import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { mockAssessments } from "@/data/mockData";
import { StatusBadge, SeverityBadge } from "@/components/shared/badges";
import { Plus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Assessments() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: "Report Downloaded",
      description: "The PDF report has been downloaded successfully.",
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
          <p className="text-muted-foreground">View and manage all AI security assessments.</p>
        </div>
        <Button onClick={() => setLocation("/assessments/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Assessment
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-4 font-medium">Project</th>
              <th className="px-6 py-4 font-medium hidden md:table-cell">Repository</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium hidden sm:table-cell">Created</th>
              <th className="px-6 py-4 font-medium">Score</th>
              <th className="px-6 py-4 font-medium">Risk Level</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockAssessments.map((assessment) => (
              <tr 
                key={assessment.id} 
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setLocation(`/assessments/${assessment.id}`)}
              >
                <td className="px-6 py-4 font-medium text-foreground">{assessment.projectName}</td>
                <td className="px-6 py-4 text-muted-foreground hidden md:table-cell truncate max-w-[200px]">{assessment.repoUrl}</td>
                <td className="px-6 py-4"><StatusBadge status={assessment.status} /></td>
                <td className="px-6 py-4 text-muted-foreground hidden sm:table-cell">
                  {new Date(assessment.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">{assessment.score > 0 ? `${assessment.score}/100` : '-'}</td>
                <td className="px-6 py-4">{assessment.score > 0 ? <SeverityBadge severity={assessment.riskLevel} /> : '-'}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setLocation(`/assessments/${assessment.id}`); }}>
                    View
                  </Button>
                  {assessment.status === "Completed" && (
                    <Button variant="ghost" size="sm" onClick={handleDownload} title="Download Report">
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
