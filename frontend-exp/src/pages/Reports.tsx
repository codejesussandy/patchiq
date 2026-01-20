import { useState } from "react"
import {
  FileText,
  Download,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  Shield,
  Package,
  Monitor,
  BarChart3,
  TrendingUp,
  Filter,
} from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Report {
  id: string
  name: string
  type: "vulnerability" | "patch" | "compliance" | "executive"
  format: "pdf" | "csv" | "xlsx"
  generatedAt: string
  size: string
  status: "ready" | "generating" | "scheduled"
  schedule?: string
}

const reports: Report[] = [
  {
    id: "1",
    name: "Executive Security Summary - January 2024",
    type: "executive",
    format: "pdf",
    generatedAt: "2024-01-16 09:00",
    size: "2.4 MB",
    status: "ready",
  },
  {
    id: "2",
    name: "Vulnerability Assessment Report",
    type: "vulnerability",
    format: "pdf",
    generatedAt: "2024-01-15 14:30",
    size: "5.1 MB",
    status: "ready",
  },
  {
    id: "3",
    name: "Patch Compliance Report",
    type: "compliance",
    format: "xlsx",
    generatedAt: "2024-01-14 08:00",
    size: "1.8 MB",
    status: "ready",
  },
  {
    id: "4",
    name: "Monthly Patch Deployment Summary",
    type: "patch",
    format: "pdf",
    generatedAt: "Generating...",
    size: "-",
    status: "generating",
  },
  {
    id: "5",
    name: "Weekly Compliance Check",
    type: "compliance",
    format: "csv",
    generatedAt: "Scheduled",
    size: "-",
    status: "scheduled",
    schedule: "Every Monday 6:00 AM",
  },
]

const reportTemplates = [
  {
    name: "Executive Summary",
    description: "High-level overview for leadership",
    icon: TrendingUp,
    type: "executive",
  },
  {
    name: "Vulnerability Report",
    description: "Detailed vulnerability analysis",
    icon: Shield,
    type: "vulnerability",
  },
  {
    name: "Patch Status",
    description: "Deployment status across endpoints",
    icon: Package,
    type: "patch",
  },
  {
    name: "Compliance Report",
    description: "Compliance status and metrics",
    icon: CheckCircle2,
    type: "compliance",
  },
  {
    name: "Asset Inventory",
    description: "Complete asset listing",
    icon: Monitor,
    type: "asset",
  },
  {
    name: "Custom Report",
    description: "Build your own report",
    icon: BarChart3,
    type: "custom",
  },
]

export function Reports() {
  const [typeFilter, setTypeFilter] = useState("all")

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "vulnerability":
        return <Shield className="h-4 w-4 text-critical" />
      case "patch":
        return <Package className="h-4 w-4 text-primary" />
      case "compliance":
        return <CheckCircle2 className="h-4 w-4 text-success" />
      case "executive":
        return <TrendingUp className="h-4 w-4 text-accent" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const filteredReports = reports.filter((r) =>
    typeFilter === "all" ? true : r.type === typeFilter
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Reports</h1>
          <p className="text-sm text-text-secondary">
            Generate and manage security reports
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Report</DialogTitle>
              <DialogDescription>
                Choose a report template to get started
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {reportTemplates.map((template) => (
                <button
                  key={template.name}
                  className="flex items-start gap-4 rounded-xl border border-border-subtle bg-surface p-4 text-left transition-colors hover:border-primary hover:bg-surface-hover"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated">
                    <template.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-text">{template.name}</p>
                    <p className="text-xs text-text-muted">{template.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total Reports</p>
              <p className="text-2xl font-bold text-text">47</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-success/15 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Generated Today</p>
              <p className="text-2xl font-bold text-text">5</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-info/15 text-info">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Scheduled</p>
              <p className="text-2xl font-bold text-text">8</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Downloads</p>
              <p className="text-2xl font-bold text-text">234</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border-subtle">
          <CardTitle>Recent Reports</CardTitle>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
              <SelectItem value="vulnerability">Vulnerability</SelectItem>
              <SelectItem value="patch">Patch</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border-subtle">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 transition-colors hover:bg-surface-hover"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated">
                    {getTypeIcon(report.type)}
                  </div>
                  <div>
                    <p className="font-medium text-text">{report.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {report.type}
                      </Badge>
                      <span className="text-xs text-text-muted uppercase">{report.format}</span>
                      {report.status === "ready" && (
                        <span className="text-xs text-text-muted">{report.size}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {report.status === "ready" ? (
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">{report.generatedAt}</span>
                      </div>
                    ) : report.status === "generating" ? (
                      <Badge variant="info" className="text-[10px]">
                        <Clock className="mr-1 h-3 w-3 animate-spin" />
                        Generating
                      </Badge>
                    ) : (
                      <div>
                        <Badge variant="secondary" className="text-[10px]">
                          <Clock className="mr-1 h-3 w-3" />
                          Scheduled
                        </Badge>
                        <p className="text-[10px] text-text-muted mt-1">{report.schedule}</p>
                      </div>
                    )}
                  </div>

                  {report.status === "ready" && (
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Regenerate</DropdownMenuItem>
                      <DropdownMenuItem>Schedule</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-error">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
