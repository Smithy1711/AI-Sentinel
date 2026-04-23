/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AssessmentRunStatus,
  AssessmentStatus,
  FindingSeverity,
  FindingStatus,
  RepositoryStatus,
  ReportStatus,
  RiskLevel,
} from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { describe, expect, it } from "vitest";
import { DashboardService } from "./dashboard.service";

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
      status: AssessmentStatus.DRAFT,
      deletedAt: null,
    },
    {
      id: "assessment_2",
      workspaceId: "workspace_1",
      status: AssessmentStatus.RUNNING,
      deletedAt: null,
    },
    {
      id: "assessment_3",
      workspaceId: "workspace_1",
      status: AssessmentStatus.COMPLETED,
      deletedAt: null,
    },
  ];

  const repositories = [
    {
      id: "repo_1",
      workspaceId: "workspace_1",
      status: RepositoryStatus.CONNECTED,
      deletedAt: null,
    },
    {
      id: "repo_2",
      workspaceId: "workspace_1",
      status: RepositoryStatus.CONNECTED,
      deletedAt: null,
    },
    {
      id: "repo_3",
      workspaceId: "workspace_1",
      status: RepositoryStatus.ERROR,
      deletedAt: null,
    },
  ];

  const findings = [
    {
      id: "finding_1",
      workspaceId: "workspace_1",
      severity: FindingSeverity.CRITICAL,
      status: FindingStatus.OPEN,
      deletedAt: null,
    },
    {
      id: "finding_2",
      workspaceId: "workspace_1",
      severity: FindingSeverity.HIGH,
      status: FindingStatus.OPEN,
      deletedAt: null,
    },
    {
      id: "finding_3",
      workspaceId: "workspace_1",
      severity: FindingSeverity.MEDIUM,
      status: FindingStatus.FIXED,
      deletedAt: null,
    },
  ];

  const reports = [
    {
      id: "report_1",
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      assessmentRunId: "run_1",
      title: "First report",
      version: 1,
      status: ReportStatus.GENERATED,
      riskLevel: RiskLevel.HIGH,
      createdAt: new Date("2026-04-17T10:00:00.000Z"),
      deletedAt: null,
    },
    {
      id: "report_2",
      workspaceId: "workspace_1",
      assessmentId: "assessment_3",
      assessmentRunId: "run_2",
      title: "Second report",
      version: 2,
      status: ReportStatus.PUBLISHED,
      riskLevel: RiskLevel.MEDIUM,
      createdAt: new Date("2026-04-17T11:00:00.000Z"),
      deletedAt: null,
    },
  ];

  const activity = [
    {
      id: "audit_1",
      workspaceId: "workspace_1",
      action: "assessment.run.launched",
      entityType: "assessment_run",
      entityId: "run_1",
      actorUserId: "user_1",
      metadata: { assessmentId: "assessment_1" },
      createdAt: new Date("2026-04-17T12:00:00.000Z"),
    },
    {
      id: "audit_2",
      workspaceId: "workspace_1",
      action: "report.generated",
      entityType: "report",
      entityId: "report_2",
      actorUserId: "user_1",
      metadata: { assessmentId: "assessment_3" },
      createdAt: new Date("2026-04-17T12:05:00.000Z"),
    },
  ];

  const runs = [
    {
      id: "run_1",
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      status: AssessmentRunStatus.SCANNING,
      progressPercent: 55,
      findingsCount: 0,
      overallRiskLevel: null,
      updatedAt: new Date("2026-04-17T12:06:00.000Z"),
      assessment: {
        name: "Assessment One",
      },
    },
    {
      id: "run_2",
      workspaceId: "workspace_1",
      assessmentId: "assessment_3",
      status: AssessmentRunStatus.COMPLETED,
      progressPercent: 100,
      findingsCount: 3,
      overallRiskLevel: RiskLevel.HIGH,
      updatedAt: new Date("2026-04-17T12:04:00.000Z"),
      assessment: {
        name: "Assessment Three",
      },
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
      count: async ({ where }: any) =>
        assessments.filter(
          (item) =>
            item.workspaceId === where.workspaceId &&
            item.deletedAt === where.deletedAt &&
            where.status.in.includes(item.status),
        ).length,
      groupBy: async ({ where }: any) => {
        const counts = new Map<AssessmentStatus, number>();

        for (const assessment of assessments) {
          if (
            assessment.workspaceId === where.workspaceId &&
            assessment.deletedAt === where.deletedAt
          ) {
            counts.set(
              assessment.status,
              (counts.get(assessment.status) ?? 0) + 1,
            );
          }
        }

        return Array.from(counts.entries()).map(([status, count]) => ({
          status,
          _count: { _all: count },
        }));
      },
    },
    repository: {
      count: async ({ where }: any) =>
        repositories.filter(
          (item) =>
            item.workspaceId === where.workspaceId &&
            item.deletedAt === where.deletedAt &&
            item.status === where.status,
        ).length,
    },
    finding: {
      count: async ({ where }: any) =>
        findings.filter((item) => {
          if (item.workspaceId !== where.workspaceId) {
            return false;
          }
          if (item.deletedAt !== where.deletedAt) {
            return false;
          }
          if (!where.severity.in.includes(item.severity)) {
            return false;
          }
          if (where.status.notIn.includes(item.status)) {
            return false;
          }
          return true;
        }).length,
      groupBy: async ({ where }: any) => {
        const counts = new Map<FindingSeverity, number>();

        for (const finding of findings) {
          if (
            finding.workspaceId === where.workspaceId &&
            finding.deletedAt === where.deletedAt
          ) {
            counts.set(
              finding.severity,
              (counts.get(finding.severity) ?? 0) + 1,
            );
          }
        }

        return Array.from(counts.entries()).map(([severity, count]) => ({
          severity,
          _count: { _all: count },
        }));
      },
    },
    report: {
      findMany: async ({ where, take }: any) =>
        reports
          .filter(
            (item) =>
              item.workspaceId === where.workspaceId &&
              item.deletedAt === where.deletedAt,
          )
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(0, take),
    },
    auditLog: {
      findMany: async ({ where, take }: any) =>
        activity
          .filter((item) => item.workspaceId === where.workspaceId)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(0, take),
    },
    assessmentRun: {
      findMany: async ({ where, take }: any) =>
        runs
          .filter((item) => item.workspaceId === where.workspaceId)
          .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
          .slice(0, take),
    },
  };

  return {
    app: {
      prisma,
    } as unknown as FastifyInstance,
  };
}

