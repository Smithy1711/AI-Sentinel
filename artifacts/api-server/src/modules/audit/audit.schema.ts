export const activityFeedResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "object",
      required: ["workspaceId", "items"],
      properties: {
        workspaceId: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            required: [
              "id",
              "action",
              "entityType",
              "entityId",
              "actorUserId",
              "assessmentId",
              "assessmentRunId",
              "createdAt",
            ],
            properties: {
              id: { type: "string" },
              action: { type: "string" },
              entityType: { type: "string" },
              entityId: { type: "string", nullable: true },
              actorUserId: { type: "string", nullable: true },
              assessmentId: { type: "string", nullable: true },
              assessmentRunId: { type: "string", nullable: true },
              createdAt: { type: "string", format: "date-time" },
              metadata: {
                type: "object",
                nullable: true,
                additionalProperties: true,
              },
            },
          },
        },
      },
    },
  },
} as const;
