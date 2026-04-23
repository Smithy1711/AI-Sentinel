import { Link, useLocation } from "wouter";
import { LayoutDashboard, ShieldAlert, GitBranch, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { getInitials } from "@/lib/presenters";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Assessments", href: "/assessments", icon: ShieldAlert },
  { name: "Repositories", href: "/repositories", icon: GitBranch },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { activeWorkspace, user } = useSession();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center px-4 font-bold text-lg tracking-tight border-b text-primary">
        <ShieldAlert className="mr-2 h-5 w-5" />
        AI Exposure Review
      </div>
      
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {getInitials(user?.displayName ?? user?.email)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user?.displayName ?? user?.email}</span>
            <span className="text-xs text-muted-foreground">
              {activeWorkspace?.name ?? "No active workspace"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
