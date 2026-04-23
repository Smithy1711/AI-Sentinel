import { useParams, useLocation } from "wouter";
import { mockAssessments, mockFindings } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "@/components/shared/badges";
import { ArrowLeft, Download, Share2, Printer, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ReportViewer() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const assessment = mockAssessments.find(a => a.id === id) || mockAssessments[0];
  
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: "Report link has been copied to clipboard."
    });
  };

  const handleDownload = () => {
    toast({
      title: "Downloading PDF",
      description: "Your report is being generated and will download shortly."
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => setLocation(`/assessments/${assessment.id}`)} className="mb-2 -ml-3">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assessment
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Executive Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-lg shadow-sm print:shadow-none print:border-none p-8 md:p-12">
        {/* Report Header */}
        <div className="border-b pb-8 mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-primary mb-2">AI Exposure Review</h2>
            <p className="text-xl text-muted-foreground">{assessment.projectName}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground space-y-1">
            <p>Date: {new Date(assessment.createdAt).toLocaleDateString()}</p>
            <p>Target: {assessment.repoUrl.replace("https://", "")}</p>
            <p>Branch: {assessment.branch}</p>
          </div>
        </div>

        {/* Exec Summary */}
        <div className="space-y-6 mb-12">
          <h3 className="text-xl font-bold border-b pb-2">Executive Summary</h3>
          <div className="flex items-start gap-6">
            <div className="w-48 shrink-0 bg-muted/30 p-4 rounded-lg text-center">
              <span className="text-sm font-medium text-muted-foreground block mb-2">Overall Risk Rating</span>
              <SeverityBadge severity={assessment.riskLevel} className="text-lg px-4 py-1 w-full justify-center" />
              <div className="mt-4 pt-4 border-t border-border/50">
                <span className="text-sm font-medium text-muted-foreground block mb-1">Security Score</span>
                <span className="text-3xl font-bold">{assessment.score}/100</span>
              </div>
            </div>
            <div className="prose dark:prose-invert max-w-none text-sm">
              <p>
                An architecture review and dynamic analysis was performed against the <strong>{assessment.projectName}</strong> application. 
                The primary objective was to identify vulnerabilities within the LLM integration layer, focusing on prompt injection, 
                data leakage, and unauthorized tool execution.
              </p>
              <p>
                The assessment identified <strong>{mockFindings.length}</strong> total findings, with <strong>{mockFindings.filter(f => f.severity === 'Critical').length} Critical</strong> and <strong>{mockFindings.filter(f => f.severity === 'High').length} High</strong> severity issues.
                Immediate remediation is recommended for the Critical findings related to RAG pipeline sanitization and data leakage through debug endpoints.
              </p>
            </div>
          </div>
        </div>

        {/* OWASP Mapping */}
        <div className="space-y-6 mb-12">
          <h3 className="text-xl font-bold border-b pb-2">OWASP Top 10 for LLMs Coverage</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {["LLM01: Prompt Injection", "LLM02: Insecure Output Handling", "LLM03: Training Data Poisoning", 
              "LLM04: Model Denial of Service", "LLM05: Supply Chain Vulnerabilities", "LLM06: Sensitive Information Disclosure",
              "LLM07: Insecure Plugin Design", "LLM08: Excessive Agency", "LLM09: Overreliance", "LLM10: Model Theft"].map((cat, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-muted-foreground">{cat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Remediation Roadmap */}
        <div className="space-y-6 mb-12 break-inside-avoid">
          <h3 className="text-xl font-bold border-b pb-2">Remediation Roadmap</h3>
          
          <div className="space-y-4">
            <div className="border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 rounded-lg p-4">
              <h4 className="font-bold text-red-800 dark:text-red-400 mb-2">Phase 1: Fix Now (0-30 Days)</h4>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2 text-red-900/80 dark:text-red-300">
                {mockFindings.filter(f => f.severity === 'Critical' || f.severity === 'High').map(f => (
                  <li key={f.id}>{f.title}</li>
                ))}
              </ul>
            </div>
            
            <div className="border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 rounded-lg p-4">
              <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-2">Phase 2: Next Sprint (30-60 Days)</h4>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2 text-amber-900/80 dark:text-amber-300">
                {mockFindings.filter(f => f.severity === 'Medium').map(f => (
                  <li key={f.id}>{f.title}</li>
                ))}
              </ul>
            </div>
            
            <div className="border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4">
              <h4 className="font-bold text-blue-800 dark:text-blue-400 mb-2">Phase 3: Later (60-90 Days)</h4>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2 text-blue-900/80 dark:text-blue-300">
                {mockFindings.filter(f => f.severity === 'Low' || f.severity === 'Info').map(f => (
                  <li key={f.id}>{f.title}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Detailed Findings */}
        <div className="space-y-6 break-before-page">
          <h3 className="text-xl font-bold border-b pb-2">Detailed Findings</h3>
          <div className="space-y-8">
            {mockFindings.map((finding, idx) => (
              <div key={finding.id} className="border rounded-lg overflow-hidden break-inside-avoid">
                <div className="bg-muted/50 p-4 border-b flex items-start gap-4">
                  <div className="font-bold text-muted-foreground w-6 shrink-0 mt-0.5">{idx + 1}.</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-foreground">{finding.title}</h4>
                      <SeverityBadge severity={finding.severity} />
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Category: {finding.category} | Confidence: {finding.confidence} | Component: <span className="font-mono text-xs">{finding.affectedFile}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-4 bg-card text-sm">
                  <div>
                    <h5 className="font-semibold mb-1">Description</h5>
                    <p className="text-muted-foreground">{finding.description}</p>
                  </div>
                  <div>
                    <h5 className="font-semibold mb-1">Recommendation</h5>
                    <p className="text-muted-foreground">{finding.recommendation}</p>
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
