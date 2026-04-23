import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { formatEnumLabel } from "@/lib/presenters";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { AiArchitectureType } from "@/types";

const steps = [
  { id: 1, name: "Assessment Details" },
  { id: 2, name: "Runtime Context" },
  { id: 3, name: "Scope" },
  { id: 4, name: "Review & Launch" },
];

const scopeOptions = [
  { id: "repo_analysis", label: "Repository Analysis", description: "Static review of the connected codebase." },
  { id: "prompt_injection", label: "Prompt Injection Checks", description: "Checks for prompt override and unsafe instruction handling." },
  { id: "rag_data_exposure", label: "RAG Data Exposure", description: "Reviews retrieval boundaries and context leakage risk." },
  { id: "excessive_agency", label: "Agent & Tool Controls", description: "Reviews tool invocation boundaries and approval gates." },
  { id: "weak_authz", label: "Authz & Tenancy", description: "Looks for weak workspace or tenant separation around AI features." },
  { id: "secrets_exposure", label: "Secrets & Integrations", description: "Reviews prompt, response, and integration secret exposure risk." },
  { id: "abuse_controls", label: "Spend & Abuse Controls", description: "Checks rate limiting and cost control coverage." },
];

export default function NewAssessment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { accessToken, activeWorkspace } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repositoryId, setRepositoryId] = useState<string>("none");
  const [branch, setBranch] = useState("");
  const [stagingUrl, setStagingUrl] = useState("");
  const [credentialsPlaceholder, setCredentialsPlaceholder] = useState("");
  const [aiProvider, setAiProvider] = useState("openai");
  const [architecture, setArchitecture] = useState<AiArchitectureType>("CHAT");
  const [selectedScopeChecks, setSelectedScopeChecks] = useState<string[]>([
    "repo_analysis",
    "prompt_injection",
    "rag_data_exposure",
    "excessive_agency",
  ]);

  const repositoriesQuery = useQuery({
    queryKey: ["repositories", activeWorkspace?.id],
    enabled: Boolean(accessToken && activeWorkspace),
    queryFn: () => api.repositories.list(accessToken!, activeWorkspace!.id),
  });

  const selectedRepository = useMemo(
    () => repositoriesQuery.data?.find((repository) => repository.id === repositoryId) ?? null,
    [repositoriesQuery.data, repositoryId],
  );

  const validateStep = () => {
    if (currentStep === 1 && !name.trim()) {
      toast({
        title: "Assessment name required",
        description: "Give the assessment a name before continuing.",
        variant: "destructive",
      });
      return false;
    }

    if (currentStep === 3 && selectedScopeChecks.length === 0) {
      toast({
        title: "Select at least one scope check",
        description: "The assessment needs at least one analysis scope.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep()) {
      return;
    }

    setCurrentStep((previous) => Math.min(previous + 1, steps.length));
  };

  const handleBack = () => {
    setCurrentStep((previous) => Math.max(previous - 1, 1));
  };

  const handleLaunch = async () => {
    if (!accessToken || !activeWorkspace) {
      return;
    }

    setIsSubmitting(true);
    let createdAssessmentId: string | null = null;

    try {
      const assessment = await api.assessments.create(accessToken, activeWorkspace.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        repositoryId: repositoryId === "none" ? null : repositoryId,
        branch: branch.trim() || selectedRepository?.defaultBranch || null,
        stagingUrl: stagingUrl.trim() || null,
        credentialsPlaceholder: credentialsPlaceholder.trim() || null,
        aiProvider: aiProvider || null,
        aiArchitectureType: architecture,
        selectedScopeChecks,
      });

      createdAssessmentId = assessment.id;
      await api.assessments.launch(accessToken, activeWorkspace.id, assessment.id);
      await queryClient.invalidateQueries();

      toast({
        title: "Assessment launched",
        description: "The backend created a run and started processing it.",
      });

      setLocation(`/assessments/${assessment.id}`);
    } catch (error) {
      toast({
        title: createdAssessmentId ? "Assessment saved as draft" : "Assessment launch failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });

      if (createdAssessmentId) {
        await queryClient.invalidateQueries();
        setLocation(`/assessments/${createdAssessmentId}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (repositoriesQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load repositories</AlertTitle>
        <AlertDescription>
          {repositoriesQuery.error instanceof Error
            ? repositoriesQuery.error.message
            : "Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Assessment</h1>
        <p className="text-muted-foreground">Configure and launch a real backend assessment run.</p>
      </div>

      <div className="relative">
        <div className="absolute top-4 h-0.5 w-full bg-muted" />
        <div
          className="absolute top-4 h-0.5 bg-primary transition-all duration-300"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
        <div className="relative flex justify-between">
          {steps.map((step) => (
            <div className="flex flex-col items-center gap-2" key={step.id}>
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background text-sm font-medium transition-colors",
                  currentStep > step.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : currentStep === step.id
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground",
                )}
              >
                {step.id}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].name}</CardTitle>
          <CardDescription>
            {currentStep === 1 && "Name the assessment and optionally attach a connected repository."}
            {currentStep === 2 && "Provide runtime context for optional staging checks and AI architecture metadata."}
            {currentStep === 3 && "Choose the AI-specific review scopes that should run."}
            {currentStep === 4 && "Review the configuration before creating the assessment and launching the run."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStep === 1 ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="assessment-name">Assessment name</Label>
                <Input
                  id="assessment-name"
                  placeholder="AI Exposure Review for Production Copilot"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assessment-description">Description</Label>
                <Textarea
                  id="assessment-description"
                  placeholder="Optional notes for reviewers or stakeholders."
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repository">Connected repository</Label>
                <Select value={repositoryId} onValueChange={setRepositoryId}>
                  <SelectTrigger id="repository">
                    <SelectValue placeholder="Select a repository" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No repository</SelectItem>
                    {(repositoriesQuery.data ?? []).map((repository) => (
                      <SelectItem key={repository.id} value={repository.id}>
                        {repository.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Repositories can be connected on the repositories page or through GitHub OAuth.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  placeholder={selectedRepository?.defaultBranch ?? "main"}
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                />
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ai-provider">Primary AI provider</Label>
                  <Select value={aiProvider} onValueChange={setAiProvider}>
                    <SelectTrigger id="ai-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="azure_openai">Azure OpenAI</SelectItem>
                      <SelectItem value="google_gemini">Google Gemini</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="architecture">Architecture type</Label>
                  <Select value={architecture} onValueChange={(value) => setArchitecture(value as AiArchitectureType)}>
                    <SelectTrigger id="architecture">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHAT">Chat</SelectItem>
                      <SelectItem value="RAG">RAG</SelectItem>
                      <SelectItem value="AGENT">Agent</SelectItem>
                      <SelectItem value="WORKFLOW">Workflow</SelectItem>
                      <SelectItem value="CLASSIFIER">Classifier</SelectItem>
                      <SelectItem value="CONTENT_GENERATION">Content Generation</SelectItem>
                      <SelectItem value="SEARCH">Search</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staging-url">Staging URL</Label>
                <Input
                  id="staging-url"
                  placeholder="https://staging.example.com"
                  value={stagingUrl}
                  onChange={(event) => setStagingUrl(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credentials-placeholder">Credentials placeholder</Label>
                <Input
                  id="credentials-placeholder"
                  placeholder="staging test account stored in secrets manager"
                  value={credentialsPlaceholder}
                  onChange={(event) => setCredentialsPlaceholder(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This is a note only. The backend stores it as a placeholder, not raw credentials.
                </p>
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-4">
              {scopeOptions.map((item) => {
                const checked = selectedScopeChecks.includes(item.id);

                return (
                  <div className="flex items-start space-x-3 rounded-md border p-3" key={item.id}>
                    <Checkbox
                      checked={checked}
                      id={item.id}
                      onCheckedChange={(value) => {
                        setSelectedScopeChecks((previous) => {
                          if (value) {
                            return previous.includes(item.id) ? previous : [...previous, item.id];
                          }

                          return previous.filter((entry) => entry !== item.id);
                        });
                      }}
                    />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor={item.id}>{item.label}</Label>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                    Assessment
                  </h4>
                  <div className="space-y-2 rounded-md bg-muted/30 p-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{name}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Repository</span>
                      <span className="font-medium">
                        {selectedRepository?.fullName ?? "No repository"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Branch</span>
                      <span className="font-medium">
                        {branch || selectedRepository?.defaultBranch || "-"}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                    Runtime
                  </h4>
                  <div className="space-y-2 rounded-md bg-muted/30 p-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">AI provider</span>
                      <span className="font-medium">{formatEnumLabel(aiProvider)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Architecture</span>
                      <span className="font-medium">{formatEnumLabel(architecture)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Staging URL</span>
                      <span className="font-medium">{stagingUrl || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                  Selected Scope
                </h4>
                <div className="space-y-2 rounded-md bg-muted/30 p-4 text-sm">
                  {selectedScopeChecks.map((item) => (
                    <div className="flex items-center gap-2" key={item}>
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>{formatEnumLabel(item)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button disabled={currentStep === 1 || isSubmitting} onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {currentStep < steps.length ? (
            <Button onClick={handleNext}>
              Next Step
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button disabled={isSubmitting} onClick={() => void handleLaunch()}>
              {isSubmitting ? "Launching..." : "Launch Assessment"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
