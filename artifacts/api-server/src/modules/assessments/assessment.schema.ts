import { z } from "zod";

export const assessmentStatusValues = [
  "DRAFT",
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELED",
  "ARCHIVED",
] as const;

export const aiArchitectureTypeValues = [
  "CHAT",
  "RAG",
  "AGENT",
  "WORKFLOW",
  "CLASSIFIER",
  "CONTENT_GENERATION",
  "SEARCH",
  "OTHER",
] as const;

export const workspaceParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
  })
  .strict();

export const assessmentParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
    assessmentId: z.string().min(1),
  })
  .strict();

const selectedScopeChecksSchema = z
  .array(z.string().trim().min(1).max(120))
  .max(100);

const scopeSettingsSchema = z.record(z.string(), z.unknown());

export const createAssessmentBodySchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).optional(),
    repositoryId: z.string().min(1).nullable().optional(),
    branch: z.string().trim().min(1).max(120).nullable().optional(),
    stagingUrl: z.string().trim().url().nullable().optional(),
    credentialsPlaceholder: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .nullable()
      .optional(),
    aiProvider: z.string().trim().min(1).max(120).nullable().optional(),
    aiArchitectureType: z.enum(aiArchitectureTypeValues).nullable().optional(),
    selectedScopeChecks: selectedScopeChecksSchema.optional(),
    scopeSettings: scopeSettingsSchema.nullable().optional(),
  })
  .strict();

export const updateAssessmentDraftBodySchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    repositoryId: z.string().min(1).nullable().optional(),
    branch: z.string().trim().min(1).max(120).nullable().optional(),
    stagingUrl: z.string().trim().url().nullable().optional(),
    credentialsPlaceholder: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .nullable()
      .optional(),
    aiProvider: z.string().trim().min(1).max(120).nullable().optional(),
    aiArchitectureType: z.enum(aiArchitectureTypeValues).nullable().optional(),
    selectedScopeChecks: selectedScopeChecksSchema.optional(),
    scopeSettings: scopeSettingsSchema.nullable().optional(),
  })
  .strict();

export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;
export type AssessmentParams = z.infer<typeof assessmentParamsSchema>;
export type CreateAssessmentBody = z.infer<typeof createAssessmentBodySchema>;
export type UpdateAssessmentDraftBody = z.infer<
  typeof updateAssessmentDraftBodySchema
>;

const assessmentRepositorySummarySchema = {
  type: "object",
  nullable: true,
  required: [
    "id",
    "provider",
    "owner",
    "repoName",
    "fullName",
    "repoUrl",
    "defaultBranch",
    "connectionStatus",
  ],
  properties: {
    id: { type: "string" },
    provider: {
      type: "string",
      enum: ["GITHUB", "GITLAB", "BITBUCKET"],
    },
    owner: { type: "string" },
    repoName: { type: "string" },
    fullName: { type: "string" },
    repoUrl: { type: "string", nullable: true },
    defaultBranch: { type: "string", nullable: true },
    connectionStatus: {
      type: "string",
      enum: ["CONNECTED", "ERROR", "DISCONNECTED", "ARCHIVED"],
    },
  },
} as const;

const assessmentConfigurationSchema = {
  type: "object",
  required: [
    "repositoryId",
    "branch",
    "stagingUrl",
    "credentialsPlaceholder",
    "aiProvider",
    "aiArchitectureType",
    "selectedScopeChecks",
    "scopeSettings",
  ],
  properties: {
    repositoryId: { type: "string", nullable: true },
    branch: { type: "string", nullable: true },
    stagingUrl: { type: "string", nullable: true },
    credentialsPlaceholder: { type: "string", nullable: true },
    aiProvider: { type: "string", nullable: true },
    aiArchitectureType: {
      type: "string",
      nullable: true,
      enum: [...aiArchitectureTypeValues],
    },
    selectedScopeChecks: {
      type: "array",
      items: { type: "string" },
    },
    scopeSettings: {
      type: "object",
      nullable: true,
      additionalProperties: true,
    },
  },
} as const;

const assessmentViewSchema = {
  type: "object",
  required: [
    "id",
    "workspaceId",
    "name",
    "description",
    "status",
    "repository",
    "configuration",
    "latestRunAt",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string" },
    workspaceId: { type: "string" },
    name: { type: "string" },
    description: { type: "string", nullable: true },
    status: {
      type: "string",
      enum: [...assessmentStatusValues],
    },
    repository: assessmentRepositorySummarySchema,
    configuration: assessmentConfigurationSchema,
    latestRunAt: { type: "string", format: "date-time", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

export const assessmentResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: assessmentViewSchema,
  },
} as const;

export const assessmentListResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "array",
      items: assessmentViewSchema,
    },
  },
} as const;
