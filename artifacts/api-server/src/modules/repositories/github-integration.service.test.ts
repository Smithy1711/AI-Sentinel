/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  IntegrationConnectionStatus,
  IntegrationProviderType,
} from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { decryptSecret, encryptSecret } from "../../lib/secrets";
import { createTestEnv } from "../../test/test-env";
import { GitHubIntegrationService } from "./github-integration.service";
import { RepositoryProviderRegistry } from "./providers/provider-registry";
import type { RepositoryProviderAdapter } from "./providers/provider-adapter";

function createFakeApp() {
  let idCounter = 1;
  const nextId = () => `github_test_${idCounter++}`;
  const now = () => new Date();

  const workspaceMembers = [
    {
      workspaceId: "workspace_1",
      userId: "user_1",
      role: "OWNER",
      deletedAt: null,
    },
  ];

  const authSessions: any[] = [];
  const connections: any[] = [];
  const auditLogs: any[] = [];
  const env = createTestEnv({
    GITHUB_USE_MOCK: false,
    GITHUB_CLIENT_ID: "client_123",
    GITHUB_CLIENT_SECRET: "secret_123secret_123secret_123secret_123",
  });

  const prisma = {
    workspaceMember: {
      findFirst: async ({ where }: any) =>
        workspaceMembers.find(
          (item) =>
            item.workspaceId === where.workspaceId &&
            item.userId === where.userId &&
            item.deletedAt === where.deletedAt,
        ) ?? null,
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
        authSessions.push(session);
        return session;
      },
      findFirst: async ({ where }: any) =>
        authSessions.find(
          (item) =>
            item.workspaceId === where.workspaceId &&
            item.userId === where.userId &&
            item.provider === where.provider &&
            item.state === where.state &&
            item.consumedAt === where.consumedAt,
        ) ?? null,
      update: async ({ where, data }: any) => {
        const session = authSessions.find((item) => item.id === where.id);

        if (!session) {
          throw new Error("Session not found");
        }

        Object.assign(session, data, { updatedAt: now() });
        return session;
      },
    },
    integrationConnection: {
      findFirst: async ({ where }: any) =>
        connections.find((item) => {
          if (where.workspaceId && item.workspaceId !== where.workspaceId) {
            return false;
          }

          if (where.provider && item.provider !== where.provider) {
            return false;
          }

          if (where.externalAccountId && item.externalAccountId !== where.externalAccountId) {
            return false;
          }

          if (where.deletedAt !== undefined && item.deletedAt !== where.deletedAt) {
            return false;
          }

          if (where.status?.in && !where.status.in.includes(item.status)) {
            return false;
          }

          return true;
        }) ?? null,
      create: async ({ data }: any) => {
        const connection = {
          id: nextId(),
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
          ...data,
        };
        connections.push(connection);
        return connection;
      },
      update: async ({ where, data }: any) => {
        const connection = connections.find((item) => item.id === where.id);

        if (!connection) {
          throw new Error("Connection not found");
        }

        Object.assign(connection, data, { updatedAt: now() });
        return connection;
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const auditLog = {
          id: nextId(),
          createdAt: now(),
          ...data,
        };
        auditLogs.push(auditLog);
        return auditLog;
      },
    },
  };

  return {
    app: {
      config: env,
      prisma,
    } as unknown as FastifyInstance,
    env,
    authSessions,
    connections,
    auditLogs,
  };
}

