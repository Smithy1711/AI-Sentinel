import type {
  ConfidenceLevel,
  FindingSeverity,
  FindingStatus,
  RiskLevel,
} from "@prisma/client";

export type FindingCategoryApi =
  | "prompt_injection"
  | "indirect_prompt_injection"
  | "prompt_leakage"
  | "insecure_output_handling"
  | "excessive_agency"
  | "rag_data_exposure"
  | "weak_authz"
  | "secrets_exposure"
  | "insecure_logging"
  | "abuse_controls"
  | "supply_chain"
  | "other";

export interface ReportFindingAppendixItem {
  id: string;
  title: string;
  description: string | null;
  severity: FindingSeverity;
  category: FindingCategoryApi;
  confidence: ConfidenceLevel;
  status: FindingStatus;
  affectedComponent: string | null;
  filePath: string | null;
  endpoint: string | null;
  evidenceSummary: string | null;
  recommendedRemediation: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ReportDocument {
  executiveSummary: string;
  overallRiskRating: RiskLevel;
  scopeSummary: {
    assessmentName: string;
    repository: {
      id: string;
      fullName: string;
      provider: string;
    } | null;
    branch: string | null;
    stagingUrl: string | null;
    aiProvider: string | null;
    aiArchitectureType: string | null;
    selectedScopeChecks: string[];
    assessmentRunId: string;
    findingsAnalyzed: number;
  };
  keyFindings: Array<{
    id: string;
    title: string;
    severity: FindingSeverity;
    category: FindingCategoryApi;
    confidence: ConfidenceLevel;
    status: FindingStatus;
    evidenceSummary: string | null;
    recommendedRemediation: string | null;
  }>;
  mappedCategories: Array<{
    category: FindingCategoryApi;
    count: number;
    highestSeverity: FindingSeverity;
  }>;
  remediationRoadmap: {
    fixNow: Array<{
      findingId: string;
      title: string;
      severity: FindingSeverity;
      category: FindingCategoryApi;
      action: string | null;
    }>;
    next: Array<{
      findingId: string;
      title: string;
      severity: FindingSeverity;
      category: FindingCategoryApi;
      action: string | null;
    }>;
    later: Array<{
      findingId: string;
      title: string;
      severity: FindingSeverity;
      category: FindingCategoryApi;
      action: string | null;
    }>;
  };
  appendix: {
    findings: ReportFindingAppendixItem[];
  };
}

export interface ReportRenderer<TOutput = unknown> {
  readonly format: "json";
  render(document: ReportDocument): TOutput;
}

export class JsonReportRenderer implements ReportRenderer<ReportDocument> {
  readonly format = "json" as const;

  render(document: ReportDocument): ReportDocument {
    return document;
  }
}
