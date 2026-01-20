import { useState } from "react"
import {
  Shield,
  AlertTriangle,
  Download,
  RefreshCw,
  ExternalLink,
  MoreHorizontal,
  Zap,
  Clock,
  Target,
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

interface Vulnerability {
  id: string
  cve: string
  severity: "critical" | "high" | "medium" | "low"
  cvss: number
  epss: number
  description: string
  affectedEndpoints: number
  exploitable: boolean
  publishedDate: string
  discoveredDate: string
  status: "open" | "in_progress" | "resolved"
}

const mockVulnerabilities: Vulnerability[] = [
  {
    id: "1",
    cve: "CVE-2024-1234",
    severity: "critical",
    cvss: 9.8,
    epss: 0.97,
    description: "Remote Code Execution vulnerability in Windows SMB",
    affectedEndpoints: 15,
    exploitable: true,
    publishedDate: "2024-01-15",
    discoveredDate: "2024-01-16",
    status: "open",
  },
  {
    id: "2",
    cve: "CVE-2024-5678",
    severity: "critical",
    cvss: 9.1,
    epss: 0.85,
    description: "Privilege Escalation in Linux Kernel",
    affectedEndpoints: 12,
    exploitable: true,
    publishedDate: "2024-01-10",
    discoveredDate: "2024-01-12",
    status: "in_progress",
  },
  {
    id: "3",
    cve: "CVE-2024-9012",
    severity: "high",
    cvss: 8.9,
    epss: 0.72,
    description: "SQL Injection in Apache Tomcat",
    affectedEndpoints: 23,
    exploitable: false,
    publishedDate: "2024-01-08",
    discoveredDate: "2024-01-09",
    status: "open",
  },
  {
    id: "4",
    cve: "CVE-2024-3456",
    severity: "high",
    cvss: 8.5,
    epss: 0.65,
    description: "Cross-Site Scripting in Microsoft Exchange",
    affectedEndpoints: 8,
    exploitable: false,
    publishedDate: "2024-01-05",
    discoveredDate: "2024-01-07",
    status: "resolved",
  },
  {
    id: "5",
    cve: "CVE-2024-7890",
    severity: "high",
    cvss: 8.2,
    epss: 0.58,
    description: "Authentication Bypass in OpenSSH",
    affectedEndpoints: 19,
    exploitable: true,
    publishedDate: "2024-01-03",
    discoveredDate: "2024-01-04",
    status: "open",
  },
  {
    id: "6",
    cve: "CVE-2024-2345",
    severity: "medium",
    cvss: 6.5,
    epss: 0.32,
    description: "Information Disclosure in Nginx",
    affectedEndpoints: 34,
    exploitable: false,
    publishedDate: "2024-01-01",
    discoveredDate: "2024-01-02",
    status: "open",
  },
  {
    id: "7",
    cve: "CVE-2024-6789",
    severity: "medium",
    cvss: 5.9,
    epss: 0.25,
    description: "Denial of Service in Redis",
    affectedEndpoints: 7,
    exploitable: false,
    publishedDate: "2023-12-28",
    discoveredDate: "2023-12-30",
    status: "in_progress",
  },
  {
    id: "8",
    cve: "CVE-2024-0123",
    severity: "low",
    cvss: 3.5,
    epss: 0.12,
    description: "Minor Information Leak in PostgreSQL",
    affectedEndpoints: 5,
    exploitable: false,
    publishedDate: "2023-12-25",
    discoveredDate: "2023-12-27",
    status: "resolved",
  },
]

const stats = [
  {
    label: "Total Vulnerabilities",
    value: 847,
    icon: Shield,
    color: "primary",
  },
  {
    label: "Critical",
    value: 47,
    icon: AlertTriangle,
    color: "critical",
  },
  {
    label: "Exploitable",
    value: 156,
    icon: Zap,
    color: "high",
  },
  {
    label: "Avg. Time to Fix",
    value: "4.2d",
    icon: Clock,
    color: "info",
  },
]

export function Vulnerabilities() {
  const [activeTab, setActiveTab] = useState("all")

  const columns: Column<Vulnerability>[] = [
    {
      key: "severity",
      label: "Severity",
      sortable: true,
      width: "w-28",
      render: (item) => (
        <Badge variant={item.severity} className="uppercase">
          {item.severity}
        </Badge>
      ),
    },
    {
      key: "cve",
      label: "CVE",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-primary">{item.cve}</span>
          {item.exploitable && (
            <Badge variant="critical" className="text-[10px]">
              <Zap className="mr-1 h-3 w-3" />
              Exploit
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "cvss",
      label: "CVSS",
      sortable: true,
      width: "w-20",
      render: (item) => (
        <span
          className={cn(
            "font-bold",
            item.cvss >= 9 && "text-critical",
            item.cvss >= 7 && item.cvss < 9 && "text-high",
            item.cvss >= 4 && item.cvss < 7 && "text-medium",
            item.cvss < 4 && "text-low"
          )}
        >
          {item.cvss}
        </span>
      ),
    },
    {
      key: "epss",
      label: "EPSS",
      sortable: true,
      width: "w-24",
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-surface-elevated overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                item.epss >= 0.7 && "bg-critical",
                item.epss >= 0.4 && item.epss < 0.7 && "bg-high",
                item.epss < 0.4 && "bg-medium"
              )}
              style={{ width: `${item.epss * 100}%` }}
            />
          </div>
          <span className="text-xs text-text-muted">
            {(item.epss * 100).toFixed(0)}%
          </span>
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (item) => (
        <span className="line-clamp-1 max-w-[300px]">{item.description}</span>
      ),
    },
    {
      key: "affectedEndpoints",
      label: "Affected",
      sortable: true,
      width: "w-24",
      render: (item) => (
        <div className="flex items-center gap-1">
          <Target className="h-3 w-3 text-text-muted" />
          <span>{item.affectedEndpoints}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      width: "w-28",
      render: (item) => (
        <Badge
          variant={
            item.status === "resolved"
              ? "success"
              : item.status === "in_progress"
              ? "warning"
              : "secondary"
          }
        >
          {item.status.replace("_", " ")}
        </Badge>
      ),
    },
  ]

  const filteredData =
    activeTab === "all"
      ? mockVulnerabilities
      : mockVulnerabilities.filter((v) => v.severity === activeTab)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Vulnerabilities</h1>
          <p className="text-sm text-text-secondary">
            Monitor and manage security vulnerabilities across your infrastructure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Scan Now
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="glow">
            <Shield className="mr-2 h-4 w-4" />
            Add Exception
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} variant="elevated">
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  stat.color === "primary" && "bg-primary/20 text-primary",
                  stat.color === "critical" && "bg-critical/20 text-critical",
                  stat.color === "high" && "bg-high/20 text-high",
                  stat.color === "info" && "bg-info/20 text-info"
                )}
              >
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">{stat.label}</p>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table with Tabs */}
      <Card variant="elevated" className="overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-border-subtle px-6 pt-4">
            <TabsList>
              <TabsTrigger value="all">
                All
                <Badge variant="secondary" className="ml-2">
                  {mockVulnerabilities.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="critical">
                Critical
                <Badge variant="critical" className="ml-2">
                  {mockVulnerabilities.filter((v) => v.severity === "critical").length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="high">
                High
                <Badge variant="high" className="ml-2">
                  {mockVulnerabilities.filter((v) => v.severity === "high").length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="medium">
                Medium
                <Badge variant="medium" className="ml-2">
                  {mockVulnerabilities.filter((v) => v.severity === "medium").length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="low">
                Low
                <Badge variant="low" className="ml-2">
                  {mockVulnerabilities.filter((v) => v.severity === "low").length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-0">
            <DataTable
              data={filteredData}
              columns={columns}
              searchPlaceholder="Search vulnerabilities..."
              onRowClick={(item) => console.log("View vulnerability:", item.cve)}
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
                      <Target className="mr-2 h-4 w-4" />
                      Show Affected Endpoints
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      Add Exception
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
