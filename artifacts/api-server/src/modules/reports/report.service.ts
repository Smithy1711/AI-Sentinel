import {
  FindingSeverity,
  ReportStatus,
  RiskLevel,
  type Prisma,
  type Report,
  WorkspaceMemberRole,
} from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors";
import { AuditLogService } from "../audit/audit.service";
import {
  findingCategoryEnumToApi,
  FindingService,
} from "../findings/finding.service";
import {
  JsonReportRenderer,
  type FindingCategoryApi,
  type ReportDocument,
  type ReportRenderer,
} from "./report.renderer";
import { WorkspaceAccessService } from "../workspaces/workspace-access.service";

const reportReadRoles = [
  WorkspaceMemberRole.OWNER,
  WorkspaceMemberRole.ADMIN,
  WorkspaceMemberRole.MEMBER,
  WorkspaceMemberRole.VIEWER,
];

const reportGenerateRoles = [
  WorkspaceMemberRole.OWNER,
  WorkspaceMemberRole.ADMIN,
  WorkspaceMemberRole.MEMBER,
];

const assessmentReportSelect = {
  id: true,
  workspaceId: true,
  name: true,
  status: true,
  aiProvider: true,
  aiArchitectureType: true,
  branch: true,
  stagingUrl: true,
  selectedScopeChecks: true,
  repository: {
    select: {
      id: true,
      fullName: true,
      provider: true,
    },
  },
} satisfies Prisma.AssessmentSelect;

const runReportSelect = {
  id: true,
  workspaceId: true,
  assessmentId: true,
  overallRiskLevel: true,
  branch: true,
  stagingUrl: true,
  status: true,
  completedAt: true,
  createdAt: true,
  findingsCount: true,
} satisfies Prisma.AssessmentRunSelect;

function normalizeDocument(value: unknown): ReportDocument | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ReportDocument;
  }

  return null;
}

function severityRank(severity: FindingSeverity) {
  switch (severity) {
    case FindingSeverity.CRITICAL:
      return 0;
    case FindingSeverity.HIGH:
      return 1;
    case FindingSeverity.MEDIUM:
      return 2;
    case FindingSeverity.LOW:
      return 3;
    case FindingSeverity.INFO:
    default:
      return 4;
  }
}

export class ReportService {
  private readonly workspaceAccessService: WorkspaceAccessService;
  private readonly findingService: FindingService;
  private readonly auditLogService: AuditLogService;

  constructor(
    private readonly app: FastifyInstance,
    private readonly renderer: ReportRenderer<ReportDocument> = new JsonReportRenderer(),
  ) {
    this.workspaceAccessService = new WorkspaceAccessService(app);
    this.findingService = new FindingService(app);
    this.auditLogService = new AuditLogService(app);
  }

  async generateLatestReport(input: {
    workspaceId: string;
    assessmentId: string;
    userId: string;
  }) {
    await this.workspaceAccessService.requireRole(
      input.userId,
      input.workspaceId,
      reportGenerateRoles,
    );

    return this.generateReportForAssessmentRun({
      workspaceId: input.workspaceId,
      assessmentId: input.assessmentId,
      generatedByUserId: input.userId,
    });
  }

