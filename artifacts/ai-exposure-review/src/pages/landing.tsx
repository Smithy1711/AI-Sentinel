import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Search, Activity, Code, Server, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="px-6 h-16 flex items-center justify-between border-b">
        <div className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
          <Shield className="w-5 h-5" />
          <span>AI Exposure Review</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/signin" className="text-sm font-medium hover:underline text-muted-foreground">Sign In</Link>
          <Button onClick={() => setLocation("/signup")} size="sm">Get Started</Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            Secure your AI applications before they ship.
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
            The platform built for engineering and security teams to audit LLM apps, RAG pipelines, and agent workflows. Detect prompt injection, data leakage, and tool abuse automatically.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => setLocation("/signup")} className="text-base h-12 px-8">
              Start Assessment
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/reports/sample")} className="text-base h-12 px-8">
              View Sample Report
            </Button>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-20 bg-muted/30 border-y">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
              <p className="text-muted-foreground mt-4 text-lg">Seamless integration into your development lifecycle.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <Code className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3">1. Connect</h3>
                <p className="text-muted-foreground">Link your GitHub, GitLab, or Bitbucket repositories in seconds. We support all major AI frameworks.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3">2. Scan</h3>
                <p className="text-muted-foreground">Our engine performs static code analysis and dynamic runtime probing against OWASP Top 10 for LLMs.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <Activity className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3">3. Review</h3>
                <p className="text-muted-foreground">Get a prioritized list of findings with actionable remediation steps and exportable PDF reports.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Risks Covered */}
        <section className="py-24 px-6 max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Comprehensive coverage for AI risks</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">We go beyond traditional SAST to find logic flaws unique to generative AI architectures.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Prompt Injection", desc: "Detect vulnerabilities where untrusted inputs can override system instructions." },
              { title: "Data Leakage", desc: "Identify vectors where PII, system prompts, or confidential context can be exfiltrated." },
              { title: "Unsafe Tool Invocation", desc: "Audit agent boundaries, confirmation gates, and schema validation for external tool calls." },
              { title: "RAG Tenancy Flaws", desc: "Find missing access controls and isolation gaps in vector store retrieval pipelines." },
              { title: "Insecure Output Handling", desc: "Detect missing sanitization when rendering or executing LLM-generated outputs." },
              { title: "Denial of Wallet", desc: "Flag missing rate limits, spend caps, and token boundaries that could lead to cost abuse." }
            ].map((risk, i) => (
              <div key={i} className="p-6 border rounded-lg bg-card hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  {risk.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{risk.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-primary text-primary-foreground text-center">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to secure your AI pipelines?</h2>
            <p className="text-primary-foreground/80 text-lg mb-10">
              Join leading engineering teams building trust into their AI features from day one.
            </p>
            <Button size="lg" variant="secondary" onClick={() => setLocation("/signup")} className="text-base h-12 px-8 bg-white text-primary hover:bg-gray-100">
              Create Free Account <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t px-6 text-center text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 font-medium mb-4 md:mb-0">
            <Shield className="w-4 h-4" />
            <span>AI Exposure Review</span>
          </div>
          <p>© 2025 AI Exposure Review. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
