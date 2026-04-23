import {
  IntegrationConnectionStatus,
  IntegrationProviderType,
  Prisma,
  type IntegrationConnection,
  type Repository,
  RepositoryStatus,
  WorkspaceMemberRole,
} from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors";
import { AuditLogService } from "../audit/audit.service";
import { WorkspaceAccessService } from "../workspaces/workspace-access.service";
import { GitHubIntegrationService } from "./github-integration.service";
import { RepositoryProviderRegistry } from "./providers/provider-registry";

const repositoryWriteRoles = [
  WorkspaceMemberRole.OWNER,
  WorkspaceMemberRole.ADMIN,
  WorkspaceMemberRole.MEMBER,
];

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

export class RepositoryService {
  private readonly workspaceAccessService: WorkspaceAccessService;
  private readonly githubIntegrationService: GitHubIntegrationService;
  private readonly githubAdapter;
  private readonly auditLogService: AuditLogService;

  constructor(
    private readonly app: FastifyInstance,
    registry: RepositoryProviderRegistry = new RepositoryProviderRegistry(
      app.config,
    ),
  ) {
    this.workspaceAccessService = new WorkspaceAccessService(app);
    this.auditLogService = new AuditLogService(app);
    this.githubIntegrationService = new GitHubIntegrationService(app, registry);
    this.githubAdapter = registry.getAdapter(IntegrationProviderType.GITHUB);
  }

