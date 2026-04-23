export type Severity = "Critical" | "High" | "Medium" | "Low" | "Info";
export type Status = "Draft" | "Queued" | "Running" | "Completed" | "Failed";

export type Assessment = {
  id: string;
  projectName: string;
  repoUrl: string;
  branch: string;
  status: Status;
  createdAt: string;
  score: number;
  riskLevel: Severity;
};

export type FindingCategory = "Prompt Injection" | "Data Leakage" | "Auth" | "Tool Abuse" | "Logging" | "Rate Limiting" | "RAG";
export type Confidence = "High" | "Medium" | "Low";

export type Finding = {
  id: string;
  assessmentId: string;
  title: string;
  severity: Severity;
  category: FindingCategory;
  confidence: Confidence;
  description: string;
  affectedFile: string;
  recommendation: string;
  status: "Open" | "Acknowledged" | "Resolved";
};

export type Repository = {
  id: string;
  provider: "github" | "gitlab" | "bitbucket";
  name: string;
  url: string;
  defaultBranch: string;
  lastScanned: string | null;
  assessmentCount: number;
  status: "Active" | "Never Scanned" | "Error";
};

export type ActivityEvent = {
  id: string;
  type: "assessment_completed" | "finding_detected" | "repo_connected" | "report_exported";
  title: string;
  timestamp: string;
};
