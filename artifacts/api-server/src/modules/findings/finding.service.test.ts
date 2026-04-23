/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ConfidenceLevel,
  FindingCategory,
  FindingSeverity,
  FindingStatus,
} from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { describe, expect, it } from "vitest";
import { FindingService } from "./finding.service";

function createFakeApp() {
  const now = () => new Date();

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

  const assessmentRuns = [
    {
      id: "run_1",
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
    },
    {
      id: "run_2",
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
    },
  ];

  const findings: any[] = [
    {
      id: "finding_1",
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      assessmentRunId: "run_1",
      title: "Prompt injection exposure",
      description: "Prompt input is concatenated into trusted system context.",
      severity: FindingSeverity.HIGH,
      category: FindingCategory.PROMPT_INJECTION,
      confidence: ConfidenceLevel.HIGH,
      status: FindingStatus.OPEN,
      affectedComponent: "prompt-layer",
      affectedFilePath: "src/ai/prompt.ts",
      affectedEndpoint: null,
      evidenceSummary: "User input appears in the trusted prompt envelope.",
      recommendedRemediation: "Separate trusted and untrusted prompt segments.",
      metadata: { demo: true },
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    },
    {
      id: "finding_2",
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      assessmentRunId: "run_1",
      title: "RAG data exposure risk",
      description: "Retrieved documents may cross tenant boundaries.",
      severity: FindingSeverity.MEDIUM,
      category: FindingCategory.RAG_DATA_EXPOSURE,
      confidence: ConfidenceLevel.MEDIUM,
      status: FindingStatus.OPEN,
      affectedComponent: "retrieval-layer",
      affectedFilePath: "src/rag/retriever.ts",
      affectedEndpoint: null,
      evidenceSummary: "Retriever lacks an explicit tenant filter.",
      recommendedRemediation: "Apply tenant scoping before retrieval.",
      metadata: { demo: true },
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    },
    {
      id: "finding_3",
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      assessmentRunId: "run_2",
      title: "Secrets exposure in AI integration",
      description: "API token may be logged in connector traces.",
      severity: FindingSeverity.CRITICAL,
      category: FindingCategory.SECRETS_EXPOSURE,
      confidence: ConfidenceLevel.LOW,
      status: FindingStatus.ACCEPTED_RISK,
      affectedComponent: "integration-gateway",
      affectedFilePath: null,
      affectedEndpoint: "/api/v1/ai/complete",
      evidenceSummary: "Sensitive token material appears in debug traces.",
      recommendedRemediation: "Redact secrets before logging and tracing.",
      metadata: { demo: true },
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    },
  ];

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
    assessmentRun: {
      findFirst: async ({ where, select }: any) => {
        const run =
          assessmentRuns.find(
            (item) =>
              item.id === where.id && item.workspaceId === where.workspaceId,
          ) ?? null;

        if (!run) {
          return null;
        }

        return select?.id ? { id: run.id } : run;
      },
    },
    finding: {
      findMany: async ({ where }: any) =>
        findings.filter((item) => {
          if (item.workspaceId !== where.workspaceId) {
            return false;
          }

          if (where.assessmentId && item.assessmentId !== where.assessmentId) {
            return false;
          }

          if (
            where.assessmentRunId &&
            item.assessmentRunId !== where.assessmentRunId
          ) {
            return false;
          }

          if (item.deletedAt !== where.deletedAt) {
            return false;
          }

          if (where.severity?.in && !where.severity.in.includes(item.severity)) {
            return false;
          }

          if (where.category?.in && !where.category.in.includes(item.category)) {
            return false;
          }

          if (where.status?.in && !where.status.in.includes(item.status)) {
            return false;
          }

          if (
            where.confidence?.in &&
            !where.confidence.in.includes(item.confidence)
          ) {
            return false;
          }

          return true;
        }),
      findFirst: async ({ where }: any) =>
        findings.find(
          (item) =>
            item.id === where.id &&
            item.workspaceId === where.workspaceId &&
            item.deletedAt === where.deletedAt,
        ) ?? null,
      update: async ({ where, data }: any) => {
        const finding = findings.find((item) => item.id === where.id);

        if (!finding) {
          throw new Error("Finding not found");
        }

        Object.assign(finding, data, { updatedAt: now() });
        return finding;
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
    findings,
    auditLogs,
  };
}

describe("FindingService", () => {
  it("filters findings for an assessment", async () => {
    const { app } = createFakeApp();
    const service = new FindingService(app);

    const result = await service.listForAssessment({
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      userId: "user_1",
      filters: {
        severity: [FindingSeverity.HIGH, FindingSeverity.CRITICAL],
        category: ["prompt_injection", "secrets_exposure"],
        status: [FindingStatus.OPEN],
      },
    });

    expect(result).toHaveLength(1);
    expect(service.serializeFinding(result[0]!).category).toBe("prompt_injection");
  });

  it("aggregates findings by severity and category for a run", async () => {
    const { app } = createFakeApp();
    const service = new FindingService(app);

    const aggregate = await service.aggregateForRun({
      workspaceId: "workspace_1",
      assessmentRunId: "run_1",
      userId: "user_1",
      filters: {
        status: [FindingStatus.OPEN],
      },
    });

    expect(aggregate.totalCount).toBe(2);
    expect(aggregate.bySeverity).toEqual(
      expect.arrayContaining([
        { severity: "HIGH", count: 1 },
        { severity: "MEDIUM", count: 1 },
      ]),
    );
    expect(aggregate.byCategory).toEqual(
      expect.arrayContaining([
        { category: "prompt_injection", count: 1 },
        { category: "rag_data_exposure", count: 1 },
      ]),
    );
  });
});
