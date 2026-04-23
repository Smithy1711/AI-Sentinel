import {
  type Finding,
  FindingCategory,
  WorkspaceMemberRole,
} from "@prisma/client";
import type {
  ConfidenceLevel,
  FindingSeverity,
  FindingStatus,
} from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors";
import { AuditLogService } from "../audit/audit.service";
import { WorkspaceAccessService } from "../workspaces/workspace-access.service";

export const findingCategoryApiToEnum = {
  prompt_injection: FindingCategory.PROMPT_INJECTION,
  indirect_prompt_injection: FindingCategory.INDIRECT_PROMPT_INJECTION,
  prompt_leakage: FindingCategory.PROMPT_LEAKAGE,
  insecure_output_handling: FindingCategory.INSECURE_OUTPUT_HANDLING,
  excessive_agency: FindingCategory.EXCESSIVE_AGENCY,
  rag_data_exposure: FindingCategory.RAG_DATA_EXPOSURE,
  weak_authz: FindingCategory.WEAK_AUTHZ,
  secrets_exposure: FindingCategory.SECRETS_EXPOSURE,
  insecure_logging: FindingCategory.INSECURE_LOGGING,
  abuse_controls: FindingCategory.ABUSE_CONTROLS,
  supply_chain: FindingCategory.SUPPLY_CHAIN,
  other: FindingCategory.OTHER,
} as const;

export const findingCategoryEnumToApi = Object.fromEntries(
  Object.entries(findingCategoryApiToEnum).map(([apiValue, enumValue]) => [
    enumValue,
    apiValue,
  ]),
) as Record<FindingCategory, keyof typeof findingCategoryApiToEnum>;

const triageRoles = [
  WorkspaceMemberRole.OWNER,
  WorkspaceMemberRole.ADMIN,
  WorkspaceMemberRole.MEMBER,
];

export interface FindingFilters {
  severity?: FindingSeverity[];
  category?: (keyof typeof findingCategoryApiToEnum)[];
  status?: FindingStatus[];
  confidence?: ConfidenceLevel[];
}

