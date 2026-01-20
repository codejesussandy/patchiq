import { useState } from "react"
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Server,
  MoreHorizontal,
  ChevronRight,
  Eye,
  ThumbsUp,
  ThumbsDown,
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

interface TestPatch {
  id: string
  name: string
  kbNumber: string
  severity: "critical" | "high" | "medium" | "low"
  vendor: string
  testStatus: "pending" | "testing" | "passed" | "failed" | "approved" | "rejected"
  testProgress: number
  testEndpoints: number
  totalEndpoints: number
  startedAt: string
  completedAt?: string
  issues: number
  approver?: string
}

const mockTestPatches: TestPatch[] = [
  {
    id: "1",
    name: "Security Update for Windows 11",
    kbNumber: "KB5034441",
    severity: "critical",
    vendor: "Microsoft",
    testStatus: "testing",
    testProgress: 65,
    testEndpoints: 5,
    totalEndpoints: 5,
    startedAt: "2024-01-16 10:30",
    issues: 0,
  },
  {
    id: "2",
    name: "Cumulative Update for .NET Framework",
    kbNumber: "KB5034275",
    severity: "high",
    vendor: "Microsoft",
    testStatus: "passed",
    testProgress: 100,
    testEndpoints: 3,
    totalEndpoints: 3,
    startedAt: "2024-01-15 14:00",
    completedAt: "2024-01-15 16:30",
    issues: 0,
  },
  {
    id: "3",
    name: "Chrome Security Update",
    kbNumber: "121.0.6167.85",
    severity: "high",
    vendor: "Google",
    testStatus: "failed",
    testProgress: 100,
    testEndpoints: 4,
    totalEndpoints: 4,
    startedAt: "2024-01-14 09:00",
    completedAt: "2024-01-14 11:45",
    issues: 2,
  },
  {
    id: "4",
    name: "macOS Sonoma 14.3 Update",
    kbNumber: "14.3",
    severity: "medium",
    vendor: "Apple",
    testStatus: "approved",
    testProgress: 100,
    testEndpoints: 2,
    totalEndpoints: 2,
    startedAt: "2024-01-13 08:00",
    completedAt: "2024-01-13 14:00",
    issues: 0,
    approver: "John Smith",
  },
  {
    id: "5",
    name: "Adobe Acrobat Security Patch",
    kbNumber: "24.001.20604",
    severity: "medium",
    vendor: "Adobe",
    testStatus: "pending",
    testProgress: 0,
    testEndpoints: 0,
    totalEndpoints: 3,
    startedAt: "-",
    issues: 0,
  },
]

const stats = [
  { label: "Pending Review", value: 8, icon: Clock, color: "warning" },
  { label: "Currently Testing", value: 3, icon: Play, color: "info" },
  { label: "Passed", value: 12, icon: CheckCircle2, color: "success" },
  { label: "Failed", value: 2, icon: XCircle, color: "error" },
]

export function TestApprove() {
  const [activeTab, setActiveTab] = useState("all")

  const getStatusConfig = (status: TestPatch["testStatus"]) => {
    switch (status) {
      case "pending":
        return { label: "Pending", variant: "secondary" as const, icon: Clock }
      case "testing":
        return { label: "Testing", variant: "info" as const, icon: Play }
      case "passed":
        return { label: "Passed", variant: "success" as const, icon: CheckCircle2 }
      case "failed":
        return { label: "Failed", variant: "error" as const, icon: XCircle }
      case "approved":
        return { label: "Approved", variant: "success" as const, icon: ThumbsUp }
      case "rejected":
        return { label: "Rejected", variant: "error" as const, icon: ThumbsDown }
      default:
        return { label: status, variant: "secondary" as const, icon: Clock }
    }
  }

  const filteredPatches = mockTestPatches.filter((patch) => {
    if (activeTab === "all") return true
    return patch.testStatus === activeTab
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Test & Approve</h1>
          <p className="text-sm text-text-secondary">
            Review and approve patches before deployment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Test Report
          </Button>
          <Button size="sm">
            <Play className="mr-2 h-4 w-4" />
            Start Test Cycle
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
                  stat.color === "warning" && "bg-warning/15 text-warning",
                  stat.color === "info" && "bg-info/15 text-info",
                  stat.color === "success" && "bg-success/15 text-success",
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

      {/* Main Content */}
      <Card className="glass-card">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b border-border-subtle">
            <div className="flex items-center justify-between">
              <CardTitle>Patch Testing Queue</CardTitle>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="testing">Testing</TabsTrigger>
                <TabsTrigger value="passed">Passed</TabsTrigger>
                <TabsTrigger value="failed">Failed</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-border-subtle">
              {filteredPatches.map((patch) => {
                const statusConfig = getStatusConfig(patch.testStatus)
                return (
                  <div
                    key={patch.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          patch.testStatus === "testing" && "bg-info/15 text-info",
                          patch.testStatus === "passed" && "bg-success/15 text-success",
                          patch.testStatus === "failed" && "bg-error/15 text-error",
                          patch.testStatus === "approved" && "bg-success/15 text-success",
                          patch.testStatus === "pending" && "bg-surface-elevated text-text-muted"
                        )}
                      >
                        <statusConfig.icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text truncate">{patch.name}</p>
                          <Badge variant={patch.severity} className="uppercase text-[10px]">
                            {patch.severity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-text-muted font-mono">{patch.kbNumber}</span>
                          <span className="text-xs text-text-secondary">{patch.vendor}</span>
                        </div>
                      </div>

                      {/* Progress section */}
                      <div className="w-48">
                        {patch.testStatus === "testing" ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-text-secondary">Testing progress</span>
                              <span className="text-text-muted">{patch.testProgress}%</span>
                            </div>
                            <Progress value={patch.testProgress} className="h-1.5" />
                          </div>
                        ) : patch.testStatus === "pending" ? (
                          <span className="text-xs text-text-muted">Not started</span>
                        ) : (
                          <div className="flex items-center gap-2 text-xs">
                            <Server className="h-3 w-3 text-text-muted" />
                            <span className="text-text-secondary">
                              {patch.testEndpoints}/{patch.totalEndpoints} endpoints tested
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Issues indicator */}
                      {patch.issues > 0 && (
                        <Badge variant="error" className="text-[10px]">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {patch.issues} issues
                        </Badge>
                      )}

                      {/* Status badge */}
                      <Badge variant={statusConfig.variant} className="text-[10px] w-24 justify-center">
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {patch.testStatus === "passed" && (
                        <>
                          <Button variant="outline" size="sm" className="text-success border-success/30 hover:bg-success/10">
                            <ThumbsUp className="mr-2 h-3 w-3" />
                            Approve
                          </Button>
                          <Button variant="outline" size="sm" className="text-error border-error/30 hover:bg-error/10">
                            <ThumbsDown className="mr-2 h-3 w-3" />
                            Reject
                          </Button>
                        </>
                      )}
                      {patch.testStatus === "pending" && (
                        <Button variant="outline" size="sm">
                          <Play className="mr-2 h-3 w-3" />
                          Start Test
                        </Button>
                      )}
                      {patch.testStatus === "testing" && (
                        <Button variant="outline" size="sm">
                          <Pause className="mr-2 h-3 w-3" />
                          Pause
                        </Button>
                      )}
                      {patch.testStatus === "failed" && (
                        <Button variant="outline" size="sm">
                          <RotateCcw className="mr-2 h-3 w-3" />
                          Retest
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
                            View Test Report
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Server className="mr-2 h-4 w-4" />
                            View Test Endpoints
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-warning">
                            Skip Testing
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button variant="ghost" size="icon-sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
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