describe("GitHubIntegrationService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an auth session and authorization URL during initiation", async () => {
    const { app, authSessions } = createFakeApp();
    const service = new GitHubIntegrationService(app);

    const result = await service.initiateConnection({
      workspaceId: "workspace_1",
      userId: "user_1",
    });

    expect(result.provider).toBe("GITHUB");
    expect(result.state).toEqual(expect.any(String));
    expect(result.authorizationUrl).toContain("code_challenge=");
    expect(authSessions).toHaveLength(1);
    expect(authSessions[0]!.state).toBe(result.state);
    expect(authSessions[0]!.codeVerifier).not.toBe(result.state);
  });

  it("exchanges the callback and stores encrypted tokens", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "gho_secret",
            token_type: "bearer",
            scope: "repo,read:user",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 42,
            login: "octocat",
            name: "The Octocat",
            avatar_url: "https://avatars.githubusercontent.com/u/42",
            html_url: "https://github.com/octocat",
            type: "User",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { app, env, authSessions, connections } = createFakeApp();
    const service = new GitHubIntegrationService(app);

    const initiated = await service.initiateConnection({
      workspaceId: "workspace_1",
      userId: "user_1",
    });

    const connection = await service.handleCallback({
      workspaceId: "workspace_1",
      userId: "user_1",
      state: initiated.state,
      code: "code_123",
    });

    expect(connection.status).toBe(IntegrationConnectionStatus.ACTIVE);
    expect(connection.externalAccountLogin).toBe("octocat");
    expect(connections).toHaveLength(1);
    expect(connections[0]!.encryptedAccessToken).not.toBe("gho_secret");
    expect(
      decryptSecret(
        connections[0]!.encryptedAccessToken,
        env.INTEGRATION_TOKEN_ENCRYPTION_SECRET,
      ),
    ).toBe("gho_secret");
    expect(authSessions[0]!.consumedAt).toEqual(expect.any(Date));
    expect(authSessions[0]!.integrationConnectionId).toBe(connection.id);
  });

  it("refreshes an expired stored token when a refresh token exists", async () => {
    const { app, env, connections } = createFakeApp();
    const existingConnection = {
      id: "connection_1",
      workspaceId: "workspace_1",
      connectedByUserId: "user_1",
      provider: IntegrationProviderType.GITHUB,
      status: IntegrationConnectionStatus.ACTIVE,
      displayName: "Octocat",
      externalAccountId: "42",
      externalAccountLogin: "octocat",
      installationId: null,
      encryptedAccessToken: "stale",
      encryptedRefreshToken: "",
      tokenExpiresAt: new Date(Date.now() - 60_000),
      scopes: ["repo"],
      providerMetadata: null,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    existingConnection.encryptedAccessToken = encryptSecret(
      "gho_old",
      env.INTEGRATION_TOKEN_ENCRYPTION_SECRET,
    );
    existingConnection.encryptedRefreshToken = encryptSecret(
      "ghr_refresh",
      env.INTEGRATION_TOKEN_ENCRYPTION_SECRET,
    );
    connections.push(existingConnection);

    const refreshAdapter: RepositoryProviderAdapter = {
      provider: IntegrationProviderType.GITHUB,
      getAuthorizationUrl: async () => ({
        authorizationUrl: "https://github.example/authorize",
        state: "state_1",
      }),
      exchangeCodeForConnection: async () => ({
        accessToken: "gho_unused",
        externalAccountId: "42",
        externalAccountLogin: "octocat",
      }),
      refreshAccessToken: async ({ refreshToken }) => {
        expect(refreshToken).toBe("ghr_refresh");

        return {
          accessToken: "gho_new",
          refreshToken: "ghr_new",
          tokenExpiresAt: new Date(Date.now() + 3600_000),
          scopes: ["repo", "read:user"],
        };
      },
      listRepositories: async () => [],
    };
    const service = new GitHubIntegrationService(
      app,
      new RepositoryProviderRegistry(env, [refreshAdapter]),
    );
    const result = await service.getConnectionWithAccessToken({
      workspaceId: "workspace_1",
      userId: "user_1",
    });

    expect(result.accessToken).toBe("gho_new");
    expect(connections[0]!.scopes).toEqual(["repo", "read:user"]);
    expect(
      decryptSecret(
        connections[0]!.encryptedAccessToken,
        env.INTEGRATION_TOKEN_ENCRYPTION_SECRET,
      ),
    ).toBe("gho_new");
  });
});
