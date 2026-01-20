import { useState } from "react"
import {
  Package,
  Download,
  RefreshCw,
  MoreHorizontal,
  ExternalLink,
  Play,
  Calendar,
  Server,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
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

interface Patch {
  id: string
  name: string
  kbNumber: string
  severity: "critical" | "high" | "medium" | "low"
  vendor: string
  product: string
  releaseDate: string
  size: string
  applicableEndpoints: number
  installedEndpoints: number
  status: "available" | "downloading" | "ready" | "deployed"
  rebootRequired: boolean
}

const mockPatches: Patch[] = [
  {
    id: "1",
    name: "Security Update for Windows 11",
    kbNumber: "KB5034441",
    severity: "critical",
    vendor: "Microsoft",
    product: "Windows 11",
    releaseDate: "2024-01-15",
    size: "245 MB",
    applicableEndpoints: 67,
    installedEndpoints: 45,
    status: "ready",
    rebootRequired: true,
  },
  {
    id: "2",
    name: "Cumulative Update for .NET Framework",
    kbNumber: "KB5034275",
    severity: "high",
    vendor: "Microsoft",
    product: ".NET Framework",
    releaseDate: "2024-01-12",
    size: "78 MB",
    applicableEndpoints: 89,
    installedEndpoints: 89,
    status: "deployed",
    rebootRequired: false,
  },
  {
    id: "3",
    name: "Chrome Security Update",
    kbNumber: "121.0.6167.85",
    severity: "high",
    vendor: "Google",
    product: "Chrome",
    releaseDate: "2024-01-10",
    size: "95 MB",
    applicableEndpoints: 134,
    installedEndpoints: 98,
    status: "ready",
    rebootRequired: false,
  },
  {
    id: "4",
    name: "macOS Sonoma 14.3 Update",
    kbNumber: "14.3",
    severity: "medium",
    vendor: "Apple",
    product: "macOS",
    releaseDate: "2024-01-08",
    size: "1.2 GB",
    applicableEndpoints: 34,
    installedEndpoints: 12,
    status: "downloading",
    rebootRequired: true,
  },
  {
    id: "5",
    name: "Adobe Acrobat Security Patch",
    kbNumber: "24.001.20604",
    severity: "medium",
    vendor: "Adobe",
    product: "Acrobat Reader",
    releaseDate: "2024-01-05",
    size: "156 MB",
    applicableEndpoints: 78,
    installedEndpoints: 45,
    status: "available",
    rebootRequired: false,
  },
  {
    id: "6",
    name: "Linux Kernel Security Update",
    kbNumber: "6.6.9-200",
    severity: "critical",
    vendor: "Linux",
    product: "Kernel",
    releaseDate: "2024-01-03",
    size: "45 MB",
    applicableEndpoints: 34,
    installedEndpoints: 34,
    status: "deployed",
    rebootRequired: true,
  },
]

const stats = [
  { label: "Total Patches", value: 234, icon: Package, color: "primary" },
  { label: "Critical Pending", value: 12, icon: Clock, color: "critical" },
  { label: "Ready to Deploy", value: 47, icon: CheckCircle2, color: "success" },
  { label: "Failed", value: 3, icon: XCircle, color: "error" },
]

export function AllPatches() {
  const [activeTab, setActiveTab] = useState("all")
  const [vendorFilter, setVendorFilter] = useState("all")

  const columns: Column<Patch>[] = [
    {
      key: "severity",
      label: "Severity",
      sortable: true,
      width: "w-24",
      render: (item) => (
        <Badge variant={item.severity} className="uppercase text-[10px]">
          {item.severity}
        </Badge>
      ),
    },
    {
      key: "name",
      label: "Patch Name",
      sortable: true,
      render: (item) => (
        <div className="max-w-[280px]">
          <p className="font-medium text-text truncate">{item.name}</p>
          <p className="text-xs text-text-muted font-mono">{item.kbNumber}</p>
        </div>
      ),
    },
    {
      key: "vendor",
      label: "Vendor",
      sortable: true,
      width: "w-28",
      render: (item) => (
        <span className="text-text-secondary">{item.vendor}</span>
      ),
    },
    {
      key: "product",
      label: "Product",
      sortable: true,
      width: "w-32",
    },
    {
      key: "releaseDate",
      label: "Released",
      sortable: true,
      width: "w-28",
      render: (item) => (
        <div className="flex items-center gap-1.5 text-text-secondary">
          <Calendar className="h-3 w-3" />
          <span className="text-xs">{item.releaseDate}</span>
        </div>
      ),
    },
    {
      key: "applicableEndpoints",
      label: "Coverage",
      sortable: true,
      width: "w-32",
      render: (item) => {
        const percentage = Math.round(
          (item.installedEndpoints / item.applicableEndpoints) * 100
        )
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">
                {item.installedEndpoints}/{item.applicableEndpoints}
              </span>
              <span className="text-text-muted">{percentage}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-elevated overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  percentage === 100
                    ? "bg-success"
                    : percentage >= 50
                    ? "bg-primary"
                    : "bg-warning"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
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
        const statusConfig = {
          available: { label: "Available", variant: "secondary" as const },
          downloading: { label: "Downloading", variant: "info" as const },
          ready: { label: "Ready", variant: "success" as const },
          deployed: { label: "Deployed", variant: "default" as const },
        }
        const config = statusConfig[item.status]
        return (
          <Badge variant={config.variant} className="text-[10px]">
            {config.label}
          </Badge>
        )
      },
    },
    {
      key: "rebootRequired",
      label: "Reboot",
      width: "w-20",
      render: (item) => (
        <span className={cn(
          "text-xs",
          item.rebootRequired ? "text-warning" : "text-text-muted"
        )}>
          {item.rebootRequired ? "Required" : "No"}
        </span>
      ),
    },
  ]

  const filteredData = mockPatches.filter((patch) => {
    if (activeTab !== "all" && patch.status !== activeTab) return false
    if (vendorFilter !== "all" && patch.vendor !== vendorFilter) return false
    return true
  })

  const vendors = [...new Set(mockPatches.map((p) => p.vendor))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">All Patches</h1>
          <p className="text-sm text-text-secondary">
            Manage and deploy patches across your infrastructure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm">
            <Play className="mr-2 h-4 w-4" />
            Deploy Selected
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
                  stat.color === "critical" && "bg-critical/15 text-critical",
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

      {/* Table */}
      <Card className="glass-card overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
            <TabsList>
              <TabsTrigger value="all">
                All
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {mockPatches.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="ready">
                Ready
                <Badge variant="success" className="ml-2 text-[10px]">
                  {mockPatches.filter((p) => p.status === "ready").length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="deployed">Deployed</TabsTrigger>
              <TabsTrigger value="available">Available</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <Filter className="mr-2 h-3 w-3" />
                  <SelectValue placeholder="Vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor} value={vendor}>
                      {vendor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <CardContent className="p-0">
            <DataTable
              data={filteredData}
              columns={columns}
              searchPlaceholder="Search patches..."
              onRowClick={(item) => console.log("View patch:", item.kbNumber)}
              actions={(_item) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Play className="mr-2 h-4 w-4" />
                      Deploy Now
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Server className="mr-2 h-4 w-4" />
                      View Endpoints
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-warning">
                      Exclude Patch
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
