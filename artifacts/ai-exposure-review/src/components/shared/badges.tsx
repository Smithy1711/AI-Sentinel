import { Badge } from "@/components/ui/badge";
import { Severity, Status } from "@/types";
import { cn } from "@/lib/utils";

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const variants: Record<Severity, string> = {
    Critical: "bg-destructive text-destructive-foreground hover:bg-destructive",
    High: "bg-orange-500 text-white hover:bg-orange-600",
    Medium: "bg-amber-500 text-white hover:bg-amber-600",
    Low: "bg-blue-500 text-white hover:bg-blue-600",
    Info: "bg-slate-500 text-white hover:bg-slate-600",
  };

  return (
    <Badge className={cn(variants[severity], className)} variant="outline">
      {severity}
    </Badge>
  );
}

export function StatusBadge({ status, className }: { status: Status | "Active" | "Never Scanned" | "Error"; className?: string }) {
  const variants: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    Queued: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
    Running: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    Completed: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    Failed: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
    Active: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    "Never Scanned": "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
    Error: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <Badge className={cn(variants[status], className)} variant="outline">
      {status}
    </Badge>
  );
}
