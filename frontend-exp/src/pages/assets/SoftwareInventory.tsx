import { useState } from "react"
import {
  Package,
  Download,
  RefreshCw,
  MoreHorizontal,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Server,
  Laptop,
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

interface Software {
  id: string
  name: string
  publisher: string
  version: string
  installedOn: number
  category: "productivity" | "security" | "development" | "communication" | "system" | "other"
  status: "up-to-date" | "update-available" | "vulnerable" | "unsupported"
  lastUpdated: string
  size: string
}

const mockSoftware: Software[] = [
  {
    id: "1",
    name: "Microsoft Office 365",
    publisher: "Microsoft",
    version: "16.0.17231",
    installedOn: 145,
    category: "productivity",
    status: "up-to-date",
    lastUpdated: "2024-01-15",
    size: "4.2 GB",
  },
  {
    id: "2",
    name: "Google Chrome",
    publisher: "Google",
    version: "121.0.6167",
    installedOn: 168,
    category: "productivity",
    status: "update-available",
    lastUpdated: "2024-01-10",
    size: "245 MB",
  },
  {
    id: "3",
    name: "Visual Studio Code",
    publisher: "Microsoft",
    version: "1.85.2",
    installedOn: 45,
    category: "development",
    status: "up-to-date",
    lastUpdated: "2024-01-14",
    size: "380 MB",
  },
  {
    id: "4",
    name: "Zoom",
    publisher: "Zoom Video Communications",
    version: "5.16.10",
    installedOn: 134,
    category: "communication",
    status: "vulnerable",
    lastUpdated: "2024-01-05",
    size: "156 MB",
  },
  {
    id: "5",
    name: "Adobe Acrobat Reader",
    publisher: "Adobe",
    version: "23.008.20470",
    installedOn: 112,
    category: "productivity",
    status: "update-available",
    lastUpdated: "2023-12-20",
    size: "678 MB",
  },
  {
    id: "6",
    name: "CrowdStrike Falcon",
    publisher: "CrowdStrike",
    version: "7.04.17705",
    installedOn: 165,
    category: "security",
    status: "up-to-date",
    lastUpdated: "2024-01-16",
    size: "89 MB",
  },
  {
    id: "7",
    name: "Java Runtime Environment",
    publisher: "Oracle",
    version: "8u381",
    installedOn: 78,
    category: "development",
    status: "unsupported",
    lastUpdated: "2023-10-15",
    size: "142 MB",
  },
  {
    id: "8",
    name: "Slack",
    publisher: "Salesforce",
    version: "4.35.126",
    installedOn: 89,
    category: "communication",
    status: "up-to-date",
    lastUpdated: "2024-01-12",
    size: "234 MB",
  },
]

const stats = [
  { label: "Total Software", value: 234, icon: Package, color: "primary" },
  { label: "Up to Date", value: 189, icon: CheckCircle2, color: "success" },
  { label: "Updates Available", value: 32, icon: Clock, color: "warning" },
  { label: "Vulnerable", value: 13, icon: AlertTriangle, color: "error" },
]

export function SoftwareInventory() {
  const [activeTab, setActiveTab] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const getStatusConfig = (status: Software["status"]) => {
    switch (status) {
      case "up-to-date":
        return { label: "Up to date", variant: "success" as const, icon: CheckCircle2 }
      case "update-available":
        return { label: "Update available", variant: "warning" as const, icon: Clock }
      case "vulnerable":
        return { label: "Vulnerable", variant: "error" as const, icon: AlertTriangle }
      case "unsupported":
        return { label: "Unsupported", variant: "secondary" as const, icon: Shield }
      default:
        return { label: status, variant: "secondary" as const, icon: Package }
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "security":
        return <Shield className="h-4 w-4 text-success" />
      case "development":
        return <Package className="h-4 w-4 text-primary" />
      case "communication":
        return <Server className="h-4 w-4 text-info" />
      default:
        return <Package className="h-4 w-4 text-text-muted" />
    }
  }

  const columns: Column<Software>[] = [
    {
      key: "name",
      label: "Software",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated">
            {getCategoryIcon(item.category)}
          </div>
          <div>
            <p className="font-medium text-text">{item.name}</p>
            <p className="text-xs text-text-muted">{item.publisher}</p>
          </div>
        </div>
      ),
    },
    {
      key: "version",
      label: "Version",
      sortable: true,
      width: "w-32",
      render: (item) => (
        <span className="text-sm font-mono text-text-secondary">{item.version}</span>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      width: "w-32",
      render: (item) => (
        <Badge variant="secondary" className="text-[10px] capitalize">
          {item.category}
        </Badge>
      ),
    },
    {
      key: "installedOn",
      label: "Installed On",
      sortable: true,
      width: "w-32",
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <Laptop className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-sm text-text-secondary">{item.installedOn} devices</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      width: "w-36",
      render: (item) => {
        const config = getStatusConfig(item.status)
        return (
          <Badge variant={config.variant} className="text-[10px]">
            <config.icon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
        )
      },
    },
    {
      key: "lastUpdated",
      label: "Last Updated",
      sortable: true,
      width: "w-28",
      render: (item) => (
        <span className="text-xs text-text-muted">{item.lastUpdated}</span>
      ),
    },
    {
      key: "size",
      label: "Size",
      width: "w-24",
      render: (item) => (
        <span className="text-xs text-text-muted">{item.size}</span>
      ),
    },
  ]

  const filteredData = mockSoftware.filter((software) => {
    if (activeTab !== "all" && software.status !== activeTab) return false
    if (categoryFilter !== "all" && software.category !== categoryFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Software Inventory</h1>
          <p className="text-sm text-text-secondary">
            Track installed software across endpoints
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Scan Now
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
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
                  stat.color === "warning" && "bg-warning/15 text-warning",
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
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="up-to-date">Up to Date</TabsTrigger>
              <TabsTrigger value="update-available">Updates Available</TabsTrigger>
              <TabsTrigger value="vulnerable">Vulnerable</TabsTrigger>
              <TabsTrigger value="unsupported">Unsupported</TabsTrigger>
            </TabsList>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <Filter className="mr-2 h-3 w-3" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="productivity">Productivity</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CardContent className="p-0">
            <DataTable
              data={filteredData}
              columns={columns}
              searchPlaceholder="Search software..."
              actions={(_item) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>View Installed Devices</DropdownMenuItem>
                    <DropdownMenuItem>Check for Updates</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-error">
                      Block Software
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
