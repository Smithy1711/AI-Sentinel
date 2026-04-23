/* eslint-disable @typescript-eslint/no-explicit-any */

import { IntegrationConnectionStatus, IntegrationProviderType, RepositoryStatus } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestEnv } from "../../test/test-env";
import { RepositoryProviderRegistry } from "./providers/provider-registry";
import type { RepositoryProviderAdapter } from "./providers/provider-adapter";
import { RepositoryService } from "./repository.service";

function createFakeApp() {
  let idCounter = 1;
  const nextId = () => `repo_test_${idCounter++}`;
  const now = () => new Date();

  const workspaceMembers = [
    {
      userId: "user_1",
      workspaceId: "workspace_1",
      role: "OWNER",
      deletedAt: null,
    },
  ];

  const integrationConnections: any[] = [];
  const integrationAuthSessions: any[] = [];
  const repositories: any[] = [];
  const auditLogs: any[] = [];

  const prisma = {
    workspaceMember: {
      findFirst: async ({ where, select }: any) => {
        const membership =
          workspaceMembers.find(
            (item) =>
              item.userId === where.userId &&
              item.workspaceId === where.workspaceId &&
              item.deletedAt === where.deletedAt,
          ) ?? null;

        if (!membership) {
          return null;
        }

        if (select) {
          return {
            userId: membership.userId,
            workspaceId: membership.workspaceId,
            role: membership.role,
          };
        }

        return membership;
      },
    },
    repository: {
      findMany: async ({ where }: any) =>
        repositories.filter(
          (item) =>
            item.workspaceId === where.workspaceId &&
            item.deletedAt === where.deletedAt,
        ),
      findFirst: async ({ where, select }: any) => {
        const repository =
          repositories.find((item) => {
            if (where.id && item.id !== where.id) {
              return false;
            }

            if (where.workspaceId && item.workspaceId !== where.workspaceId) {
              return false;
            }

            if (where.provider && item.provider !== where.provider) {
              return false;
            }

            if (where.fullName && item.fullName !== where.fullName) {
              return false;
            }

            if (where.deletedAt !== undefined && item.deletedAt !== where.deletedAt) {
              return false;
            }

            if (where.NOT?.id && item.id === where.NOT.id) {
              return false;
            }

            return true;
          }) ?? null;

        if (!repository) {
          return null;
        }

        if (select?.id) {
          return { id: repository.id };
        }

        return repository;
      },
      create: async ({ data }: any) => {
        const repository = {
          id: nextId(),
          workspaceId: data.workspaceId,
          integrationConnectionId: data.integrationConnectionId ?? null,
          createdByUserId: data.createdByUserId ?? null,
          provider: data.provider,
          status: data.status,
          externalId: data.externalId ?? null,
          owner: data.owner,
          name: data.name,
          fullName: data.fullName,
          url: data.url ?? null,
          isPrivate: data.isPrivate ?? true,
          defaultBranch: data.defaultBranch ?? null,
          branch: data.branch ?? null,
          providerMetadata: data.providerMetadata ?? null,
          lastSyncedAt: data.lastSyncedAt ?? null,
          lastScannedAt: data.lastScannedAt ?? null,
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
        };
        repositories.push(repository);
        return repository;
      },
      update: async ({ where, data }: any) => {
        const repository = repositories.find((item) => item.id === where.id);

        if (!repository) {
          throw new Error("Repository not found");
        }

        Object.assign(repository, data, { updatedAt: now() });
        return repository;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;

        for (const repository of repositories) {
          if (repository.workspaceId !== where.workspaceId) {
            continue;
          }

          if (repository.provider !== where.provider) {
            continue;
          }

          if (repository.integrationConnectionId !== where.integrationConnectionId) {
            continue;
          }

          if (where.deletedAt !== undefined && repository.deletedAt !== where.deletedAt) {
            continue;
          }

          if (
            where.fullName?.notIn &&
            where.fullName.notIn.includes(repository.fullName)
          ) {
            continue;
          }

          Object.assign(repository, data, { updatedAt: now() });
          count += 1;
        }

        return { count };
      },
    },
    integrationConnection: {
      findFirst: async ({ where }: any) => {
        return (
          integrationConnections.find((item) => {
            if (where.workspaceId && item.workspaceId !== where.workspaceId) {
              return false;
            }

            if (where.provider && item.provider !== where.provider) {
              return false;
            }

            if (
              where.status &&
              !where.status.in &&
              item.status !== where.status
            ) {
              return false;
            }

            if (where.status?.in && !where.status.in.includes(item.status)) {
              return false;
            }

            if (
              where.externalAccountId &&
              item.externalAccountId !== where.externalAccountId
            ) {
              return false;
            }

            if (where.deletedAt !== undefined && item.deletedAt !== where.deletedAt) {
              return false;
            }

            return true;
          }) ?? null
        );
      },
      create: async ({ data }: any) => {
        const connection = {
          id: nextId(),
          workspaceId: data.workspaceId,
          connectedByUserId: data.connectedByUserId ?? null,
          provider: data.provider,
          status: data.status,
          displayName: data.displayName ?? null,
          externalAccountId: data.externalAccountId ?? null,
          externalAccountLogin: data.externalAccountLogin ?? null,
          installationId: data.installationId ?? null,
          encryptedAccessToken: data.encryptedAccessToken ?? null,
          encryptedRefreshToken: data.encryptedRefreshToken ?? null,
          tokenExpiresAt: data.tokenExpiresAt ?? null,
          scopes: data.scopes ?? [],
          providerMetadata: data.providerMetadata ?? null,
          lastSyncedAt: data.lastSyncedAt ?? null,
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
        };
        integrationConnections.push(connection);
        return connection;
      },
      update: async ({ where, data }: any) => {
        const connection = integrationConnections.find((item) => item.id === where.id);

        if (!connection) {
          throw new Error("Connection not found");
        }

        Object.assign(connection, data, { updatedAt: now() });
        return connection;
      },
    },
    integrationAuthSession: {
      create: async ({ data }: any) => {
        const session = {
          id: nextId(),
          createdAt: now(),
          updatedAt: now(),
          consumedAt: null,
          integrationConnectionId: null,
          ...data,
        };
        integrationAuthSessions.push(session);
        return session;
      },
      findFirst: async ({ where }: any) => {
        return (
          integrationAuthSessions.find((item) => {
            if (where.workspaceId && item.workspaceId !== where.workspaceId) {
              return false;
            }

            if (where.userId && item.userId !== where.userId) {
              return false;
            }

            if (where.provider && item.provider !== where.provider) {
              return false;
            }

            if (where.state && item.state !== where.state) {
              return false;
            }

            if (where.consumedAt !== undefined && item.consumedAt !== where.consumedAt) {
              return false;
            }

            return true;
          }) ?? null
        );
      },
      update: async ({ where, data }: any) => {
        const session = integrationAuthSessions.find((item) => item.id === where.id);

        if (!session) {
          throw new Error("Session not found");
        }

        Object.assign(session, data, { updatedAt: now() });
        return session;
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const log = {
          id: nextId(),
          ...data,
          createdAt: now(),
        };
        auditLogs.push(log);
        return log;
      },
    },
  };

  const app = {
    config: createTestEnv(),
    prisma,
  } as unknown as FastifyInstance;

  return {
    app,
    repositories,
    integrationConnections,
    integrationAuthSessions,
    auditLogs,
  };
}

