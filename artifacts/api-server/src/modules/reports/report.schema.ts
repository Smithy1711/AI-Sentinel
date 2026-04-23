import { z } from "zod";

export const workspaceParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
  })
  .strict();

export const assessmentReportParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
    assessmentId: z.string().min(1),
  })
  .strict();

export const reportParamsSchema = z
  .object({
    workspaceId: z.string().min(1),
    reportId: z.string().min(1),
  })
  .strict();

export type AssessmentReportParams = z.infer<typeof assessmentReportParamsSchema>;
export type ReportParams = z.infer<typeof reportParamsSchema>;

const riskLevelValues = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
const severityValues = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
const confidenceValues = ["HIGH", "MEDIUM", "LOW"] as const;
const statusValues = ["OPEN", "ACCEPTED_RISK", "FIXED", "FALSE_POSITIVE"] as const;
const categoryValues = [
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

const reportContentSchema = {
  type: "object",
  required: [
    "executiveSummary",
    "overallRiskRating",
    "scopeSummary",
    "keyFindings",
    "mappedCategories",
    "remediationRoadmap",
    "appendix",
  ],
  properties: {
    executiveSummary: { type: "string" },
    overallRiskRating: { type: "string", enum: [...riskLevelValues] },
    scopeSummary: {
      type: "object",
      required: [
        "assessmentName",
        "repository",
        "branch",
        "stagingUrl",
        "aiProvider",
        "aiArchitectureType",
        "selectedScopeChecks",
        "assessmentRunId",
        "findingsAnalyzed",
      ],
      properties: {
        assessmentName: { type: "string" },
        repository: {
          type: "object",
          nullable: true,
          required: ["id", "fullName", "provider"],
          properties: {
            id: { type: "string" },
            fullName: { type: "string" },
            provider: { type: "string" },
          },
        },
        branch: { type: "string", nullable: true },
        stagingUrl: { type: "string", nullable: true },
        aiProvider: { type: "string", nullable: true },
        aiArchitectureType: { type: "string", nullable: true },
        selectedScopeChecks: {
          type: "array",
          items: { type: "string" },
        },
        assessmentRunId: { type: "string" },
        findingsAnalyzed: { type: "integer" },
      },
    },
    keyFindings: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "title",
          "severity",
          "category",
          "confidence",
          "status",
          "evidenceSummary",
          "recommendedRemediation",
        ],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          severity: { type: "string", enum: [...severityValues] },
          category: { type: "string", enum: [...categoryValues] },
          confidence: { type: "string", enum: [...confidenceValues] },
          status: { type: "string", enum: [...statusValues] },
          evidenceSummary: { type: "string", nullable: true },
          recommendedRemediation: { type: "string", nullable: true },
        },
      },
    },
    mappedCategories: {
      type: "array",
      items: {
        type: "object",
        required: ["category", "count", "highestSeverity"],
        properties: {
          category: { type: "string", enum: [...categoryValues] },
          count: { type: "integer" },
          highestSeverity: { type: "string", enum: [...severityValues] },
        },
      },
    },
    remediationRoadmap: {
      type: "object",
      required: ["fixNow", "next", "later"],
      properties: {
        fixNow: {
          type: "array",
          items: {
            type: "object",
            required: ["findingId", "title", "severity", "category", "action"],
            properties: {
              findingId: { type: "string" },
              title: { type: "string" },
              severity: { type: "string", enum: [...severityValues] },
              category: { type: "string", enum: [...categoryValues] },
              action: { type: "string", nullable: true },
            },
          },
        },
        next: {
          type: "array",
          items: {
            type: "object",
            required: ["findingId", "title", "severity", "category", "action"],
            properties: {
              findingId: { type: "string" },
              title: { type: "string" },
              severity: { type: "string", enum: [...severityValues] },
              category: { type: "string", enum: [...categoryValues] },
              action: { type: "string", nullable: true },
            },
          },
        },
        later: {
          type: "array",
          items: {
            type: "object",
            required: ["findingId", "title", "severity", "category", "action"],
            properties: {
              findingId: { type: "string" },
              title: { type: "string" },
              severity: { type: "string", enum: [...severityValues] },
              category: { type: "string", enum: [...categoryValues] },
              action: { type: "string", nullable: true },
            },
          },
        },
      },
    },
    appendix: {
      type: "object",
      required: ["findings"],
      properties: {
        findings: {
          type: "array",
          items: {
            type: "object",
            required: [
              "id",
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
            ],
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              description: { type: "string", nullable: true },
              severity: { type: "string", enum: [...severityValues] },
              category: { type: "string", enum: [...categoryValues] },
              confidence: { type: "string", enum: [...confidenceValues] },
              status: { type: "string", enum: [...statusValues] },
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
            },
          },
        },
      },
    },
  },
} as const;

const reportViewSchema = {
  type: "object",
  required: [
    "id",
    "workspaceId",
    "assessmentId",
    "assessmentRunId",
    "status",
    "version",
    "title",
    "executiveSummary",
    "overallRiskRating",
    "content",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string" },
    workspaceId: { type: "string" },
    assessmentId: { type: "string" },
    assessmentRunId: { type: "string", nullable: true },
    status: {
      type: "string",
      enum: ["DRAFT", "GENERATED", "PUBLISHED", "ARCHIVED"],
    },
    version: { type: "integer" },
    title: { type: "string" },
    executiveSummary: { type: "string", nullable: true },
    overallRiskRating: {
      type: "string",
      nullable: true,
      enum: [...riskLevelValues],
    },
    content: reportContentSchema,
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

export const reportResponseSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: reportViewSchema,
  },
} as const;
