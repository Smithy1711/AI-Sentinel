/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AiArchitectureType,
  AssessmentRunStatus,
  AssessmentStatus,
  IntegrationProviderType,
  RepositoryStatus,
  ReportStatus,
  RiskLevel,
} from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { describe, expect, it } from "vitest";
import type { AppError } from "../../lib/errors";
import type {
  BackgroundJob,
  BackgroundJobProcessor,
  BackgroundJobQueue,
} from "../../plugins/job-queue";
import { AssessmentRunService } from "./assessment-run.service";
import { AssessmentRunWorker } from "./assessment-run.worker";

class ManualBackgroundJobQueue implements BackgroundJobQueue {
  private readonly jobs: BackgroundJob<unknown>[] = [];
  private readonly processors = new Map<
    string,
    BackgroundJobProcessor<unknown>
  >();
  private nextId = 1;

  async enqueue<TPayload>(name: string, payload: TPayload) {
    const job: BackgroundJob<TPayload> = {
      id: `job_${this.nextId++}`,
      name,
      payload,
      queuedAt: new Date(),
    };

    this.jobs.push(job);
    return { id: job.id };
  }

  registerProcessor<TPayload>(
    name: string,
    processor: BackgroundJobProcessor<TPayload>,
  ) {
    this.processors.set(
      name,
      processor as BackgroundJobProcessor<unknown>,
    );
  }

  async drain() {
    while (this.jobs.length > 0) {
      const job = this.jobs.shift()!;
      const processor = this.processors.get(job.name);

      if (processor) {
        await processor(job);
      }
    }
  }
}

function createFakeApp() {
  let idCounter = 1;
  const nextId = () => `run_test_${idCounter++}`;
  const now = () => new Date();

  const queue = new ManualBackgroundJobQueue();
  const workspaceMembers = [
    {
      userId: "user_1",
      workspaceId: "workspace_1",
      role: "OWNER",
      deletedAt: null,
    },
  ];

  const repositories: any[] = [
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
      lastScannedAt: null,
      deletedAt: null,
    },
  ];

  const assessments: any[] = [
    {
      id: "assessment_1",
      workspaceId: "workspace_1",
      repositoryId: "repo_1",
      createdByUserId: "user_1",
      name: "Initial review",
      description: "Assess the AI-enabled API.",
      status: AssessmentStatus.DRAFT,
      aiProvider: "openai",
      aiArchitectureType: AiArchitectureType.RAG,
      stagingUrl: "https://staging.example.com",
      branch: "main",
      repository: {
        id: "repo_1",
        fullName: "acme/platform-api",
        provider: IntegrationProviderType.GITHUB,
      },
      credentialsPlaceholder: "staging-basic-auth",
      selectedScopeChecks: ["prompt-injection", "rag-data-leakage"],
      assessmentScopeSettings: {
        runtimeProbesEnabled: true,
      },
      providerMetadata: null,
      latestRunAt: null,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    },
  ];

  const assessmentRuns: any[] = [];
  const runEvents: any[] = [];
  const findings: any[] = [];
  const reports: any[] = [];

  const clone = <T>(value: T) => structuredClone(value);

  const attachRun = (run: any, include?: any) => {
    if (!include) {
      return clone(run);
    }

    const result: any = clone(run);

    if (include.assessment) {
      const assessment = assessments.find((item) => item.id === run.assessmentId)!;
      result.assessment = {
        id: assessment.id,
        name: assessment.name,
        status: assessment.status,
        description: assessment.description,
        repositoryId: assessment.repositoryId,
        branch: assessment.branch,
        stagingUrl: assessment.stagingUrl,
        aiProvider: assessment.aiProvider,
        aiArchitectureType: assessment.aiArchitectureType,
        selectedScopeChecks: clone(assessment.selectedScopeChecks),
        credentialsPlaceholder: assessment.credentialsPlaceholder,
      };
    }

    if (include.events) {
      result.events = runEvents
        .filter((event) => event.assessmentRunId === run.id)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .map((event) => clone(event));
    }

    return result;
  };

  const prisma = {
    $transaction: async (arg: any) => {
      if (typeof arg === "function") {
        return arg(prisma);
      }

      return Promise.all(arg);
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

        if (!select) {
          return clone(assessment);
        }

        const selected: Record<string, unknown> = {};
        for (const key of Object.keys(select)) {
          if (select[key]) {
            selected[key] = clone(assessment[key]);
          }
        }

        return selected;
      },
      update: async ({ where, data }: any) => {
        const assessment = assessments.find((item) => item.id === where.id);

        if (!assessment) {
          throw new Error("Assessment not found");
        }

        Object.assign(assessment, data, { updatedAt: now() });
        return clone(assessment);
      },
    },
    assessmentRun: {
      findFirst: async ({ where, select, include }: any) => {
        const run =
          assessmentRuns.find((item) => {
            if (where.id && item.id !== where.id) {
              return false;
            }

            if (where.workspaceId && item.workspaceId !== where.workspaceId) {
              return false;
            }

            if (where.assessmentId && item.assessmentId !== where.assessmentId) {
              return false;
            }

            if (where.status?.in && !where.status.in.includes(item.status)) {
              return false;
            }

            return true;
          }) ?? null;

        if (!run) {
          return null;
        }

        if (select?.id) {
          return { id: run.id };
        }

        return attachRun(run, include);
      },
      findUnique: async ({ where, select, include }: any) => {
        const run = assessmentRuns.find((item) => item.id === where.id) ?? null;

        if (!run) {
          return null;
        }

        if (select?.status) {
          return { status: run.status };
        }

        return attachRun(run, include);
      },
      create: async ({ data, include }: any) => {
        const run = {
          id: nextId(),
          workspaceId: data.workspaceId,
          assessmentId: data.assessmentId,
          triggeredByUserId: data.triggeredByUserId ?? null,
          status: data.status,
          triggerSource: data.triggerSource,
          queueJobId: data.queueJobId ?? null,
          progressPercent: data.progressPercent ?? 0,
          currentMessage: data.currentMessage ?? null,
          branch: data.branch ?? null,
          stagingUrl: data.stagingUrl ?? null,
          scopeSettings: data.scopeSettings ?? null,
          providerMetadata: data.providerMetadata ?? null,
          engineVersion: data.engineVersion ?? null,
          overallRiskLevel: data.overallRiskLevel ?? null,
          findingsCount: data.findingsCount ?? 0,
          queuedAt: data.queuedAt ?? now(),
          startedAt: data.startedAt ?? null,
          completedAt: data.completedAt ?? null,
          failedAt: data.failedAt ?? null,
          canceledAt: data.canceledAt ?? null,
          errorMessage: data.errorMessage ?? null,
          createdAt: now(),
          updatedAt: now(),
        };
        assessmentRuns.push(run);
        return attachRun(run, include);
      },
      update: async ({ where, data, include }: any) => {
        const run = assessmentRuns.find((item) => item.id === where.id);

        if (!run) {
          throw new Error("Run not found");
        }

        Object.assign(run, data, { updatedAt: now() });
        return attachRun(run, include);
      },
    },
    assessmentRunEvent: {
      create: async ({ data }: any) => {
        const event = {
          id: nextId(),
          assessmentRunId: data.assessmentRunId,
          status: data.status,
          progressPercent: data.progressPercent ?? null,
          message: data.message,
          metadata: data.metadata ?? null,
          createdAt: now(),
        };
        runEvents.push(event);
        return clone(event);
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const auditLog = {
          id: nextId(),
          ...data,
          createdAt: now(),
        };
        return clone(auditLog);
      },
    },
    finding: {
      findMany: async ({ where }: any) =>
        findings.filter(
          (item) =>
            item.workspaceId === where.workspaceId &&
            item.assessmentRunId === where.assessmentRunId &&
            item.deletedAt === where.deletedAt,
        ),
      create: async ({ data }: any) => {
        const finding = {
          id: nextId(),
          ...data,
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
        };
        findings.push(finding);
        return clone(finding);
      },
    },
    report: {
      findFirst: async ({ where }: any) => {
        const report =
          reports
            .filter(
              (item) =>
                item.assessmentId === where.assessmentId &&
                item.deletedAt === where.deletedAt,
            )
            .sort((left, right) => right.version - left.version)[0] ?? null;

        return report ? { version: report.version } : null;
      },
      create: async ({ data }: any) => {
        const report = {
          id: nextId(),
          ...data,
          status: data.status ?? ReportStatus.DRAFT,
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
        };
        reports.push(report);
        return clone(report);
      },
    },
    repository: {
      update: async ({ where, data }: any) => {
        const repository = repositories.find((item) => item.id === where.id);

        if (!repository) {
          throw new Error("Repository not found");
        }

        Object.assign(repository, data);
        return clone(repository);
      },
    },
  };

  const app = {
    prisma,
    jobQueue: queue,
  } as unknown as FastifyInstance;

  return {
    app,
    queue,
    assessmentRuns,
    findings,
    reports,
  };
}

