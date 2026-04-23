import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AssessmentRunStatus,
  AssessmentRunTrigger,
  AssessmentStatus,
  ConfidenceLevel,
  FindingCategory,
  FindingSeverity,
  FindingStatus,
  IntegrationProviderType,
  PrismaClient,
  RepositoryStatus,
  RiskLevel,
  WorkspaceInvitationStatus,
  WorkspaceMemberRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.log("Skipping seed in production.");
    return;
  }

  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/ai_exposure_review?schema=public";

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
    }),
  });

  const email =
    process.env.DEMO_USER_EMAIL ?? "demo@ai-exposure-review.local";
  const password =
    process.env.DEMO_USER_PASSWORD ?? "DemoPassword123!";
  const workspaceName =
    process.env.DEMO_WORKSPACE_NAME ?? "Demo Workspace";
  const workspaceSlug =
    process.env.DEMO_WORKSPACE_SLUG ?? "demo-workspace";
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      displayName: "Demo User",
      passwordHash,
      isActive: true,
      deletedAt: null,
    },
    create: {
      email,
      displayName: "Demo User",
      passwordHash,
      isActive: true,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: workspaceSlug },
    update: {
      name: workspaceName,
      createdByUserId: user.id,
      deletedAt: null,
      isArchived: false,
    },
    create: {
      name: workspaceName,
      slug: workspaceSlug,
      createdByUserId: user.id,
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: {
      role: WorkspaceMemberRole.OWNER,
      deletedAt: null,
    },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: WorkspaceMemberRole.OWNER,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      activeWorkspaceId: workspace.id,
    },
  });

  await prisma.workspaceInvitation.deleteMany({
    where: {
      workspaceId: workspace.id,
      status: WorkspaceInvitationStatus.PENDING,
      email,
    },
  });

  const repository =
    (await prisma.repository.findFirst({
      where: {
        workspaceId: workspace.id,
        provider: IntegrationProviderType.GITHUB,
        fullName: "demo-org/ai-exposure-review-demo",
        deletedAt: null,
      },
    })) ??
    (await prisma.repository.create({
      data: {
        workspaceId: workspace.id,
        createdByUserId: user.id,
        provider: IntegrationProviderType.GITHUB,
        status: RepositoryStatus.CONNECTED,
        owner: "demo-org",
        name: "ai-exposure-review-demo",
        fullName: "demo-org/ai-exposure-review-demo",
        url: "https://github.com/demo-org/ai-exposure-review-demo",
        defaultBranch: "main",
      },
    }));

  const assessment =
    (await prisma.assessment.findFirst({
      where: {
        workspaceId: workspace.id,
        name: "Demo AI Security Review",
        deletedAt: null,
      },
    })) ??
    (await prisma.assessment.create({
      data: {
        workspaceId: workspace.id,
        repositoryId: repository.id,
        createdByUserId: user.id,
        name: "Demo AI Security Review",
        description: "Demo assessment seeded for local development.",
        status: AssessmentStatus.COMPLETED,
        aiProvider: "openai",
        branch: "main",
        stagingUrl: "https://staging.demo.ai-exposure-review.local",
        credentialsPlaceholder: "demo-staging-credentials",
        selectedScopeChecks: [
          "prompt_injection",
          "rag_data_exposure",
          "secrets_exposure",
        ],
      },
    }));

  const assessmentRun =
    (await prisma.assessmentRun.findFirst({
      where: {
        workspaceId: workspace.id,
        assessmentId: assessment.id,
        triggerSource: AssessmentRunTrigger.SYSTEM,
      },
    })) ??
    (await prisma.assessmentRun.create({
      data: {
        workspaceId: workspace.id,
        assessmentId: assessment.id,
        triggeredByUserId: user.id,
        status: AssessmentRunStatus.COMPLETED,
        triggerSource: AssessmentRunTrigger.SYSTEM,
        progressPercent: 100,
        currentMessage: "Demo assessment run completed.",
        branch: "main",
        stagingUrl: "https://staging.demo.ai-exposure-review.local",
        findingsCount: 3,
        overallRiskLevel: RiskLevel.HIGH,
        queuedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      },
    }));

  const existingRunEvents = await prisma.assessmentRunEvent.count({
    where: {
      assessmentRunId: assessmentRun.id,
    },
  });

  if (existingRunEvents === 0) {
    await prisma.assessmentRunEvent.createMany({
      data: [
        {
          assessmentRunId: assessmentRun.id,
          status: AssessmentRunStatus.QUEUED,
          progressPercent: 0,
          message: "Demo run queued.",
        },
        {
          assessmentRunId: assessmentRun.id,
          status: AssessmentRunStatus.COMPLETED,
          progressPercent: 100,
          message: "Demo run completed.",
        },
      ],
    });
  }

  const existingFindings = await prisma.finding.count({
    where: {
      assessmentRunId: assessmentRun.id,
      deletedAt: null,
    },
  });

  if (existingFindings === 0) {
    await prisma.finding.createMany({
      data: [
        {
          workspaceId: workspace.id,
          assessmentId: assessment.id,
          assessmentRunId: assessmentRun.id,
          status: FindingStatus.OPEN,
          severity: FindingSeverity.HIGH,
          riskLevel: RiskLevel.HIGH,
          confidence: ConfidenceLevel.HIGH,
          category: FindingCategory.PROMPT_INJECTION,
          title: "Prompt input is merged with trusted instructions",
          description:
            "Demo finding showing how prompt construction issues appear in the platform.",
          affectedComponent: "prompt-layer",
          affectedFilePath: "src/ai/prompt-builder.ts",
          evidenceSummary:
            "User-controlled content is concatenated into the trusted prompt context.",
          recommendedRemediation:
            "Isolate untrusted input and enforce explicit prompt boundaries.",
          metadata: {
            demo: true,
          },
        },
        {
          workspaceId: workspace.id,
          assessmentId: assessment.id,
          assessmentRunId: assessmentRun.id,
          status: FindingStatus.OPEN,
          severity: FindingSeverity.MEDIUM,
          riskLevel: RiskLevel.MEDIUM,
          confidence: ConfidenceLevel.MEDIUM,
          category: FindingCategory.RAG_DATA_EXPOSURE,
          title: "Retriever may expose cross-tenant content",
          description:
            "Demo finding for retrieval and tenancy boundary review.",
          affectedComponent: "retrieval-layer",
          affectedFilePath: "src/rag/retriever.ts",
          evidenceSummary:
            "The retriever query path lacks an explicit tenant filter.",
          recommendedRemediation:
            "Apply tenant scoping before retrieval and validate retrieved documents.",
          metadata: {
            demo: true,
          },
        },
        {
          workspaceId: workspace.id,
          assessmentId: assessment.id,
          assessmentRunId: assessmentRun.id,
          status: FindingStatus.ACCEPTED_RISK,
          severity: FindingSeverity.CRITICAL,
          riskLevel: RiskLevel.CRITICAL,
          confidence: ConfidenceLevel.MEDIUM,
          category: FindingCategory.SECRETS_EXPOSURE,
          title: "Integration traces may expose API secrets",
          description:
            "Demo finding for secret handling in AI-related integrations.",
          affectedComponent: "integration-gateway",
          affectedEndpoint: "/api/v1/ai/complete",
          evidenceSummary:
            "Connector traces contain values resembling secret material.",
          recommendedRemediation:
            "Redact secret values before logging, tracing, or persisting payloads.",
          metadata: {
            demo: true,
          },
        },
      ],
    });
  }

  console.log("Seeded demo user and workspace.");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);

  await prisma.$disconnect();
}

void main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
