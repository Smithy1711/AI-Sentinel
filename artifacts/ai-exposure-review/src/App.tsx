import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { SessionProvider } from "@/lib/session";
import NotFound from "@/pages/not-found";

import LandingPage from "@/pages/landing";
import SignIn from "@/pages/auth/signin";
import SignUp from "@/pages/auth/signup";
import WorkspaceOnboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import Assessments from "@/pages/assessments/index";
import NewAssessment from "@/pages/assessments/new";
import AssessmentDetail from "@/pages/assessments/detail";
import Findings from "@/pages/assessments/findings";
import GithubCallbackPage from "@/pages/integrations/github-callback";
import ReportsIndex from "@/pages/reports/index";
import ReportViewer from "@/pages/reports/detail";
import Repositories from "@/pages/repositories";
import Settings from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Placeholder for unwritten pages
function Placeholder({ title }: { title: string }) {
  return <div className="p-8"><h1>{title}</h1><p>Not yet implemented</p></div>;
}

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/signin" component={SignIn} />
        <Route path="/signup" component={SignUp} />
        <Route path="/onboarding" component={WorkspaceOnboarding} />
        <Route path="/forgot-password" component={() => <Placeholder title="Forgot Password" />} />
        <Route path="/integrations/github/callback" component={GithubCallbackPage} />
        
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/assessments" component={Assessments} />
        <Route path="/assessments/new" component={NewAssessment} />
        <Route path="/assessments/:id" component={AssessmentDetail} />
        <Route path="/assessments/:id/findings" component={Findings} />
        <Route path="/reports" component={ReportsIndex} />
        <Route path="/reports/:id" component={ReportViewer} />
        <Route path="/repositories" component={Repositories} />
        <Route path="/settings" component={Settings} />
        
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

export default App;
