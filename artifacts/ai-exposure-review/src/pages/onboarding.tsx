import { useState } from "react";
import { useLocation } from "wouter";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/session";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function WorkspaceOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { createWorkspace, workspaces, selectWorkspace } = useSession();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateWorkspace = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await createWorkspace({
        name,
        slug: slug || slugify(name),
      });
      toast({
        title: "Workspace created",
        description: "Your workspace is ready for assessments.",
      });
      setLocation("/dashboard");
    } catch (error) {
      toast({
        title: "Workspace setup failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Set Up Your Workspace</CardTitle>
              <CardDescription>
                Create a workspace before connecting repositories or launching assessments.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <form className="space-y-4" onSubmit={handleCreateWorkspace}>
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                placeholder="Acme Security"
                required
                value={name}
                onChange={(event) => {
                  const nextName = event.target.value;
                  setName(nextName);
                  if (!slug) {
                    setSlug(slugify(nextName));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-slug">Workspace slug</Label>
              <Input
                id="workspace-slug"
                placeholder="acme-security"
                value={slug}
                onChange={(event) => setSlug(slugify(event.target.value))}
              />
            </div>
            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating workspace..." : "Create Workspace"}
            </Button>
          </form>

          {workspaces.length > 0 ? (
            <div className="space-y-3 border-t pt-6">
              <div>
                <h2 className="font-medium">Existing workspaces</h2>
                <p className="text-sm text-muted-foreground">
                  If you already belong to a workspace, switch into it here.
                </p>
              </div>
              <div className="space-y-2">
                {workspaces.map((membership) => (
                  <button
                    key={membership.workspace.id}
                    className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-left hover:bg-muted/50"
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        await selectWorkspace(membership.workspace.id);
                        setLocation("/dashboard");
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    type="button"
                  >
                    <div>
                      <p className="font-medium">{membership.workspace.name}</p>
                      <p className="text-sm text-muted-foreground">{membership.role}</p>
                    </div>
                    <span className="text-sm text-primary">Use workspace</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
