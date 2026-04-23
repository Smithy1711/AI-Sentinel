import { z } from "zod";

export const repositoryParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
    repositoryId: z.string().min(1),
  })
  .strict();

export const workspaceParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
  })
  .strict();

export const createRepositoryBodySchema = z
  .object({
    provider: z.enum(["GITHUB", "GITLAB", "BITBUCKET"]),
    owner: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(120),
    url: z.string().trim().url().optional(),
    defaultBranch: z.string().trim().min(1).max(120).optional(),
    connectionStatus: z
      .enum(["CONNECTED", "ERROR", "DISCONNECTED", "ARCHIVED"])
      .optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const updateRepositoryBodySchema = z
  .object({
    owner: z.string().trim().min(1).max(120).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    url: z.string().trim().url().nullable().optional(),
    defaultBranch: z.string().trim().min(1).max(120).nullable().optional(),
    branch: z.string().trim().min(1).max(120).nullable().optional(),
    connectionStatus: z
      .enum(["CONNECTED", "ERROR", "DISCONNECTED", "ARCHIVED"])
      .optional(),
    lastScannedAt: z.string().datetime().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .strict();

export const githubCallbackBodySchema = z
  .object({
    code: z.string().trim().min(1),
    state: z.string().trim().min(1),
  })
  .strict();

export type RepositoryParams = z.infer<typeof repositoryParamsSchema>;
export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;
export type CreateRepositoryBody = z.infer<typeof createRepositoryBodySchema>;
export type UpdateRepositoryBody = z.infer<typeof updateRepositoryBodySchema>;
export type GithubCallbackBody = z.infer<typeof githubCallbackBodySchema>;

export const repositoryResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "object",
      required: [
        "id",
        "workspaceId",
        "provider",
        "owner",
        "repoName",
        "repoUrl",
        "defaultBranch",
        "connectionStatus",
        "lastScannedAt",
        "lastSyncedAt",
        "metadata",
        "createdAt",
        "updatedAt",
      ],
      properties: {
        id: { type: "string" },
        workspaceId: { type: "string" },
        integrationConnectionId: { type: "string", nullable: true },
        provider: {
          type: "string",
          enum: ["GITHUB", "GITLAB", "BITBUCKET"],
        },
        owner: { type: "string" },
        repoName: { type: "string" },
        fullName: { type: "string" },
        repoUrl: { type: "string", nullable: true },
        defaultBranch: { type: "string", nullable: true },
        branch: { type: "string", nullable: true },
        connectionStatus: {
          type: "string",
          enum: ["CONNECTED", "ERROR", "DISCONNECTED", "ARCHIVED"],
        },
        lastScannedAt: { type: "string", format: "date-time", nullable: true },
        lastSyncedAt: { type: "string", format: "date-time", nullable: true },
        metadata: {
          type: "object",
          nullable: true,
          additionalProperties: true,
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
  },
} as const;

export const repositoryListResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "array",
      items: repositoryResponseSchema.properties.data,
    },
  },
} as const;

export const githubInitiateResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "object",
      required: ["provider", "authorizationUrl", "state"],
      properties: {
        provider: {
          type: "string",
          enum: ["GITHUB"],
        },
        authorizationUrl: { type: "string" },
        state: { type: "string" },
      },
    },
  },
} as const;

export const integrationConnectionResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "object",
      required: [
        "id",
        "workspaceId",
        "provider",
        "status",
        "displayName",
        "externalAccountId",
        "externalAccountLogin",
        "scopes",
        "providerMetadata",
        "createdAt",
        "updatedAt",
      ],
      properties: {
        id: { type: "string" },
        workspaceId: { type: "string" },
        provider: {
          type: "string",
          enum: ["GITHUB", "GITLAB", "BITBUCKET"],
        },
        status: {
          type: "string",
          enum: ["ACTIVE", "ERROR", "REVOKED", "DISCONNECTED"],
        },
        displayName: { type: "string", nullable: true },
        externalAccountId: { type: "string", nullable: true },
        externalAccountLogin: { type: "string", nullable: true },
        scopes: {
          type: "array",
          items: { type: "string" },
        },
        providerMetadata: {
          type: "object",
          nullable: true,
          additionalProperties: true,
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
  },
} as const;

export const repositorySyncResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "object",
      required: ["connection", "repositories"],
      properties: {
        connection: integrationConnectionResponseSchema.properties.data,
        repositories: {
          type: "array",
          items: repositoryResponseSchema.properties.data,
        },
      },
    },
  },
} as const;