describe("AssessmentRunService", () => {
  it("launches a run and completes the placeholder execution pipeline", async () => {
    const { app, queue, findings, reports } = createFakeApp();
    const service = new AssessmentRunService(app);
    new AssessmentRunWorker(app).register();

    const launched = await service.launchAssessment({
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      userId: "user_1",
    });

    expect(launched.status).toBe(AssessmentRunStatus.QUEUED);
    expect(launched.queueJobId).toBe("job_1");

    await queue.drain();

    const detail = await service.getAssessmentRun({
      workspaceId: "workspace_1",
      assessmentRunId: launched.id,
      userId: "user_1",
    });

    const serialized = service.serializeRun(detail);
    expect(serialized.status).toBe("COMPLETED");
    expect(serialized.findingsCount).toBeGreaterThan(0);
    expect(serialized.overallRiskLevel).toBe(RiskLevel.HIGH);
    expect(
      serialized.timeline.map((event: { status: string }) => event.status),
    ).toEqual([
      "QUEUED",
      "PREPARING",
      "SCANNING",
      "SCANNING",
      "SCANNING",
      "SCANNING",
      "NORMALIZING",
      "NORMALIZING",
      "REPORT_GENERATION",
      "COMPLETED",
    ]);
    expect(findings.length).toBeGreaterThan(0);
    expect(reports).toHaveLength(1);
  });

  it("prevents launching a second active run for the same assessment", async () => {
    const { app } = createFakeApp();
    const service = new AssessmentRunService(app);

    await service.launchAssessment({
      workspaceId: "workspace_1",
      assessmentId: "assessment_1",
      userId: "user_1",
    });

    await expect(
      service.launchAssessment({
        workspaceId: "workspace_1",
        assessmentId: "assessment_1",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "ASSESSMENT_ALREADY_RUNNING",
    } satisfies Partial<AppError>);
  });
});
