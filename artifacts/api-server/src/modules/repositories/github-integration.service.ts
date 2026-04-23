import { randomUUID } from "node:crypto";
import {
  IntegrationConnectionStatus,
  IntegrationProviderType,
  Prisma,
  type IntegrationAuthSession,
  type IntegrationConnection,
  WorkspaceMemberRole,
} from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors";
import { createPkcePair } from "../../lib/pkce";
import { decryptSecret, encryptSecret } from "../../lib/secrets";
import { AuditLogService } from "../audit/audit.service";
import { WorkspaceAccessService } from "../workspaces/workspace-access.service";
import { RepositoryProviderRegistry } from "./providers/provider-registry";
import type {
  ProviderConnectionResult,
  ProviderTokenRefreshResult,
  RepositoryProviderAdapter,
} from "./providers/provider-adapter";

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

type ConnectionWithAccessToken = {
  connection: IntegrationConnection;
  accessToken: string;
};

export class GitHubIntegrationService {
  private readonly workspaceAccessService: WorkspaceAccessService;
  private readonly providerAdapter: RepositoryProviderAdapter;
  private readonly auditLogService: AuditLogService;

  constructor(
    private readonly app: FastifyInstance,
    registry: RepositoryProviderRegistry = new RepositoryProviderRegistry(
      app.config,
    ),
  ) {
    this.workspaceAccessService = new WorkspaceAccessService(app);
    this.auditLogService = new AuditLogService(app);
    this.providerAdapter = registry.getAdapter(IntegrationProviderType.GITHUB);
  }

