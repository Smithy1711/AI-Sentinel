import {
  AssessmentRunStatus,
  AssessmentStatus,
  ConfidenceLevel,
  FindingSeverity,
  FindingStatus,
  Prisma,
  RiskLevel,
} from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { ASSESSMENT_RUN_JOB_NAME } from "./assessment-run.service";
import {
  createPlaceholderAssessmentExecutionPipeline,
  type AssessmentExecutionContext,
  type AssessmentExecutionPipeline,
  type NormalizedFindingDraft,
} from "./assessment-run.pipeline";
import { AuditLogService } from "../audit/audit.service";
import { ReportService } from "../reports/report.service";

class RunCanceledError extends Error {}

function toNullableJsonInput(
  value: Record<string, unknown> | null | undefined,
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

function toRiskLevelFromSeverity(severity: FindingSeverity): RiskLevel {
  switch (severity) {
    case FindingSeverity.CRITICAL:
      return RiskLevel.CRITICAL;
    case FindingSeverity.HIGH:
      return RiskLevel.HIGH;
    case FindingSeverity.MEDIUM:
      return RiskLevel.MEDIUM;
    case FindingSeverity.LOW:
      return RiskLevel.LOW;
    case FindingSeverity.INFO:
    default:
      return RiskLevel.INFO;
  }
}

export class AssessmentRunWorker {
  private readonly auditLogService: AuditLogService;

  constructor(
    private readonly app: FastifyInstance,
    private readonly pipeline: AssessmentExecutionPipeline = createPlaceholderAssessmentExecutionPipeline(),
  ) {
    this.auditLogService = new AuditLogService(app);
  }

  register() {
    this.app.jobQueue.registerProcessor<{ runId: string }>(
      ASSESSMENT_RUN_JOB_NAME,
      async (job) => {
        await this.process(job.payload.runId);
      },
    );
  }

  private async process(runId: string) {
    const run = await this.app.prisma.assessmentRun.findUnique({
      where: { id: runId },
      include: {
        assessment: {
          select: {
            id: true,
            name: true,
            description: true,
            repositoryId: true,
            branch: true,
            stagingUrl: true,
            aiProvider: true,
            aiArchitectureType: true,
            selectedScopeChecks: true,
            credentialsPlaceholder: true,
          },
        },
      },
    });

    if (!run) {
      return;
    }

    if (run.status === AssessmentRunStatus.CANCELED) {
      return;
    }

    const context: AssessmentExecutionContext = {
      assessment: {
        id: run.assessment.id,
        name: run.assessment.name,
        description: run.assessment.description,
        repositoryId: run.assessment.repositoryId,
        branch: run.assessment.branch,
        stagingUrl: run.assessment.stagingUrl,
        aiProvider: run.assessment.aiProvider,
        aiArchitectureType: run.assessment.aiArchitectureType,
        selectedScopeChecks: run.assessment.selectedScopeChecks,
        credentialsPlaceholder: run.assessment.credentialsPlaceholder,
      },
      run: {
        id: run.id,
        workspaceId: run.workspaceId,
        assessmentId: run.assessmentId,
        branch: run.branch,
        stagingUrl: run.stagingUrl,
      },
    };

    try {
      await this.transitionRun({
        runId: run.id,
        assessmentId: run.assessmentId,
        status: AssessmentRunStatus.PREPARING,
        progressPercent: 10,
        message: "Preparing assessment execution.",
        startedAt: new Date(),
        assessmentStatus: AssessmentStatus.RUNNING,
      });

      await this.ensureRunNotCanceled(run.id);

      await this.transitionRun({
        runId: run.id,
        assessmentId: run.assessmentId,
        status: AssessmentRunStatus.SCANNING,
        progressPercent: 30,
        message: "Running repository analysis placeholder.",
        assessmentStatus: AssessmentStatus.RUNNING,
      });

      const repoAnalysis = await this.pipeline.repositoryAnalysis.analyze(context);

      await this.appendEvent({
        runId: run.id,
        status: AssessmentRunStatus.SCANNING,
        progressPercent: 45,
        message: "Repository analysis stage completed.",
        metadata: repoAnalysis.metadata,
      });

      await this.ensureRunNotCanceled(run.id);

      await this.appendEvent({
        runId: run.id,
        status: AssessmentRunStatus.SCANNING,
        progressPercent: 55,
        message: "Executing runtime probe placeholder.",
      });

      const runtimeProbe = await this.pipeline.runtimeProbe.probe(
        context,
        repoAnalysis,
      );

      await this.appendEvent({
        runId: run.id,
        status: AssessmentRunStatus.SCANNING,
        progressPercent: 65,
        message: "Runtime probe stage completed.",
        metadata: runtimeProbe.metadata,
      });

      await this.ensureRunNotCanceled(run.id);

      await this.transitionRun({
        runId: run.id,
        assessmentId: run.assessmentId,
        status: AssessmentRunStatus.NORMALIZING,
        progressPercent: 75,
        message: "Normalizing findings.",
        assessmentStatus: AssessmentStatus.RUNNING,
      });

      const normalizedFindings =
        await this.pipeline.findingNormalization.normalize({
          context,
          repoAnalysis,
          runtimeProbe,
        });

      await this.persistFindings(run, normalizedFindings);

      await this.app.prisma.assessmentRun.update({
        where: { id: run.id },
        data: {
          findingsCount: normalizedFindings.length,
          overallRiskLevel: this.getOverallRiskLevel(normalizedFindings),
        },
      });

      await this.appendEvent({
        runId: run.id,
        status: AssessmentRunStatus.NORMALIZING,
        progressPercent: 82,
        message: `${normalizedFindings.length} findings normalized.`,
        metadata: {
          findingsCount: normalizedFindings.length,
        },
      });

      await this.ensureRunNotCanceled(run.id);

      await this.transitionRun({
        runId: run.id,
        assessmentId: run.assessmentId,
        status: AssessmentRunStatus.REPORT_GENERATION,
        progressPercent: 90,
        message: "Generating report placeholder.",
        assessmentStatus: AssessmentStatus.RUNNING,
      });

      await this.pipeline.reportGeneration.generate({
        context,
        findings: normalizedFindings,
        repoAnalysis,
        runtimeProbe,
      });

      const reportService = new ReportService(this.app);
      const { report } = await reportService.generateReportForAssessmentRun({
        workspaceId: run.workspaceId,
        assessmentId: run.assessmentId,
        assessmentRunId: run.id,
        generatedByUserId: run.triggeredByUserId,
      });

      await this.app.prisma.assessmentRun.update({
        where: { id: run.id },
        data: {
          overallRiskLevel: report.riskLevel,
          findingsCount: normalizedFindings.length,
        },
      });

      if (run.assessment.repositoryId) {
        await this.app.prisma.repository.update({
          where: { id: run.assessment.repositoryId },
          data: {
            lastScannedAt: new Date(),
          },
        });
      }

      await this.transitionRun({
        runId: run.id,
        assessmentId: run.assessmentId,
        status: AssessmentRunStatus.COMPLETED,
        progressPercent: 100,
        message: "Assessment run completed.",
        completedAt: new Date(),
        assessmentStatus: AssessmentStatus.COMPLETED,
      });

      await this.auditLogService.record({
        workspaceId: run.workspaceId,
        actorUserId: run.triggeredByUserId,
        assessmentId: run.assessmentId,
        assessmentRunId: run.id,
        action: "assessment.run.completed",
        entityType: "assessment_run",
        entityId: run.id,
        metadata: {
          findingsCount: normalizedFindings.length,
          overallRiskLevel: report.riskLevel,
        },
      });
    } catch (error) {
      if (error instanceof RunCanceledError) {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Assessment run failed.";

      await this.transitionRun({
        runId: run.id,
        assessmentId: run.assessmentId,
        status: AssessmentRunStatus.FAILED,
        progressPercent: 100,
        message: "Assessment run failed.",
        failedAt: new Date(),
        errorMessage: message,
        assessmentStatus: AssessmentStatus.FAILED,
        metadata: {
          error: message,
        },
      });

      await this.auditLogService.record({
        workspaceId: run.workspaceId,
        actorUserId: run.triggeredByUserId,
        assessmentId: run.assessmentId,
        assessmentRunId: run.id,
        action: "assessment.run.failed",
        entityType: "assessment_run",
        entityId: run.id,
        metadata: {
          error: message,
        },
      });
    }
  }

  private async transitionRun(input: {
    runId: string;
    assessmentId: string;
    status: AssessmentRunStatus;
    progressPercent: number;
    message: string;
    assessmentStatus: AssessmentStatus;
    startedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }) {
    const now = new Date();

    await this.app.prisma.$transaction([
      this.app.prisma.assessmentRun.update({
        where: { id: input.runId },
        data: {
          status: input.status,
          progressPercent: input.progressPercent,
          currentMessage: input.message,
          ...(input.startedAt ? { startedAt: input.startedAt } : {}),
          ...(input.completedAt ? { completedAt: input.completedAt } : {}),
          ...(input.failedAt ? { failedAt: input.failedAt } : {}),
          ...(input.errorMessage !== undefined
            ? { errorMessage: input.errorMessage }
            : {}),
        },
      }),
      this.app.prisma.assessment.update({
        where: { id: input.assessmentId },
        data: {
          status: input.assessmentStatus,
          latestRunAt: now,
        },
      }),
      this.app.prisma.assessmentRunEvent.create({
        data: {
          assessmentRunId: input.runId,
          status: input.status,
          progressPercent: input.progressPercent,
          message: input.message,
          metadata: toNullableJsonInput(input.metadata),
        },
      }),
    ]);
  }

  private async appendEvent(input: {
    runId: string;
    status: AssessmentRunStatus;
    progressPercent?: number;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.app.prisma.$transaction([
      this.app.prisma.assessmentRun.update({
        where: { id: input.runId },
        data: {
          status: input.status,
          ...(input.progressPercent !== undefined
            ? { progressPercent: input.progressPercent }
            : {}),
          currentMessage: input.message,
        },
      }),
      this.app.prisma.assessmentRunEvent.create({
        data: {
          assessmentRunId: input.runId,
          status: input.status,
          progressPercent: input.progressPercent ?? null,
          message: input.message,
          metadata: toNullableJsonInput(input.metadata),
        },
      }),
    ]);
  }

  private async ensureRunNotCanceled(runId: string) {
    const run = await this.app.prisma.assessmentRun.findUnique({
      where: { id: runId },
      select: { status: true },
    });

    if (run?.status === AssessmentRunStatus.CANCELED) {
      throw new RunCanceledError();
    }
  }

  private async persistFindings(
    run: {
      id: string;
      workspaceId: string;
      assessmentId: string;
    },
    findings: NormalizedFindingDraft[],
  ) {
    await Promise.all(
      findings.map((finding) =>
        this.app.prisma.finding.create({
          data: {
            workspaceId: run.workspaceId,
            assessmentId: run.assessmentId,
            assessmentRunId: run.id,
            status: FindingStatus.OPEN,
            severity: finding.severity,
            riskLevel: finding.riskLevel ?? toRiskLevelFromSeverity(finding.severity),
            confidence: finding.confidence ?? ConfidenceLevel.MEDIUM,
            category: finding.category,
            title: finding.title,
            summary: finding.summary,
            description: finding.description,
            affectedComponent: finding.affectedComponent ?? null,
            affectedFilePath: finding.affectedFilePath ?? null,
            affectedEndpoint: finding.affectedEndpoint ?? null,
            evidenceSummary: finding.evidenceSummary ?? finding.summary,
            recommendedRemediation:
              finding.recommendedRemediation ?? null,
            evidence: toNullableJsonInput(finding.evidence),
            remediation: toNullableJsonInput(finding.remediation),
            metadata: toNullableJsonInput(finding.metadata),
          },
        }),
      ),
    );
  }

  private getOverallRiskLevel(findings: NormalizedFindingDraft[]) {
    return (
      findings.reduce<RiskLevel>((current, finding) => {
        const order: RiskLevel[] = [
          RiskLevel.CRITICAL,
          RiskLevel.HIGH,
          RiskLevel.MEDIUM,
          RiskLevel.LOW,
          RiskLevel.INFO,
        ];

        return order.indexOf(finding.riskLevel) < order.indexOf(current)
          ? finding.riskLevel
          : current;
      }, RiskLevel.INFO) ?? null
    );
  }
}
