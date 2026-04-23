/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ConfidenceLevel,
  FindingCategory,
  FindingSeverity,
  FindingStatus,
  ReportStatus,
  RiskLevel,
} from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { describe, expect, it } from "vitest";
import { ReportService } from "./report.service";

function createFakeApp() {
  let idCounter = 1;
  const nextId = () => `report_test_${idCounter++}`;
  const now = () => new Date();

  const workspaceMembers = [
    {
      userId: "user_1",
      workspaceId: "workspace_1",
      role: "OWNER",
      deletedAt: null,
    },
  ];

  const assessment = {
    id: "assessment_1",
    workspaceId: "workspace_1",
    name: "Production AI Review",
    status: "COMPLETED",
    aiProvider: "openai",
    aiArchitectureType: "RAG",
    branch: "main",
    stagingUrl: "https://staging.example.com",
    selectedScopeChecks: ["prompt_injection", "rag_data_exposure"],
    deletedAt: null,
    repository: {
      id: "repo_1",
      fullName: "acme/platform-api",
      provider: "GITHUB",
    },
  };

  const runs = [
    {
      id: "run_1",
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      overallRiskLevel: RiskLevel.HIGH,
      branch: "main",
      stagingUrl: "https://staging.example.com",
      status: "COMPLETED",
      completedAt: new Date("2026-04-17T10:00:00.000Z"),
      createdAt: new Date("2026-04-17T09:00:00.000Z"),
      findingsCount: 3,
    },
  ];

  const findings = [
    {
      id: "finding_1",
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      assessmentRunId: "run_1",
      title: "Prompt injection exposure",
      description: "User content reaches trusted prompt instructions.",
      severity: FindingSeverity.HIGH,
      riskLevel: RiskLevel.HIGH,
      confidence: ConfidenceLevel.HIGH,
      status: FindingStatus.OPEN,
      category: FindingCategory.PROMPT_INJECTION,
      affectedComponent: "prompt-layer",
      affectedFilePath: "src/ai/prompt.ts",
      affectedEndpoint: null,
      evidenceSummary: "User input appears inside trusted instructions.",
      recommendedRemediation: "Separate trusted and untrusted prompt segments.",
      metadata: { source: "test" },
      createdAt: new Date("2026-04-17T09:10:00.000Z"),
      updatedAt: new Date("2026-04-17T09:10:00.000Z"),
      deletedAt: null,
    },
    {
      id: "finding_2",
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      assessmentRunId: "run_1",
      title: "RAG exposure risk",
      description: "Retriever lacks explicit tenant filtering.",
      severity: FindingSeverity.MEDIUM,
      riskLevel: RiskLevel.MEDIUM,
      confidence: ConfidenceLevel.MEDIUM,
      status: FindingStatus.OPEN,
      category: FindingCategory.RAG_DATA_EXPOSURE,
      affectedComponent: "retrieval-layer",
      affectedFilePath: "src/rag/retriever.ts",
      affectedEndpoint: null,
      evidenceSummary: "Retrieved content is not tenant scoped.",
      recommendedRemediation: "Apply tenant filters before retrieval.",
      metadata: { source: "test" },
      createdAt: new Date("2026-04-17T09:11:00.000Z"),
      updatedAt: new Date("2026-04-17T09:11:00.000Z"),
      deletedAt: null,
    },
    {
      id: "finding_3",
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      assessmentRunId: "run_1",
      title: "Low priority logging issue",
      description: "Trace output retains extra context.",
      severity: FindingSeverity.LOW,
      riskLevel: RiskLevel.LOW,
      confidence: ConfidenceLevel.LOW,
      status: FindingStatus.FIXED,
      category: FindingCategory.INSECURE_LOGGING,
      affectedComponent: "logging-layer",
      affectedFilePath: null,
      affectedEndpoint: "/api/v1/ai/complete",
      evidenceSummary: "Logging previously retained prompt fragments.",
      recommendedRemediation: "Retain only redacted fields in logs.",
      metadata: { source: "test" },
      createdAt: new Date("2026-04-17T09:12:00.000Z"),
      updatedAt: new Date("2026-04-17T09:12:00.000Z"),
      deletedAt: null,
    },
  ];

  const reports: any[] = [];
  const auditLogs: any[] = [];

  const prisma = {
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
        if (
          assessment.id !== where.id ||
          assessment.workspaceId !== where.workspaceId ||
          assessment.deletedAt !== where.deletedAt
        ) {
          return null;
        }

        if (!select) {
          return assessment;
        }

        return {
          id: assessment.id,
          workspaceId: assessment.workspaceId,
          name: assessment.name,
          status: assessment.status,
          aiProvider: assessment.aiProvider,
          aiArchitectureType: assessment.aiArchitectureType,
          branch: assessment.branch,
          stagingUrl: assessment.stagingUrl,
          selectedScopeChecks: assessment.selectedScopeChecks,
          repository: assessment.repository,
        };
      },
    },
    assessmentRun: {
      findFirst: async ({ where, orderBy, select }: any) => {
        const filtered = runs.filter((run) => {
          if (run.workspaceId !== where.workspaceId) {
            return false;
          }

          if (run.assessmentId !== where.assessmentId) {
            return false;
          }

          if (where.id && run.id !== where.id) {
            return false;
          }

          if (where.status && run.status !== where.status) {
            return false;
          }

          return true;
        });

        const selectedRun =
          filtered.sort((left, right) => {
            if (orderBy?.[0]?.completedAt === "desc") {
              return (
                (right.completedAt?.getTime() ?? 0) -
                (left.completedAt?.getTime() ?? 0)
              );
            }

            return 0;
          })[0] ?? null;

        if (!selectedRun) {
          return null;
        }

        if (!select) {
          return selectedRun;
        }

        return {
          id: selectedRun.id,
          workspaceId: selectedRun.workspaceId,
          assessmentId: selectedRun.assessmentId,
          overallRiskLevel: selectedRun.overallRiskLevel,
          branch: selectedRun.branch,
          stagingUrl: selectedRun.stagingUrl,
          status: selectedRun.status,
          completedAt: selectedRun.completedAt,
          createdAt: selectedRun.createdAt,
          findingsCount: selectedRun.findingsCount,
        };
      },
    },
    finding: {
      findMany: async ({ where }: any) =>
        findings.filter(
          (finding) =>
            finding.workspaceId === where.workspaceId &&
            finding.assessmentRunId === where.assessmentRunId &&
            finding.deletedAt === where.deletedAt,
        ),
    },
    report: {
      findFirst: async ({ where, orderBy }: any) => {
        const filtered = reports.filter(
          (report) =>
            report.workspaceId === where.workspaceId &&
            (where.assessmentId ? report.assessmentId === where.assessmentId : true) &&
            (where.id ? report.id === where.id : true) &&
            report.deletedAt === where.deletedAt,
        );

        if (filtered.length === 0) {
          return null;
        }

        return filtered.sort((left, right) => {
          if (orderBy?.[0]?.version === "desc") {
            return right.version - left.version;
          }

          return right.createdAt.getTime() - left.createdAt.getTime();
        })[0];
      },
      create: async ({ data }: any) => {
        const report = {
          id: nextId(),
          workspaceId: data.workspaceId,
          assessmentId: data.assessmentId,
          assessmentRunId: data.assessmentRunId,
          generatedByUserId: data.generatedByUserId ?? null,
          status: data.status ?? ReportStatus.GENERATED,
          version: data.version,
          riskLevel: data.riskLevel ?? null,
          title: data.title,
          executiveSummary: data.executiveSummary ?? null,
          summaryJson: data.summaryJson ?? null,
          remediationRoadmap: data.remediationRoadmap ?? null,
          publishedAt: null,
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
        };
        reports.push(report);
        return report;
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        auditLogs.push(data);
        return data;
      },
    },
  };

  return {
    app: {
      prisma,
    } as unknown as FastifyInstance,
    reports,
    auditLogs,
  };
}