  async initiateConnection(input: { workspaceId: string; userId: string }) {
    await this.workspaceAccessService.requireRole(input.userId, input.workspaceId, [
      WorkspaceMemberRole.OWNER,
      WorkspaceMemberRole.ADMIN,
      WorkspaceMemberRole.MEMBER,
    ]);

    const state = cryptoRandom();
    const pkce = createPkcePair();
    const expiresAt = new Date(
      Date.now() + this.app.config.GITHUB_OAUTH_STATE_TTL_MINUTES * 60_000,
    );

    await this.app.prisma.integrationAuthSession.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        provider: IntegrationProviderType.GITHUB,
        state,
        codeVerifier: encryptSecret(
          pkce.codeVerifier,
          this.app.config.INTEGRATION_TOKEN_ENCRYPTION_SECRET,
        ),
        expiresAt,
      },
    });

    const result = await this.providerAdapter.getAuthorizationUrl({
      workspaceId: input.workspaceId,
      userId: input.userId,
      state,
      codeChallenge: pkce.codeChallenge,
      codeChallengeMethod: pkce.codeChallengeMethod,
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      action: "integration.github.initiated",
      entityType: "integration_connection",
      metadata: {
        provider: "GITHUB",
      },
    });

    return {
      provider: "GITHUB" as const,
      authorizationUrl: result.authorizationUrl,
      state: result.state,
    };
  }

  async handleCallback(input: {
    workspaceId: string;
    userId: string;
    code: string;
    state: string;
  }) {
    await this.workspaceAccessService.requireRole(input.userId, input.workspaceId, [
      WorkspaceMemberRole.OWNER,
      WorkspaceMemberRole.ADMIN,
      WorkspaceMemberRole.MEMBER,
    ]);

    const authSession = await this.consumeAuthSession(input);
    const connectionResult = await this.providerAdapter.exchangeCodeForConnection(
      {
        code: input.code,
        state: input.state,
        workspaceId: input.workspaceId,
        codeVerifier: decryptSecret(
          authSession.codeVerifier,
          this.app.config.INTEGRATION_TOKEN_ENCRYPTION_SECRET,
        ),
      },
    );

    const connection = await this.upsertConnection({
      workspaceId: input.workspaceId,
      connectedByUserId: input.userId,
      provider: IntegrationProviderType.GITHUB,
      result: connectionResult,
      authSessionId: authSession.id,
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      action: "integration.github.connected",
      entityType: "integration_connection",
      entityId: connection.id,
      metadata: {
        provider: "GITHUB",
        externalAccountLogin: connection.externalAccountLogin,
      },
    });

    return connection;
  }

  async getActiveConnectionOrThrow(
    workspaceId: string,
    userId: string,
  ) {
    await this.workspaceAccessService.requireRole(userId, workspaceId, [
      WorkspaceMemberRole.OWNER,
      WorkspaceMemberRole.ADMIN,
      WorkspaceMemberRole.MEMBER,
    ]);

    const connection = await this.app.prisma.integrationConnection.findFirst({
      where: {
        workspaceId,
        provider: IntegrationProviderType.GITHUB,
        status: {
          in: [
            IntegrationConnectionStatus.ACTIVE,
            IntegrationConnectionStatus.ERROR,
          ],
        },
        deletedAt: null,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!connection) {
      throw new AppError(
        404,
        "GITHUB_CONNECTION_NOT_FOUND",
        "No GitHub connection was found for the workspace.",
      );
    }

    if (connection.status === IntegrationConnectionStatus.REVOKED) {
      throw new AppError(
        409,
        "GITHUB_CONNECTION_REVOKED",
        "The GitHub connection is no longer authorized. Reconnect GitHub and try again.",
      );
    }

    return connection;
  }

  async getConnectionWithAccessToken(input: {
    workspaceId: string;
    userId: string;
  }): Promise<ConnectionWithAccessToken> {
    const connection = await this.getActiveConnectionOrThrow(
      input.workspaceId,
      input.userId,
    );

    if (!connection.encryptedAccessToken) {
      throw new AppError(
        409,
        "GITHUB_CONNECTION_REVOKED",
        "The GitHub connection is no longer authorized. Reconnect GitHub and try again.",
      );
    }

    if (
      connection.tokenExpiresAt &&
      connection.tokenExpiresAt.getTime() <= Date.now() &&
      connection.encryptedRefreshToken &&
      typeof this.providerAdapter.refreshAccessToken === "function"
    ) {
      const refreshed = await this.providerAdapter.refreshAccessToken({
        refreshToken: decryptSecret(
          connection.encryptedRefreshToken,
          this.app.config.INTEGRATION_TOKEN_ENCRYPTION_SECRET,
        ),
      });

      const updatedConnection = await this.persistRefreshedConnection(
        connection.id,
        refreshed,
      );

      return {
        connection: updatedConnection,
        accessToken: refreshed.accessToken,
      };
    }

    return {
      connection,
      accessToken: decryptSecret(
        connection.encryptedAccessToken,
        this.app.config.INTEGRATION_TOKEN_ENCRYPTION_SECRET,
      ),
    };
  }

  async markConnectionRevoked(input: {
    connectionId: string;
    workspaceId: string;
    userId: string;
  }) {
    const connection = await this.app.prisma.integrationConnection.update({
      where: { id: input.connectionId },
      data: {
        status: IntegrationConnectionStatus.REVOKED,
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        tokenExpiresAt: null,
      },
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      action: "integration.github.revoked",
      entityType: "integration_connection",
      entityId: connection.id,
      metadata: {
        provider: "GITHUB",
        externalAccountLogin: connection.externalAccountLogin,
      },
    });

    return connection;
  }

  async markConnectionPermissionError(input: {
    connectionId: string;
    workspaceId: string;
    userId: string;
    details?: unknown;
  }) {
    const connection = await this.app.prisma.integrationConnection.update({
      where: { id: input.connectionId },
      data: {
        status: IntegrationConnectionStatus.ERROR,
        providerMetadata: {
          permissionErrorAt: new Date().toISOString(),
          details: input.details ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      action: "integration.github.permission_error",
      entityType: "integration_connection",
      entityId: connection.id,
    });

    return connection;
  }

  serializeConnection(connection: IntegrationConnection) {
    return {
      id: connection.id,
      workspaceId: connection.workspaceId,
      provider: connection.provider,
      status: connection.status,
      displayName: connection.displayName,
      externalAccountId: connection.externalAccountId,
      externalAccountLogin: connection.externalAccountLogin,
      scopes: connection.scopes,
      providerMetadata:
        connection.providerMetadata &&
        typeof connection.providerMetadata === "object"
          ? (connection.providerMetadata as Record<string, unknown>)
          : null,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
    };
  }

  private async consumeAuthSession(input: {
    workspaceId: string;
    userId: string;
    state: string;
  }): Promise<IntegrationAuthSession> {
    const authSession = await this.app.prisma.integrationAuthSession.findFirst({
      where: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        provider: IntegrationProviderType.GITHUB,
        state: input.state,
        consumedAt: null,
      },
    });

    if (!authSession || authSession.expiresAt.getTime() <= Date.now()) {
      throw new AppError(
        400,
        "GITHUB_OAUTH_STATE_INVALID",
        "The GitHub authorization state is invalid or expired.",
      );
    }

    await this.app.prisma.integrationAuthSession.update({
      where: { id: authSession.id },
      data: {
        consumedAt: new Date(),
      },
    });

    return authSession;
  }

  private async persistRefreshedConnection(
    connectionId: string,
    result: ProviderTokenRefreshResult,
  ) {
    return this.app.prisma.integrationConnection.update({
      where: { id: connectionId },
      data: {
        status: IntegrationConnectionStatus.ACTIVE,
        encryptedAccessToken: encryptSecret(
          result.accessToken,
          this.app.config.INTEGRATION_TOKEN_ENCRYPTION_SECRET,
        ),
        ...(result.refreshToken === undefined
          ? {}
          : {
              encryptedRefreshToken: result.refreshToken
                ? encryptSecret(
                    result.refreshToken,
                    this.app.config.INTEGRATION_TOKEN_ENCRYPTION_SECRET,
                  )
                : null,
            }),
        ...(result.tokenExpiresAt === undefined
          ? {}
          : { tokenExpiresAt: result.tokenExpiresAt }),
        ...(result.scopes === undefined ? {} : { scopes: result.scopes }),
        ...(result.providerMetadata === undefined
          ? {}
          : { providerMetadata: toNullableJsonInput(result.providerMetadata) }),
      },
    });
  }

  private async upsertConnection(input: {
    workspaceId: string;
    connectedByUserId: string;
    provider: IntegrationProviderType;
    result: ProviderConnectionResult;
    authSessionId: string;
  }) {
    const existingConnection = await this.app.prisma.integrationConnection.findFirst({
      where: {
        workspaceId: input.workspaceId,
        provider: input.provider,
        externalAccountId: input.result.externalAccountId,
        deletedAt: null,
      },
    });

    const data = {
      connectedByUserId: input.connectedByUserId,
      status: IntegrationConnectionStatus.ACTIVE,
      displayName: input.result.displayName ?? null,
      externalAccountId: input.result.externalAccountId,
      externalAccountLogin: input.result.externalAccountLogin,
      installationId: input.result.installationId ?? null,
      encryptedAccessToken: encryptSecret(
        input.result.accessToken,
        this.app.config.INTEGRATION_TOKEN_ENCRYPTION_SECRET,
      ),
      encryptedRefreshToken: input.result.refreshToken
        ? encryptSecret(
            input.result.refreshToken,
            this.app.config.INTEGRATION_TOKEN_ENCRYPTION_SECRET,
          )
        : null,
      tokenExpiresAt: input.result.tokenExpiresAt ?? null,
      scopes: input.result.scopes ?? [],
      providerMetadata: toNullableJsonInput(input.result.providerMetadata),
      lastSyncedAt: null,
    };

    const connection = existingConnection
      ? await this.app.prisma.integrationConnection.update({
          where: { id: existingConnection.id },
          data,
        })
      : await this.app.prisma.integrationConnection.create({
          data: {
            workspaceId: input.workspaceId,
            provider: input.provider,
            ...data,
          },
        });

    await this.app.prisma.integrationAuthSession.update({
      where: { id: input.authSessionId },
      data: {
        integrationConnectionId: connection.id,
      },
    });

    return connection;
  }
}

function cryptoRandom() {
  return randomUUID();
}
