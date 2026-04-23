import { ReactNode, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useLocation } from "wouter";
import { useSession } from "@/lib/session";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location, setLocation] = useLocation();
  const { status, isAuthenticated, activeWorkspace } = useSession();
  const isPublicPage =
    location === "/" ||
    location === "/signin" ||
    location === "/signup" ||
    location === "/forgot-password";
  const isSetupPage =
    location === "/onboarding" || location === "/integrations/github/callback";

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!isAuthenticated && !isPublicPage) {
      setLocation("/signin");
      return;
    }

    if (isAuthenticated && !activeWorkspace && !isSetupPage) {
      setLocation("/onboarding");
      return;
    }

    if (isAuthenticated && isPublicPage) {
      setLocation(activeWorkspace ? "/dashboard" : "/onboarding");
    }
  }, [activeWorkspace, isAuthenticated, isPublicPage, isSetupPage, location, setLocation, status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading workspace...</div>
      </div>
    );
  }

  if (isPublicPage || isSetupPage) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  if (!isAuthenticated || !activeWorkspace) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
