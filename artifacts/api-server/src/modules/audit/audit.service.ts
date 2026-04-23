import { Prisma } from "@prisma/client";
import type { PrismaClientLike } from "../../plugins/prisma";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors";
import { WorkspaceAccessService } from "../workspaces/workspace-access.service";

type AuditLogClient = Pick<PrismaClientLike, "auditLog">;

function normalizeMetadata(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

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

export class AuditLogService {
  private readonly workspaceAccessService: WorkspaceAccessService;

  constructor(private readonly app: FastifyInstance) {
    this.workspaceAccessService = new WorkspaceAccessService(app);
  }

  async record(
    input: {
      action: string;
      entityType: string;
      entityId?: string | null;
      actorUserId?: string | null;
      workspaceId?: string | null;
      assessmentId?: string | null;
      assessmentRunId?: string | null;
      metadata?: Record<string, unknown> | null;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
    client: AuditLogClient = this.app.prisma,
  ) {
    return client.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        actorUserId: input.actorUserId ?? null,
        workspaceId: input.workspaceId ?? null,
        assessmentId: input.assessmentId ?? null,
        assessmentRunId: input.assessmentRunId ?? null,
        metadata: toNullableJsonInput(input.metadata),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      } as never,
    });
  }

  async listRecentWorkspaceActivity(input: {
    workspaceId: string;
    userId: string;
    limit?: number;
  }) {
    await this.workspaceAccessService.requireMembership(
      input.userId,
      input.workspaceId,
    );

    const activity = await this.app.prisma.auditLog.findMany({
      where: {
        workspaceId: input.workspaceId,
      },
      orderBy: [{ createdAt: "desc" }],
      take: input.limit ?? 10,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        actorUserId: true,
        assessmentId: true,
        assessmentRunId: true,
        metadata: true,
        createdAt: true,
      },
    } as never);

    return {
      workspaceId: input.workspaceId,
      items: (activity as Array<{
        id: string;
        action: string;
        entityType: string;
        entityId: string | null;
        actorUserId: string | null;
        assessmentId: string | null;
        assessmentRunId: string | null;
        metadata: unknown;
        createdAt: Date;
      }>).map((item) => this.serializeEntry(item)),
    };
  }

  async listAssessmentActivity(input: {
    workspaceId: string;
    assessmentId: string;
    userId: string;
    limit?: number;
  }) {
    await this.workspaceAccessService.requireMembership(
      input.userId,
      input.workspaceId,
    );

    const assessment = await this.app.prisma.assessment.findFirst({
      where: {
        id: input.assessmentId,
        workspaceId: input.workspaceId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!assessment) {
      throw new AppError(404, "ASSESSMENT_NOT_FOUND", "Assessment not found.");
    }

    const activity = await this.app.prisma.auditLog.findMany({
      where: {
        workspaceId: input.workspaceId,
        assessmentId: input.assessmentId,
      },
      orderBy: [{ createdAt: "desc" }],
      take: input.limit ?? 20,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        actorUserId: true,
        assessmentId: true,
        assessmentRunId: true,
        metadata: true,
        createdAt: true,
      },
    } as never);

    return {
      workspaceId: input.workspaceId,
      items: (activity as Array<{
        id: string;
        action: string;
        entityType: string;
        entityId: string | null;
        actorUserId: string | null;
        assessmentId: string | null;
        assessmentRunId: string | null;
        metadata: unknown;
        createdAt: Date;
      }>).map((item) => this.serializeEntry(item)),
    };
  }

  serializeEntry(entry: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    actorUserId: string | null;
    assessmentId: string | null;
    assessmentRunId: string | null;
    metadata: unknown;
    createdAt: Date;
  }) {
    return {
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorUserId: entry.actorUserId,
      assessmentId: entry.assessmentId,
      assessmentRunId: entry.assessmentRunId,
      metadata: normalizeMetadata(entry.metadata),
      createdAt: entry.createdAt.toISOString(),
    };
  }
}
