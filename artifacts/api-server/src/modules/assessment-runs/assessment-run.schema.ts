import { z } from "zod";

export const workspaceParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
  })
  .strict();

export const assessmentLaunchParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
    assessmentId: z.string().min(1),
  })
  .strict();

export const assessmentRunParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
    assessmentRunId: z.string().min(1),
  })
  .strict();

export type AssessmentLaunchParams = z.infer<typeof assessmentLaunchParamsSchema>;
export type AssessmentRunParams = z.infer<typeof assessmentRunParamsSchema>;

const assessmentRunTimelineEventSchema = {
  type: "object",
  required: ["id", "status", "progressPercent", "message", "createdAt"],
  properties: {
    id: { type: "string" },
    status: {
      type: "string",
      enum: [
        "QUEUED",
        "PREPARING",
        "SCANNING",
        "NORMALIZING",
        "REPORT_GENERATION",
        "COMPLETED",
        "FAILED",
        "CANCELED",
      ],
    },
    progressPercent: { type: "integer", nullable: true },
    message: { type: "string" },
    metadata: {
      type: "object",
      nullable: true,
      additionalProperties: true,
    },
    createdAt: { type: "string", format: "date-time" },
  },
} as const;

const assessmentRunDetailSchema = {
  type: "object",
  required: [
    "id",
    "workspaceId",
    "assessmentId",
    "assessment",
    "status",
    "progressPercent",
    "currentMessage",
    "triggerSource",
    "queueJobId",
    "branch",
    "stagingUrl",
    "findingsCount",
    "overallRiskLevel",
    "errorMessage",
    "queuedAt",
    "startedAt",
    "completedAt",
    "failedAt",
    "canceledAt",
    "createdAt",
    "updatedAt",
    "timeline",
  ],
  properties: {
    id: { type: "string" },
    workspaceId: { type: "string" },
    assessmentId: { type: "string" },
    assessment: {
      type: "object",
      required: ["id", "name", "status"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        status: {
          type: "string",
          enum: [
            "DRAFT",
            "QUEUED",
            "RUNNING",
            "COMPLETED",
            "FAILED",
            "CANCELED",
            "ARCHIVED",
          ],
        },
      },
    },
    status: assessmentRunTimelineEventSchema.properties.status,
    progressPercent: { type: "integer" },
    currentMessage: { type: "string", nullable: true },
    triggerSource: {
      type: "string",
      enum: ["MANUAL", "SCHEDULED", "API", "SYSTEM"],
    },
    queueJobId: { type: "string", nullable: true },
    branch: { type: "string", nullable: true },
    stagingUrl: { type: "string", nullable: true },
    findingsCount: { type: "integer" },
    overallRiskLevel: {
      type: "string",
      nullable: true,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"],
    },
    errorMessage: { type: "string", nullable: true },
    queuedAt: { type: "string", format: "date-time" },
    startedAt: { type: "string", format: "date-time", nullable: true },
    completedAt: { type: "string", format: "date-time", nullable: true },
    failedAt: { type: "string", format: "date-time", nullable: true },
    canceledAt: { type: "string", format: "date-time", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    timeline: {
      type: "array",
      items: assessmentRunTimelineEventSchema,
    },
  },
} as const;

export const assessmentRunResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: assessmentRunDetailSchema,
  },
} as const;
