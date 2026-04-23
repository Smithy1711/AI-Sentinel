import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SiGithub, SiGitlab, SiBitbucket } from "react-icons/si";
import { cn } from "@/lib/utils";
import { CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const steps = [
  { id: 1, name: "Connect Repository" },
  { id: 2, name: "App Details" },
  { id: 3, name: "Assessment Scope" },
  { id: 4, name: "Review & Launch" }
];

export default function NewAssessment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Form State
  const [provider, setProvider] = useState<"github" | "gitlab" | "bitbucket">("github");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  
  const [stagingUrl, setStagingUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [aiProvider, setAiProvider] = useState("openai");
  const [architecture, setArchitecture] = useState("llm_app");

  const [scope, setScope] = useState({
    static: true,
    promptInjection: true,
    rag: true,
    tools: true,
    auth: true,
    secrets: true,
    rateLimiting: true
  });

  const handleNext = () => {
    if (currentStep === 1 && !repoUrl) {
      toast({
        title: "Validation Error",
        description: "Repository URL is required.",
        variant: "destructive"
      });
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleLaunch = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsCompleted(true);
      toast({
        title: "Assessment Launched",
        description: "Your assessment has been queued successfully."
      });
    }, 1500);
  };

  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Assessment Queued</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          We are analyzing the repository. You will be notified when the results are ready to review.
        </p>
        <div className="pt-6">
          <Button onClick={() => setLocation("/assessments")}>
            Return to Assessments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Assessment</h1>
        <p className="text-muted-foreground">Configure and launch a new security scan.</p>
      </div>

      <div className="relative">
        <div className="absolute top-4 w-full h-0.5 bg-muted"></div>
        <div className="absolute top-4 h-0.5 bg-primary transition-all duration-300" 
             style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}></div>
        <div className="relative flex justify-between">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 bg-background transition-colors",
                currentStep > step.id ? "border-primary bg-primary text-primary-foreground" :
                currentStep === step.id ? "border-primary text-primary" : "border-muted text-muted-foreground"
              )}>
                {step.id}
              </div>
              <span className={cn(
                "text-xs font-medium",
                currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
              )}>{step.name}</span>
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].name}</CardTitle>
          <CardDescription>
            {currentStep === 1 && "Select your repository provider and provide the connection details."}
            {currentStep === 2 && "Provide context about the application's runtime environment."}
            {currentStep === 3 && "Select the security checks to perform during the assessment."}
            {currentStep === 4 && "Review your configuration before launching the assessment."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-3">
                <Label>Provider</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className={cn("border rounded-md p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors", provider === "github" ? "border-primary bg-primary/5" : "hover:bg-muted/50")}
                    onClick={() => setProvider("github")}
                  >
                    <SiGithub className="w-6 h-6" />
                    <span className="text-sm font-medium">GitHub</span>
                  </div>
                  <div 
                    className={cn("border rounded-md p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors", provider === "gitlab" ? "border-primary bg-primary/5" : "hover:bg-muted/50")}
                    onClick={() => setProvider("gitlab")}
                  >
                    <SiGitlab className="w-6 h-6" />
                    <span className="text-sm font-medium">GitLab</span>
                  </div>
                  <div 
                    className={cn("border rounded-md p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors", provider === "bitbucket" ? "border-primary bg-primary/5" : "hover:bg-muted/50")}
                    onClick={() => setProvider("bitbucket")}
                  >
                    <SiBitbucket className="w-6 h-6" />
                    <span className="text-sm font-medium">Bitbucket</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="repoUrl">Repository URL <span className="text-destructive">*</span></Label>
                <Input 
                  id="repoUrl" 
                  placeholder="https://github.com/org/repo" 
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">main</SelectItem>
                    <SelectItem value="master">master</SelectItem>
                    <SelectItem value="develop">develop</SelectItem>
                    <SelectItem value="staging">staging</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="aiProvider">Primary AI Provider</Label>
                  <Select value={aiProvider} onValueChange={setAiProvider}>
                    <SelectTrigger id="aiProvider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="cohere">Cohere</SelectItem>
                      <SelectItem value="azure">Azure OpenAI</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="architecture">Architecture Type</Label>
                  <Select value={architecture} onValueChange={setArchitecture}>
                    <SelectTrigger id="architecture">
                      <SelectValue placeholder="Select architecture" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llm_app">LLM App</SelectItem>
                      <SelectItem value="rag_app">RAG App</SelectItem>
                      <SelectItem value="agent">Agent Workflow</SelectItem>
                      <SelectItem value="copilot">Internal Copilot</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <h3 className="font-medium text-sm">Dynamic Analysis Configuration (Optional)</h3>
                <div className="space-y-2">
                  <Label htmlFor="stagingUrl">Staging URL</Label>
                  <Input 
                    id="stagingUrl" 
                    placeholder="https://staging.example.com" 
                    value={stagingUrl}
                    onChange={(e) => setStagingUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Required for runtime probing and injection tests.</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Test Username</Label>
                    <Input 
                      id="username" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Test Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              {[
                { id: 'static', label: 'Static Repo Scan', desc: 'SAST analysis of application code for known vulnerabilities.', disabled: true },
                { id: 'promptInjection', label: 'Prompt Injection Checks', desc: 'Fuzzing and payload testing to detect jailbreaks and override attempts.' },
                { id: 'rag', label: 'RAG Pipeline Checks', desc: 'Analyze retrieval mechanisms, context window poisoning, and tenancy.' },
                { id: 'tools', label: 'Tool Calling & Agent Checks', desc: 'Audit tool boundaries, confirmation gates, and unauthorized actions.' },
                { id: 'auth', label: 'Auth & Tenancy Review', desc: 'Verify access controls around AI endpoints and models.' },
                { id: 'secrets', label: 'Secrets & Logging Review', desc: 'Check for leaked credentials, PII in logs, and model output leakage.' },
                { id: 'rateLimiting', label: 'Rate Limiting & Abuse Controls', desc: 'Test for Denial of Wallet vulnerabilities and resource exhaustion.' }
              ].map(item => (
                <div key={item.id} className="flex items-start space-x-3 p-3 border rounded-md">
                  <Checkbox 
                    id={item.id} 
                    checked={(scope as any)[item.id]} 
                    disabled={item.disabled}
                    onCheckedChange={(checked) => setScope(prev => ({ ...prev, [item.id]: !!checked }))}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor={item.id} className={cn("font-medium", item.disabled && "opacity-70")}>
                      {item.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase">Repository details</h4>
                    <div className="bg-muted/30 rounded-md p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Provider:</span>
                        <span className="font-medium capitalize">{provider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">URL:</span>
                        <span className="font-medium truncate ml-4">{repoUrl}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Branch:</span>
                        <span className="font-medium">{branch}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase">App Configuration</h4>
                    <div className="bg-muted/30 rounded-md p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Provider:</span>
                        <span className="font-medium capitalize">{aiProvider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Architecture:</span>
                        <span className="font-medium capitalize">{architecture.replace('_', ' ')}</span>
                      </div>
                      {stagingUrl && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Staging URL:</span>
                          <span className="font-medium truncate ml-4">{stagingUrl}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase">Assessment Scope</h4>
                  <div className="bg-muted/30 rounded-md p-4 text-sm space-y-2">
                    {Object.entries(scope).filter(([_, v]) => v).map(([k]) => (
                      <div key={k} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || isSubmitting}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          {currentStep < steps.length ? (
            <Button onClick={handleNext}>
              Next Step
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleLaunch} disabled={isSubmitting}>
              {isSubmitting ? "Launching..." : "Launch Assessment"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