describe("RepositoryService", () => {
  let adapter: RepositoryProviderAdapter;

  beforeEach(() => {
    adapter = {
      provider: IntegrationProviderType.GITHUB,
      getAuthorizationUrl: async (input) => ({
        authorizationUrl: "https://github.example/authorize",
        state: input.state ?? "state_1",
      }),
      exchangeCodeForConnection: async () => ({
        accessToken: "gho_test_token",
        externalAccountId: "acct_1",
        externalAccountLogin: "mock-org",
        displayName: "Mock Org",
        refreshToken: null,
        tokenExpiresAt: null,
        scopes: ["repo"],
        installationId: "install_1",
        providerMetadata: { source: "test" },
      }),
      listRepositories: async ({ accessToken }) => {
        expect(accessToken).toBe("gho_test_token");

        return [
        {
          externalId: "repo_1",
          owner: "mock-org",
          name: "platform-api",
          fullName: "mock-org/platform-api",
          url: "https://github.com/mock-org/platform-api",
          defaultBranch: "main",
          isPrivate: true,
          metadata: { language: "TypeScript" },
        },
      ];
      },
    };
  });

  it("creates and lists repositories in a workspace", async () => {
    const { app, repositories } = createFakeApp();
    const service = new RepositoryService(
      app,
      new RepositoryProviderRegistry(app.config, [adapter]),
    );

    const created = await service.createRepository({
      workspaceId: "workspace_1",
      userId: "user_1",
      provider: IntegrationProviderType.GITHUB,
      owner: "acme",
      name: "ai-review",
      url: "https://github.com/acme/ai-review",
      defaultBranch: "main",
      metadata: { environment: "test" },
    });

    expect(created.fullName).toBe("acme/ai-review");
    expect(repositories).toHaveLength(1);

    const listed = await service.listRepositories({
      workspaceId: "workspace_1",
      userId: "user_1",
    });

    expect(listed).toHaveLength(1);
    expect(service.serializeRepository(listed[0]!).repoName).toBe("ai-review");
  });

  it("syncs repositories from the GitHub adapter into the workspace", async () => {
    const { app, repositories, integrationConnections } = createFakeApp();
    const service = new RepositoryService(
      app,
      new RepositoryProviderRegistry(app.config, [adapter]),
    );

    const initiated = await service.initiateGithubConnection({
      workspaceId: "workspace_1",
      userId: "user_1",
    });

    const connection = await service.handleGithubCallback({
      workspaceId: "workspace_1",
      userId: "user_1",
      code: "mock-code",
      state: initiated.state,
    });

    expect(connection.status).toBe(IntegrationConnectionStatus.ACTIVE);
    expect(integrationConnections).toHaveLength(1);

    const synced = await service.syncGithubRepositories({
      workspaceId: "workspace_1",
      userId: "user_1",
    });

    expect(synced.repositories).toHaveLength(1);
    expect(repositories[0]!.status).toBe(RepositoryStatus.CONNECTED);
    expect(repositories[0]!.fullName).toBe("mock-org/platform-api");
    expect(repositories[0]!.integrationConnectionId).toBe(connection.id);
  });
});
