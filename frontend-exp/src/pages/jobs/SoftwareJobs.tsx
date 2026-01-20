import { useState } from "react"
import {
  Package,
  Play,
  Pause,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Server,
  MoreHorizontal,
  Eye,
  FileText,
  Download,
  Upload,
  Trash2,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SoftwareJob {
  id: string
  name: string
  type: "install" | "uninstall" | "update"
  software: string
  version: string
  status: "running" | "completed" | "failed" | "scheduled" | "queued"
  progress: number
  targetEndpoints: number
  completedEndpoints: number
  failedEndpoints: number
  startedAt: string
  completedAt?: string
  scheduledFor?: string
  initiatedBy: string
}

const mockJobs: SoftwareJob[] = [
  {
    id: "1",
    name: "Deploy Chrome Browser",
    type: "install",
    software: "Google Chrome",
    version: "121.0.6167",
    status: "running",
    progress: 45,
    targetEndpoints: 50,
    completedEndpoints: 22,
    failedEndpoints: 1,
    startedAt: "2024-01-16 10:30",
    initiatedBy: "John Smith",
  },
  {
    id: "2",
    name: "Update Visual Studio Code",
    type: "update",
    software: "Visual Studio Code",
    version: "1.85.2",
    status: "completed",
    progress: 100,
    targetEndpoints: 45,
    completedEndpoints: 45,
    failedEndpoints: 0,
    startedAt: "2024-01-15 14:00",
    completedAt: "2024-01-15 15:30",
    initiatedBy: "Jane Doe",
  },
  {
    id: "3",
    name: "Remove Legacy Java",
    type: "uninstall",
    software: "Java Runtime Environment",
    version: "8u281",
    status: "failed",
    progress: 78,
    targetEndpoints: 30,
    completedEndpoints: 23,
    failedEndpoints: 7,
    startedAt: "2024-01-14 09:00",
    completedAt: "2024-01-14 10:45",
    initiatedBy: "Admin",
  },
  {
    id: "4",
    name: "Deploy Slack",
    type: "install",
    software: "Slack",
    version: "4.35.126",
    status: "scheduled",
    progress: 0,
    targetEndpoints: 100,
    completedEndpoints: 0,
    failedEndpoints: 0,
    startedAt: "-",
    scheduledFor: "2024-01-17 02:00",
    initiatedBy: "John Smith",
  },
  {
    id: "5",
    name: "Update Adobe Reader",
    type: "update",
    software: "Adobe Acrobat Reader",
    version: "24.001",
    status: "queued",
    progress: 0,
    targetEndpoints: 80,
    completedEndpoints: 0,
    failedEndpoints: 0,
    startedAt: "-",
    initiatedBy: "Jane Doe",
  },
]

const stats = [
  { label: "Active Jobs", value: 3, icon: Play, color: "primary" },
  { label: "Completed Today", value: 12, icon: CheckCircle2, color: "success" },
  { label: "Failed", value: 2, icon: XCircle, color: "error" },
  { label: "Scheduled", value: 5, icon: Calendar, color: "warning" },
]

export function SoftwareJobs() {
  const [activeTab, setActiveTab] = useState("all")

  const getStatusConfig = (status: SoftwareJob["status"]) => {
    switch (status) {
      case "running":
        return { label: "Running", variant: "info" as const, icon: Play }
      case "completed":
        return { label: "Completed", variant: "success" as const, icon: CheckCircle2 }
      case "failed":
        return { label: "Failed", variant: "error" as const, icon: XCircle }
      case "scheduled":
        return { label: "Scheduled", variant: "warning" as const, icon: Calendar }
      case "queued":
        return { label: "Queued", variant: "secondary" as const, icon: Clock }
      default:
        return { label: status, variant: "secondary" as const, icon: Clock }
    }
  }

  const getTypeConfig = (type: SoftwareJob["type"]) => {
    switch (type) {
      case "install":
        return { label: "Install", icon: Download, color: "text-success" }
      case "uninstall":
        return { label: "Uninstall", icon: Trash2, color: "text-error" }
      case "update":
        return { label: "Update", icon: Upload, color: "text-info" }
      default:
        return { label: type, icon: Package, color: "text-text-muted" }
    }
  }

  const filteredJobs = mockJobs.filter((job) => {
    if (activeTab === "all") return true
    return job.status === activeTab
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Software Jobs</h1>
          <p className="text-sm text-text-secondary">
            Track software deployment tasks
          </p>
        </div>
        <Button size="sm">
          <Play className="mr-2 h-4 w-4" />
          New Deployment
        </Button>
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

      {/* Jobs List */}
      <Card className="glass-card">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b border-border-subtle">
            <div className="flex items-center justify-between">
              <CardTitle>Deployment Jobs</CardTitle>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="running">Running</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="failed">Failed</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-border-subtle">
              {filteredJobs.map((job) => {
                const statusConfig = getStatusConfig(job.status)
                const typeConfig = getTypeConfig(job.type)
                return (
                  <div
                    key={job.id}
                    className="p-4 transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-lg",
                            job.status === "running" && "bg-info/15 text-info",
                            job.status === "completed" && "bg-success/15 text-success",
                            job.status === "failed" && "bg-error/15 text-error",
                            job.status === "scheduled" && "bg-warning/15 text-warning",
                            job.status === "queued" && "bg-surface-elevated text-text-muted"
                          )}
                        >
                          {job.status === "running" ? (
                            <Play className="h-5 w-5" />
                          ) : (
                            <Package className="h-5 w-5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-text">{job.name}</p>
                            <Badge variant={statusConfig.variant} className="text-[10px]">
                              {job.status === "running" && (
                                <Play className="mr-1 h-3 w-3 animate-pulse" />
                              )}
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="secondary" className="text-[10px]">
                              <typeConfig.icon className={cn("mr-1 h-3 w-3", typeConfig.color)} />
                              {typeConfig.label}
                            </Badge>
                            <span className="text-xs text-text-muted">{job.software}</span>
                            <span className="text-xs text-text-muted font-mono">v{job.version}</span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="w-48">
                          {job.status === "running" ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-text-secondary">
                                  {job.completedEndpoints}/{job.targetEndpoints} endpoints
                                </span>
                                <span className="text-text-muted">{job.progress}%</span>
                              </div>
                              <Progress value={job.progress} className="h-1.5" />
                            </div>
                          ) : job.status === "scheduled" ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Calendar className="h-3 w-3 text-text-muted" />
                              <span className="text-text-secondary">
                                Scheduled: {job.scheduledFor}
                              </span>
                            </div>
                          ) : job.status === "completed" || job.status === "failed" ? (
                            <div className="flex items-center gap-2 text-xs">
                              <Server className="h-3 w-3 text-text-muted" />
                              <span className="text-success">{job.completedEndpoints} success</span>
                              {job.failedEndpoints > 0 && (
                                <span className="text-error">{job.failedEndpoints} failed</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Server className="h-3 w-3 text-text-muted" />
                              <span className="text-text-secondary">
                                {job.targetEndpoints} endpoints
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Time info */}
                        <div className="w-32">
                          {job.status === "running" && (
                            <div className="text-xs">
                              <p className="text-text-muted">Started</p>
                              <p className="text-text-secondary">{job.startedAt}</p>
                            </div>
                          )}
                          {job.completedAt && (
                            <div className="text-xs">
                              <p className="text-text-muted">Completed</p>
                              <p className="text-text-secondary">{job.completedAt}</p>
                            </div>
                          )}
                        </div>

                        {/* Initiated by */}
                        <div className="w-28">
                          <p className="text-xs text-text-muted">Initiated by</p>
                          <p className="text-sm text-text-secondary">{job.initiatedBy}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {job.status === "running" && (
                          <Button variant="outline" size="sm">
                            <Pause className="mr-2 h-3 w-3" />
                            Pause
                          </Button>
                        )}
                        {job.status === "failed" && (
                          <Button variant="outline" size="sm">
                            <RotateCcw className="mr-2 h-3 w-3" />
                            Retry
                          </Button>
                        )}
                        {job.status === "scheduled" && (
                          <Button variant="outline" size="sm">
                            <Play className="mr-2 h-3 w-3" />
                            Run Now
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
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              View Logs
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Server className="mr-2 h-4 w-4" />
                              View Endpoints
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-error">
                              Cancel Job
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