function normalizeMetadata(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

export class FindingService {
  private readonly workspaceAccessService: WorkspaceAccessService;
  private readonly auditLogService: AuditLogService;

  constructor(private readonly app: FastifyInstance) {
    this.workspaceAccessService = new WorkspaceAccessService(app);
    this.auditLogService = new AuditLogService(app);
  }

  async listForAssessment(input: {
    workspaceId: string;
    assessmentId: string;
    userId: string;
    filters?: FindingFilters;
  }) {
    await this.workspaceAccessService.requireMembership(
      input.userId,
      input.workspaceId,
    );
    await this.ensureAssessmentExists(input.workspaceId, input.assessmentId);

    return this.app.prisma.finding.findMany({
      where: {
        workspaceId: input.workspaceId,
        assessmentId: input.assessmentId,
        deletedAt: null,
        ...this.buildFilterWhere(input.filters),
      },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    });
  }

  async listForRun(input: {
    workspaceId: string;
    assessmentRunId: string;
    userId: string;
    filters?: FindingFilters;
  }) {
    await this.workspaceAccessService.requireMembership(
      input.userId,
      input.workspaceId,
    );
    await this.ensureRunExists(input.workspaceId, input.assessmentRunId);

    return this.app.prisma.finding.findMany({
      where: {
        workspaceId: input.workspaceId,
        assessmentRunId: input.assessmentRunId,
        deletedAt: null,
        ...this.buildFilterWhere(input.filters),
      },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    });
  }

  async getFinding(input: {
    workspaceId: string;
    findingId: string;
    userId: string;
  }) {
    await this.workspaceAccessService.requireMembership(
      input.userId,
      input.workspaceId,
    );

    const finding = await this.app.prisma.finding.findFirst({
      where: {
        id: input.findingId,
        workspaceId: input.workspaceId,
        deletedAt: null,
      },
    });

    if (!finding) {
      throw new AppError(404, "FINDING_NOT_FOUND", "Finding not found.");
    }

    return finding;
  }

  async updateStatus(input: {
    workspaceId: string;
    findingId: string;
    userId: string;
    status: FindingStatus;
  }) {
    await this.workspaceAccessService.requireRole(
      input.userId,
      input.workspaceId,
      triageRoles,
    );

    const finding = await this.getFinding(input);
    const updatedFinding = await this.app.prisma.finding.update({
      where: { id: finding.id },
      data: {
        status: input.status,
      },
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      assessmentId: updatedFinding.assessmentId,
      assessmentRunId: updatedFinding.assessmentRunId,
      action: "finding.status_updated",
      entityType: "finding",
      entityId: updatedFinding.id,
      metadata: {
        previousStatus: finding.status,
        newStatus: updatedFinding.status,
      },
    });

    return updatedFinding;
  }

  async aggregateForAssessment(input: {
    workspaceId: string;
    assessmentId: string;
    userId: string;
    filters?: FindingFilters;
  }) {
    const findings = await this.listForAssessment(input);
    return this.buildAggregate(findings);
  }

  async aggregateForRun(input: {
    workspaceId: string;
    assessmentRunId: string;
    userId: string;
    filters?: FindingFilters;
  }) {
    const findings = await this.listForRun(input);
    return this.buildAggregate(findings);
  }

  serializeFinding(finding: Finding) {
    return {
      id: finding.id,
      workspaceId: finding.workspaceId,
      assessmentId: finding.assessmentId,
      assessmentRunId: finding.assessmentRunId,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      category: findingCategoryEnumToApi[finding.category],
      confidence: finding.confidence,
      status: finding.status,
      affectedComponent: finding.affectedComponent,
      filePath: finding.affectedFilePath,
      endpoint: finding.affectedEndpoint,
      evidenceSummary: finding.evidenceSummary,
      recommendedRemediation: finding.recommendedRemediation,
      metadata: normalizeMetadata(finding.metadata),
      createdAt: finding.createdAt.toISOString(),
      updatedAt: finding.updatedAt.toISOString(),
    };
  }

  private async ensureAssessmentExists(workspaceId: string, assessmentId: string) {
    const assessment = await this.app.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        workspaceId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!assessment) {
      throw new AppError(404, "ASSESSMENT_NOT_FOUND", "Assessment not found.");
    }
  }

  private async ensureRunExists(workspaceId: string, assessmentRunId: string) {
    const run = await this.app.prisma.assessmentRun.findFirst({
      where: {
        id: assessmentRunId,
        workspaceId,
      },
      select: { id: true },
    });

    if (!run) {
      throw new AppError(
        404,
        "ASSESSMENT_RUN_NOT_FOUND",
        "Assessment run not found.",
      );
    }
  }

  private buildFilterWhere(filters?: FindingFilters) {
    return {
      ...(filters?.severity?.length
        ? { severity: { in: filters.severity } }
        : {}),
      ...(filters?.category?.length
        ? {
            category: {
              in: filters.category.map((item) => findingCategoryApiToEnum[item]),
            },
          }
        : {}),
      ...(filters?.status?.length
        ? { status: { in: filters.status } }
        : {}),
      ...(filters?.confidence?.length
        ? { confidence: { in: filters.confidence } }
        : {}),
    };
  }

  private buildAggregate(findings: Finding[]) {
    const severityCounts = new Map<FindingSeverity, number>();
    const categoryCounts = new Map<keyof typeof findingCategoryApiToEnum, number>();

    for (const finding of findings) {
      severityCounts.set(
        finding.severity,
        (severityCounts.get(finding.severity) ?? 0) + 1,
      );

      const category = findingCategoryEnumToApi[finding.category];
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }

    return {
      totalCount: findings.length,
      bySeverity: Array.from(severityCounts.entries()).map(
        ([severity, count]) => ({
          severity,
          count,
        }),
      ),
      byCategory: Array.from(categoryCounts.entries()).map(
        ([category, count]) => ({
          category,
          count,
        }),
      ),
    };
  }
}
