import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  MoreHorizontal,
  Server,
  Calendar,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/shared/DataTable"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DeployedPatch {
  id: string
  name: string
  kbNumber: string
  deploymentDate: string
  targetEndpoints: number
  successCount: number
  failedCount: number
  pendingCount: number
  status: "completed" | "in_progress" | "failed" | "partial"
  deployedBy: string
}

const mockDeployments: DeployedPatch[] = [
  {
    id: "1",
    name: "Security Update for Windows 11",
    kbNumber: "KB5034441",
    deploymentDate: "2024-01-16 14:30",
    targetEndpoints: 67,
    successCount: 65,
    failedCount: 2,
    pendingCount: 0,
    status: "partial",
    deployedBy: "Admin",
  },
  {
    id: "2",
    name: "Cumulative Update for .NET Framework",
    kbNumber: "KB5034275",
    deploymentDate: "2024-01-15 09:00",
    targetEndpoints: 89,
    successCount: 89,
    failedCount: 0,
    pendingCount: 0,
    status: "completed",
    deployedBy: "Auto-Deploy",
  },
  {
    id: "3",
    name: "Chrome Security Update",
    kbNumber: "121.0.6167.85",
    deploymentDate: "2024-01-14 16:45",
    targetEndpoints: 134,
    successCount: 98,
    failedCount: 5,
    pendingCount: 31,
    status: "in_progress",
    deployedBy: "Admin",
  },
  {
    id: "4",
    name: "Linux Kernel Security Update",
    kbNumber: "6.6.9-200",
    deploymentDate: "2024-01-12 11:00",
    targetEndpoints: 34,
    successCount: 34,
    failedCount: 0,
    pendingCount: 0,
    status: "completed",
    deployedBy: "Auto-Deploy",
  },
]

const stats = [
  { label: "Total Deployments", value: 156, icon: CheckCircle2, color: "primary" },
  { label: "Success Rate", value: "94.2%", icon: CheckCircle2, color: "success" },
  { label: "In Progress", value: 8, icon: Clock, color: "info" },
  { label: "Failed", value: 12, icon: XCircle, color: "error" },
]

export function DeployedPatches() {
  const columns: Column<DeployedPatch>[] = [
    {
      key: "status",
      label: "Status",
      sortable: true,
      width: "w-28",
      render: (item) => {
        const statusConfig = {
          completed: { label: "Completed", variant: "success" as const, icon: CheckCircle2 },
          in_progress: { label: "In Progress", variant: "info" as const, icon: Clock },
          failed: { label: "Failed", variant: "error" as const, icon: XCircle },
          partial: { label: "Partial", variant: "warning" as const, icon: AlertTriangle },
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
      label: "Patch",
      sortable: true,
      render: (item) => (
        <div className="max-w-[260px]">
          <p className="font-medium text-text truncate">{item.name}</p>
          <p className="text-xs text-text-muted font-mono">{item.kbNumber}</p>
        </div>
      ),
    },
    {
      key: "deploymentDate",
      label: "Deployed",
      sortable: true,
      width: "w-36",
      render: (item) => (
        <div className="flex items-center gap-1.5 text-text-secondary">
          <Calendar className="h-3 w-3" />
          <span className="text-xs">{item.deploymentDate}</span>
        </div>
      ),
    },
    {
      key: "targetEndpoints",
      label: "Progress",
      width: "w-48",
      render: (item) => {
        const successPercent = Math.round((item.successCount / item.targetEndpoints) * 100)
        const failedPercent = Math.round((item.failedCount / item.targetEndpoints) * 100)
        return (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-success">{item.successCount} success</span>
              {item.failedCount > 0 && (
                <span className="text-error">{item.failedCount} failed</span>
              )}
              {item.pendingCount > 0 && (
                <span className="text-text-muted">{item.pendingCount} pending</span>
              )}
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-elevated overflow-hidden flex">
              <div
                className="h-full bg-success"
                style={{ width: `${successPercent}%` }}
              />
              <div
                className="h-full bg-error"
                style={{ width: `${failedPercent}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      key: "deployedBy",
      label: "Deployed By",
      sortable: true,
      width: "w-28",
      render: (item) => (
        <span className="text-text-secondary text-sm">{item.deployedBy}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Deployed Patches</h1>
          <p className="text-sm text-text-secondary">
            Track deployment history and status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
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
        <CardHeader className="border-b border-border-subtle">
          <CardTitle>Deployment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={mockDeployments}
            columns={columns}
            searchPlaceholder="Search deployments..."
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
                    <Server className="mr-2 h-4 w-4" />
                    View Endpoints
                  </DropdownMenuItem>
                  <DropdownMenuItem>Retry Failed</DropdownMenuItem>
                  <DropdownMenuItem>Download Report</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
