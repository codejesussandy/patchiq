import { useState } from "react"
import {
  Key,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  Users,
  DollarSign,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  TrendingUp,
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

interface License {
  id: string
  software: string
  publisher: string
  type: "perpetual" | "subscription" | "volume" | "oem"
  totalSeats: number
  usedSeats: number
  status: "compliant" | "warning" | "non-compliant" | "expired"
  expiryDate: string
  cost: string
  renewalType: "auto" | "manual"
}

const mockLicenses: License[] = [
  {
    id: "1",
    software: "Microsoft Office 365 E3",
    publisher: "Microsoft",
    type: "subscription",
    totalSeats: 200,
    usedSeats: 145,
    status: "compliant",
    expiryDate: "2024-12-31",
    cost: "$38/user/mo",
    renewalType: "auto",
  },
  {
    id: "2",
    software: "Adobe Creative Cloud",
    publisher: "Adobe",
    type: "subscription",
    totalSeats: 50,
    usedSeats: 52,
    status: "non-compliant",
    expiryDate: "2024-06-30",
    cost: "$79/user/mo",
    renewalType: "manual",
  },
  {
    id: "3",
    software: "Slack Business+",
    publisher: "Salesforce",
    type: "subscription",
    totalSeats: 100,
    usedSeats: 89,
    status: "compliant",
    expiryDate: "2024-09-15",
    cost: "$12.50/user/mo",
    renewalType: "auto",
  },
  {
    id: "4",
    software: "Zoom Business",
    publisher: "Zoom",
    type: "subscription",
    totalSeats: 150,
    usedSeats: 142,
    status: "warning",
    expiryDate: "2024-03-31",
    cost: "$19.99/user/mo",
    renewalType: "manual",
  },
  {
    id: "5",
    software: "AutoCAD",
    publisher: "Autodesk",
    type: "subscription",
    totalSeats: 25,
    usedSeats: 18,
    status: "compliant",
    expiryDate: "2024-08-20",
    cost: "$220/user/mo",
    renewalType: "auto",
  },
  {
    id: "6",
    software: "Windows Server 2022",
    publisher: "Microsoft",
    type: "volume",
    totalSeats: 20,
    usedSeats: 20,
    status: "compliant",
    expiryDate: "Perpetual",
    cost: "$6,155 (one-time)",
    renewalType: "manual",
  },
  {
    id: "7",
    software: "Salesforce Enterprise",
    publisher: "Salesforce",
    type: "subscription",
    totalSeats: 75,
    usedSeats: 45,
    status: "compliant",
    expiryDate: "2024-11-30",
    cost: "$165/user/mo",
    renewalType: "auto",
  },
  {
    id: "8",
    software: "Norton Antivirus Enterprise",
    publisher: "NortonLifeLock",
    type: "subscription",
    totalSeats: 200,
    usedSeats: 165,
    status: "expired",
    expiryDate: "2024-01-01",
    cost: "$45/user/yr",
    renewalType: "manual",
  },
]

const stats = [
  { label: "Total Licenses", value: 48, icon: Key, color: "primary" },
  { label: "Compliant", value: 42, icon: CheckCircle2, color: "success" },
  { label: "Expiring Soon", value: 4, icon: Clock, color: "warning" },
  { label: "Non-Compliant", value: 2, icon: XCircle, color: "error" },
]

export function SoftwareLicenses() {
  const [activeTab, setActiveTab] = useState("all")

  const getStatusConfig = (status: License["status"]) => {
    switch (status) {
      case "compliant":
        return { label: "Compliant", variant: "success" as const, icon: CheckCircle2 }
      case "warning":
        return { label: "Expiring Soon", variant: "warning" as const, icon: Clock }
      case "non-compliant":
        return { label: "Over License", variant: "error" as const, icon: AlertTriangle }
      case "expired":
        return { label: "Expired", variant: "error" as const, icon: XCircle }
      default:
        return { label: status, variant: "secondary" as const, icon: Key }
    }
  }

  const getTypeLabel = (type: License["type"]) => {
    switch (type) {
      case "perpetual":
        return "Perpetual"
      case "subscription":
        return "Subscription"
      case "volume":
        return "Volume"
      case "oem":
        return "OEM"
      default:
        return type
    }
  }

  const filteredLicenses = mockLicenses.filter((license) => {
    if (activeTab === "all") return true
    return license.status === activeTab
  })

  const calculateUsage = (used: number, total: number) => {
    return Math.round((used / total) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Software Licenses</h1>
          <p className="text-sm text-text-secondary">
            Manage software license compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add License
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Software License</DialogTitle>
                <DialogDescription>
                  Enter license details to track compliance
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 text-center text-text-muted">
                License form would go here
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

      {/* Licenses List */}
      <Card className="glass-card">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b border-border-subtle">
            <div className="flex items-center justify-between">
              <CardTitle>License Overview</CardTitle>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="compliant">Compliant</TabsTrigger>
                <TabsTrigger value="warning">Expiring</TabsTrigger>
                <TabsTrigger value="non-compliant">Over License</TabsTrigger>
                <TabsTrigger value="expired">Expired</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-border-subtle">
              {filteredLicenses.map((license) => {
                const statusConfig = getStatusConfig(license.status)
                const usage = calculateUsage(license.usedSeats, license.totalSeats)
                const isOverLicense = license.usedSeats > license.totalSeats

                return (
                  <div
                    key={license.id}
                    className="p-4 transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-lg",
                            license.status === "compliant" && "bg-success/15 text-success",
                            license.status === "warning" && "bg-warning/15 text-warning",
                            license.status === "non-compliant" && "bg-error/15 text-error",
                            license.status === "expired" && "bg-error/15 text-error"
                          )}
                        >
                          <Key className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-text">{license.software}</p>
                            <Badge variant={statusConfig.variant} className="text-[10px]">
                              <statusConfig.icon className="mr-1 h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-text-muted">{license.publisher}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {getTypeLabel(license.type)}
                            </Badge>
                          </div>
                        </div>

                        {/* Usage */}
                        <div className="w-40">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-text-secondary">
                              <Users className="inline h-3 w-3 mr-1" />
                              {license.usedSeats}/{license.totalSeats} seats
                            </span>
                            <span className={cn(
                              isOverLicense ? "text-error" : "text-text-muted"
                            )}>
                              {usage}%
                            </span>
                          </div>
                          <Progress
                            value={Math.min(usage, 100)}
                            className={cn(
                              "h-1.5",
                              isOverLicense && "[&>div]:bg-error"
                            )}
                          />
                        </div>

                        {/* Expiry */}
                        <div className="w-32 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Calendar className="h-3 w-3 text-text-muted" />
                            <span className={cn(
                              "text-xs",
                              license.status === "warning" && "text-warning",
                              license.status === "expired" && "text-error",
                              license.status === "compliant" && "text-text-secondary"
                            )}>
                              {license.expiryDate}
                            </span>
                          </div>
                          {license.renewalType === "auto" && (
                            <span className="text-[10px] text-text-muted">Auto-renew</span>
                          )}
                        </div>

                        {/* Cost */}
                        <div className="w-32 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <DollarSign className="h-3 w-3 text-text-muted" />
                            <span className="text-sm text-text-secondary">{license.cost}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {license.status === "warning" && (
                          <Button variant="outline" size="sm">
                            <RefreshCw className="mr-2 h-3 w-3" />
                            Renew
                          </Button>
                        )}
                        {license.status === "non-compliant" && (
                          <Button variant="outline" size="sm" className="text-error border-error/30">
                            <TrendingUp className="mr-2 h-3 w-3" />
                            Add Seats
                          </Button>
                        )}
                        {license.status === "expired" && (
                          <Button variant="outline" size="sm" className="text-error border-error/30">
                            <RefreshCw className="mr-2 h-3 w-3" />
                            Renew Now
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
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit License
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Users className="mr-2 h-4 w-4" />
                              Manage Users
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-error">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
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
