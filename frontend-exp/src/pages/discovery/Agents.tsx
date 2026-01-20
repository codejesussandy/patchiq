import { useState } from "react"
import {
  Bot,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Monitor,
  MoreHorizontal,
  Trash2,
  Settings,
  Play,
  Upload,
  Wifi,
  WifiOff,
  HardDrive,
  Apple,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/shared/DataTable"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Agent {
  id: string
  hostname: string
  ipAddress: string
  os: "windows" | "linux" | "macos"
  version: string
  status: "online" | "offline" | "updating" | "error"
  lastCheckin: string
  cpuUsage: number
  memoryUsage: number
  installedDate: string
}

const mockAgents: Agent[] = [
  {
    id: "1",
    hostname: "WIN-SERVER-01",
    ipAddress: "192.168.1.10",
    os: "windows",
    version: "2.4.1",
    status: "online",
    lastCheckin: "Just now",
    cpuUsage: 12,
    memoryUsage: 45,
    installedDate: "2023-06-15",
  },
  {
    id: "2",
    hostname: "DEV-LAPTOP-03",
    ipAddress: "192.168.1.45",
    os: "macos",
    version: "2.4.1",
    status: "online",
    lastCheckin: "2 min ago",
    cpuUsage: 8,
    memoryUsage: 32,
    installedDate: "2023-08-20",
  },
  {
    id: "3",
    hostname: "PROD-DB-01",
    ipAddress: "192.168.1.20",
    os: "linux",
    version: "2.4.0",
    status: "updating",
    lastCheckin: "5 min ago",
    cpuUsage: 25,
    memoryUsage: 68,
    installedDate: "2023-05-10",
  },
  {
    id: "4",
    hostname: "HR-WS-12",
    ipAddress: "192.168.1.112",
    os: "windows",
    version: "2.3.8",
    status: "error",
    lastCheckin: "15 min ago",
    cpuUsage: 0,
    memoryUsage: 0,
    installedDate: "2023-09-01",
  },
  {
    id: "5",
    hostname: "FINANCE-WS-05",
    ipAddress: "192.168.1.85",
    os: "windows",
    version: "2.4.1",
    status: "offline",
    lastCheckin: "2 hours ago",
    cpuUsage: 0,
    memoryUsage: 0,
    installedDate: "2023-07-22",
  },
  {
    id: "6",
    hostname: "WEB-SERVER-02",
    ipAddress: "192.168.1.25",
    os: "linux",
    version: "2.4.1",
    status: "online",
    lastCheckin: "Just now",
    cpuUsage: 34,
    memoryUsage: 52,
    installedDate: "2023-04-18",
  },
]

const stats = [
  { label: "Total Agents", value: 165, icon: Bot, color: "primary" },
  { label: "Online", value: 148, icon: Wifi, color: "success" },
  { label: "Offline", value: 12, icon: WifiOff, color: "error" },
  { label: "Needs Update", value: 23, icon: Clock, color: "warning" },
]

