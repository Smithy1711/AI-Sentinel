import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useLocation } from "wouter";
import { isAuthenticated } from "@/lib/auth";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location, setLocation] = useLocation();
  const isAuthPage = location === "/" || location === "/signin" || location === "/signup" || location === "/forgot-password";
  const authenticated = isAuthenticated();

  // Simple client-side protection
  if (!isAuthPage && !authenticated) {
    setLocation("/signin");
    return null;
  }

  if (isAuthPage && authenticated) {
    if (location !== "/") {
      setLocation("/dashboard");
    }
  }

  if (isAuthPage) {
    return <div className="min-h-screen bg-background">{children}</div>;
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
