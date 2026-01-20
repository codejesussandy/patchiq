import { useState } from "react"
import {
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Calendar,
  Server,
  ChevronRight,
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
import { Progress } from "@/components/ui/progress"

interface Job {
  id: string
  name: string
  type: "deployment" | "scan" | "rollback"
  status: "running" | "completed" | "failed" | "scheduled" | "paused"
  progress: number
  targetCount: number
  successCount: number
  failedCount: number
  startTime: string
  estimatedEnd: string
  createdBy: string
}

const mockJobs: Job[] = [
  {
    id: "1",
    name: "Critical Security Patches - Jan 2024",
    type: "deployment",
    status: "running",
    progress: 67,
    targetCount: 89,
    successCount: 60,
    failedCount: 2,
    startTime: "2024-01-16 14:30",
    estimatedEnd: "2024-01-16 16:00",
    createdBy: "Admin",
  },
  {
    id: "2",
    name: "Windows 11 Update Rollout",
    type: "deployment",
    status: "scheduled",
    progress: 0,
    targetCount: 67,
    successCount: 0,
    failedCount: 0,
    startTime: "2024-01-17 02:00",
    estimatedEnd: "2024-01-17 06:00",
    createdBy: "Auto-Schedule",
  },
  {
    id: "3",
    name: "Chrome Security Update",
    type: "deployment",
    status: "completed",
    progress: 100,
    targetCount: 134,
    successCount: 131,
    failedCount: 3,
    startTime: "2024-01-15 09:00",
    estimatedEnd: "2024-01-15 11:30",
    createdBy: "Admin",
  },
  {
    id: "4",
    name: "Linux Kernel Patch",
    type: "deployment",
    status: "failed",
    progress: 45,
    targetCount: 34,
    successCount: 15,
    failedCount: 19,
    startTime: "2024-01-14 16:00",
    estimatedEnd: "N/A",
    createdBy: "Admin",
  },
  {
    id: "5",
    name: "Adobe Acrobat Rollback",
    type: "rollback",
    status: "completed",
    progress: 100,
    targetCount: 12,
    successCount: 12,
    failedCount: 0,
    startTime: "2024-01-13 11:00",
    estimatedEnd: "2024-01-13 11:30",
    createdBy: "Support",
  },
]

const stats = [
  { label: "Active Jobs", value: 3, icon: Play, color: "primary" },
  { label: "Completed Today", value: 12, icon: CheckCircle2, color: "success" },
  { label: "Scheduled", value: 8, icon: Clock, color: "info" },
  { label: "Failed", value: 2, icon: XCircle, color: "error" },
]

export function PatchJobs() {
  const [activeTab, setActiveTab] = useState("all")

  const columns: Column<Job>[] = [
    {
      key: "status",
      label: "Status",
      sortable: true,
      width: "w-28",
      render: (item) => {
        const statusConfig = {
          running: { label: "Running", variant: "info" as const, icon: Play },
          completed: { label: "Completed", variant: "success" as const, icon: CheckCircle2 },
          failed: { label: "Failed", variant: "error" as const, icon: XCircle },
          scheduled: { label: "Scheduled", variant: "secondary" as const, icon: Clock },
          paused: { label: "Paused", variant: "warning" as const, icon: Pause },
        }
        const config = statusConfig[item.status]
        return (
          <Badge variant={config.variant} className="text-[10px]">
            <config.icon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
        )
      },
    },
    {
      key: "name",
      label: "Job Name",
      sortable: true,
      render: (item) => (
        <div className="max-w-[280px]">
          <p className="font-medium text-text truncate">{item.name}</p>
          <p className="text-xs text-text-muted capitalize">{item.type}</p>
        </div>
      ),
    },
    {
      key: "progress",
      label: "Progress",
      width: "w-48",
      render: (item) => (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">
              {item.successCount + item.failedCount} / {item.targetCount}
            </span>
            <span className={cn(
              item.status === "failed" ? "text-error" : "text-text-muted"
            )}>
              {item.progress}%
            </span>
          </div>
          <Progress
            value={item.progress}
            variant={item.status === "failed" ? "critical" : item.status === "completed" ? "success" : "default"}
            className="h-1.5"
          />
        </div>
      ),
    },
    {
      key: "startTime",
      label: "Started",
      sortable: true,
      width: "w-36",
      render: (item) => (
        <div className="flex items-center gap-1.5 text-text-secondary">
          <Calendar className="h-3 w-3" />
          <span className="text-xs">{item.startTime}</span>
        </div>
      ),
    },
    {
      key: "createdBy",
      label: "Created By",
      sortable: true,
      width: "w-28",
      render: (item) => (
        <span className="text-sm text-text-secondary">{item.createdBy}</span>
      ),
    },
  ]

  const filteredData = mockJobs.filter((job) => {
    if (activeTab === "all") return true
    return job.status === activeTab
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Patch Jobs</h1>
          <p className="text-sm text-text-secondary">
            Monitor and manage patch deployment jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm">
            <Play className="mr-2 h-4 w-4" />
            Create Job
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
                  stat.color === "info" && "bg-info/15 text-info",
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

      {/* Table */}
      <Card className="glass-card overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
            <TabsList>
              <TabsTrigger value="all">All Jobs</TabsTrigger>
              <TabsTrigger value="running">
                Running
                <Badge variant="info" className="ml-2 text-[10px]">
                  {mockJobs.filter((j) => j.status === "running").length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-0">
            <DataTable
              data={filteredData}
              columns={columns}
              searchPlaceholder="Search jobs..."
              actions={(item) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <ChevronRight className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {item.status === "running" && (
                      <>
                        <DropdownMenuItem>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause Job
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-error">
                          <StopCircle className="mr-2 h-4 w-4" />
                          Stop Job
                        </DropdownMenuItem>
                      </>
                    )}
                    {item.status === "paused" && (
                      <DropdownMenuItem>
                        <Play className="mr-2 h-4 w-4" />
                        Resume Job
                      </DropdownMenuItem>
                    )}
                    {item.status === "failed" && (
                      <DropdownMenuItem>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry Job
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Server className="mr-2 h-4 w-4" />
                      View Endpoints
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
