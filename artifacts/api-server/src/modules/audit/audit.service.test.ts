/* eslint-disable @typescript-eslint/no-explicit-any */

import type { FastifyInstance } from "fastify";
import { describe, expect, it } from "vitest";
import { AuditLogService } from "./audit.service";

function createFakeApp() {
  const users = [
    {
      id: "user_1",
      activeWorkspaceId: "workspace_1",
    },
  ];

  const workspaceMembers = [
    {
      userId: "user_1",
      workspaceId: "workspace_1",
      role: "OWNER",
      deletedAt: null,
    },
  ];

  const assessments = [
    {
      id: "assessment_1",
      workspaceId: "workspace_1",
      deletedAt: null,
    },
  ];

  const auditLogs: any[] = [
    {
      id: "audit_1",
      workspaceId: "workspace_1",
      actorUserId: "user_1",
      assessmentId: "assessment_1",
      assessmentRunId: "run_1",
      action: "assessment.run.launched",
      entityType: "assessment_run",
      entityId: "run_1",
      metadata: { triggerSource: "MANUAL" },
      createdAt: new Date("2026-04-17T10:00:00.000Z"),
    },
    {
      id: "audit_2",
      workspaceId: "workspace_1",
      actorUserId: "user_1",
      assessmentId: "assessment_1",
      assessmentRunId: "run_1",
      action: "report.generated",
      entityType: "report",
      entityId: "report_1",
      metadata: { version: 1 },
      createdAt: new Date("2026-04-17T10:05:00.000Z"),
    },
    {
      id: "audit_3",
      workspaceId: "workspace_1",
      actorUserId: "user_1",
      assessmentId: null,
      assessmentRunId: null,
      action: "repository.created",
      entityType: "repository",
      entityId: "repo_1",
      metadata: { fullName: "acme/platform-api" },
      createdAt: new Date("2026-04-17T10:10:00.000Z"),
    },
  ];

  const prisma = {
    user: {
      findUnique: async ({ where }: any) =>
        users.find((item) => item.id === where.id) ?? null,
    },
    workspaceMember: {
      findFirst: async ({ where }: any) =>
        workspaceMembers.find(
          (item) =>
            item.userId === where.userId &&
            item.workspaceId === where.workspaceId &&
            item.deletedAt === where.deletedAt,
        ) ?? null,
    },
    assessment: {
      findFirst: async ({ where, select }: any) => {
        const assessment =
          assessments.find(
            (item) =>
              item.id === where.id &&
              item.workspaceId === where.workspaceId &&
              item.deletedAt === where.deletedAt,
          ) ?? null;

        if (!assessment) {
          return null;
        }

        return select?.id ? { id: assessment.id } : assessment;
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const record = {
          id: `audit_${auditLogs.length + 1}`,
          ...data,
          createdAt: new Date("2026-04-17T10:15:00.000Z"),
        };
        auditLogs.push(record);
        return record;
      },
      findMany: async ({ where, take }: any) =>
        auditLogs
          .filter((item) => {
            if (where.workspaceId && item.workspaceId !== where.workspaceId) {
              return false;
            }

            if (
              where.assessmentId !== undefined &&
              item.assessmentId !== where.assessmentId
            ) {
              return false;
            }

            return true;
          })
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(0, take),
    },
  };

  return {
    app: {
      prisma,
    } as unknown as FastifyInstance,
    auditLogs,
  };
}

describe("AuditLogService", () => {
  it("records a reusable audit event with actor, workspace, and entity metadata", async () => {
    const { app, auditLogs } = createFakeApp();
    const service = new AuditLogService(app);

    await service.record({
      workspaceId: "workspace_1",
      actorUserId: "user_1",
      assessmentId: "assessment_1",
      assessmentRunId: "run_2",
      action: "assessment.run.completed",
      entityType: "assessment_run",
      entityId: "run_2",
      metadata: {
        findingsCount: 3,
      },
    });

    expect(auditLogs.at(-1)).toMatchObject({
      action: "assessment.run.completed",
      entityType: "assessment_run",
      entityId: "run_2",
      workspaceId: "workspace_1",
      actorUserId: "user_1",
      assessmentId: "assessment_1",
      assessmentRunId: "run_2",
    });
  });

  it("lists recent workspace and assessment activity feeds", async () => {
    const { app } = createFakeApp();
    const service = new AuditLogService(app);

    const workspaceFeed = await service.listRecentWorkspaceActivity({
      workspaceId: "workspace_1",
      userId: "user_1",
      limit: 10,
    });

    const assessmentFeed = await service.listAssessmentActivity({
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      userId: "user_1",
      limit: 10,
    });

    expect(workspaceFeed.items[0]).toMatchObject({
      id: "audit_3",
      action: "repository.created",
      assessmentId: null,
    });
    expect(assessmentFeed.items).toHaveLength(2);
    expect(assessmentFeed.items[0]).toMatchObject({
      id: "audit_2",
      action: "report.generated",
      assessmentId: "assessment_1",
      assessmentRunId: "run_1",
    });
  });
});
