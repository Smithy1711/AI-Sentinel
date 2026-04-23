import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { mockAssessments, mockFindings } from "@/data/mockData";
import { SeverityBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Search, ChevronDown, FileCode, CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { FindingCategory, Severity } from "@/types";

export default function Findings() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const assessment = mockAssessments.find(a => a.id === id) || mockAssessments[0];
  
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredFindings = mockFindings.filter(f => {
    if (search && !f.title.toLowerCase().includes(search.toLowerCase()) && !f.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (severityFilter !== "All" && f.severity !== severityFilter) return false;
    if (categoryFilter !== "All" && f.category !== categoryFilter) return false;
    if (statusFilter !== "All" && f.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => setLocation(`/assessments/${assessment.id}`)} className="mb-2 -ml-3">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assessment
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Findings</h1>
          <p className="text-muted-foreground">{assessment.projectName} • {mockFindings.length} issues detected</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search findings..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Severities</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Info">Info</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                <SelectItem value="Prompt Injection">Prompt Injection</SelectItem>
                <SelectItem value="Data Leakage">Data Leakage</SelectItem>
                <SelectItem value="Auth">Auth & Tenancy</SelectItem>
                <SelectItem value="Tool Abuse">Tool Abuse</SelectItem>
                <SelectItem value="Logging">Logging</SelectItem>
                <SelectItem value="Rate Limiting">Rate Limiting</SelectItem>
                <SelectItem value="RAG">RAG</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Acknowledged">Acknowledged</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredFindings.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-lg">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium">No findings match your criteria</h3>
            <Button variant="link" onClick={() => { setSearch(""); setSeverityFilter("All"); setCategoryFilter("All"); setStatusFilter("All"); }}>
              Clear all filters
            </Button>
          </div>
        ) : (
          filteredFindings.map((finding) => (
            <Collapsible key={finding.id} className="bg-card border rounded-lg overflow-hidden group">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-start p-5 gap-4 text-left hover:bg-muted/50 transition-colors">
                  <div className="mt-1">
                    <SeverityBadge severity={finding.severity} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between gap-4">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{finding.title}</h3>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full",
                          finding.status === "Open" ? "bg-red-100 text-red-700 dark:bg-red-900/30" : 
                          finding.status === "Resolved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" :
                          "bg-amber-100 text-amber-700 dark:bg-amber-900/30"
                        )}>
                          {finding.status}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{finding.category}</span>
                      <span>•</span>
                      <span>Confidence: {finding.confidence}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        <FileCode className="h-3 w-3" />
                        {finding.affectedFile}
                      </span>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-5 pt-0 border-t bg-muted/10 space-y-6 mt-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-foreground">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{finding.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-foreground">Recommendation</h4>
                    <div className="bg-primary/5 border border-primary/10 rounded-md p-4 flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground">{finding.recommendation}</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm">Mark as False Positive</Button>
                    <Button variant="outline" size="sm">Acknowledge Risk</Button>
                    <Button size="sm">Mark as Resolved</Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </div>
    </div>
  );
}
