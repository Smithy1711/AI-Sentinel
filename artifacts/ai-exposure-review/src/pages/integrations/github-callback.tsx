import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/session";
import { api } from "@/lib/api";

export default function GithubCallbackPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { accessToken, activeWorkspace } = useSession();

  useEffect(() => {
    if (!accessToken || !activeWorkspace) {
      setLocation("/signin");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      toast({
        title: "GitHub connection failed",
        description: "The callback is missing the required OAuth parameters.",
        variant: "destructive",
      });
      setLocation("/repositories");
      return;
    }

    void (async () => {
      try {
        await api.repositories.completeGithub(accessToken, activeWorkspace.id, {
          code,
          state,
        });
        await api.repositories.syncGithub(accessToken, activeWorkspace.id);
        await queryClient.invalidateQueries();
        toast({
          title: "GitHub connected",
          description: "Repositories were synced into the workspace.",
        });
      } catch (error) {
        toast({
          title: "GitHub connection failed",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLocation("/repositories");
      }
    })();
  }, [accessToken, activeWorkspace, queryClient, setLocation, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div>
          <h1 className="font-semibold">Finishing GitHub connection</h1>
          <p className="text-sm text-muted-foreground">
            We are finalizing the OAuth callback and syncing repositories.
          </p>
        </div>
      </div>
    </div>
  );
}