  async generateReportForAssessmentRun(input: {
    workspaceId: string;
    assessmentId: string;
    generatedByUserId: string | null;
    assessmentRunId?: string;
  }) {
    const assessment = await this.app.prisma.assessment.findFirst({
      where: {
        id: input.assessmentId,
        workspaceId: input.workspaceId,
        deletedAt: null,
      },
      select: assessmentReportSelect,
    });

    if (!assessment) {
      throw new AppError(404, "ASSESSMENT_NOT_FOUND", "Assessment not found.");
    }

    const run = await this.app.prisma.assessmentRun.findFirst({
      where: {
        workspaceId: input.workspaceId,
        assessmentId: input.assessmentId,
        ...(input.assessmentRunId ? { id: input.assessmentRunId } : {}),
        status: input.assessmentRunId ? undefined : "COMPLETED",
      },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      select: runReportSelect,
    });

    if (!run) {
      throw new AppError(
        409,
        "REPORT_SOURCE_RUN_NOT_AVAILABLE",
        "A completed assessment run is required before generating a report.",
      );
    }

    const findings = await this.app.prisma.finding.findMany({
      where: {
        workspaceId: input.workspaceId,
        assessmentRunId: run.id,
        deletedAt: null,
      },
      orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
    });

    const latestReport = await this.app.prisma.report.findFirst({
      where: {
        assessmentId: input.assessmentId,
        deletedAt: null,
      },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      select: {
        version: true,
      },
    });

    const version = (latestReport?.version ?? 0) + 1;
    const document = this.buildDocument({
      assessment,
      run,
      findings,
    });
    const content = this.renderer.render(document);

    const report = await this.app.prisma.report.create({
      data: {
        workspaceId: input.workspaceId,
        assessmentId: input.assessmentId,
        assessmentRunId: run.id,
        generatedByUserId: input.generatedByUserId,
        status: ReportStatus.GENERATED,
        version,
        riskLevel: document.overallRiskRating,
        title: `${assessment.name} Report v${version}`,
        executiveSummary: document.executiveSummary,
        summaryJson: content as unknown as Prisma.InputJsonValue,
        remediationRoadmap:
          document.remediationRoadmap as unknown as Prisma.InputJsonValue,
      },
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.generatedByUserId,
      assessmentId: input.assessmentId,
      assessmentRunId: run.id,
      action: "report.generated",
      entityType: "report",
      entityId: report.id,
      metadata: {
        version,
      },
    });

    return {
      report,
      content,
    };
  }

  async getLatestReport(input: {
    workspaceId: string;
    assessmentId: string;
    userId: string;
  }) {
    await this.workspaceAccessService.requireRole(
      input.userId,
      input.workspaceId,
      reportReadRoles,
    );

    const report = await this.app.prisma.report.findFirst({
      where: {
        workspaceId: input.workspaceId,
        assessmentId: input.assessmentId,
        deletedAt: null,
      },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
    });

    if (!report) {
      throw new AppError(404, "REPORT_NOT_FOUND", "Report not found.");
    }

    return report;
  }

  async getReportById(input: {
    workspaceId: string;
    reportId: string;
    userId: string;
  }) {
    await this.workspaceAccessService.requireRole(
      input.userId,
      input.workspaceId,
      reportReadRoles,
    );

    const report = await this.app.prisma.report.findFirst({
      where: {
        id: input.reportId,
        workspaceId: input.workspaceId,
        deletedAt: null,
      },
    });

    if (!report) {
      throw new AppError(404, "REPORT_NOT_FOUND", "Report not found.");
    }

    return report;
  }

  serializeReport(report: Report) {
    const content = normalizeDocument(report.summaryJson);

    if (!content) {
      throw new AppError(
        500,
        "REPORT_CONTENT_INVALID",
        "Stored report content is invalid.",
      );
    }

    return {
      id: report.id,
      workspaceId: report.workspaceId,
      assessmentId: report.assessmentId,
      assessmentRunId: report.assessmentRunId,
      status: report.status,
      version: report.version,
      title: report.title,
      executiveSummary: report.executiveSummary,
      overallRiskRating: report.riskLevel,
      content,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    };
  }

