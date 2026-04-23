import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { mockAssessments } from "@/data/mockData";
import { StatusBadge, SeverityBadge } from "@/components/shared/badges";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Circle, ArrowLeft, Download, Activity, FileText } from "lucide-react";
import { SiGithub, SiGitlab, SiBitbucket } from "react-icons/si";
import { cn } from "@/lib/utils";

export default function AssessmentDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const assessment = mockAssessments.find(a => a.id === id) || mockAssessments[0];

  const providerIcon = assessment.repoUrl.includes("github") ? <SiGithub className="w-4 h-4" /> : 
                       assessment.repoUrl.includes("gitlab") ? <SiGitlab className="w-4 h-4" /> : 
                       <SiBitbucket className="w-4 h-4" />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <Button variant="ghost" size="sm" onClick={() => setLocation("/assessments")} className="mb-2 -ml-3">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Assessments
      </Button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{assessment.projectName}</h1>
            <StatusBadge status={assessment.status} className="text-sm px-2 py-0.5" />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {providerIcon}
              {assessment.repoUrl.replace("https://", "")}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Circle className="w-3 h-3 fill-current text-primary" />
              {assessment.branch}
            </span>
            <span>•</span>
            <span>Started {new Date(assessment.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {assessment.status === "Completed" && (
            <>
              <div className="flex flex-col items-end mr-4">
                <span className="text-sm text-muted-foreground mb-1">Overall Score</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{assessment.score}/100</span>
                  <SeverityBadge severity={assessment.riskLevel} />
                </div>
              </div>
              <Button variant="outline" onClick={() => setLocation(`/reports/${assessment.id}`)}>
                <Download className="w-4 h-4 mr-2" />
                Report
              </Button>
            </>
          )}
          <Button onClick={() => setLocation(`/assessments/${assessment.id}/findings`)}>
            View Findings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="findings" onClick={() => setLocation(`/assessments/${assessment.id}/findings`)}>
            Findings
          </TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Assessment Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">
                  {[
                    { title: "Repository Connected", desc: "Successfully authenticated and cloned repository", done: true },
                    { title: "Static Analysis", desc: "Scanned AST for hardcoded secrets and known vulns", done: true },
                    { title: "Dynamic Probes", desc: "Executed fuzzing payloads against staging endpoint", done: assessment.status === "Completed" || assessment.status === "Running" },
                    { title: "Report Generation", desc: "Compiling findings into actionable report", done: assessment.status === "Completed" },
                  ].map((step, idx) => (
                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-full border-2 bg-background absolute left-0 md:left-1/2 -translate-x-1/2",
                        step.done ? "border-emerald-500 text-emerald-500" : "border-muted-foreground text-muted-foreground"
                      )}>
                        {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                      </div>
                      <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] ml-6 md:ml-0 md:group-odd:text-right md:group-even:text-left">
                        <h4 className={cn("font-medium", step.done ? "text-foreground" : "text-muted-foreground")}>{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Findings Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-destructive" /><span className="text-sm">Critical</span></div>
                    <span className="font-medium">4</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500" /><span className="text-sm">High</span></div>
                    <span className="font-medium">8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-sm">Medium</span></div>
                    <span className="font-medium">14</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-sm">Low</span></div>
                    <span className="font-medium">22</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Detected AI Surface</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Providers</span>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs px-2 py-1 bg-muted rounded-md font-medium">OpenAI GPT-4o</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Frameworks</span>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs px-2 py-1 bg-muted rounded-md font-medium">LangChain</span>
                      <span className="text-xs px-2 py-1 bg-muted rounded-md font-medium">FastAPI</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Vector Store</span>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs px-2 py-1 bg-muted rounded-md font-medium">Pinecone</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Tools detected</span>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs px-2 py-1 bg-muted rounded-md font-medium">Email</span>
                      <span className="text-xs px-2 py-1 bg-muted rounded-md font-medium">Calendar</span>
                      <span className="text-xs px-2 py-1 bg-muted rounded-md font-medium">Web Search</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="evidence">
          <Card>
            <CardHeader>
              <CardTitle>Evidence Files</CardTitle>
              <CardDescription>Raw logs and payload responses from the assessment run.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="font-semibold text-lg">No evidence files available yet</h3>
                <p className="text-muted-foreground max-w-sm mt-2">
                  Evidence files will appear here once the relevant dynamic probes complete.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  "Assessment started by Jane Doe",
                  "Repository connected successfully",
                  "Static analysis complete - 12 findings detected",
                  "Dynamic analysis started on staging.example.com",
                ].map((act, i) => (
                  <div key={i} className="flex gap-4">
                    <Activity className="w-4 h-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{act}</p>
                      <p className="text-xs text-muted-foreground">Today at 10:00 AM</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