describe("ReportService", () => {
  it("generates a deterministic structured report from the latest completed run", async () => {
    const { app, reports, auditLogs } = createFakeApp();
    const service = new ReportService(app);

    const { report } = await service.generateLatestReport({
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      userId: "user_1",
    });

    expect(reports).toHaveLength(1);
    expect(report.version).toBe(1);

    const serialized = service.serializeReport(report);
    expect(serialized.overallRiskRating).toBe("HIGH");
    expect(serialized.content.scopeSummary.assessmentRunId).toBe("run_1");
    expect(serialized.content.keyFindings).toHaveLength(3);
    expect(serialized.content.mappedCategories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "prompt_injection",
          count: 1,
        }),
      ]),
    );
    expect(serialized.content.remediationRoadmap.fixNow).toHaveLength(1);
    expect(serialized.content.remediationRoadmap.next).toHaveLength(1);
    expect(serialized.content.remediationRoadmap.later).toHaveLength(0);
    expect(auditLogs).toHaveLength(1);
  });

  it("returns the latest stored report for an assessment", async () => {
    const { app, reports } = createFakeApp();
    const service = new ReportService(app);

    const first = await service.generateLatestReport({
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      userId: "user_1",
    });

    reports.push({
      ...first.report,
      id: "report_latest",
      version: 2,
      createdAt: new Date("2026-04-17T12:00:00.000Z"),
      updatedAt: new Date("2026-04-17T12:00:00.000Z"),
    });

    const latest = await service.getLatestReport({
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      userId: "user_1",
    });

    expect(latest.id).toBe("report_latest");

    const byId = await service.getReportById({
      workspaceId: "workspace_1",
      reportId: first.report.id,
      userId: "user_1",
    });

    expect(byId.id).toBe(first.report.id);
  });
});
