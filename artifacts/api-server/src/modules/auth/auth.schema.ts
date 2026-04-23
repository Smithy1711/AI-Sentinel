import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8)
  .max(72, "Password must be 72 characters or fewer.");

export const signupBodySchema = z
  .object({
    email: z.string().trim().email().max(320),
    password: passwordSchema,
    displayName: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export const loginBodySchema = z
  .object({
    email: z.string().trim().email().max(320),
    password: passwordSchema,
  })
  .strict();

export type SignupBody = z.infer<typeof signupBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;

export const authResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "object",
      required: ["accessToken", "user"],
      properties: {
        accessToken: { type: "string" },
        user: {
          type: "object",
          required: ["id", "email", "activeWorkspaceId", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string" },
            email: { type: "string", format: "email" },
            displayName: { type: "string", nullable: true },
            activeWorkspaceId: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  },
} as const;

export const currentUserResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "object",
      required: ["user"],
      properties: {
        user: authResponseSchema.properties.data.properties.user,
        activeWorkspace: {
          type: "object",
          nullable: true,
          required: ["id", "name", "slug"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            slug: { type: "string" },
          },
        },
      },
    },
  },
} as const;
