import { useState } from "react"
import {
  Plus,
  Search,
  MoreHorizontal,
  ExternalLink,
  Settings,
  Trash2,
  CheckCircle2,
  XCircle,
  Zap,
  Mail,
  MessageSquare,
  Shield,
  Bot,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Integration {
  id: string
  name: string
  description: string
  type: "email" | "incident" | "threat_intel" | "ai"
  icon: React.ElementType
  status: "active" | "inactive" | "error"
  lastSync: string
}

const integrations: Integration[] = [
  {
    id: "1",
    name: "Email Notifications",
    description: "Send alerts and reports via email",
    type: "email",
    icon: Mail,
    status: "active",
    lastSync: "2 min ago",
  },
  {
    id: "2",
    name: "Zendesk Integration",
    description: "Create and manage incident tickets",
    type: "incident",
    icon: MessageSquare,
    status: "active",
    lastSync: "5 min ago",
  },
  {
    id: "3",
    name: "VirusTotal",
    description: "Threat intelligence and file scanning",
    type: "threat_intel",
    icon: Shield,
    status: "active",
    lastSync: "1 hour ago",
  },
  {
    id: "4",
    name: "OpenAI",
    description: "AI-powered analysis and recommendations",
    type: "ai",
    icon: Bot,
    status: "inactive",
    lastSync: "Never",
  },
  {
    id: "5",
    name: "Acunetix PDI",
    description: "Vulnerability scanning integration",
    type: "threat_intel",
    icon: Shield,
    status: "error",
    lastSync: "Failed",
  },
]

const availableIntegrations = [
  { name: "Slack", description: "Team notifications and alerts", icon: MessageSquare, category: "Communication" },
  { name: "ServiceNow", description: "ITSM integration", icon: Settings, category: "ITSM" },
  { name: "Splunk", description: "SIEM integration", icon: Zap, category: "Security" },
  { name: "Microsoft Teams", description: "Team collaboration", icon: MessageSquare, category: "Communication" },
]

export function Marketplace() {
  const [activeTab, setActiveTab] = useState("installed")
  const [search, setSearch] = useState("")

  const filteredIntegrations = integrations.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Marketplace</h1>
          <p className="text-sm text-text-secondary">
            Manage integrations and extensions
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Integration</DialogTitle>
              <DialogDescription>
                Connect PatchIQ with your favorite tools and services
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {availableIntegrations.map((integration) => (
                <button
                  key={integration.name}
                  className="flex items-start gap-4 rounded-xl border border-border-subtle bg-surface p-4 text-left transition-colors hover:border-primary hover:bg-surface-hover"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated">
                    <integration.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-text">{integration.name}</p>
                    <p className="text-xs text-text-muted">{integration.description}</p>
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      {integration.category}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs and Search */}
      <Card className="glass-card">
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="installed">
                Installed
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {integrations.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="available">Available</TabsTrigger>
            </TabsList>
          </Tabs>

          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search integrations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>

        <CardContent className="p-6">
          {activeTab === "installed" ? (
            <div className="space-y-4">
              {filteredIntegrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-4 transition-colors hover:bg-surface-hover"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl",
                      integration.status === "active" && "bg-primary/15 text-primary",
                      integration.status === "inactive" && "bg-surface-elevated text-text-muted",
                      integration.status === "error" && "bg-error/15 text-error"
                    )}>
                      <integration.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text">{integration.name}</p>
                        <Badge
                          variant={
                            integration.status === "active"
                              ? "success"
                              : integration.status === "error"
                              ? "error"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {integration.status === "active" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {integration.status === "error" && <XCircle className="mr-1 h-3 w-3" />}
                          {integration.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary">{integration.description}</p>
                      <p className="text-xs text-text-muted mt-1">Last sync: {integration.lastSync}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Switch checked={integration.status === "active"} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Settings className="mr-2 h-4 w-4" />
                          Configure
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Docs
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-error">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableIntegrations.map((integration) => (
                <Card key={integration.name} className="bg-surface border-border-subtle hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated">
                        <integration.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-text">{integration.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">{integration.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <Badge variant="secondary" className="text-[10px]">
                        {integration.category}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Install
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
