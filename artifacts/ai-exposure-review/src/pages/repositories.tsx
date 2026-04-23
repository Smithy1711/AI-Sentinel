import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { mockRepositories } from "@/data/mockData";
import { StatusBadge } from "@/components/shared/badges";
import { Plus, RefreshCw, MoreVertical, Trash, Play } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { SiGithub, SiGitlab, SiBitbucket } from "react-icons/si";

export default function Repositories() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [provider, setProvider] = useState("github");
  const [url, setUrl] = useState("");

  const handleAdd = () => {
    if (!url) return;
    toast({
      title: "Repository Added",
      description: "Successfully connected to repository.",
    });
    setIsOpen(false);
    setUrl("");
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "github": return <SiGithub className="w-5 h-5 text-foreground" />;
      case "gitlab": return <SiGitlab className="w-5 h-5 text-orange-500" />;
      case "bitbucket": return <SiBitbucket className="w-5 h-5 text-blue-500" />;
      default: return <SiGithub className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
          <p className="text-muted-foreground">Manage connected codebases and integration settings.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Repository
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Repository</DialogTitle>
              <DialogDescription>
                Link a new codebase to your workspace for continuous scanning.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="gitlab">GitLab</SelectItem>
                    <SelectItem value="bitbucket">Bitbucket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Repository URL</Label>
                <Input 
                  placeholder="https://github.com/org/repo" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Branch</Label>
                <Input defaultValue="main" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Connect</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-4 font-medium w-12">Provider</th>
              <th className="px-6 py-4 font-medium">Repository</th>
              <th className="px-6 py-4 font-medium">Default Branch</th>
              <th className="px-6 py-4 font-medium">Last Scanned</th>
              <th className="px-6 py-4 font-medium text-center">Assessments</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockRepositories.map((repo) => (
              <tr key={repo.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4">
                  {getProviderIcon(repo.provider)}
                </td>
                <td className="px-6 py-4 font-medium text-foreground">
                  <a href={repo.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary">
                    {repo.name}
                  </a>
                </td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-muted rounded text-xs font-mono">{repo.defaultBranch}</span></td>
                <td className="px-6 py-4 text-muted-foreground">
                  {repo.lastScanned ? new Date(repo.lastScanned).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 text-center">{repo.assessmentCount}</td>
                <td className="px-6 py-4"><StatusBadge status={repo.status} /></td>
                <td className="px-6 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Play className="w-4 h-4 mr-2" /> New Scan
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <RefreshCw className="w-4 h-4 mr-2" /> Sync Config
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash className="w-4 h-4 mr-2" /> Disconnect
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
