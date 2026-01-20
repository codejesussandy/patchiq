import { useState } from "react"
import {
  Zap,
  Plus,
  Settings,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  Calendar,
  Server,
  Package,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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

interface DeploymentPolicy {
  id: string
  name: string
  description: string
  enabled: boolean
  schedule: string
  severity: ("critical" | "high" | "medium" | "low")[]
  targetGroups: string[]
  targetCount: number
  autoApprove: boolean
  testFirst: boolean
  rebootPolicy: "immediate" | "scheduled" | "user-choice"
  lastRun: string
  nextRun: string
  successRate: number
  patchesDeployed: number
}

const mockPolicies: DeploymentPolicy[] = [
  {
    id: "1",
    name: "Critical Security Updates",
    description: "Auto-deploy critical patches within 24 hours",
    enabled: true,
    schedule: "Daily at 2:00 AM",
    severity: ["critical"],
    targetGroups: ["Production Servers", "Domain Controllers"],
    targetCount: 45,
    autoApprove: false,
    testFirst: true,
    rebootPolicy: "scheduled",
    lastRun: "2024-01-16 02:00",
    nextRun: "2024-01-17 02:00",
    successRate: 98,
    patchesDeployed: 156,
  },
  {
    id: "2",
    name: "Workstation Updates",
    description: "Weekly deployment for all workstations",
    enabled: true,
    schedule: "Every Sunday at 11:00 PM",
    severity: ["critical", "high", "medium"],
    targetGroups: ["All Workstations"],
    targetCount: 234,
    autoApprove: true,
    testFirst: true,
    rebootPolicy: "user-choice",
    lastRun: "2024-01-14 23:00",
    nextRun: "2024-01-21 23:00",
    successRate: 94,
    patchesDeployed: 1247,
  },
  {
    id: "3",
    name: "Development Environment",
    description: "Auto-deploy all patches to dev servers",
    enabled: true,
    schedule: "Every 6 hours",
    severity: ["critical", "high", "medium", "low"],
    targetGroups: ["Dev Servers", "Test Environment"],
    targetCount: 28,
    autoApprove: true,
    testFirst: false,
    rebootPolicy: "immediate",
    lastRun: "2024-01-16 12:00",
    nextRun: "2024-01-16 18:00",
    successRate: 89,
    patchesDeployed: 892,
  },
  {
    id: "4",
    name: "Database Servers",
    description: "Monthly maintenance window for DB patches",
    enabled: false,
    schedule: "First Saturday of month at 1:00 AM",
    severity: ["critical", "high"],
    targetGroups: ["Database Servers"],
    targetCount: 12,
    autoApprove: false,
    testFirst: true,
    rebootPolicy: "scheduled",
    lastRun: "2024-01-06 01:00",
    nextRun: "2024-02-03 01:00",
    successRate: 100,
    patchesDeployed: 34,
  },
]

const stats = [
  { label: "Active Policies", value: 3, icon: Zap, color: "primary" },
  { label: "Total Deployments", value: 2329, icon: Package, color: "info" },
  { label: "Success Rate", value: "96%", icon: CheckCircle2, color: "success" },
  { label: "Next Deployment", value: "6h", icon: Clock, color: "warning" },
]

export function ZeroTouch() {
  const [policies, setPolicies] = useState(mockPolicies)

  const togglePolicy = (id: string) => {
    setPolicies(policies.map(p =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ))
  }

  const getSeverityBadges = (severity: string[]) => {
    return severity.map((s) => (
      <Badge key={s} variant={s as "critical" | "high" | "medium" | "low"} className="text-[10px] uppercase">
        {s}
      </Badge>
    ))
  }

  const getRebootLabel = (policy: string) => {
    switch (policy) {
      case "immediate":
        return "Immediate reboot"
      case "scheduled":
        return "Scheduled reboot"
      case "user-choice":
        return "User decides"
      default:
        return policy
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Zero Touch Deployment</h1>
          <p className="text-sm text-text-secondary">
            Automated patch deployment configuration
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Deployment Policy</DialogTitle>
              <DialogDescription>
                Configure automated patch deployment rules
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center text-text-muted">
              Policy creation form would go here
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
                  stat.color === "info" && "bg-info/15 text-info",
                  stat.color === "success" && "bg-success/15 text-success",
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

      {/* Policies */}
      <Card className="glass-card">
        <CardHeader className="border-b border-border-subtle">
          <CardTitle>Deployment Policies</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border-subtle">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className={cn(
                  "p-6 transition-colors",
                  !policy.enabled && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl",
                        policy.enabled
                          ? "bg-primary/15 text-primary"
                          : "bg-surface-elevated text-text-muted"
                      )}
                    >
                      <Zap className="h-6 w-6" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-text">{policy.name}</h3>
                        {policy.enabled ? (
                          <Badge variant="success" className="text-[10px]">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            <Pause className="mr-1 h-3 w-3" />
                            Paused
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">{policy.description}</p>

                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-text-muted" />
                          <span className="text-xs text-text-secondary">{policy.schedule}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Server className="h-3.5 w-3.5 text-text-muted" />
                          <span className="text-xs text-text-secondary">{policy.targetCount} endpoints</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {getSeverityBadges(policy.severity)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right space-y-2">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-text-muted">Success rate</span>
                        <span className={cn(
                          "text-sm font-semibold",
                          policy.successRate >= 95 ? "text-success" :
                          policy.successRate >= 80 ? "text-warning" : "text-error"
                        )}>
                          {policy.successRate}%
                        </span>
                      </div>
                      <Progress
                        value={policy.successRate}
                        className="h-1.5 w-24"
                      />
                    </div>

                    <Switch
                      checked={policy.enabled}
                      onCheckedChange={() => togglePolicy(policy.id)}
                    />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Policy
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Play className="mr-2 h-4 w-4" />
                          Run Now
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="mr-2 h-4 w-4" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-error">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Policy
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Policy details */}
                <div className="mt-4 ml-16 grid grid-cols-4 gap-4 pt-4 border-t border-border-subtle">
                  <div>
                    <p className="text-xs text-text-muted">Target Groups</p>
                    <p className="text-sm text-text-secondary mt-0.5">
                      {policy.targetGroups.join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Reboot Policy</p>
                    <p className="text-sm text-text-secondary mt-0.5">
                      {getRebootLabel(policy.rebootPolicy)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Last Run</p>
                    <p className="text-sm text-text-secondary mt-0.5">{policy.lastRun}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Next Run</p>
                    <p className="text-sm text-text-secondary mt-0.5">{policy.nextRun}</p>
                  </div>
                </div>

                {/* Badges for features */}
                <div className="mt-3 ml-16 flex items-center gap-2">
                  {policy.autoApprove && (
                    <Badge variant="secondary" className="text-[10px]">
                      Auto-approve
                    </Badge>
                  )}
                  {policy.testFirst && (
                    <Badge variant="secondary" className="text-[10px]">
                      Test before deploy
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">
                    {policy.patchesDeployed} patches deployed
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
