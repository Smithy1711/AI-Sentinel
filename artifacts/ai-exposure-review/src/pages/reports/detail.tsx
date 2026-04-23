import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Printer, Share2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/shared/badges";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { formatCategoryLabel, formatEnumLabel } from "@/lib/presenters";
import { useSession } from "@/lib/session";

export default function ReportViewer() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { accessToken, activeWorkspace } = useSession();

  const reportQuery = useQuery({
    queryKey: ["report", activeWorkspace?.id, id],
    enabled: Boolean(accessToken && activeWorkspace && id),
    queryFn: () => api.reports.getById(accessToken!, activeWorkspace!.id, id!),
  });

  if (reportQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading report...</div>;
  }

  if (reportQuery.isError || !reportQuery.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load report</AlertTitle>
        <AlertDescription>
          {reportQuery.error instanceof Error ? reportQuery.error.message : "Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  const report = reportQuery.data;

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied",
      description: "The report URL is now in your clipboard.",
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Button className="mb-2 -ml-3" onClick={() => setLocation(`/assessments/${report.assessmentId}`)} size="sm" variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assessment
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{report.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => void handleShare()} variant="outline">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button onClick={() => window.print()} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-8 shadow-sm print:border-none print:shadow-none md:p-12">
        <div className="mb-8 flex items-start justify-between border-b pb-8">
          <div>
            <h2 className="mb-2 text-3xl font-bold text-primary">AI Exposure Review</h2>
            <p className="text-xl text-muted-foreground">{report.content.scopeSummary.assessmentName}</p>
          </div>
          <div className="space-y-1 text-right text-sm text-muted-foreground">
            <p>Date: {new Date(report.createdAt).toLocaleDateString()}</p>
            <p>
              Target: {report.content.scopeSummary.repository?.fullName ?? "Manual configuration"}
            </p>
            <p>Branch: {report.content.scopeSummary.branch ?? "-"}</p>
          </div>
        </div>

        <div className="mb-12 space-y-6">
          <h3 className="border-b pb-2 text-xl font-bold">Executive Summary</h3>
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="w-full shrink-0 rounded-lg bg-muted/30 p-4 text-center md:w-48">
              <span className="mb-2 block text-sm font-medium text-muted-foreground">
                Overall Risk Rating
              </span>
              <SeverityBadge
                className="w-full justify-center text-lg px-4 py-1"
                severity={report.content.overallRiskRating}
              />
              <div className="mt-4 border-t border-border/50 pt-4">
                <span className="mb-1 block text-sm font-medium text-muted-foreground">
                  Findings Analyzed
                </span>
                <span className="text-3xl font-bold">
                  {report.content.scopeSummary.findingsAnalyzed}
                </span>
              </div>
            </div>
            <div className="prose max-w-none text-sm dark:prose-invert">
              <p>{report.content.executiveSummary}</p>
            </div>
          </div>
        </div>

        <div className="mb-12 space-y-6">
          <h3 className="border-b pb-2 text-xl font-bold">Scope Summary</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase text-muted-foreground">AI Provider</p>
              <p className="font-medium">
                {report.content.scopeSummary.aiProvider
                  ? formatEnumLabel(report.content.scopeSummary.aiProvider)
                  : "-"}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase text-muted-foreground">Architecture</p>
              <p className="font-medium">
                {report.content.scopeSummary.aiArchitectureType
                  ? formatEnumLabel(report.content.scopeSummary.aiArchitectureType)
                  : "-"}
              </p>
            </div>
            <div className="rounded-lg border p-4 md:col-span-2">
              <p className="text-xs uppercase text-muted-foreground">Scope Checks</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {report.content.scopeSummary.selectedScopeChecks.map((check) => (
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium" key={check}>
                    {formatEnumLabel(check)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12 space-y-6">
          <h3 className="border-b pb-2 text-xl font-bold">Mapped Categories</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {report.content.mappedCategories.map((category) => (
              <div className="flex items-center justify-between rounded-lg border p-4" key={category.category}>
                <div>
                  <p className="font-medium">{formatCategoryLabel(category.category)}</p>
                  <p className="text-sm text-muted-foreground">{category.count} findings</p>
                </div>
                <SeverityBadge severity={category.highestSeverity} />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-12 space-y-6 break-inside-avoid">
          <h3 className="border-b pb-2 text-xl font-bold">Remediation Roadmap</h3>
          <div className="space-y-4">
            {[
              {
                title: "Fix Now",
                items: report.content.remediationRoadmap.fixNow,
                classes: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-300",
              },
              {
                title: "Next",
                items: report.content.remediationRoadmap.next,
                classes: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-300",
              },
              {
                title: "Later",
                items: report.content.remediationRoadmap.later,
                classes: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/10 dark:text-blue-300",
              },
            ].map((section) => (
              <div className={`rounded-lg border p-4 ${section.classes}`} key={section.title}>
                <h4 className="mb-2 font-bold">{section.title}</h4>
                {section.items.length > 0 ? (
                  <ul className="ml-2 list-inside list-disc space-y-1 text-sm">
                    {section.items.map((item) => (
                      <li key={item.findingId}>{item.title}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm opacity-80">No findings were placed in this phase.</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6 break-before-page">
          <h3 className="border-b pb-2 text-xl font-bold">Appendix: Findings</h3>
          <div className="space-y-8">
            {report.content.appendix.findings.map((finding, index) => (
              <div className="overflow-hidden rounded-lg border break-inside-avoid" key={finding.id}>
                <div className="flex items-start gap-4 border-b bg-muted/50 p-4">
                  <div className="mt-0.5 w-6 shrink-0 font-bold text-muted-foreground">{index + 1}.</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-bold text-foreground">{finding.title}</h4>
                      <SeverityBadge severity={finding.severity} />
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Category: {formatCategoryLabel(finding.category)} | Confidence: {formatEnumLabel(finding.confidence)} | Status: {formatEnumLabel(finding.status)}
                    </div>
                  </div>
                </div>
                <div className="space-y-4 bg-card p-4 text-sm">
                  <div>
                    <h5 className="mb-1 font-semibold">Description</h5>
                    <p className="text-muted-foreground">
                      {finding.description ?? "No detailed description was captured."}
                    </p>
                  </div>
                  {finding.evidenceSummary ? (
                    <div>
                      <h5 className="mb-1 font-semibold">Evidence Summary</h5>
                      <p className="text-muted-foreground">{finding.evidenceSummary}</p>
                    </div>
                  ) : null}
                  <div>
                    <h5 className="mb-1 font-semibold">Recommendation</h5>
                    <p className="text-muted-foreground">
                      {finding.recommendedRemediation ?? "No remediation guidance was captured."}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
