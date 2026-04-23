import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Activity, ArrowLeft, CheckCircle2, Circle, FileText, Play, RefreshCw, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SeverityBadge, StatusBadge } from "@/components/shared/badges";
import { api } from "@/lib/api";
import { formatEnumLabel } from "@/lib/presenters";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { AssessmentRunStatus } from "@/types";

const activeRunStatuses: AssessmentRunStatus[] = [
  "QUEUED",
  "PREPARING",
  "SCANNING",
  "NORMALIZING",
  "REPORT_GENERATION",
];

export default function AssessmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { accessToken, activeWorkspace } = useSession();

  const assessmentQuery = useQuery({
    queryKey: ["assessment", activeWorkspace?.id, id],
    enabled: Boolean(accessToken && activeWorkspace && id),
    queryFn: () => api.assessments.get(accessToken!, activeWorkspace!.id, id!),
    refetchInterval: 5000,
  });

  const latestRunId = assessmentQuery.data?.latestRun?.id ?? null;
  const shouldPollRun =
    assessmentQuery.data?.latestRun &&
    activeRunStatuses.includes(assessmentQuery.data.latestRun.status);

  const runQuery = useQuery({
    queryKey: ["assessment-run", activeWorkspace?.id, latestRunId],
    enabled: Boolean(accessToken && activeWorkspace && latestRunId),
    queryFn: () => api.runs.get(accessToken!, activeWorkspace!.id, latestRunId!),
    refetchInterval: shouldPollRun ? 3000 : false,
  });

  const aggregatesQuery = useQuery({
    queryKey: ["assessment-findings-aggregate", activeWorkspace?.id, id],
    enabled: Boolean(accessToken && activeWorkspace && id),
    queryFn: () => api.findings.aggregateForAssessment(accessToken!, activeWorkspace!.id, id!),
  });

  const activityQuery = useQuery({
    queryKey: ["assessment-activity", activeWorkspace?.id, id],
    enabled: Boolean(accessToken && activeWorkspace && id),
    queryFn: () => api.assessments.activity(accessToken!, activeWorkspace!.id, id!),
  });

  const reportQuery = useQuery({
    queryKey: ["assessment-report-latest", activeWorkspace?.id, id],
    enabled: Boolean(accessToken && activeWorkspace && id),
    queryFn: () => api.reports.latest(accessToken!, activeWorkspace!.id, id!),
  });

  const error =
    assessmentQuery.error ||
    runQuery.error ||
    aggregatesQuery.error ||
    activityQuery.error ||
    reportQuery.error;

  if (assessmentQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading assessment...</div>;
  }

  if (!assessmentQuery.data || error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load assessment</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  const assessment = assessmentQuery.data;
  const run = runQuery.data ?? null;
  const aggregates = aggregatesQuery.data;
  const report = reportQuery.data;
  const activity = activityQuery.data?.items ?? [];

  const launchAssessment = async () => {
    if (!accessToken || !activeWorkspace) {
      return;
    }

    await api.assessments.launch(accessToken, activeWorkspace.id, assessment.id);
    await queryClient.invalidateQueries();
  };

  const cancelAssessment = async () => {
    if (!accessToken || !activeWorkspace) {
      return;
    }

    await api.assessments.cancel(accessToken, activeWorkspace.id, assessment.id);
    await queryClient.invalidateQueries();
  };

  const generateReport = async () => {
    if (!accessToken || !activeWorkspace) {
      return;
    }

    const generatedReport = await api.reports.generate(accessToken, activeWorkspace.id, assessment.id);
    await queryClient.invalidateQueries();
    setLocation(`/reports/${generatedReport.id}`);
  };

  const launchDisabled =
    assessment.latestRun !== null &&
    activeRunStatuses.includes(assessment.latestRun.status);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <Button className="mb-2 -ml-3" onClick={() => setLocation("/assessments")} size="sm" variant="ghost">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Assessments
      </Button>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{assessment.name}</h1>
            <StatusBadge className="text-sm px-2 py-0.5" status={assessment.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{assessment.repository?.fullName ?? "No repository connected"}</span>
            <span>•</span>
            <span>{assessment.configuration.branch ?? assessment.repository?.defaultBranch ?? "No branch set"}</span>
            <span>•</span>
            <span>Created {new Date(assessment.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={launchDisabled} onClick={() => void launchAssessment()} variant="outline">
            <Play className="mr-2 h-4 w-4" />
            {assessment.latestRun ? "Run Again" : "Launch"}
          </Button>
          {launchDisabled ? (
            <Button onClick={() => void cancelAssessment()} variant="outline">
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Run
            </Button>
          ) : null}
          {report ? (
            <Button onClick={() => setLocation(`/reports/${report.id}`)}>
              <FileText className="mr-2 h-4 w-4" />
              Open Report
            </Button>
          ) : assessment.status === "COMPLETED" ? (
            <Button onClick={() => void generateReport()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Latest Run</CardTitle>
            <CardDescription>
              Current orchestration state for the most recent assessment execution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {run ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{run.currentMessage ?? formatEnumLabel(run.status)}</span>
                    <span className="font-medium">{run.progressPercent}%</span>
                  </div>
                  <Progress value={run.progressPercent} />
                </div>

                <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-muted">
                  {run.timeline.map((event) => (
                    <div className="relative flex gap-4" key={event.id}>
                      <div
                        className={cn(
                          "absolute left-[-6px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-background",
                          event.status === "COMPLETED"
                            ? "border-emerald-500 text-emerald-500"
                            : event.status === "FAILED" || event.status === "CANCELED"
                              ? "border-red-500 text-red-500"
                              : "border-primary text-primary",
                        )}
                      >
                        {event.status === "COMPLETED" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Circle className="h-2.5 w-2.5 fill-current" />
                        )}
                      </div>
                      <div className="w-full">
                        <div className="flex items-center justify-between gap-4">
                          <h4 className="font-medium">{formatEnumLabel(event.status)}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                This assessment has not been launched yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Findings Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {aggregates ? (
                aggregates.bySeverity.length > 0 ? (
                  aggregates.bySeverity.map((entry) => (
                    <div className="flex items-center justify-between" key={entry.severity}>
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={entry.severity} />
                      </div>
                      <span className="font-medium">{entry.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No findings recorded yet.</p>
                )
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="block text-xs text-muted-foreground">AI Provider</span>
                <span>{assessment.configuration.aiProvider ? formatEnumLabel(assessment.configuration.aiProvider) : "-"}</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Architecture</span>
                <span>
                  {assessment.configuration.aiArchitectureType
                    ? formatEnumLabel(assessment.configuration.aiArchitectureType)
                    : "-"}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Staging URL</span>
                <span>{assessment.configuration.stagingUrl ?? "-"}</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Scope Checks</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {assessment.configuration.selectedScopeChecks.length > 0 ? (
                    assessment.configuration.selectedScopeChecks.map((check) => (
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium" key={check}>
                        {formatEnumLabel(check)}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No scope selected</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assessment activity yet.</p>
              ) : (
                activity.map((item) => (
                  <div className="flex gap-4" key={item.id}>
                    <Activity className="mt-1 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{formatEnumLabel(item.action)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Actions</CardTitle>
            <CardDescription>Jump into the outputs generated for this assessment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" onClick={() => setLocation(`/assessments/${assessment.id}/findings`)} variant="outline">
              View Findings
            </Button>
            {report ? (
              <Button className="w-full justify-start" onClick={() => setLocation(`/reports/${report.id}`)} variant="outline">
                Open Latest Report
              </Button>
            ) : null}
            {assessment.repository ? (
              <Button className="w-full justify-start" onClick={() => setLocation("/repositories")} variant="outline">
                View Connected Repository
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
