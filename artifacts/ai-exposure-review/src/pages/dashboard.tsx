import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, FileText, GitBranch, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge, StatusBadge } from "@/components/shared/badges";
import { api } from "@/lib/api";
import { formatEnumLabel } from "@/lib/presenters";
import { useSession } from "@/lib/session";

const severityColors: Record<string, string> = {
  CRITICAL: "hsl(var(--destructive))",
  HIGH: "#f97316",
  MEDIUM: "#f59e0b",
  LOW: "#3b82f6",
  INFO: "#64748b",
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { accessToken, activeWorkspace } = useSession();

  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview", activeWorkspace?.id],
    enabled: Boolean(accessToken && activeWorkspace),
    queryFn: () => api.dashboard.overview(accessToken!),
  });

  const activityQuery = useQuery({
    queryKey: ["dashboard", "recent-activity", activeWorkspace?.id],
    enabled: Boolean(accessToken && activeWorkspace),
    queryFn: () => api.dashboard.recentActivity(accessToken!),
  });

  const reportsQuery = useQuery({
    queryKey: ["dashboard", "recent-reports", activeWorkspace?.id],
    enabled: Boolean(accessToken && activeWorkspace),
    queryFn: () => api.dashboard.recentReports(accessToken!),
  });

  const runsQuery = useQuery({
    queryKey: ["dashboard", "latest-runs", activeWorkspace?.id],
    enabled: Boolean(accessToken && activeWorkspace),
    queryFn: () => api.dashboard.latestRuns(accessToken!),
    refetchInterval: 5000,
  });

  const assessmentsQuery = useQuery({
    queryKey: ["assessments", activeWorkspace?.id],
    enabled: Boolean(accessToken && activeWorkspace),
    queryFn: () => api.assessments.list(accessToken!, activeWorkspace!.id),
  });

  if (
    overviewQuery.isLoading ||
    activityQuery.isLoading ||
    reportsQuery.isLoading ||
    runsQuery.isLoading ||
    assessmentsQuery.isLoading
  ) {
    return <div className="text-sm text-muted-foreground">Loading dashboard...</div>;
  }

  const error =
    overviewQuery.error ||
    activityQuery.error ||
    reportsQuery.error ||
    runsQuery.error ||
    assessmentsQuery.error;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load dashboard</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  const overview = overviewQuery.data!;
  const activity = activityQuery.data!.items;
  const reports = reportsQuery.data!.items;
  const latestRuns = runsQuery.data!.items;
  const recentAssessments = assessmentsQuery.data!.slice(0, 5);

  const findingsChartData = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map((severity) => ({
    name: formatEnumLabel(severity),
    value: overview.charts.findingsBySeverity.find((item) => item.severity === severity)?.count ?? 0,
    color: severityColors[severity],
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview for {activeWorkspace?.name}.
          </p>
        </div>
        <Button onClick={() => setLocation("/assessments/new")}>Start New Assessment</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assessments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.cards.activeAssessmentsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Severity Findings</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {overview.cards.highSeverityFindingsCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Repos</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.cards.connectedReposCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Findings by Severity</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={findingsChartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <XAxis axisLine={false} dataKey="name" fontSize={12} tickLine={false} />
                  <YAxis axisLine={false} fontSize={12} tickLine={false} />
                  <Tooltip cursor={{ fill: "transparent" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {findingsChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest workspace events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                activity.map((item) => (
                  <div className="flex items-start gap-4" key={item.id}>
                    <div className="mt-2 h-2 w-2 rounded-full bg-primary" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{formatEnumLabel(item.action)}</p>
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
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latest Runs</CardTitle>
            <CardDescription>Most recent assessment execution state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs have been launched yet.</p>
            ) : (
              latestRuns.map((run) => (
                <button
                  className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-left hover:bg-muted/50"
                  key={run.id}
                  onClick={() => setLocation(`/assessments/${run.assessmentId}`)}
                  type="button"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{run.assessmentName}</p>
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(run.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {run.overallRiskLevel ? <SeverityBadge severity={run.overallRiskLevel} /> : null}
                    <StatusBadge status={run.status} />
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Generated report outputs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports have been generated yet.</p>
            ) : (
              reports.map((report) => (
                <button
                  className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-left hover:bg-muted/50"
                  key={report.id}
                  onClick={() => setLocation(`/reports/${report.id}`)}
                  type="button"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{report.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Generated {new Date(report.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.overallRiskRating ? (
                      <SeverityBadge severity={report.overallRiskRating} />
                    ) : null}
                    <StatusBadge status={report.status} />
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Assessment</th>
                  <th className="px-6 py-3 font-medium">Repository</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Latest Run</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAssessments.map((assessment) => (
                  <tr className="border-b last:border-0 hover:bg-muted/50" key={assessment.id}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{assessment.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(assessment.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {assessment.repository?.fullName ?? "Manual configuration"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={assessment.status} />
                    </td>
                    <td className="px-6 py-4">
                      {assessment.latestRun ? (
                        <div className="flex items-center gap-2">
                          {assessment.latestRun.overallRiskLevel ? (
                            <SeverityBadge severity={assessment.latestRun.overallRiskLevel} />
                          ) : null}
                          <StatusBadge status={assessment.latestRun.status} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not launched</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button onClick={() => setLocation(`/assessments/${assessment.id}`)} size="sm" variant="ghost">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
