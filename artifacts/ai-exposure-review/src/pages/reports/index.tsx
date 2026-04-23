import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, SeverityBadge } from "@/components/shared/badges";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function ReportsIndex() {
  const { accessToken, activeWorkspace } = useSession();

  const reportsQuery = useQuery({
    queryKey: ["dashboard", "recent-reports", activeWorkspace?.id],
    enabled: Boolean(accessToken && activeWorkspace),
    queryFn: () => api.dashboard.recentReports(accessToken!),
  });

  if (reportsQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading reports...</div>;
  }

  if (reportsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load reports</AlertTitle>
        <AlertDescription>
          {reportsQuery.error instanceof Error ? reportsQuery.error.message : "Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  const reports = reportsQuery.data?.items ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Recent generated reports for the active workspace.
        </p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/60" />
            <div>
              <p className="font-medium">No reports yet</p>
              <p className="text-sm text-muted-foreground">
                Reports appear after a completed assessment run generates one.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{report.title}</CardTitle>
                  <CardDescription>
                    Generated {new Date(report.createdAt).toLocaleString()}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={report.status} />
                  {report.overallRiskRating ? (
                    <SeverityBadge severity={report.overallRiskRating} />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Version {report.version}
                </div>
                <Link className="text-sm font-medium text-primary hover:underline" href={`/reports/${report.id}`}>
                  Open report
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
