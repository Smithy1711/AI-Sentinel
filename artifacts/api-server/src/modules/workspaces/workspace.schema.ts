import { z } from "zod";

export const createWorkspaceBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    description: z.string().trim().max(500).optional(),
  })
  .strict();

export const workspaceParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
  })
  .strict();

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceBodySchema>;
export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;

const workspaceSummarySchema = {
  type: "object",
  required: ["id", "name", "slug", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    slug: { type: "string" },
    description: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

const workspaceMembershipSchema = {
  type: "object",
  required: ["role", "joinedAt", "isActive", "workspace"],
  properties: {
    role: {
      type: "string",
      enum: ["OWNER", "ADMIN", "MEMBER", "VIEWER"],
    },
    joinedAt: { type: "string", format: "date-time" },
    isActive: { type: "boolean" },
    workspace: workspaceSummarySchema,
  },
} as const;

export const workspaceListResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "array",
      items: workspaceMembershipSchema,
    },
  },
} as const;

export const workspaceResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: workspaceMembershipSchema,
  },
} as const;

export const workspaceSelectionResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "object",
      required: ["activeWorkspaceId", "workspace"],
      properties: {
        activeWorkspaceId: { type: "string" },
        workspace: workspaceSummarySchema,
      },
    },
  },
} as const;
