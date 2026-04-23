export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type RiskLevel = Severity;
export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type AssessmentStatus =
  | "DRAFT"
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"
  | "ARCHIVED";

export type AssessmentRunStatus =
  | "QUEUED"
  | "PREPARING"
  | "SCANNING"
  | "NORMALIZING"
  | "REPORT_GENERATION"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export type RepositoryProvider = "GITHUB" | "GITLAB" | "BITBUCKET";
export type RepositoryConnectionStatus =
  | "CONNECTED"
  | "ERROR"
  | "DISCONNECTED"
  | "ARCHIVED";

export type AiArchitectureType =
  | "CHAT"
  | "RAG"
  | "AGENT"
  | "WORKFLOW"
  | "CLASSIFIER"
  | "CONTENT_GENERATION"
  | "SEARCH"
  | "OTHER";

export type FindingCategory =
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

export type FindingStatus =
  | "OPEN"
  | "ACCEPTED_RISK"
  | "FIXED"
  | "FALSE_POSITIVE";

export type ReportStatus = "DRAFT" | "GENERATED" | "PUBLISHED" | "ARCHIVED";

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMembership {
  role: WorkspaceRole;
  joinedAt: string;
  isActive: boolean;
  workspace: WorkspaceSummary;
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  activeWorkspaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentRepositorySummary {
  id: string;
  provider: RepositoryProvider;
  owner: string;
  repoName: string;
  fullName: string;
  repoUrl: string | null;
  defaultBranch: string | null;
  connectionStatus: RepositoryConnectionStatus;
}

export interface AssessmentConfiguration {
  repositoryId: string | null;
  branch: string | null;
  stagingUrl: string | null;
  credentialsPlaceholder: string | null;
  aiProvider: string | null;
  aiArchitectureType: AiArchitectureType | null;
  selectedScopeChecks: string[];
  scopeSettings: Record<string, unknown> | null;
}

export interface AssessmentLatestRunSummary {
  id: string;
  status: AssessmentRunStatus;
  progressPercent: number;
  findingsCount: number;
  overallRiskLevel: RiskLevel | null;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: AssessmentStatus;
  repository: AssessmentRepositorySummary | null;
  configuration: AssessmentConfiguration;
  latestRun: AssessmentLatestRunSummary | null;
  latestRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentRunTimelineEvent {
  id: string;
  status: AssessmentRunStatus;
  progressPercent: number | null;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AssessmentRun {
  id: string;
  workspaceId: string;
  assessmentId: string;
  assessment: {
    id: string;
    name: string;
    status: AssessmentStatus;
  };
  status: AssessmentRunStatus;
  progressPercent: number;
  currentMessage: string | null;
  triggerSource: "MANUAL" | "SCHEDULED" | "API" | "SYSTEM";
  queueJobId: string | null;
  branch: string | null;
  stagingUrl: string | null;
  findingsCount: number;
  overallRiskLevel: RiskLevel | null;
  errorMessage: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  timeline: AssessmentRunTimelineEvent[];
}

export interface Finding {
  id: string;
  workspaceId: string;
  assessmentId: string;
  assessmentRunId: string;
  title: string;
  description: string | null;
  severity: Severity;
  category: FindingCategory;
  confidence: Confidence;
  status: FindingStatus;
  affectedComponent: string | null;
  filePath: string | null;
  endpoint: string | null;
  evidenceSummary: string | null;
  recommendedRemediation: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface FindingAggregate {
  totalCount: number;
  bySeverity: Array<{ severity: Severity; count: number }>;
  byCategory: Array<{ category: FindingCategory; count: number }>;
}

export interface Repository {
  id: string;
  workspaceId: string;
  integrationConnectionId?: string | null;
  provider: RepositoryProvider;
  owner: string;
  repoName: string;
  fullName: string;
  repoUrl: string | null;
  defaultBranch: string | null;
  branch?: string | null;
  connectionStatus: RepositoryConnectionStatus;
  lastScannedAt: string | null;
  lastSyncedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConnection {
  id: string;
  workspaceId: string;
  provider: RepositoryProvider;
  status: "ACTIVE" | "ERROR" | "REVOKED" | "DISCONNECTED";
  displayName: string | null;
  externalAccountId: string | null;
  externalAccountLogin: string | null;
  scopes: string[];
  providerMetadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorUserId: string | null;
  assessmentId: string | null;
  assessmentRunId: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
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
    severity: Severity;
    category: FindingCategory;
    confidence: Confidence;
    status: FindingStatus;
    evidenceSummary: string | null;
    recommendedRemediation: string | null;
  }>;
  mappedCategories: Array<{
    category: FindingCategory;
    count: number;
    highestSeverity: Severity;
  }>;
  remediationRoadmap: {
    fixNow: Array<{
      findingId: string;
      title: string;
      severity: Severity;
      category: FindingCategory;
      action: string | null;
    }>;
    next: Array<{
      findingId: string;
      title: string;
      severity: Severity;
      category: FindingCategory;
      action: string | null;
    }>;
    later: Array<{
      findingId: string;
      title: string;
      severity: Severity;
      category: FindingCategory;
      action: string | null;
    }>;
  };
  appendix: {
    findings: Array<{
      id: string;
      title: string;
      description: string | null;
      severity: Severity;
      category: FindingCategory;
      confidence: Confidence;
      status: FindingStatus;
      affectedComponent: string | null;
      filePath: string | null;
      endpoint: string | null;
      evidenceSummary: string | null;
      recommendedRemediation: string | null;
      metadata: Record<string, unknown> | null;
    }>;
  };
}

export interface Report {
  id: string;
  workspaceId: string;
  assessmentId: string;
  assessmentRunId: string | null;
  status: ReportStatus;
  version: number;
  title: string;
  executiveSummary: string | null;
  overallRiskRating: RiskLevel | null;
  content: ReportDocument;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardOverview {
  workspaceId: string;
  cards: {
    activeAssessmentsCount: number;
    connectedReposCount: number;
    highSeverityFindingsCount: number;
  };
  charts: {
    findingsBySeverity: Array<{ severity: Severity; count: number }>;
    assessmentsByStatus: Array<{ status: AssessmentStatus; count: number }>;
  };
}

export interface DashboardRecentReports {
  workspaceId: string;
  items: Array<{
    id: string;
    assessmentId: string;
    assessmentRunId: string | null;
    title: string;
    version: number;
    status: ReportStatus;
    overallRiskRating: RiskLevel | null;
    createdAt: string;
  }>;
}

export interface DashboardRecentActivity {
  workspaceId: string;
  items: ActivityEvent[];
}

export interface DashboardLatestRuns {
  workspaceId: string;
  items: Array<{
    id: string;
    assessmentId: string;
    assessmentName: string;
    status: AssessmentRunStatus;
    progressPercent: number;
    findingsCount: number;
    overallRiskLevel: RiskLevel | null;
    updatedAt: string;
  }>;
}
