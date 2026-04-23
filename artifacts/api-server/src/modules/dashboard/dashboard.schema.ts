export const dashboardOverviewResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "object",
      required: [
        "workspaceId",
        "cards",
        "charts",
      ],
      properties: {
        workspaceId: { type: "string" },
        cards: {
          type: "object",
          required: [
            "activeAssessmentsCount",
            "connectedReposCount",
            "highSeverityFindingsCount",
          ],
          properties: {
            activeAssessmentsCount: { type: "integer" },
            connectedReposCount: { type: "integer" },
            highSeverityFindingsCount: { type: "integer" },
          },
        },
        charts: {
          type: "object",
          required: ["findingsBySeverity", "assessmentsByStatus"],
          properties: {
            findingsBySeverity: {
              type: "array",
              items: {
                type: "object",
                required: ["severity", "count"],
                properties: {
                  severity: {
                    type: "string",
                    enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"],
                  },
                  count: { type: "integer" },
                },
              },
            },
            assessmentsByStatus: {
              type: "array",
              items: {
                type: "object",
                required: ["status", "count"],
                properties: {
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
                  count: { type: "integer" },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const dashboardRecentReportsResponseSchema = {
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
              "assessmentId",
              "assessmentRunId",
              "title",
              "version",
              "status",
              "overallRiskRating",
              "createdAt",
            ],
            properties: {
              id: { type: "string" },
              assessmentId: { type: "string" },
              assessmentRunId: { type: "string", nullable: true },
              title: { type: "string" },
              version: { type: "integer" },
              status: {
                type: "string",
                enum: ["DRAFT", "GENERATED", "PUBLISHED", "ARCHIVED"],
              },
              overallRiskRating: {
                type: "string",
                nullable: true,
                enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"],
              },
              createdAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  },
} as const;

export const dashboardRecentActivityResponseSchema = {
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

export const dashboardLatestRunsResponseSchema = {
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
              "assessmentId",
              "assessmentName",
              "status",
              "progressPercent",
              "findingsCount",
              "overallRiskLevel",
              "updatedAt",
            ],
            properties: {
              id: { type: "string" },
              assessmentId: { type: "string" },
              assessmentName: { type: "string" },
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
              progressPercent: { type: "integer" },
              findingsCount: { type: "integer" },
              overallRiskLevel: {
                type: "string",
                nullable: true,
                enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"],
              },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  },
} as const;
