/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AiArchitectureType,
  AssessmentStatus,
  IntegrationProviderType,
  RepositoryStatus,
} from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { describe, expect, it } from "vitest";
import { AssessmentService } from "./assessment.service";

function createFakeApp() {
  let idCounter = 1;
  const nextId = () => `assessment_test_${idCounter++}`;
  const now = () => new Date();

  const workspaceMembers = [
    {
      userId: "user_1",
      workspaceId: "workspace_1",
      role: "OWNER",
      deletedAt: null,
    },
  ];

  const repositories = [
    {
      id: "repo_1",
      workspaceId: "workspace_1",
      provider: IntegrationProviderType.GITHUB,
      owner: "acme",
      name: "platform-api",
      fullName: "acme/platform-api",
      url: "https://github.com/acme/platform-api",
      defaultBranch: "main",
      status: RepositoryStatus.CONNECTED,
      deletedAt: null,
    },
  ];

  const assessments: any[] = [];
  const auditLogs: any[] = [];

  const attachRepository = (assessment: any) => ({
    ...assessment,
    repository:
      repositories.find((repository) => repository.id === assessment.repositoryId) ??
      null,
  });

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
    repository: {
      findFirst: async ({ where }: any) =>
        repositories.find(
          (item) =>
            item.id === where.id &&
            item.workspaceId === where.workspaceId &&
            item.deletedAt === where.deletedAt,
        ) ?? null,
    },
    assessment: {
      create: async ({ data }: any) => {
        const assessment = {
          id: nextId(),
          workspaceId: data.workspaceId,
          repositoryId: data.repositoryId ?? null,
          createdByUserId: data.createdByUserId ?? null,
          name: data.name,
          description: data.description ?? null,
          status: data.status ?? AssessmentStatus.DRAFT,
          aiProvider: data.aiProvider ?? null,
          aiArchitectureType: data.aiArchitectureType ?? null,
          stagingUrl: data.stagingUrl ?? null,
          branch: data.branch ?? null,
          credentialsPlaceholder: data.credentialsPlaceholder ?? null,
          selectedScopeChecks: data.selectedScopeChecks ?? [],
          assessmentScopeSettings: data.assessmentScopeSettings ?? null,
          providerMetadata: data.providerMetadata ?? null,
          latestRunAt: null,
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
        };
        assessments.push(assessment);
        return attachRepository(assessment);
      },
      findMany: async ({ where }: any) =>
        assessments
          .filter(
            (item) =>
              item.workspaceId === where.workspaceId &&
              item.deletedAt === where.deletedAt,
          )
          .map(attachRepository),
      findFirst: async ({ where }: any) => {
        const assessment =
          assessments.find(
            (item) =>
              item.id === where.id &&
              item.workspaceId === where.workspaceId &&
              item.deletedAt === where.deletedAt,
          ) ?? null;

        return assessment ? attachRepository(assessment) : null;
      },
      update: async ({ where, data }: any) => {
        const assessment = assessments.find((item) => item.id === where.id);

        if (!assessment) {
          throw new Error("Assessment not found");
        }

        Object.assign(assessment, data, { updatedAt: now() });
        return attachRepository(assessment);
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const record = {
          id: nextId(),
          ...data,
          createdAt: now(),
        };
        auditLogs.push(record);
        return record;
      },
    },
  };

  return {
    app: {
      prisma,
    } as FastifyInstance,
    assessments,
    auditLogs,
  };
}

describe("AssessmentService", () => {
  it("creates a draft assessment with repository-backed defaults", async () => {
    const { app, assessments, auditLogs } = createFakeApp();
    const service = new AssessmentService(app);

    const created = await service.createAssessment({
      workspaceId: "workspace_1",
      userId: "user_1",
      name: "Production API review",
      repositoryId: "repo_1",
      stagingUrl: "https://staging.example.com",
      credentialsPlaceholder: "staging-basic-auth",
      aiProvider: "openai",
      aiArchitectureType: AiArchitectureType.RAG,
      selectedScopeChecks: ["prompt-injection", "rag-data-leakage"],
      scopeSettings: {
        runtimeProbesEnabled: true,
      },
    });

    expect(created.status).toBe(AssessmentStatus.DRAFT);
    expect(created.branch).toBe("main");
    expect(assessments).toHaveLength(1);
    expect(auditLogs).toHaveLength(1);

    const serialized = service.serializeAssessment(created);
    expect(serialized.configuration.repositoryId).toBe("repo_1");
    expect(serialized.configuration.selectedScopeChecks).toEqual([
      "prompt-injection",
      "rag-data-leakage",
    ]);
    expect(serialized.repository?.fullName).toBe("acme/platform-api");
  });

  it("lists and retrieves assessments in a frontend-friendly shape", async () => {
    const { app } = createFakeApp();
    const service = new AssessmentService(app);

    const created = await service.createAssessment({
      workspaceId: "workspace_1",
      userId: "user_1",
      name: "Agent runtime review",
      description: "Assess agent permissions and unsafe tool use.",
      repositoryId: "repo_1",
      branch: "release/2026-04",
      aiProvider: "anthropic",
      aiArchitectureType: AiArchitectureType.AGENT,
      selectedScopeChecks: ["tool-permissions", "unsafe-tool-invocation"],
    });

    const listed = await service.listAssessments({
      workspaceId: "workspace_1",
      userId: "user_1",
    });
    const detail = await service.getAssessment({
      workspaceId: "workspace_1",
      assessmentId: created.id,
      userId: "user_1",
    });

    expect(listed).toHaveLength(1);
    expect(detail.id).toBe(created.id);
    expect(service.serializeAssessment(detail)).toMatchObject({
      name: "Agent runtime review",
      status: "DRAFT",
      configuration: {
        branch: "release/2026-04",
        aiProvider: "anthropic",
        aiArchitectureType: "AGENT",
        selectedScopeChecks: ["tool-permissions", "unsafe-tool-invocation"],
      },
    });
  });
});
