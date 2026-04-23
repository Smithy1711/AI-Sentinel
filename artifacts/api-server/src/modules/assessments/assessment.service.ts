import {
  AssessmentRunStatus,
  AssessmentStatus,
  Prisma,
  type Assessment,
  type Repository,
  WorkspaceMemberRole,
} from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors";
import { AuditLogService } from "../audit/audit.service";
import { WorkspaceAccessService } from "../workspaces/workspace-access.service";

const assessmentWriteRoles = [
  WorkspaceMemberRole.OWNER,
  WorkspaceMemberRole.ADMIN,
  WorkspaceMemberRole.MEMBER,
];

const assessmentRepositorySelect = {
  id: true,
  provider: true,
  owner: true,
  name: true,
  fullName: true,
  url: true,
  defaultBranch: true,
  status: true,
} satisfies Prisma.RepositorySelect;

const assessmentWithRepositoryInclude = {
  repository: {
    select: assessmentRepositorySelect,
  },
} satisfies Prisma.AssessmentInclude;

type AssessmentWithRepository = Prisma.AssessmentGetPayload<{
  include: typeof assessmentWithRepositoryInclude;
}>;

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

function normalizeScopeSettings(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

export class AssessmentService {
  private readonly workspaceAccessService: WorkspaceAccessService;
  private readonly auditLogService: AuditLogService;

  constructor(private readonly app: FastifyInstance) {
    this.workspaceAccessService = new WorkspaceAccessService(app);
    this.auditLogService = new AuditLogService(app);
  }

  async createAssessment(input: {
    workspaceId: string;
    userId: string;
    name: string;
    description?: string;
    repositoryId?: string | null;
    branch?: string | null;
    stagingUrl?: string | null;
    credentialsPlaceholder?: string | null;
    aiProvider?: string | null;
    aiArchitectureType?: Assessment["aiArchitectureType"];
    selectedScopeChecks?: string[];
    scopeSettings?: Record<string, unknown> | null;
  }): Promise<AssessmentWithRepository> {
    await this.workspaceAccessService.requireRole(
      input.userId,
      input.workspaceId,
      assessmentWriteRoles,
    );

    const repository = await this.resolveRepository(
      input.workspaceId,
      input.repositoryId ?? null,
    );

    const assessment = await this.app.prisma.assessment.create({
      data: {
        workspaceId: input.workspaceId,
        createdByUserId: input.userId,
        repositoryId: repository?.id ?? null,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        branch: input.branch ?? repository?.defaultBranch ?? null,
        stagingUrl: input.stagingUrl ?? null,
        credentialsPlaceholder: input.credentialsPlaceholder ?? null,
        aiProvider: input.aiProvider ?? null,
        aiArchitectureType: input.aiArchitectureType ?? null,
        selectedScopeChecks: input.selectedScopeChecks ?? [],
        assessmentScopeSettings: toNullableJsonInput(input.scopeSettings),
      },
      include: assessmentWithRepositoryInclude,
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      assessmentId: assessment.id,
      action: "assessment.created",
      entityType: "assessment",
      entityId: assessment.id,
      metadata: {
        repositoryId: assessment.repositoryId,
        status: assessment.status,
      },
    });

    return assessment;
  }

  async listAssessments(input: {
    workspaceId: string;
    userId: string;
  }): Promise<AssessmentWithRepository[]> {
    await this.workspaceAccessService.requireMembership(
      input.userId,
      input.workspaceId,
    );

    return this.app.prisma.assessment.findMany({
      where: {
        workspaceId: input.workspaceId,
        deletedAt: null,
      },
      include: assessmentWithRepositoryInclude,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });
  }

  async getAssessment(input: {
    workspaceId: string;
    assessmentId: string;
    userId: string;
  }): Promise<AssessmentWithRepository> {
    await this.workspaceAccessService.requireMembership(
      input.userId,
      input.workspaceId,
    );

    return this.getAssessmentOrThrow(input.workspaceId, input.assessmentId);
  }

  async updateAssessmentDraft(input: {
    workspaceId: string;
    assessmentId: string;
    userId: string;
    name?: string;
    description?: string | null;
    repositoryId?: string | null;
    branch?: string | null;
    stagingUrl?: string | null;
    credentialsPlaceholder?: string | null;
    aiProvider?: string | null;
    aiArchitectureType?: Assessment["aiArchitectureType"] | null;
    selectedScopeChecks?: string[];
    scopeSettings?: Record<string, unknown> | null;
  }): Promise<AssessmentWithRepository> {
    await this.workspaceAccessService.requireRole(
      input.userId,
      input.workspaceId,
      assessmentWriteRoles,
    );

    const assessment = await this.getAssessmentOrThrow(
      input.workspaceId,
      input.assessmentId,
    );

    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new AppError(
        409,
        "ASSESSMENT_NOT_DRAFT",
        "Only draft assessments can be updated.",
      );
    }

    const repositoryId =
      input.repositoryId === undefined
        ? assessment.repositoryId
        : input.repositoryId;
    const repository = await this.resolveRepository(input.workspaceId, repositoryId);

    const updatedAssessment = await this.app.prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
        ...(input.repositoryId !== undefined
          ? { repositoryId: repository?.id ?? null }
          : {}),
        ...(input.branch !== undefined
          ? { branch: input.branch }
          : input.repositoryId !== undefined
            ? { branch: repository?.defaultBranch ?? null }
            : {}),
        ...(input.stagingUrl !== undefined
          ? { stagingUrl: input.stagingUrl }
          : {}),
        ...(input.credentialsPlaceholder !== undefined
          ? { credentialsPlaceholder: input.credentialsPlaceholder }
          : {}),
        ...(input.aiProvider !== undefined
          ? { aiProvider: input.aiProvider }
          : {}),
        ...(input.aiArchitectureType !== undefined
          ? { aiArchitectureType: input.aiArchitectureType }
          : {}),
        ...(input.selectedScopeChecks !== undefined
          ? { selectedScopeChecks: input.selectedScopeChecks }
          : {}),
        ...(input.scopeSettings !== undefined
          ? { assessmentScopeSettings: toNullableJsonInput(input.scopeSettings) }
          : {}),
      },
      include: assessmentWithRepositoryInclude,
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      assessmentId: updatedAssessment.id,
      action: "assessment.updated",
      entityType: "assessment",
      entityId: updatedAssessment.id,
    });

    return updatedAssessment;
  }

  async archiveAssessment(input: {
    workspaceId: string;
    assessmentId: string;
    userId: string;
  }): Promise<AssessmentWithRepository> {
    await this.workspaceAccessService.requireRole(
      input.userId,
      input.workspaceId,
      assessmentWriteRoles,
    );

    const assessment = await this.getAssessmentOrThrow(
      input.workspaceId,
      input.assessmentId,
    );

    if (assessment.status === AssessmentStatus.ARCHIVED) {
      return assessment;
    }

    const archivedAssessment = await this.app.prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        status: AssessmentStatus.ARCHIVED,
      },
      include: assessmentWithRepositoryInclude,
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      assessmentId: archivedAssessment.id,
      action: "assessment.archived",
      entityType: "assessment",
      entityId: archivedAssessment.id,
    });

    return archivedAssessment;
  }

  async cancelAssessment(input: {
    workspaceId: string;
    assessmentId: string;
    userId: string;
  }): Promise<AssessmentWithRepository> {
    await this.workspaceAccessService.requireRole(
      input.userId,
      input.workspaceId,
      assessmentWriteRoles,
    );

    const assessment = await this.getAssessmentOrThrow(
      input.workspaceId,
      input.assessmentId,
    );

    if (
      assessment.status !== AssessmentStatus.QUEUED &&
      assessment.status !== AssessmentStatus.RUNNING
    ) {
      throw new AppError(
        409,
        "ASSESSMENT_NOT_CANCELABLE",
        "Only queued or running assessments can be canceled.",
      );
    }

    const canceledAssessment = await this.app.prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        status: AssessmentStatus.CANCELED,
      },
      include: assessmentWithRepositoryInclude,
    });

    const activeRun = await this.app.prisma.assessmentRun.findFirst({
      where: {
        workspaceId: input.workspaceId,
        assessmentId: assessment.id,
        status: {
          in: [
            AssessmentRunStatus.QUEUED,
            AssessmentRunStatus.PREPARING,
            AssessmentRunStatus.SCANNING,
            AssessmentRunStatus.NORMALIZING,
            AssessmentRunStatus.REPORT_GENERATION,
          ],
        },
      },
      select: { id: true },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (activeRun) {
      await this.app.prisma.assessmentRun.update({
        where: { id: activeRun.id },
        data: {
          status: AssessmentRunStatus.CANCELED,
          currentMessage: "Assessment run canceled.",
          canceledAt: new Date(),
        },
      });

      await this.app.prisma.assessmentRunEvent.create({
        data: {
          assessmentRunId: activeRun.id,
          status: AssessmentRunStatus.CANCELED,
          progressPercent: null,
          message: "Assessment run canceled.",
        },
      });
    }

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      assessmentId: canceledAssessment.id,
      assessmentRunId: activeRun?.id ?? null,
      action: "assessment.canceled",
      entityType: "assessment",
      entityId: canceledAssessment.id,
    });

    return canceledAssessment;
  }

  serializeAssessment(assessment: AssessmentWithRepository) {
    return {
      id: assessment.id,
      workspaceId: assessment.workspaceId,
      name: assessment.name,
      description: assessment.description,
      status: assessment.status,
      repository: assessment.repository
        ? this.serializeRepositorySummary(assessment.repository)
        : null,
      configuration: {
        repositoryId: assessment.repositoryId,
        branch: assessment.branch,
        stagingUrl: assessment.stagingUrl,
        credentialsPlaceholder: assessment.credentialsPlaceholder,
        aiProvider: assessment.aiProvider,
        aiArchitectureType: assessment.aiArchitectureType,
        selectedScopeChecks: assessment.selectedScopeChecks,
        scopeSettings: normalizeScopeSettings(assessment.assessmentScopeSettings),
      },
      latestRunAt: assessment.latestRunAt?.toISOString() ?? null,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
    };
  }

  private async resolveRepository(
    workspaceId: string,
    repositoryId: string | null,
  ) {
    if (!repositoryId) {
      return null;
    }

    const repository = await this.app.prisma.repository.findFirst({
      where: {
        id: repositoryId,
        workspaceId,
        deletedAt: null,
      },
      select: assessmentRepositorySelect,
    });

    if (!repository) {
      throw new AppError(
        404,
        "REPOSITORY_NOT_FOUND",
        "Repository not found for this workspace.",
      );
    }

    return repository;
  }

  private async getAssessmentOrThrow(
    workspaceId: string,
    assessmentId: string,
  ): Promise<AssessmentWithRepository> {
    const assessment = await this.app.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        workspaceId,
        deletedAt: null,
      },
      include: assessmentWithRepositoryInclude,
    });

    if (!assessment) {
      throw new AppError(404, "ASSESSMENT_NOT_FOUND", "Assessment not found.");
    }

    return assessment;
  }

  private serializeRepositorySummary(repository: Pick<
    Repository,
    "id" | "provider" | "owner" | "name" | "fullName" | "url" | "defaultBranch" | "status"
  >) {
    return {
      id: repository.id,
      provider: repository.provider,
      owner: repository.owner,
      repoName: repository.name,
      fullName: repository.fullName,
      repoUrl: repository.url,
      defaultBranch: repository.defaultBranch,
      connectionStatus: repository.status,
    };
  }
}