describe("DashboardService", () => {
  it("returns active workspace overview cards and charts", async () => {
    const { app } = createFakeApp();
    const service = new DashboardService(app);

    const overview = await service.getOverview("user_1");

    expect(overview.workspaceId).toBe("workspace_1");
    expect(overview.cards).toEqual({
      activeAssessmentsCount: 2,
      connectedReposCount: 2,
      highSeverityFindingsCount: 2,
    });
    expect(overview.charts.findingsBySeverity).toEqual(
      expect.arrayContaining([
        { severity: "CRITICAL", count: 1 },
        { severity: "HIGH", count: 1 },
        { severity: "MEDIUM", count: 1 },
      ]),
    );
    expect(overview.charts.assessmentsByStatus).toEqual(
      expect.arrayContaining([
        { status: "DRAFT", count: 1 },
        { status: "RUNNING", count: 1 },
        { status: "COMPLETED", count: 1 },
      ]),
    );
  });

  it("returns recent reports, activity, and latest runs for the active workspace", async () => {
    const { app } = createFakeApp();
    const service = new DashboardService(app);

    const reports = await service.getRecentReports("user_1");
    const activity = await service.getRecentActivity("user_1");
    const latestRuns = await service.getLatestRuns("user_1");

    expect(reports.items[0]?.id).toBe("report_2");
    expect(activity.items[0]).toMatchObject({
      id: "audit_2",
      action: "report.generated",
    });
    expect(latestRuns.items[0]).toMatchObject({
      id: "run_1",
      assessmentName: "Assessment One",
      status: "SCANNING",
      progressPercent: 55,
    });
  });
});
