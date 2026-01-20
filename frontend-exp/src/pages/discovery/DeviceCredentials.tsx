import { useState } from "react"
import {
  Key,
  Plus,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Server,
  Monitor,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

interface Credential {
  id: string
  name: string
  type: "windows" | "linux" | "ssh" | "snmp" | "api"
  username: string
  scope: string
  status: "active" | "expiring" | "expired" | "failed"
  lastUsed: string
  devicesUsing: number
  createdBy: string
  expiryDate?: string
}

const mockCredentials: Credential[] = [
  {
    id: "1",
    name: "Domain Admin",
    type: "windows",
    username: "DOMAIN\\admin",
    scope: "All Windows Servers",
    status: "active",
    lastUsed: "2 hours ago",
    devicesUsing: 45,
    createdBy: "John Smith",
  },
  {
    id: "2",
    name: "Linux Root SSH",
    type: "ssh",
    username: "root",
    scope: "Linux Servers",
    status: "active",
    lastUsed: "1 day ago",
    devicesUsing: 28,
    createdBy: "Jane Doe",
  },
  {
    id: "3",
    name: "SNMP Community",
    type: "snmp",
    username: "public",
    scope: "Network Devices",
    status: "expiring",
    lastUsed: "3 days ago",
    devicesUsing: 34,
    createdBy: "Mike Johnson",
    expiryDate: "2024-02-01",
  },
  {
    id: "4",
    name: "Workstation Admin",
    type: "windows",
    username: "DOMAIN\\wsadmin",
    scope: "All Workstations",
    status: "active",
    lastUsed: "Just now",
    devicesUsing: 112,
    createdBy: "John Smith",
  },
  {
    id: "5",
    name: "API Service Account",
    type: "api",
    username: "svc_api_user",
    scope: "API Integrations",
    status: "failed",
    lastUsed: "5 days ago",
    devicesUsing: 8,
    createdBy: "Admin",
  },
  {
    id: "6",
    name: "Ubuntu Deploy Key",
    type: "ssh",
    username: "deploy",
    scope: "Ubuntu Servers",
    status: "expired",
    lastUsed: "2 weeks ago",
    devicesUsing: 0,
    createdBy: "Jane Doe",
    expiryDate: "2024-01-01",
  },
]

const stats = [
  { label: "Total Credentials", value: 24, icon: Key, color: "primary" },
  { label: "Active", value: 20, icon: CheckCircle2, color: "success" },
  { label: "Expiring Soon", value: 2, icon: Clock, color: "warning" },
  { label: "Failed/Expired", value: 2, icon: AlertTriangle, color: "error" },
]

export function DeviceCredentials() {
  const [activeTab, setActiveTab] = useState("all")

  const getStatusConfig = (status: Credential["status"]) => {
    switch (status) {
      case "active":
        return { label: "Active", variant: "success" as const, icon: CheckCircle2 }
      case "expiring":
        return { label: "Expiring Soon", variant: "warning" as const, icon: Clock }
      case "expired":
        return { label: "Expired", variant: "error" as const, icon: AlertTriangle }
      case "failed":
        return { label: "Failed", variant: "error" as const, icon: AlertTriangle }
      default:
        return { label: status, variant: "secondary" as const, icon: Key }
    }
  }

  const getTypeIcon = (type: Credential["type"]) => {
    switch (type) {
      case "windows":
        return <Monitor className="h-4 w-4 text-[#0078D4]" />
      case "linux":
      case "ssh":
        return <Server className="h-4 w-4 text-[#FCC624]" />
      case "snmp":
        return <Shield className="h-4 w-4 text-primary" />
      case "api":
        return <Key className="h-4 w-4 text-accent" />
      default:
        return <Key className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: Credential["type"]) => {
    switch (type) {
      case "windows":
        return "Windows"
      case "linux":
        return "Linux"
      case "ssh":
        return "SSH Key"
      case "snmp":
        return "SNMP"
      case "api":
        return "API Key"
      default:
        return type
    }
  }

  const filteredCredentials = mockCredentials.filter((cred) => {
    if (activeTab === "all") return true
    return cred.status === activeTab
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Device Credentials</h1>
          <p className="text-sm text-text-secondary">
            Manage device credentials for discovery
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Credential
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Credential</DialogTitle>
              <DialogDescription>
                Add credentials for device discovery and management
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center text-text-muted">
              Credential form would go here
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-lg",
                  stat.color === "primary" && "bg-primary/15 text-primary",
                  stat.color === "success" && "bg-success/15 text-success",
                  stat.color === "warning" && "bg-warning/15 text-warning",
                  stat.color === "error" && "bg-error/15 text-error"
                )}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">{stat.label}</p>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Credentials List */}
      <Card className="glass-card">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b border-border-subtle">
            <div className="flex items-center justify-between">
              <CardTitle>Stored Credentials</CardTitle>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="expiring">Expiring</TabsTrigger>
                <TabsTrigger value="failed">Failed</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-border-subtle">
              {filteredCredentials.map((credential) => {
                const statusConfig = getStatusConfig(credential.status)
                return (
                  <div
                    key={credential.id}
                    className="p-4 transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-lg",
                            credential.status === "active" && "bg-success/15",
                            credential.status === "expiring" && "bg-warning/15",
                            credential.status === "expired" && "bg-error/15",
                            credential.status === "failed" && "bg-error/15"
                          )}
                        >
                          {getTypeIcon(credential.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-text">{credential.name}</p>
                            <Badge variant={statusConfig.variant} className="text-[10px]">
                              <statusConfig.icon className="mr-1 h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="secondary" className="text-[10px]">
                              {getTypeLabel(credential.type)}
                            </Badge>
                            <span className="text-xs text-text-muted font-mono">{credential.username}</span>
                          </div>
                        </div>

                        {/* Scope */}
                        <div className="w-40">
                          <p className="text-xs text-text-muted">Scope</p>
                          <p className="text-sm text-text-secondary">{credential.scope}</p>
                        </div>

                        {/* Devices using */}
                        <div className="w-32 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Server className="h-4 w-4 text-text-muted" />
                            <span className="text-lg font-semibold text-text">{credential.devicesUsing}</span>
                          </div>
                          <p className="text-xs text-text-muted">devices</p>
                        </div>

                        {/* Last used */}
                        <div className="w-28">
                          <p className="text-xs text-text-muted">Last used</p>
                          <p className="text-sm text-text-secondary">{credential.lastUsed}</p>
                        </div>

                        {/* Expiry */}
                        {credential.expiryDate && (
                          <div className="w-28">
                            <p className="text-xs text-text-muted">Expires</p>
                            <p className={cn(
                              "text-sm",
                              credential.status === "expiring" && "text-warning",
                              credential.status === "expired" && "text-error"
                            )}>
                              {credential.expiryDate}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {credential.status === "expiring" && (
                          <Button variant="outline" size="sm" className="text-warning border-warning/30">
                            <Clock className="mr-2 h-3 w-3" />
                            Renew
                          </Button>
                        )}
                        {credential.status === "failed" && (
                          <Button variant="outline" size="sm" className="text-error border-error/30">
                            <AlertTriangle className="mr-2 h-3 w-3" />
                            Fix
                          </Button>
                        )}

                        <Button variant="ghost" size="icon-sm">
                          <Eye className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Credential
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Server className="mr-2 h-4 w-4" />
                              View Devices
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Shield className="mr-2 h-4 w-4" />
                              Test Connection
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-error">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}
