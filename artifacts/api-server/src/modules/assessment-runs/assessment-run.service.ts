import {
  AssessmentRunStatus,
  AssessmentRunTrigger,
  AssessmentStatus,
  Prisma,
  WorkspaceMemberRole,
} from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors";
import { AuditLogService } from "../audit/audit.service";
import { WorkspaceAccessService } from "../workspaces/workspace-access.service";

export const ASSESSMENT_RUN_JOB_NAME = "assessment-run.execute";

const launchRoles = [
  WorkspaceMemberRole.OWNER,
  WorkspaceMemberRole.ADMIN,
  WorkspaceMemberRole.MEMBER,
];

const activeRunStatuses = [
  AssessmentRunStatus.QUEUED,
  AssessmentRunStatus.PREPARING,
  AssessmentRunStatus.SCANNING,
  AssessmentRunStatus.NORMALIZING,
  AssessmentRunStatus.REPORT_GENERATION,
];

const assessmentRunDetailInclude = {
  assessment: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
  events: {
    orderBy: {
      createdAt: "asc",
    },
  },
} satisfies Prisma.AssessmentRunInclude;

type AssessmentRunDetail = Prisma.AssessmentRunGetPayload<{
  include: typeof assessmentRunDetailInclude;
}>;

function normalizeObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

export class AssessmentRunService {
  private readonly workspaceAccessService: WorkspaceAccessService;
  private readonly auditLogService: AuditLogService;

  constructor(private readonly app: FastifyInstance) {
    this.workspaceAccessService = new WorkspaceAccessService(app);
    this.auditLogService = new AuditLogService(app);
  }

  async launchAssessment(input: {
    workspaceId: string;
    assessmentId: string;
    userId: string;
    triggerSource?: AssessmentRunTrigger;
  }): Promise<AssessmentRunDetail> {
    await this.workspaceAccessService.requireRole(
      input.userId,
      input.workspaceId,
      launchRoles,
    );

    const assessment = await this.app.prisma.assessment.findFirst({
      where: {
        id: input.assessmentId,
        workspaceId: input.workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        status: true,
        repositoryId: true,
        branch: true,
        stagingUrl: true,
        aiProvider: true,
        aiArchitectureType: true,
        selectedScopeChecks: true,
        assessmentScopeSettings: true,
      },
    });

    if (!assessment) {
      throw new AppError(404, "ASSESSMENT_NOT_FOUND", "Assessment not found.");
    }

    if (assessment.status === AssessmentStatus.ARCHIVED) {
      throw new AppError(
        409,
        "ASSESSMENT_ARCHIVED",
        "Archived assessments cannot be launched.",
      );
    }

    const existingRun = await this.app.prisma.assessmentRun.findFirst({
      where: {
        workspaceId: input.workspaceId,
        assessmentId: input.assessmentId,
        status: {
          in: activeRunStatuses,
        },
      },
      select: { id: true },
    });

    if (existingRun) {
      throw new AppError(
        409,
        "ASSESSMENT_ALREADY_RUNNING",
        "An assessment run is already active for this assessment.",
      );
    }

    const run = await this.app.prisma.assessmentRun.create({
      data: {
        workspaceId: input.workspaceId,
        assessmentId: input.assessmentId,
        triggeredByUserId: input.userId,
        status: AssessmentRunStatus.QUEUED,
        triggerSource: input.triggerSource ?? AssessmentRunTrigger.MANUAL,
        progressPercent: 0,
        currentMessage: "Assessment run queued.",
        branch: assessment.branch,
        stagingUrl: assessment.stagingUrl,
        scopeSettings:
          assessment.assessmentScopeSettings === null
            ? Prisma.JsonNull
            : (assessment.assessmentScopeSettings as Prisma.InputJsonValue),
        providerMetadata: {
          aiProvider: assessment.aiProvider,
          aiArchitectureType: assessment.aiArchitectureType,
          selectedScopeChecks: assessment.selectedScopeChecks,
        } as Prisma.InputJsonValue,
      },
      include: assessmentRunDetailInclude,
    });

    await this.app.prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        status: AssessmentStatus.QUEUED,
        latestRunAt: run.queuedAt,
      },
    });

    await this.app.prisma.assessmentRunEvent.create({
      data: {
        assessmentRunId: run.id,
        status: AssessmentRunStatus.QUEUED,
        progressPercent: 0,
        message: "Assessment run queued.",
      },
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      assessmentId: assessment.id,
      assessmentRunId: run.id,
      action: "assessment.run.launched",
      entityType: "assessment_run",
      entityId: run.id,
      metadata: {
        triggerSource: run.triggerSource,
      },
    });

    const job = await this.app.jobQueue.enqueue(ASSESSMENT_RUN_JOB_NAME, {
      runId: run.id,
    });

    const queuedRun = await this.app.prisma.assessmentRun.update({
      where: { id: run.id },
      data: {
        queueJobId: job.id,
      },
      include: assessmentRunDetailInclude,
    });

    return queuedRun;
  }

  async getAssessmentRun(input: {
    workspaceId: string;
    assessmentRunId: string;
    userId: string;
  }): Promise<AssessmentRunDetail> {
    await this.workspaceAccessService.requireMembership(
      input.userId,
      input.workspaceId,
    );

    const run = await this.app.prisma.assessmentRun.findFirst({
      where: {
        id: input.assessmentRunId,
        workspaceId: input.workspaceId,
      },
      include: assessmentRunDetailInclude,
    });

    if (!run) {
      throw new AppError(
        404,
        "ASSESSMENT_RUN_NOT_FOUND",
        "Assessment run not found.",
      );
    }

    return run;
  }

  serializeRun(run: AssessmentRunDetail) {
    return {
      id: run.id,
      workspaceId: run.workspaceId,
      assessmentId: run.assessmentId,
      assessment: {
        id: run.assessment.id,
        name: run.assessment.name,
        status: run.assessment.status,
      },
      status: run.status,
      progressPercent: run.progressPercent,
      currentMessage: run.currentMessage,
      triggerSource: run.triggerSource,
      queueJobId: run.queueJobId,
      branch: run.branch,
      stagingUrl: run.stagingUrl,
      findingsCount: run.findingsCount,
      overallRiskLevel: run.overallRiskLevel,
      errorMessage: run.errorMessage,
      queuedAt: run.queuedAt.toISOString(),
      startedAt: run.startedAt?.toISOString() ?? null,
      completedAt: run.completedAt?.toISOString() ?? null,
      failedAt: run.failedAt?.toISOString() ?? null,
      canceledAt: run.canceledAt?.toISOString() ?? null,
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
      timeline: run.events.map((event) => ({
        id: event.id,
        status: event.status,
        progressPercent: event.progressPercent,
        message: event.message,
        metadata: normalizeObject(event.metadata),
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }
}
