import { useState } from "react"
import {
  Monitor,
  Server,
  Laptop,
  HardDrive,
  RefreshCw,
  Download,
  MoreHorizontal,
  Shield,
  Wifi,
  WifiOff,
  AlertTriangle,
  Apple,
  Settings,
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

interface Asset {
  id: string
  hostname: string
  ipAddress: string
  os: "windows" | "linux" | "macos"
  osVersion: string
  type: "workstation" | "server" | "laptop"
  status: "online" | "offline" | "warning"
  lastSeen: string
  vulnerabilities: number
  patches: number
  agent: string
}

const mockAssets: Asset[] = [
  {
    id: "1",
    hostname: "WIN-SERVER-01",
    ipAddress: "192.168.1.10",
    os: "windows",
    osVersion: "Windows Server 2022",
    type: "server",
    status: "online",
    lastSeen: "Just now",
    vulnerabilities: 3,
    patches: 5,
    agent: "v2.4.1",
  },
  {
    id: "2",
    hostname: "DEV-LAPTOP-03",
    ipAddress: "192.168.1.45",
    os: "macos",
    osVersion: "macOS Sonoma 14.3",
    type: "laptop",
    status: "online",
    lastSeen: "2 min ago",
    vulnerabilities: 1,
    patches: 2,
    agent: "v2.4.1",
  },
  {
    id: "3",
    hostname: "PROD-DB-01",
    ipAddress: "192.168.1.20",
    os: "linux",
    osVersion: "Ubuntu 22.04 LTS",
    type: "server",
    status: "online",
    lastSeen: "Just now",
    vulnerabilities: 0,
    patches: 0,
    agent: "v2.4.0",
  },
  {
    id: "4",
    hostname: "HR-WS-12",
    ipAddress: "192.168.1.112",
    os: "windows",
    osVersion: "Windows 11 Pro",
    type: "workstation",
    status: "warning",
    lastSeen: "15 min ago",
    vulnerabilities: 7,
    patches: 12,
    agent: "v2.3.8",
  },
  {
    id: "5",
    hostname: "FINANCE-WS-05",
    ipAddress: "192.168.1.85",
    os: "windows",
    osVersion: "Windows 10 Enterprise",
    type: "workstation",
    status: "offline",
    lastSeen: "2 hours ago",
    vulnerabilities: 5,
    patches: 8,
    agent: "v2.4.1",
  },
  {
    id: "6",
    hostname: "WEB-SERVER-02",
    ipAddress: "192.168.1.25",
    os: "linux",
    osVersion: "CentOS 8",
    type: "server",
    status: "online",
    lastSeen: "Just now",
    vulnerabilities: 2,
    patches: 3,
    agent: "v2.4.1",
  },
]

const stats = [
  { label: "Total Endpoints", value: 165, icon: Monitor, color: "primary" },
  { label: "Online", value: 142, icon: Wifi, color: "success" },
  { label: "Offline", value: 18, icon: WifiOff, color: "error" },
  { label: "Needs Attention", value: 23, icon: AlertTriangle, color: "warning" },
]

export function AllAssets() {
  const [activeTab, setActiveTab] = useState("all")
  const [osFilter, setOsFilter] = useState("all")

  const getOsIcon = (os: string) => {
    switch (os) {
      case "windows":
        return <Server className="h-4 w-4 text-[#0078D4]" />
      case "linux":
        return <HardDrive className="h-4 w-4 text-[#FCC624]" />
      case "macos":
        return <Apple className="h-4 w-4 text-text-secondary" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "server":
        return <Server className="h-4 w-4" />
      case "laptop":
        return <Laptop className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const columns: Column<Asset>[] = [
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
            item.status === "warning" && "bg-warning animate-pulse"
          )}
        />
      ),
    },
    {
      key: "hostname",
      label: "Hostname",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated">
            {getTypeIcon(item.type)}
          </div>
          <div>
            <p className="font-medium text-text">{item.hostname}</p>
            <p className="text-xs text-text-muted font-mono">{item.ipAddress}</p>
          </div>
        </div>
      ),
    },
    {
      key: "os",
      label: "Operating System",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          {getOsIcon(item.os)}
          <span className="text-sm text-text-secondary">{item.osVersion}</span>
        </div>
      ),
    },
    {
      key: "lastSeen",
      label: "Last Seen",
      sortable: true,
      width: "w-28",
      render: (item) => (
        <span className={cn(
          "text-sm",
          item.status === "online" ? "text-success" : "text-text-muted"
        )}>
          {item.lastSeen}
        </span>
      ),
    },
    {
      key: "vulnerabilities",
      label: "Vulnerabilities",
      sortable: true,
      width: "w-32",
      render: (item) => (
        <div className="flex items-center gap-2">
          <Shield className={cn(
            "h-4 w-4",
            item.vulnerabilities === 0 ? "text-success" :
            item.vulnerabilities > 5 ? "text-critical" : "text-warning"
          )} />
          <span className={cn(
            "font-medium",
            item.vulnerabilities === 0 ? "text-success" :
            item.vulnerabilities > 5 ? "text-critical" : "text-warning"
          )}>
            {item.vulnerabilities}
          </span>
        </div>
      ),
    },
    {
      key: "patches",
      label: "Pending Patches",
      sortable: true,
      width: "w-32",
      render: (item) => (
        <Badge variant={item.patches === 0 ? "success" : "secondary"}>
          {item.patches} patches
        </Badge>
      ),
    },
    {
      key: "agent",
      label: "Agent",
      width: "w-24",
      render: (item) => (
        <span className="text-xs text-text-muted font-mono">{item.agent}</span>
      ),
    },
  ]

  const filteredData = mockAssets.filter((asset) => {
    if (activeTab === "online" && asset.status !== "online") return false
    if (activeTab === "offline" && asset.status !== "offline") return false
    if (activeTab === "warning" && asset.status !== "warning") return false
    if (osFilter !== "all" && asset.os !== osFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">All Assets</h1>
          <p className="text-sm text-text-secondary">
            Manage and monitor all endpoints in your infrastructure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm">
            <Monitor className="mr-2 h-4 w-4" />
            Add Asset
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

      {/* Table */}
      <Card className="glass-card overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="online">
                Online
                <Badge variant="success" className="ml-2 text-[10px]">142</Badge>
              </TabsTrigger>
              <TabsTrigger value="offline">Offline</TabsTrigger>
              <TabsTrigger value="warning">Needs Attention</TabsTrigger>
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
              searchPlaceholder="Search assets..."
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
                      <Shield className="mr-2 h-4 w-4" />
                      Run Scan
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Configure
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-error">
                      Remove Asset
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
