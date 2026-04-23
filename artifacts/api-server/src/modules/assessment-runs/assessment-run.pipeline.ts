import {
  ConfidenceLevel,
  FindingCategory,
  FindingSeverity,
  RiskLevel,
  type AiArchitectureType,
} from "@prisma/client";

export interface AssessmentExecutionAssessment {
  id: string;
  name: string;
  description: string | null;
  repositoryId: string | null;
  branch: string | null;
  stagingUrl: string | null;
  aiProvider: string | null;
  aiArchitectureType: AiArchitectureType | null;
  selectedScopeChecks: string[];
  credentialsPlaceholder: string | null;
}

export interface AssessmentExecutionRun {
  id: string;
  workspaceId: string;
  assessmentId: string;
  branch: string | null;
  stagingUrl: string | null;
}

export interface AssessmentExecutionContext {
  assessment: AssessmentExecutionAssessment;
  run: AssessmentExecutionRun;
}

export interface RepoAnalysisResult {
  summary: string;
  metadata: Record<string, unknown>;
}

export interface RuntimeProbeResult {
  summary: string;
  metadata: Record<string, unknown>;
}

export interface NormalizedFindingDraft {
  severity: FindingSeverity;
  riskLevel: RiskLevel;
  confidence: ConfidenceLevel;
  category: FindingCategory;
  title: string;
  summary: string;
  description: string;
  affectedComponent?: string;
  affectedFilePath?: string;
  affectedEndpoint?: string;
  evidenceSummary?: string;
  recommendedRemediation?: string;
  evidence: Record<string, unknown>;
  remediation: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface GeneratedReportDraft {
  riskLevel: RiskLevel;
  executiveSummary: string;
  summaryJson: Record<string, unknown>;
  remediationRoadmap: Record<string, unknown>;
}

export interface RepositoryAnalysisEngine {
  analyze(context: AssessmentExecutionContext): Promise<RepoAnalysisResult>;
}

export interface RuntimeProbeEngine {
  probe(
    context: AssessmentExecutionContext,
    repoAnalysis: RepoAnalysisResult,
  ): Promise<RuntimeProbeResult>;
}

export interface FindingNormalizationEngine {
  normalize(input: {
    context: AssessmentExecutionContext;
    repoAnalysis: RepoAnalysisResult;
    runtimeProbe: RuntimeProbeResult;
  }): Promise<NormalizedFindingDraft[]>;
}

export interface ReportGenerationEngine {
  generate(input: {
    context: AssessmentExecutionContext;
    findings: NormalizedFindingDraft[];
    repoAnalysis: RepoAnalysisResult;
    runtimeProbe: RuntimeProbeResult;
  }): Promise<GeneratedReportDraft>;
}

export interface AssessmentExecutionPipeline {
  repositoryAnalysis: RepositoryAnalysisEngine;
  runtimeProbe: RuntimeProbeEngine;
  findingNormalization: FindingNormalizationEngine;
  reportGeneration: ReportGenerationEngine;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function highestRisk(findings: NormalizedFindingDraft[]): RiskLevel {
  const order: RiskLevel[] = [
    RiskLevel.CRITICAL,
    RiskLevel.HIGH,
    RiskLevel.MEDIUM,
    RiskLevel.LOW,
    RiskLevel.INFO,
  ];

  return (
    order.find((level) => findings.some((finding) => finding.riskLevel === level)) ??
    RiskLevel.INFO
  );
}

class PlaceholderRepositoryAnalysisEngine implements RepositoryAnalysisEngine {
  async analyze(context: AssessmentExecutionContext): Promise<RepoAnalysisResult> {
    await sleep(15);

    return {
      summary: context.assessment.repositoryId
        ? "Repository analysis placeholder completed."
        : "No repository linked; repository analysis placeholder skipped.",
      metadata: {
        repositoryLinked: Boolean(context.assessment.repositoryId),
        branch: context.run.branch,
        analyzedFilesEstimate: context.assessment.repositoryId ? 42 : 0,
      },
    };
  }
}

class PlaceholderRuntimeProbeEngine implements RuntimeProbeEngine {
  async probe(
    context: AssessmentExecutionContext,
    repoAnalysis: RepoAnalysisResult,
  ): Promise<RuntimeProbeResult> {
    await sleep(15);

    return {
      summary: context.run.stagingUrl
        ? "Runtime probe placeholder completed against the staging target."
        : "No staging URL configured; runtime probe placeholder skipped.",
      metadata: {
        stagingUrl: context.run.stagingUrl,
        probeMode: context.run.stagingUrl ? "staging_url" : "disabled",
        credentialsProvided: Boolean(context.assessment.credentialsPlaceholder),
        repoAnalysisSummary: repoAnalysis.summary,
      },
    };
  }
}

class PlaceholderFindingNormalizationEngine
  implements FindingNormalizationEngine
{
  async normalize(input: {
    context: AssessmentExecutionContext;
    repoAnalysis: RepoAnalysisResult;
    runtimeProbe: RuntimeProbeResult;
  }): Promise<NormalizedFindingDraft[]> {
    await sleep(15);

    const findings: NormalizedFindingDraft[] = [
      {
        severity: FindingSeverity.HIGH,
        riskLevel: RiskLevel.HIGH,
        confidence: ConfidenceLevel.MEDIUM,
        category: FindingCategory.PROMPT_INJECTION,
        title: "Prompt handling lacks explicit injection defenses",
        summary:
          "Placeholder analysis indicates prompt inputs should be reviewed for untrusted content handling.",
        description:
          "This placeholder finding represents where real scanner output about prompt injection hardening would be normalized into the shared schema.",
        affectedComponent: "prompt-construction-layer",
        affectedFilePath: "src/ai/prompt-builder.ts",
        evidenceSummary:
          "Prompt construction appears to mix user-controlled content with trusted instructions.",
        recommendedRemediation:
          "Separate untrusted user input from trusted instructions and add explicit output handling guards.",
        evidence: {
          source: "placeholder_repo_analysis",
          branch: input.context.run.branch,
          repoSummary: input.repoAnalysis.summary,
        },
        remediation: {
          actions: [
            "Review prompt construction boundaries for user-controlled content.",
            "Add explicit output guardrails before tool or model responses are trusted.",
          ],
        },
        metadata: {
          scopeChecks: input.context.assessment.selectedScopeChecks,
        },
      },
    ];

    if (input.context.assessment.aiArchitectureType === "AGENT") {
      findings.push({
        severity: FindingSeverity.MEDIUM,
        riskLevel: RiskLevel.MEDIUM,
        confidence: ConfidenceLevel.MEDIUM,
        category: FindingCategory.EXCESSIVE_AGENCY,
        title: "Agent tool permissions need review",
        summary:
          "Placeholder agent analysis indicates tool access policies should be validated.",
        description:
          "This placeholder finding marks where real tool invocation and permission checks would be recorded for agent-style systems.",
        affectedComponent: "agent-tooling",
        affectedEndpoint: input.context.run.stagingUrl ?? "/agent/actions",
        evidenceSummary:
          "The current agent configuration suggests tool permissions may be broader than required.",
        recommendedRemediation:
          "Constrain tool scope, require explicit allowlists, and validate tool outputs before use.",
        evidence: {
          source: "placeholder_runtime_probe",
          runtimeSummary: input.runtimeProbe.summary,
        },
        remediation: {
          actions: [
            "Constrain tool permissions to the minimum required scope.",
            "Add allowlists and output validation for sensitive tool calls.",
          ],
        },
      });
    }

    return findings;
  }
}

class PlaceholderReportGenerationEngine implements ReportGenerationEngine {
  async generate(input: {
    context: AssessmentExecutionContext;
    findings: NormalizedFindingDraft[];
    repoAnalysis: RepoAnalysisResult;
    runtimeProbe: RuntimeProbeResult;
  }): Promise<GeneratedReportDraft> {
    await sleep(15);

    const riskLevel = highestRisk(input.findings);

    return {
      riskLevel,
      executiveSummary:
        "Assessment run completed with placeholder analysis results. The report structure is production-ready, but the scanner stages are currently scaffolded.",
      summaryJson: {
        findingsCount: input.findings.length,
        riskLevel,
        repoAnalysis: input.repoAnalysis.metadata,
        runtimeProbe: input.runtimeProbe.metadata,
      },
      remediationRoadmap: {
        shortTerm: [
          "Review prompt and tool execution boundaries.",
          "Validate staging/runtime protections around AI-enabled flows.",
        ],
        mediumTerm: [
          "Replace placeholder analyzers with repository, runtime, and normalization engines.",
        ],
      },
    };
  }
}

export function createPlaceholderAssessmentExecutionPipeline(): AssessmentExecutionPipeline {
  return {
    repositoryAnalysis: new PlaceholderRepositoryAnalysisEngine(),
    runtimeProbe: new PlaceholderRuntimeProbeEngine(),
    findingNormalization: new PlaceholderFindingNormalizationEngine(),
    reportGeneration: new PlaceholderReportGenerationEngine(),
  };
}