  async listRepositories(input: { workspaceId: string; userId: string }) {
    await this.workspaceAccessService.requireMembership(
      input.userId,
      input.workspaceId,
    );

    return this.app.prisma.repository.findMany({
      where: {
        workspaceId: input.workspaceId,
        deletedAt: null,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });
  }

  async getRepository(input: {
    workspaceId: string;
    repositoryId: string;
    userId: string;
  }) {
    await this.workspaceAccessService.requireMembership(
      input.userId,
      input.workspaceId,
    );

    const repository = await this.app.prisma.repository.findFirst({
      where: {
        id: input.repositoryId,
        workspaceId: input.workspaceId,
        deletedAt: null,
      },
    });

    if (!repository) {
      throw new AppError(404, "REPOSITORY_NOT_FOUND", "Repository not found.");
    }

    return repository;
  }

  async createRepository(input: {
    workspaceId: string;
    userId: string;
    provider: IntegrationProviderType;
    owner: string;
    name: string;
    url?: string;
    defaultBranch?: string;
    connectionStatus?: RepositoryStatus;
    metadata?: Record<string, unknown>;
  }) {
    await this.workspaceAccessService.requireRole(
      input.userId,
      input.workspaceId,
      repositoryWriteRoles,
    );

    const fullName = `${input.owner}/${input.name}`;
    const existing = await this.app.prisma.repository.findFirst({
      where: {
        workspaceId: input.workspaceId,
        provider: input.provider,
        fullName,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(
        409,
        "REPOSITORY_ALREADY_EXISTS",
        "Repository already exists in this workspace.",
      );
    }

    const repository = await this.app.prisma.repository.create({
      data: {
        workspaceId: input.workspaceId,
        createdByUserId: input.userId,
        provider: input.provider,
        owner: input.owner,
        name: input.name,
        fullName,
        url: input.url ?? null,
        defaultBranch: input.defaultBranch ?? null,
        status: input.connectionStatus ?? RepositoryStatus.CONNECTED,
        providerMetadata: toNullableJsonInput(input.metadata),
      },
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      action: "repository.created",
      entityType: "repository",
      entityId: repository.id,
      metadata: {
        provider: repository.provider,
        fullName: repository.fullName,
      },
    });

    return repository;
  }

  async updateRepository(input: {
    workspaceId: string;
    repositoryId: string;
    userId: string;
    owner?: string;
    name?: string;
    url?: string | null;
    defaultBranch?: string | null;
    branch?: string | null;
    connectionStatus?: RepositoryStatus;
    lastScannedAt?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    await this.workspaceAccessService.requireRole(
      input.userId,
      input.workspaceId,
      repositoryWriteRoles,
    );

    const repository = await this.getRepository(input);
    const owner = input.owner ?? repository.owner;
    const name = input.name ?? repository.name;
    const fullName = `${owner}/${name}`;

    if (fullName !== repository.fullName) {
      const existing = await this.app.prisma.repository.findFirst({
        where: {
          workspaceId: input.workspaceId,
          provider: repository.provider,
          fullName,
          deletedAt: null,
          NOT: {
            id: repository.id,
          },
        },
        select: { id: true },
      });

      if (existing) {
        throw new AppError(
          409,
          "REPOSITORY_ALREADY_EXISTS",
          "Repository already exists in this workspace.",
        );
      }
    }

    const updatedRepository = await this.app.prisma.repository.update({
      where: { id: repository.id },
      data: {
        owner,
        name,
        fullName,
        ...(input.url !== undefined ? { url: input.url } : {}),
        ...(input.defaultBranch !== undefined
          ? { defaultBranch: input.defaultBranch }
          : {}),
        ...(input.branch !== undefined ? { branch: input.branch } : {}),
        ...(input.connectionStatus !== undefined
          ? { status: input.connectionStatus }
          : {}),
        ...(input.lastScannedAt !== undefined
          ? {
              lastScannedAt: input.lastScannedAt
                ? new Date(input.lastScannedAt)
                : null,
            }
          : {}),
        ...(input.metadata !== undefined
          ? { providerMetadata: toNullableJsonInput(input.metadata) }
          : {}),
      },
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      action: "repository.updated",
      entityType: "repository",
      entityId: updatedRepository.id,
    });

    return updatedRepository;
  }

  async deleteRepository(input: {
    workspaceId: string;
    repositoryId: string;
    userId: string;
  }) {
    await this.workspaceAccessService.requireRole(
      input.userId,
      input.workspaceId,
      [WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN],
    );

    const repository = await this.getRepository(input);
    const deletedRepository = await this.app.prisma.repository.update({
      where: { id: repository.id },
      data: {
        deletedAt: new Date(),
        status: RepositoryStatus.DISCONNECTED,
      },
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      action: "repository.deleted",
      entityType: "repository",
      entityId: deletedRepository.id,
    });

    return deletedRepository;
  }

  async initiateGithubConnection(input: { workspaceId: string; userId: string }) {
    return this.githubIntegrationService.initiateConnection(input);
  }

  async handleGithubCallback(input: {
    workspaceId: string;
    userId: string;
    code: string;
    state: string;
  }) {
    return this.githubIntegrationService.handleCallback(input);
  }

  async syncGithubRepositories(input: { workspaceId: string; userId: string }) {
    const { connection, accessToken } =
      await this.githubIntegrationService.getConnectionWithAccessToken({
        workspaceId: input.workspaceId,
        userId: input.userId,
      });

    let providerRepositories;

    try {
      providerRepositories = await this.githubAdapter.listRepositories({
        connection,
        workspaceId: input.workspaceId,
        accessToken,
      });
    } catch (error) {
      if (error instanceof AppError) {
        if (error.code === "GITHUB_CONNECTION_REVOKED") {
          await this.githubIntegrationService.markConnectionRevoked({
            connectionId: connection.id,
            workspaceId: input.workspaceId,
            userId: input.userId,
          });
        } else if (error.code === "GITHUB_PERMISSION_DENIED") {
          await this.githubIntegrationService.markConnectionPermissionError({
            connectionId: connection.id,
            workspaceId: input.workspaceId,
            userId: input.userId,
            details: error.details,
          });
        }
      }

      throw error;
    }

    const syncedAt = new Date();

    const syncedRepositories = await Promise.all(
      providerRepositories.map(async (providerRepository) => {
        const existingRepository = await this.app.prisma.repository.findFirst({
          where: {
            workspaceId: input.workspaceId,
            provider: IntegrationProviderType.GITHUB,
            fullName: providerRepository.fullName,
          },
        });

        if (existingRepository) {
          return this.app.prisma.repository.update({
            where: { id: existingRepository.id },
            data: {
              integrationConnectionId: connection.id,
              externalId: providerRepository.externalId ?? null,
              owner: providerRepository.owner,
              name: providerRepository.name,
              fullName: providerRepository.fullName,
              url: providerRepository.url,
              defaultBranch: providerRepository.defaultBranch ?? null,
              status: RepositoryStatus.CONNECTED,
              isPrivate: providerRepository.isPrivate ?? true,
              providerMetadata: toNullableJsonInput(
                providerRepository.metadata,
              ),
              lastSyncedAt: syncedAt,
              deletedAt: null,
            },
          });
        }

        return this.app.prisma.repository.create({
          data: {
            workspaceId: input.workspaceId,
            integrationConnectionId: connection.id,
            createdByUserId: input.userId,
            provider: IntegrationProviderType.GITHUB,
            status: RepositoryStatus.CONNECTED,
            externalId: providerRepository.externalId ?? null,
            owner: providerRepository.owner,
            name: providerRepository.name,
            fullName: providerRepository.fullName,
            url: providerRepository.url,
            defaultBranch: providerRepository.defaultBranch ?? null,
            isPrivate: providerRepository.isPrivate ?? true,
            providerMetadata: toNullableJsonInput(providerRepository.metadata),
            lastSyncedAt: syncedAt,
          },
        });
      }),
    );

    const syncedFullNames = providerRepositories.map((repository) => repository.fullName);

    await this.app.prisma.repository.updateMany({
      where: {
        workspaceId: input.workspaceId,
        provider: IntegrationProviderType.GITHUB,
        integrationConnectionId: connection.id,
        fullName: {
          notIn: syncedFullNames,
        },
        deletedAt: null,
      },
      data: {
        status: RepositoryStatus.DISCONNECTED,
      },
    });

    await this.app.prisma.integrationConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncedAt: syncedAt,
        status: IntegrationConnectionStatus.ACTIVE,
      },
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      action: "integration.github.repositories_synced",
      entityType: "integration_connection",
      entityId: connection.id,
      metadata: {
        repositoryCount: syncedRepositories.length,
      },
    });

    return {
      connection,
      repositories: syncedRepositories,
    };
  }

  serializeIntegrationConnection(connection: IntegrationConnection) {
    return this.githubIntegrationService.serializeConnection(connection);
  }

  serializeRepository(repository: Repository) {
    return {
      id: repository.id,
      workspaceId: repository.workspaceId,
      integrationConnectionId: repository.integrationConnectionId,
      provider: repository.provider,
      owner: repository.owner,
      repoName: repository.name,
      fullName: repository.fullName,
      repoUrl: repository.url,
      defaultBranch: repository.defaultBranch,
      branch: repository.branch,
      connectionStatus: repository.status,
      lastScannedAt: repository.lastScannedAt?.toISOString() ?? null,
      lastSyncedAt: repository.lastSyncedAt?.toISOString() ?? null,
      metadata:
        repository.providerMetadata &&
        typeof repository.providerMetadata === "object"
          ? (repository.providerMetadata as Record<string, unknown>)
          : null,
      createdAt: repository.createdAt.toISOString(),
      updatedAt: repository.updatedAt.toISOString(),
    };
  }
}
