import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge, SeverityBadge } from "@/components/shared/badges";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function Assessments() {
  const [, setLocation] = useLocation();
  const { accessToken, activeWorkspace } = useSession();

  const assessmentsQuery = useQuery({
    queryKey: ["assessments", activeWorkspace?.id],
    enabled: Boolean(accessToken && activeWorkspace),
    queryFn: () => api.assessments.list(accessToken!, activeWorkspace!.id),
    refetchInterval: 5000,
  });

  if (assessmentsQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading assessments...</div>;
  }

  if (assessmentsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load assessments</AlertTitle>
        <AlertDescription>
          {assessmentsQuery.error instanceof Error
            ? assessmentsQuery.error.message
            : "Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  const assessments = assessmentsQuery.data ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
          <p className="text-muted-foreground">
            Create, launch, and monitor AI application security assessments.
          </p>
        </div>
        <Button onClick={() => setLocation("/assessments/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Assessment
        </Button>
      </div>

      {assessments.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">No assessments yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start your first assessment to analyze a repository or staging environment.
          </p>
          <Button className="mt-6" onClick={() => setLocation("/assessments/new")}>
            Create Assessment
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Assessment</th>
                <th className="px-6 py-4 font-medium hidden lg:table-cell">Repository</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium hidden md:table-cell">Branch</th>
                <th className="px-6 py-4 font-medium">Latest Run</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assessments.map((assessment) => (
                <tr
                  className="cursor-pointer hover:bg-muted/50"
                  key={assessment.id}
                  onClick={() => setLocation(`/assessments/${assessment.id}`)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-foreground">{assessment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(assessment.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-muted-foreground">
                    {assessment.repository?.fullName ?? "Manual configuration"}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={assessment.status} />
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">
                    {assessment.configuration.branch ?? assessment.repository?.defaultBranch ?? "-"}
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
                    <Button
                      onClick={(event) => {
                        event.stopPropagation();
                        setLocation(`/assessments/${assessment.id}`);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
