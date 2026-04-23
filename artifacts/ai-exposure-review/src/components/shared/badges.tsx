import { Badge } from "@/components/ui/badge";
import type {
  AssessmentRunStatus,
  AssessmentStatus,
  ReportStatus,
  RepositoryConnectionStatus,
  Severity,
} from "@/types";
import { cn } from "@/lib/utils";
import { formatEnumLabel } from "@/lib/presenters";

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const variants: Record<Severity, string> = {
    CRITICAL: "bg-destructive text-destructive-foreground hover:bg-destructive",
    HIGH: "bg-orange-500 text-white hover:bg-orange-600",
    MEDIUM: "bg-amber-500 text-white hover:bg-amber-600",
    LOW: "bg-blue-500 text-white hover:bg-blue-600",
    INFO: "bg-slate-500 text-white hover:bg-slate-600",
  };

  return (
    <Badge className={cn(variants[severity], className)} variant="outline">
      {formatEnumLabel(severity)}
    </Badge>
  );
}

type BadgeStatus =
  | AssessmentStatus
  | AssessmentRunStatus
  | RepositoryConnectionStatus
  | ReportStatus
  | "ACTIVE";

export function StatusBadge({ status, className }: { status: BadgeStatus; className?: string }) {
  const variants: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    QUEUED: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
    PREPARING: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300",
    SCANNING: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    NORMALIZING: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300",
    REPORT_GENERATION: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
    RUNNING: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    GENERATED: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    PUBLISHED: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    FAILED: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
    ERROR: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
    CANCELED: "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200",
    ARCHIVED: "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200",
    CONNECTED: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    DISCONNECTED: "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200",
    ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
  };

  return (
    <Badge className={cn(variants[status], className)} variant="outline">
      {formatEnumLabel(status)}
    </Badge>
  );
}
