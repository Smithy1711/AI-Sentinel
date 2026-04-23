import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/badges";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { formatEnumLabel } from "@/lib/presenters";
import { useSession } from "@/lib/session";
import { MoreVertical, Plus, RefreshCw } from "lucide-react";
import { SiBitbucket, SiGithub, SiGitlab } from "react-icons/si";
import type { RepositoryProvider } from "@/types";

function getProviderIcon(provider: RepositoryProvider) {
  switch (provider) {
    case "GITHUB":
      return <SiGithub className="w-5 h-5 text-foreground" />;
    case "GITLAB":
      return <SiGitlab className="w-5 h-5 text-orange-500" />;
    case "BITBUCKET":
      return <SiBitbucket className="w-5 h-5 text-blue-500" />;
  }
}

export default function Repositories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { accessToken, activeWorkspace } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [provider, setProvider] = useState<RepositoryProvider>("GITHUB");
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");

  const repositoriesQuery = useQuery({
    queryKey: ["repositories", activeWorkspace?.id],
    enabled: Boolean(accessToken && activeWorkspace),
    queryFn: () => api.repositories.list(accessToken!, activeWorkspace!.id),
  });

  if (repositoriesQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading repositories...</div>;
  }

  if (repositoriesQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load repositories</AlertTitle>
        <AlertDescription>
          {repositoriesQuery.error instanceof Error
            ? repositoriesQuery.error.message
            : "Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  const repositories = repositoriesQuery.data ?? [];

  const handleManualAdd = async () => {
    if (!accessToken || !activeWorkspace) {
      return;
    }

    try {
      await api.repositories.create(accessToken, activeWorkspace.id, {
        provider,
        owner,
        name,
        url: url || undefined,
        defaultBranch: defaultBranch || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["repositories", activeWorkspace.id] });
      toast({
        title: "Repository added",
        description: "The repository record is now available for assessments.",
      });
      setIsOpen(false);
      setOwner("");
      setName("");
      setUrl("");
      setDefaultBranch("main");
    } catch (error) {
      toast({
        title: "Repository add failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGithubConnect = async () => {
    if (!accessToken || !activeWorkspace) {
      return;
    }

    try {
      const result = await api.repositories.initiateGithub(accessToken, activeWorkspace.id);
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      toast({
        title: "GitHub connection failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGithubSync = async () => {
    if (!accessToken || !activeWorkspace) {
      return;
    }

    try {
      const result = await api.repositories.syncGithub(accessToken, activeWorkspace.id);
      await queryClient.invalidateQueries({ queryKey: ["repositories", activeWorkspace.id] });
      toast({
        title: "GitHub repositories synced",
        description: `${result.repositories.length} repositories are now available in the workspace.`,
      });
    } catch (error) {
      toast({
        title: "GitHub sync failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
          <p className="text-muted-foreground">
            Manage repository records and GitHub synchronization for the active workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void handleGithubConnect()} variant="outline">
            Connect GitHub
          </Button>
          <Button onClick={() => void handleGithubSync()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync GitHub
          </Button>
          <Dialog onOpenChange={setIsOpen} open={isOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Repository
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Repository</DialogTitle>
                <DialogDescription>
                  Create a manual repository record if you do not want to use GitHub sync yet.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select onValueChange={(value) => setProvider(value as RepositoryProvider)} value={provider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GITHUB">GitHub</SelectItem>
                      <SelectItem value="GITLAB">GitLab</SelectItem>
                      <SelectItem value="BITBUCKET">Bitbucket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Owner or org</Label>
                    <Input onChange={(event) => setOwner(event.target.value)} placeholder="acme" value={owner} />
                  </div>
                  <div className="space-y-2">
                    <Label>Repository name</Label>
                    <Input onChange={(event) => setName(event.target.value)} placeholder="ai-exposure-review" value={name} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Repository URL</Label>
                  <Input
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://github.com/acme/ai-exposure-review"
                    value={url}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default branch</Label>
                  <Input onChange={(event) => setDefaultBranch(event.target.value)} value={defaultBranch} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsOpen(false)} variant="outline">
                  Cancel
                </Button>
                <Button onClick={() => void handleManualAdd()}>Save Repository</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {repositories.length === 0 ? (
        <div className="rounded-lg border bg-card py-12 text-center">
          <h2 className="text-lg font-semibold">No repositories connected</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect GitHub or add a manual repository record before launching code-backed assessments.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-12 px-6 py-4 font-medium">Provider</th>
                <th className="px-6 py-4 font-medium">Repository</th>
                <th className="px-6 py-4 font-medium">Default Branch</th>
                <th className="px-6 py-4 font-medium">Last Synced</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {repositories.map((repository) => (
                <tr className="hover:bg-muted/50" key={repository.id}>
                  <td className="px-6 py-4">{getProviderIcon(repository.provider)}</td>
                  <td className="px-6 py-4 font-medium text-foreground">
                    {repository.repoUrl ? (
                      <a className="hover:text-primary hover:underline" href={repository.repoUrl} rel="noreferrer" target="_blank">
                        {repository.fullName}
                      </a>
                    ) : (
                      repository.fullName
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded bg-muted px-2 py-1 text-xs font-mono">
                      {repository.defaultBranch ?? "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {repository.lastSyncedAt
                      ? new Date(repository.lastSyncedAt).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={repository.connectionStatus} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="h-8 w-8 p-0" size="sm" variant="ghost">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void handleGithubSync()}>
                          Sync Provider
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          {formatEnumLabel(repository.connectionStatus)}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
