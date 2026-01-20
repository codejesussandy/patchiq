import { useState } from "react"
import {
  Network,
  Plus,
  Play,
  Pause,
  RefreshCw,
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Server,
  MoreHorizontal,
  Trash2,
  Edit,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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

interface DiscoveryRange {
  id: string
  name: string
  ipRange: string
  subnet: string
  status: "idle" | "scanning" | "completed" | "scheduled"
  lastScan: string
  nextScan: string
  devicesFound: number
  newDevices: number
  schedule: string
  progress?: number
}

const mockRanges: DiscoveryRange[] = [
  {
    id: "1",
    name: "Production Network",
    ipRange: "192.168.1.0/24",
    subnet: "255.255.255.0",
    status: "scanning",
    lastScan: "In progress",
    nextScan: "-",
    devicesFound: 145,
    newDevices: 3,
    schedule: "Daily at 2:00 AM",
    progress: 67,
  },
  {
    id: "2",
    name: "Development Network",
    ipRange: "192.168.2.0/24",
    subnet: "255.255.255.0",
    status: "completed",
    lastScan: "2024-01-16 02:15",
    nextScan: "2024-01-17 02:00",
    devicesFound: 45,
    newDevices: 0,
    schedule: "Daily at 2:00 AM",
  },
  {
    id: "3",
    name: "DMZ Network",
    ipRange: "10.0.0.0/24",
    subnet: "255.255.255.0",
    status: "completed",
    lastScan: "2024-01-15 14:30",
    nextScan: "2024-01-17 14:30",
    devicesFound: 12,
    newDevices: 1,
    schedule: "Every 2 days",
  },
  {
    id: "4",
    name: "Guest Network",
    ipRange: "172.16.0.0/16",
    subnet: "255.255.0.0",
    status: "scheduled",
    lastScan: "2024-01-14 08:00",
    nextScan: "2024-01-21 08:00",
    devicesFound: 89,
    newDevices: 12,
    schedule: "Weekly",
  },
  {
    id: "5",
    name: "Backup Network",
    ipRange: "192.168.10.0/24",
    subnet: "255.255.255.0",
    status: "idle",
    lastScan: "2024-01-10 03:00",
    nextScan: "Manual",
    devicesFound: 8,
    newDevices: 0,
    schedule: "Manual",
  },
]

const stats = [
  { label: "Total Ranges", value: 5, icon: Network, color: "primary" },
  { label: "Devices Discovered", value: 299, icon: Server, color: "info" },
  { label: "New This Week", value: 16, icon: AlertTriangle, color: "warning" },
  { label: "Active Scans", value: 1, icon: RefreshCw, color: "success" },
]

export function IPDiscovery() {
  const [activeTab, setActiveTab] = useState("all")

  const getStatusConfig = (status: DiscoveryRange["status"]) => {
    switch (status) {
      case "scanning":
        return { label: "Scanning", variant: "info" as const, icon: RefreshCw }
      case "completed":
        return { label: "Completed", variant: "success" as const, icon: CheckCircle2 }
      case "scheduled":
        return { label: "Scheduled", variant: "warning" as const, icon: Clock }
      case "idle":
        return { label: "Idle", variant: "secondary" as const, icon: Pause }
      default:
        return { label: status, variant: "secondary" as const, icon: Network }
    }
  }

  const filteredRanges = mockRanges.filter((range) => {
    if (activeTab === "all") return true
    return range.status === activeTab
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">IP Discovery</h1>
          <p className="text-sm text-text-secondary">
            Network and IP range discovery
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add IP Range
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add IP Range</DialogTitle>
                <DialogDescription>
                  Configure a new IP range for network discovery
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 text-center text-text-muted">
                IP range form would go here
              </div>
            </DialogContent>
          </Dialog>
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
                  stat.color === "info" && "bg-info/15 text-info",
                  stat.color === "warning" && "bg-warning/15 text-warning",
                  stat.color === "success" && "bg-success/15 text-success"
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

      {/* Discovery Ranges */}
      <Card className="glass-card">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b border-border-subtle">
            <div className="flex items-center justify-between">
              <CardTitle>Discovery Ranges</CardTitle>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="scanning">Scanning</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-border-subtle">
              {filteredRanges.map((range) => {
                const statusConfig = getStatusConfig(range.status)
                return (
                  <div
                    key={range.id}
                    className="p-4 transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-lg",
                            range.status === "scanning" && "bg-info/15 text-info",
                            range.status === "completed" && "bg-success/15 text-success",
                            range.status === "scheduled" && "bg-warning/15 text-warning",
                            range.status === "idle" && "bg-surface-elevated text-text-muted"
                          )}
                        >
                          {range.status === "scanning" ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                          ) : (
                            <Network className="h-5 w-5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-text">{range.name}</p>
                            <Badge variant={statusConfig.variant} className="text-[10px]">
                              {range.status === "scanning" && (
                                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                              )}
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-text-muted font-mono">{range.ipRange}</span>
                            <span className="text-xs text-text-secondary">Subnet: {range.subnet}</span>
                          </div>
                        </div>

                        {/* Progress or schedule info */}
                        <div className="w-48">
                          {range.status === "scanning" && range.progress !== undefined ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-text-secondary">Scanning progress</span>
                                <span className="text-text-muted">{range.progress}%</span>
                              </div>
                              <Progress value={range.progress} className="h-1.5" />
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Clock className="h-3 w-3 text-text-muted" />
                                <span className="text-text-secondary">Last: {range.lastScan}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <Clock className="h-3 w-3 text-text-muted" />
                                <span className="text-text-secondary">Next: {range.nextScan}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Devices found */}
                        <div className="w-32 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Server className="h-4 w-4 text-text-muted" />
                            <span className="text-lg font-semibold text-text">{range.devicesFound}</span>
                          </div>
                          <p className="text-xs text-text-muted">devices found</p>
                          {range.newDevices > 0 && (
                            <Badge variant="warning" className="text-[10px] mt-1">
                              +{range.newDevices} new
                            </Badge>
                          )}
                        </div>

                        {/* Schedule */}
                        <div className="w-32">
                          <p className="text-xs text-text-muted">Schedule</p>
                          <p className="text-sm text-text-secondary">{range.schedule}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {range.status === "idle" && (
                          <Button variant="outline" size="sm">
                            <Play className="mr-2 h-3 w-3" />
                            Scan Now
                          </Button>
                        )}
                        {range.status === "scanning" && (
                          <Button variant="outline" size="sm">
                            <Pause className="mr-2 h-3 w-3" />
                            Stop
                          </Button>
                        )}
                        {range.status === "completed" && (
                          <Button variant="outline" size="sm">
                            <RefreshCw className="mr-2 h-3 w-3" />
                            Rescan
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Devices
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Range
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Clock className="mr-2 h-4 w-4" />
                              Edit Schedule
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-error">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Range
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
