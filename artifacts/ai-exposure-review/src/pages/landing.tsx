import { Link, useLocation } from "wouter";
import { Activity, ArrowRight, Code, Lock, Search, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-primary">
          <Shield className="h-5 w-5" />
          <span>AI Exposure Review</span>
        </div>
        <div className="flex items-center gap-4">
          <Link className="text-sm font-medium text-muted-foreground hover:underline" href="/signin">
            Sign In
          </Link>
          <Button onClick={() => setLocation("/signup")} size="sm">
            Get Started
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-24 text-center md:px-12">
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground md:text-6xl">
            Secure your AI applications before they ship.
          </h1>
          <p className="mx-auto mb-10 max-w-3xl text-xl leading-relaxed text-muted-foreground">
            The platform built for engineering and security teams to audit LLM apps, RAG pipelines,
            and agent workflows. Detect prompt injection, data leakage, and tool abuse automatically.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button className="h-12 px-8 text-base" onClick={() => setLocation("/signup")} size="lg">
              Start Assessment
            </Button>
            <Button className="h-12 px-8 text-base" onClick={() => setLocation("/signin")} size="lg" variant="outline">
              Sign In
            </Button>
          </div>
        </section>

        <section className="border-y bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Seamless integration into your development lifecycle.
              </p>
            </div>

            <div className="grid gap-12 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Code className="h-8 w-8" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">1. Connect</h3>
                <p className="text-muted-foreground">
                  Link your GitHub repositories or add repository records manually for assessment setup.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Search className="h-8 w-8" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">2. Launch</h3>
                <p className="text-muted-foreground">
                  Create an assessment, choose your AI-specific scope checks, and start a tracked run.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Activity className="h-8 w-8" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">3. Review</h3>
                <p className="text-muted-foreground">
                  Inspect findings, activity, and generated reports directly from the workspace dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-16">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">
              Comprehensive coverage for AI risks
            </h2>
            <p className="max-w-2xl text-lg text-muted-foreground">
              The platform focuses on AI application security weaknesses rather than generic scanning claims.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Prompt Injection",
                description: "Detect untrusted inputs that can override hidden or system instructions.",
              },
              {
                title: "Data Leakage",
                description: "Surface prompt, response, tenancy, and retrieval paths that can leak sensitive data.",
              },
              {
                title: "Unsafe Tool Invocation",
                description: "Review tool boundaries, confirmation gates, and agent permissions.",
              },
              {
                title: "RAG Exposure",
                description: "Identify retrieval leakage and weak access boundaries around vector-backed flows.",
              },
              {
                title: "Insecure Output Handling",
                description: "Flag risky output rendering and downstream handling patterns.",
              },
              {
                title: "Spend Abuse",
                description: "Highlight missing rate limits and weak cost-control safeguards.",
              },
            ].map((risk) => (
              <div className="rounded-lg border bg-card p-6 transition-shadow hover:shadow-md" key={risk.title}>
                <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                  <Lock className="h-4 w-4 text-primary" />
                  {risk.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{risk.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-primary py-20 text-center text-primary-foreground">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="mb-6 text-3xl font-bold md:text-4xl">Ready to review your AI exposure?</h2>
            <p className="mb-10 text-lg text-primary-foreground/80">
              Create a workspace, connect a repository, and launch the first backend-driven assessment.
            </p>
            <Button
              className="h-12 bg-white px-8 text-base text-primary hover:bg-gray-100"
              onClick={() => setLocation("/signup")}
              size="lg"
              variant="secondary"
            >
              Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between md:flex-row">
          <div className="mb-4 flex items-center gap-2 font-medium md:mb-0">
            <Shield className="h-4 w-4" />
            <span>AI Exposure Review</span>
          </div>
          <p>© 2026 AI Exposure Review. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
