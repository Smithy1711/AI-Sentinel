import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, CheckCircle2, ChevronDown, FileCode, Search, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeverityBadge } from "@/components/shared/badges";
import { api } from "@/lib/api";
import { formatCategoryLabel, formatEnumLabel } from "@/lib/presenters";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { Confidence, FindingCategory, FindingStatus, Severity } from "@/types";

const severityOptions: Array<Severity | "ALL"> = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const categoryOptions: Array<FindingCategory | "ALL"> = [
  "ALL",
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
];
const statusOptions: Array<FindingStatus | "ALL"> = ["ALL", "OPEN", "ACCEPTED_RISK", "FIXED", "FALSE_POSITIVE"];
const confidenceOptions: Array<Confidence | "ALL"> = ["ALL", "HIGH", "MEDIUM", "LOW"];

export default function Findings() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { accessToken, activeWorkspace } = useSession();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Severity | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<FindingCategory | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<FindingStatus | "ALL">("ALL");
  const [confidenceFilter, setConfidenceFilter] = useState<Confidence | "ALL">("ALL");

  const assessmentQuery = useQuery({
    queryKey: ["assessment", activeWorkspace?.id, id],
    enabled: Boolean(accessToken && activeWorkspace && id),
    queryFn: () => api.assessments.get(accessToken!, activeWorkspace!.id, id!),
  });

  const findingsQuery = useQuery({
    queryKey: [
      "assessment-findings",
      activeWorkspace?.id,
      id,
      severityFilter,
      categoryFilter,
      statusFilter,
      confidenceFilter,
    ],
    enabled: Boolean(accessToken && activeWorkspace && id),
    queryFn: () =>
      api.findings.listForAssessment(accessToken!, activeWorkspace!.id, id!, {
        severity: severityFilter === "ALL" ? undefined : [severityFilter],
        category: categoryFilter === "ALL" ? undefined : [categoryFilter],
        status: statusFilter === "ALL" ? undefined : [statusFilter],
        confidence: confidenceFilter === "ALL" ? undefined : [confidenceFilter],
      }),
  });

  const filteredFindings = useMemo(() => {
    const findings = findingsQuery.data ?? [];
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return findings;
    }

    return findings.filter((finding) => {
      return (
        finding.title.toLowerCase().includes(normalizedSearch) ||
        finding.description?.toLowerCase().includes(normalizedSearch) ||
        finding.evidenceSummary?.toLowerCase().includes(normalizedSearch) ||
        false
      );
    });
  }, [findingsQuery.data, search]);

  const error = assessmentQuery.error || findingsQuery.error;

  if (assessmentQuery.isLoading || findingsQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading findings...</div>;
  }

  if (!assessmentQuery.data || error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load findings</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  const assessment = assessmentQuery.data;

  const updateFindingStatus = async (findingId: string, nextStatus: FindingStatus) => {
    if (!accessToken || !activeWorkspace) {
      return;
    }

    await api.findings.updateStatus(accessToken, activeWorkspace.id, findingId, nextStatus);
    await queryClient.invalidateQueries({
      queryKey: ["assessment-findings", activeWorkspace.id, id],
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Button className="mb-2 -ml-3" onClick={() => setLocation(`/assessments/${assessment.id}`)} size="sm" variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assessment
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Findings</h1>
          <p className="text-muted-foreground">
            {assessment.name} • {filteredFindings.length} visible findings
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search findings..."
              value={search}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select onValueChange={(value) => setSeverityFilter(value as Severity | "ALL")} value={severityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                {severityOptions.map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {severity === "ALL" ? "All Severities" : formatEnumLabel(severity)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => setCategoryFilter(value as FindingCategory | "ALL")} value={categoryFilter}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === "ALL" ? "All Categories" : formatCategoryLabel(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => setStatusFilter(value as FindingStatus | "ALL")} value={statusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "ALL" ? "All Statuses" : formatEnumLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => setConfidenceFilter(value as Confidence | "ALL")} value={confidenceFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Confidence" />
              </SelectTrigger>
              <SelectContent>
                {confidenceOptions.map((confidence) => (
                  <SelectItem key={confidence} value={confidence}>
                    {confidence === "ALL" ? "All Confidence" : formatEnumLabel(confidence)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredFindings.length === 0 ? (
          <div className="rounded-lg border bg-card py-12 text-center">
            <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium">No findings match your filters</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Adjust the filters or launch a fresh assessment run to collect more findings.
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => (
            <Collapsible className="group overflow-hidden rounded-lg border bg-card" key={finding.id}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-start gap-4 p-5 text-left transition-colors hover:bg-muted/50">
                  <div className="mt-1">
                    <SeverityBadge severity={finding.severity} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between gap-4">
                      <h3 className="font-semibold text-foreground group-hover:text-primary">
                        {finding.title}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-xs font-medium",
                            finding.status === "OPEN"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30"
                              : finding.status === "FIXED"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30",
                          )}
                        >
                          {formatEnumLabel(finding.status)}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>{formatCategoryLabel(finding.category)}</span>
                      <span>•</span>
                      <span>Confidence: {formatEnumLabel(finding.confidence)}</span>
                      {finding.filePath ? (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                            <FileCode className="h-3 w-3" />
                            {finding.filePath}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4 space-y-6 border-t bg-muted/10 p-5 pt-5">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-foreground">Description</h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {finding.description ?? "No description was captured for this finding."}
                    </p>
                  </div>

                  {finding.evidenceSummary ? (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-foreground">Evidence Summary</h4>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {finding.evidenceSummary}
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-foreground">Recommended Remediation</h4>
                    <div className="flex gap-3 rounded-md border border-primary/10 bg-primary/5 p-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <p className="text-sm text-foreground">
                        {finding.recommendedRemediation ?? "No remediation guidance was generated yet."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    <Button onClick={() => void updateFindingStatus(finding.id, "FALSE_POSITIVE")} size="sm" variant="outline">
                      Mark False Positive
                    </Button>
                    <Button onClick={() => void updateFindingStatus(finding.id, "ACCEPTED_RISK")} size="sm" variant="outline">
                      Accept Risk
                    </Button>
                    <Button onClick={() => void updateFindingStatus(finding.id, "FIXED")} size="sm">
                      Mark Fixed
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </div>
    </div>
  );
}
