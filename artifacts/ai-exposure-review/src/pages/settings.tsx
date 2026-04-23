import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Upload, CreditCard, Shield, Github, Slack } from "lucide-react";
import { SiJira } from "react-icons/si";

export default function Settings() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("sk-aer_live_8f92a4b1c3d5e7f9");
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your workspace settings have been updated.",
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    toast({
      title: "Copied",
      description: "API key copied to clipboard.",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace, integrations, and billing.</p>
      </div>

      <Tabs defaultValue="workspace" className="w-full">
        <TabsList className="mb-6 bg-muted/50 border">
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="api">API Access</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="workspace">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Profile</CardTitle>
              <CardDescription>Update your company details and report branding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed relative group cursor-pointer hover:bg-muted/80 transition-colors">
                  <Shield className="w-8 h-8 text-muted-foreground group-hover:opacity-0 transition-opacity" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground">
                    <Upload className="w-4 h-4 mb-1" />
                    Upload Logo
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Company Logo</h4>
                  <p className="text-sm text-muted-foreground">Recommended size: 256x256px. Appears on exported PDF reports.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" defaultValue="Acme Corp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Workspace Slug</Label>
                  <Input id="slug" defaultValue="acme-corp" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Brand Accent Color</Label>
                <div className="flex gap-2">
                  <Input type="color" id="color" defaultValue="#1e40af" className="w-12 h-10 p-1 cursor-pointer" />
                  <Input defaultValue="#1e40af" className="font-mono uppercase w-32" />
                </div>
                <p className="text-xs text-muted-foreground">Used as the primary color in your branded PDF reports.</p>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button onClick={handleSave}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Connected Integrations</CardTitle>
              <CardDescription>Link third-party services to enhance your workflows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <Github className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-medium">GitHub</h4>
                    <p className="text-sm text-muted-foreground">Connect repositories for static analysis.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">Connected</span>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <Slack className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">Slack</h4>
                    <p className="text-sm text-muted-foreground">Receive notifications in specific channels.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Connect</Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <SiJira className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-medium">Jira</h4>
                    <p className="text-sm text-muted-foreground">Automatically create issues for critical findings.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Connect</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure which alerts you receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Assessment Complete</Label>
                  <p className="text-sm text-muted-foreground">Receive an email when a scan finishes running.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">High Severity Finding</Label>
                  <p className="text-sm text-muted-foreground">Immediate alert when a critical or high vulnerability is found.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Weekly Digest</Label>
                  <p className="text-sm text-muted-foreground">A summary of workspace activity and metrics.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Access</CardTitle>
              <CardDescription>Use API keys to trigger scans from your CI/CD pipelines.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Workspace API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input 
                      type={showKey ? "text" : "password"} 
                      value={apiKey} 
                      readOnly 
                      className="font-mono pr-10"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute right-1 top-1 h-7 w-7 p-0"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? "Hide" : "Show"}
                    </Button>
                  </div>
                  <Button variant="outline" onClick={copyToClipboard} title="Copy to clipboard">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" title="Regenerate key">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Use this key in your GitHub Actions or GitLab CI configuration.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>Manage your plan and payment methods.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 border rounded-lg bg-primary/5 border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">Starter Plan</h3>
                    <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full font-medium">Current</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Includes 10 assessments per month and 3 connected repositories.</p>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-2xl font-bold mb-1">$0<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
                  <p className="text-sm text-muted-foreground">3 / 10 scans used</p>
                </div>
              </div>

              <div className="mt-8 flex flex-col items-center justify-center p-8 border rounded-lg border-dashed text-center">
                <CreditCard className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="font-bold text-lg mb-2">Upgrade to Pro</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Get unlimited assessments, custom PDF report branding, and advanced API access for your CI/CD pipelines.
                </p>
                <Button>View Pro Features</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