export function Agents() {
  const [activeTab, setActiveTab] = useState("all")
  const [osFilter, setOsFilter] = useState("all")

  const getOsIcon = (os: string) => {
    switch (os) {
      case "windows":
        return <Monitor className="h-4 w-4 text-[#0078D4]" />
      case "linux":
        return <HardDrive className="h-4 w-4 text-[#FCC624]" />
      case "macos":
        return <Apple className="h-4 w-4 text-text-secondary" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const getStatusConfig = (status: Agent["status"]) => {
    switch (status) {
      case "online":
        return { label: "Online", variant: "success" as const, icon: CheckCircle2 }
      case "offline":
        return { label: "Offline", variant: "secondary" as const, icon: WifiOff }
      case "updating":
        return { label: "Updating", variant: "info" as const, icon: RefreshCw }
      case "error":
        return { label: "Error", variant: "error" as const, icon: AlertTriangle }
      default:
        return { label: status, variant: "secondary" as const, icon: Bot }
    }
  }

  const columns: Column<Agent>[] = [
    {
      key: "status",
      label: "",
      width: "w-12",
      render: (item) => (
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            item.status === "online" && "bg-success",
            item.status === "offline" && "bg-text-muted",
            item.status === "updating" && "bg-info animate-pulse",
            item.status === "error" && "bg-error animate-pulse"
          )}
        />
      ),
    },
    {
      key: "hostname",
      label: "Endpoint",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated">
            {getOsIcon(item.os)}
          </div>
          <div>
            <p className="font-medium text-text">{item.hostname}</p>
            <p className="text-xs text-text-muted font-mono">{item.ipAddress}</p>
          </div>
        </div>
      ),
    },
    {
      key: "version",
      label: "Agent Version",
      sortable: true,
      width: "w-32",
      render: (item) => {
        const isLatest = item.version === "2.4.1"
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-text-secondary">v{item.version}</span>
            {!isLatest && (
              <Badge variant="warning" className="text-[10px]">
                Update
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      width: "w-28",
      render: (item) => {
        const config = getStatusConfig(item.status)
        return (
          <Badge variant={config.variant} className="text-[10px]">
            {item.status === "updating" && (
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            )}
            {config.label}
          </Badge>
        )
      },
    },
    {
      key: "lastCheckin",
      label: "Last Check-in",
      sortable: true,
      width: "w-28",
      render: (item) => (
        <span className={cn(
          "text-sm",
          item.status === "online" ? "text-success" : "text-text-muted"
        )}>
          {item.lastCheckin}
        </span>
      ),
    },
    {
      key: "cpuUsage",
      label: "CPU",
      sortable: true,
      width: "w-20",
      render: (item) => (
        <span className={cn(
          "text-sm",
          item.cpuUsage > 80 ? "text-error" :
          item.cpuUsage > 50 ? "text-warning" : "text-text-secondary"
        )}>
          {item.status === "online" ? `${item.cpuUsage}%` : "-"}
        </span>
      ),
    },
    {
      key: "memoryUsage",
      label: "Memory",
      sortable: true,
      width: "w-20",
      render: (item) => (
        <span className={cn(
          "text-sm",
          item.memoryUsage > 80 ? "text-error" :
          item.memoryUsage > 50 ? "text-warning" : "text-text-secondary"
        )}>
          {item.status === "online" ? `${item.memoryUsage}%` : "-"}
        </span>
      ),
    },
    {
      key: "installedDate",
      label: "Installed",
      sortable: true,
      width: "w-28",
      render: (item) => (
        <span className="text-xs text-text-muted">{item.installedDate}</span>
      ),
    },
  ]

  const filteredData = mockAgents.filter((agent) => {
    if (activeTab !== "all" && agent.status !== activeTab) return false
    if (osFilter !== "all" && agent.os !== osFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Endpoint Agents</h1>
          <p className="text-sm text-text-secondary">
            Manage endpoint agents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh All
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Mass Update
          </Button>
          <Button size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download Agent
          </Button>
        </div>
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
                  stat.color === "error" && "bg-error/15 text-error",
                  stat.color === "warning" && "bg-warning/15 text-warning"
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

      {/* Agent version info */}
      <Card className="glass-card border-primary/20">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-text">Latest Agent Version: 2.4.1</p>
              <p className="text-sm text-text-secondary">23 agents need to be updated</p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Update All Agents
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-card overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="online">
                Online
                <Badge variant="success" className="ml-2 text-[10px]">148</Badge>
              </TabsTrigger>
              <TabsTrigger value="offline">Offline</TabsTrigger>
              <TabsTrigger value="updating">Updating</TabsTrigger>
              <TabsTrigger value="error">Error</TabsTrigger>
            </TabsList>

            <Select value={osFilter} onValueChange={setOsFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="OS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All OS</SelectItem>
                <SelectItem value="windows">Windows</SelectItem>
                <SelectItem value="linux">Linux</SelectItem>
                <SelectItem value="macos">macOS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CardContent className="p-0">
            <DataTable
              data={filteredData}
              columns={columns}
              searchPlaceholder="Search agents..."
              actions={(_item) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Update Agent
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Play className="mr-2 h-4 w-4" />
                      Restart Agent
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Configure
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-error">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Uninstall
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}