  private buildDocument(input: {
    assessment: Prisma.AssessmentGetPayload<{ select: typeof assessmentReportSelect }>;
    run: Prisma.AssessmentRunGetPayload<{ select: typeof runReportSelect }>;
    findings: Awaited<ReturnType<FastifyInstance["prisma"]["finding"]["findMany"]>>;
  }): ReportDocument {
    const sortedFindings = [...input.findings].sort((left, right) => {
      const severityDiff = severityRank(left.severity) - severityRank(right.severity);

      if (severityDiff !== 0) {
        return severityDiff;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    });

    const actionableFindings = sortedFindings.filter(
      (finding) =>
        finding.status !== "FIXED" && finding.status !== "FALSE_POSITIVE",
    );

    const overallRiskRating =
      input.run.overallRiskLevel ??
      sortedFindings[0]?.riskLevel ??
      RiskLevel.INFO;

    const keyFindings = sortedFindings.slice(0, 5).map((finding) => ({
      id: finding.id,
      title: finding.title,
      severity: finding.severity,
      category: findingCategoryEnumToApi[finding.category] as FindingCategoryApi,
      confidence: finding.confidence,
      status: finding.status,
      evidenceSummary: finding.evidenceSummary,
      recommendedRemediation: finding.recommendedRemediation,
    }));

    const mappedCategories = Array.from(
      sortedFindings.reduce(
        (accumulator, finding) => {
          const category =
            findingCategoryEnumToApi[finding.category] as FindingCategoryApi;
          const existing = accumulator.get(category);

          if (existing) {
            existing.count += 1;
            if (severityRank(finding.severity) < severityRank(existing.highestSeverity)) {
              existing.highestSeverity = finding.severity;
            }
            return accumulator;
          }

          accumulator.set(category, {
            category,
            count: 1,
            highestSeverity: finding.severity,
          });
          return accumulator;
        },
        new Map<
          FindingCategoryApi,
          {
            category: FindingCategoryApi;
            count: number;
            highestSeverity: FindingSeverity;
          }
        >(),
      ).values(),
    ).sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.category.localeCompare(right.category);
    });

    const toRoadmapItem = (finding: (typeof actionableFindings)[number]) => ({
      findingId: finding.id,
      title: finding.title,
      severity: finding.severity,
      category: findingCategoryEnumToApi[finding.category] as FindingCategoryApi,
      action: finding.recommendedRemediation,
    });

    const remediationRoadmap = {
      fixNow: actionableFindings
        .filter(
          (finding) =>
            finding.severity === FindingSeverity.CRITICAL ||
            finding.severity === FindingSeverity.HIGH,
        )
        .map(toRoadmapItem),
      next: actionableFindings
        .filter((finding) => finding.severity === FindingSeverity.MEDIUM)
        .map(toRoadmapItem),
      later: actionableFindings
        .filter(
          (finding) =>
            finding.severity === FindingSeverity.LOW ||
            finding.severity === FindingSeverity.INFO,
        )
        .map(toRoadmapItem),
    };

    const appendix = {
      findings: sortedFindings.map((finding) => {
        const serialized = this.findingService.serializeFinding(finding);
        return {
          id: serialized.id,
          title: serialized.title,
          description: serialized.description,
          severity: serialized.severity,
          category: serialized.category,
          confidence: serialized.confidence,
          status: serialized.status,
          affectedComponent: serialized.affectedComponent,
          filePath: serialized.filePath,
          endpoint: serialized.endpoint,
          evidenceSummary: serialized.evidenceSummary,
          recommendedRemediation: serialized.recommendedRemediation,
          metadata: serialized.metadata,
        };
      }),
    };

    const repositoryLabel = input.assessment.repository?.fullName
      ? ` for ${input.assessment.repository.fullName}`
      : "";
    const findingsPhrase =
      sortedFindings.length === 1 ? "1 finding" : `${sortedFindings.length} findings`;
    const categoriesPhrase =
      mappedCategories.length === 1
        ? "1 category"
        : `${mappedCategories.length} categories`;

    return {
      executiveSummary: `Assessment ${input.assessment.name}${repositoryLabel} produced ${findingsPhrase} across ${categoriesPhrase}, with an overall ${overallRiskRating.toLowerCase()} risk rating.`,
      overallRiskRating,
      scopeSummary: {
        assessmentName: input.assessment.name,
        repository: input.assessment.repository
          ? {
              id: input.assessment.repository.id,
              fullName: input.assessment.repository.fullName,
              provider: input.assessment.repository.provider,
            }
          : null,
        branch: input.run.branch ?? input.assessment.branch,
        stagingUrl: input.run.stagingUrl ?? input.assessment.stagingUrl,
        aiProvider: input.assessment.aiProvider,
        aiArchitectureType: input.assessment.aiArchitectureType,
        selectedScopeChecks: input.assessment.selectedScopeChecks,
        assessmentRunId: input.run.id,
        findingsAnalyzed: sortedFindings.length,
      },
      keyFindings,
      mappedCategories,
      remediationRoadmap,
      appendix,
    };
  }
}
