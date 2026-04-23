import { z } from "zod";

export const findingCategoryApiValues = [
  "prompt_injection",
  "indirect_prompt_injection",
  "prompt_leakage",
  "insecure_output_handling",
  "excessive_agency",
  "rag_data_exposure",
  "weak_authz",
  "secrets_exposure",
  "insecure_logging",
  "abuse_controls",
  "supply_chain",
  "other",
] as const;

export const severityValues = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
] as const;

export const confidenceValues = ["HIGH", "MEDIUM", "LOW"] as const;

export const findingStatusValues = [
  "OPEN",
  "ACCEPTED_RISK",
  "FIXED",
  "FALSE_POSITIVE",
] as const;

export const workspaceParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
  })
  .strict();

export const assessmentFindingParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
    assessmentId: z.string().min(1),
  })
  .strict();

export const runFindingParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
    assessmentRunId: z.string().min(1),
  })
  .strict();

export const findingDetailParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
    findingId: z.string().min(1),
  })
  .strict();

const csvEnum = <TValues extends readonly [string, ...string[]]>(values: TValues) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .refine(
      (items) => items.every((item) => values.includes(item as TValues[number])),
      "Invalid filter value.",
    )
    .transform((items) => items as TValues[number][]);

export const findingFilterQuerySchema = z
  .object({
    severity: csvEnum(severityValues).optional(),
    category: csvEnum(findingCategoryApiValues).optional(),
    status: csvEnum(findingStatusValues).optional(),
    confidence: csvEnum(confidenceValues).optional(),
  })
  .strict();

export const updateFindingStatusBodySchema = z
  .object({
    status: z.enum(findingStatusValues),
  })
  .strict();

export type AssessmentFindingParams = z.infer<typeof assessmentFindingParamsSchema>;
export type RunFindingParams = z.infer<typeof runFindingParamsSchema>;
export type FindingDetailParams = z.infer<typeof findingDetailParamsSchema>;
export type FindingFilterQuery = z.infer<typeof findingFilterQuerySchema>;
export type UpdateFindingStatusBody = z.infer<typeof updateFindingStatusBodySchema>;

const findingViewSchema = {
  type: "object",
  required: [
    "id",
    "workspaceId",
    "assessmentId",
    "assessmentRunId",
    "title",
    "description",
    "severity",
    "category",
    "confidence",
    "status",
    "affectedComponent",
    "filePath",
    "endpoint",
    "evidenceSummary",
    "recommendedRemediation",
    "metadata",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string" },
    workspaceId: { type: "string" },
    assessmentId: { type: "string" },
    assessmentRunId: { type: "string" },
    title: { type: "string" },
    description: { type: "string", nullable: true },
    severity: { type: "string", enum: [...severityValues] },
    category: { type: "string", enum: [...findingCategoryApiValues] },
    confidence: { type: "string", enum: [...confidenceValues] },
    status: { type: "string", enum: [...findingStatusValues] },
    affectedComponent: { type: "string", nullable: true },
    filePath: { type: "string", nullable: true },
    endpoint: { type: "string", nullable: true },
    evidenceSummary: { type: "string", nullable: true },
    recommendedRemediation: { type: "string", nullable: true },
    metadata: {
      type: "object",
      nullable: true,
      additionalProperties: true,
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

export const findingResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: findingViewSchema,
  },
} as const;

export const findingListResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "array",
      items: findingViewSchema,
    },
  },
} as const;

export const findingAggregateResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "object",
      required: ["totalCount", "bySeverity", "byCategory"],
      properties: {
        totalCount: { type: "integer" },
        bySeverity: {
          type: "array",
          items: {
            type: "object",
            required: ["severity", "count"],
            properties: {
              severity: { type: "string", enum: [...severityValues] },
              count: { type: "integer" },
            },
          },
        },
        byCategory: {
          type: "array",
          items: {
            type: "object",
            required: ["category", "count"],
            properties: {
              category: {
                type: "string",
                enum: [...findingCategoryApiValues],
              },
              count: { type: "integer" },
            },
          },
        },
      },
    },
  },
} as const;
