import { useState } from "react"
import {
  Monitor,
  Shield,
  Package,
  AlertTriangle,
  Activity,
  Server,
  Cpu,
  HardDrive,
  Apple,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Mock data
const stats = [
  {
    label: "Total Endpoints",
    value: 165,
    change: 12,
    trend: "up",
    icon: Monitor,
    color: "primary",
  },
  {
    label: "Vulnerabilities",
    value: 847,
    change: -23,
    trend: "down",
    icon: Shield,
    color: "critical",
  },
  {
    label: "Pending Patches",
    value: 34,
    change: 5,
    trend: "up",
    icon: Package,
    color: "warning",
  },
  {
    label: "Software Installed",
    value: 9063,
    change: 156,
    trend: "up",
    icon: Cpu,
    color: "accent",
  },
]

const vulnerabilityData = [
  { name: "Critical", value: 47, color: "var(--color-critical)" },
  { name: "High", value: 234, color: "var(--color-high)" },
  { name: "Medium", value: 389, color: "var(--color-medium)" },
  { name: "Low", value: 177, color: "var(--color-low)" },
]

const trendData = [
  { date: "Jan", vulnerabilities: 892, patched: 756 },
  { date: "Feb", vulnerabilities: 934, patched: 823 },
  { date: "Mar", vulnerabilities: 867, patched: 801 },
  { date: "Apr", vulnerabilities: 912, patched: 889 },
  { date: "May", vulnerabilities: 847, patched: 912 },
  { date: "Jun", vulnerabilities: 789, patched: 945 },
]

const platformData = [
  { name: "Windows", endpoints: 97, color: "#0078D4" },
  { name: "Linux", endpoints: 34, color: "#FCC624" },
  { name: "macOS", endpoints: 34, color: "#A2AAAD" },
]

const recentActivity = [
  {
    id: 1,
    type: "critical",
    title: "Critical vulnerability detected",
    description: "CVE-2024-1234 affects 15 endpoints",
    time: "5 minutes ago",
    icon: AlertTriangle,
  },
  {
    id: 2,
    type: "success",
    title: "Patch deployment complete",
    description: "KB5034441 deployed to 47 endpoints",
    time: "1 hour ago",
    icon: CheckCircle2,
  },
  {
    id: 3,
    type: "info",
    title: "New agent registered",
    description: "WIN-SERVER-05 joined the network",
    time: "2 hours ago",
    icon: Monitor,
  },
  {
    id: 4,
    type: "warning",
    title: "Pending approval",
    description: "3 patches require manual approval",
    time: "3 hours ago",
    icon: Clock,
  },
  {
    id: 5,
    type: "error",
    title: "Deployment failed",
    description: "Patch failed on 2 endpoints",
    time: "4 hours ago",
    icon: XCircle,
  },
]

const topVulnerabilities = [
  {
    cve: "CVE-2024-1234",
    cvss: 9.8,
    affected: 15,
    exploitable: true,
  },
  {
    cve: "CVE-2024-5678",
    cvss: 9.1,
    affected: 12,
    exploitable: true,
  },
  {
    cve: "CVE-2024-9012",
    cvss: 8.9,
    affected: 23,
    exploitable: false,
  },
  {
    cve: "CVE-2024-3456",
    cvss: 8.5,
    affected: 8,
    exploitable: false,
  },
  {
    cve: "CVE-2024-7890",
    cvss: 8.2,
    affected: 19,
    exploitable: true,
  },
]

export function Dashboard() {
  const [timeRange, setTimeRange] = useState("7d")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1500)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Security Dashboard</h1>
          <p className="text-sm text-text-secondary">
            Real-time overview of your security posture
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} variant="elevated" className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold counter-value text-text">
                    {stat.value.toLocaleString()}
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-error" />
                    )}
                    <span
                      className={cn(
                        "text-sm font-medium",
                        stat.trend === "up" ? "text-success" : "text-error"
                      )}
                    >
                      {Math.abs(stat.change)}%
                    </span>
                    <span className="text-xs text-text-muted">vs last week</span>
                  </div>
                </div>
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    stat.color === "primary" && "bg-primary/20 text-primary",
                    stat.color === "critical" && "bg-critical/20 text-critical",
                    stat.color === "warning" && "bg-warning/20 text-warning",
                    stat.color === "accent" && "bg-accent/20 text-accent"
                  )}
                >
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
              {/* Decorative gradient */}
              <div
                className={cn(
                  "absolute -bottom-6 -right-6 h-24 w-24 rounded-full opacity-10 blur-2xl",
                  stat.color === "primary" && "bg-primary",
                  stat.color === "critical" && "bg-critical",
                  stat.color === "warning" && "bg-warning",
                  stat.color === "accent" && "bg-accent"
                )}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid - Bento Style */}
      <div className="grid grid-cols-12 gap-4">
        {/* Vulnerability Trend Chart */}
        <Card variant="elevated" className="col-span-12 lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Security Trend</CardTitle>
              <p className="text-sm text-text-secondary">
                Vulnerabilities discovered vs patched
              </p>
            </div>
            <Badge variant="success" dot pulse>
              Live
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="vulnGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-critical)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-critical)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="patchGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={12} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="vulnerabilities"
                    stroke="var(--color-critical)"
                    fill="url(#vulnGradient)"
                    strokeWidth={2}
                    name="Vulnerabilities"
                  />
                  <Area
                    type="monotone"
                    dataKey="patched"
                    stroke="var(--color-success)"
                    fill="url(#patchGradient)"
                    strokeWidth={2}
                    name="Patched"
                  />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Vulnerability Breakdown */}
        <Card variant="elevated" className="col-span-12 lg:col-span-4">
          <CardHeader>
            <CardTitle>Vulnerability Breakdown</CardTitle>
            <p className="text-sm text-text-secondary">By severity level</p>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vulnerabilityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {vulnerabilityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {vulnerabilityData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-text-secondary">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-text">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Distribution */}
        <Card variant="elevated" className="col-span-12 md:col-span-6 lg:col-span-4">
          <CardHeader>
            <CardTitle>Platform Distribution</CardTitle>
            <p className="text-sm text-text-secondary">Endpoints by OS</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {platformData.map((platform) => {
                const percentage = Math.round(
                  (platform.endpoints / 165) * 100
                )
                return (
                  <div key={platform.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {platform.name === "Windows" && (
                          <Server className="h-4 w-4" style={{ color: platform.color }} />
                        )}
                        {platform.name === "Linux" && (
                          <HardDrive className="h-4 w-4" style={{ color: platform.color }} />
                        )}
                        {platform.name === "macOS" && (
                          <Apple className="h-4 w-4" style={{ color: platform.color }} />
                        )}
                        <span className="text-sm text-text">{platform.name}</span>
                      </div>
                      <span className="text-sm text-text-secondary">
                        {platform.endpoints} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: platform.color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Vulnerabilities */}
        <Card variant="elevated" className="col-span-12 md:col-span-6 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Vulnerabilities</CardTitle>
              <p className="text-sm text-text-secondary">By CVSS score</p>
            </div>
            <Button variant="ghost" size="sm">
              View all
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[240px]">
              <div className="space-y-3">
                {topVulnerabilities.map((vuln) => (
                  <div
                    key={vuln.cve}
                    className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-elevated p-3 transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold",
                          vuln.cvss >= 9
                            ? "bg-critical/20 text-critical"
                            : vuln.cvss >= 7
                            ? "bg-high/20 text-high"
                            : "bg-medium/20 text-medium"
                        )}
                      >
                        {vuln.cvss}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text">{vuln.cve}</p>
                        <p className="text-xs text-text-muted">
                          {vuln.affected} endpoints affected
                        </p>
                      </div>
                    </div>
                    {vuln.exploitable && (
                      <Badge variant="critical" className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Exploitable
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card variant="elevated" className="col-span-12 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <p className="text-sm text-text-secondary">Latest events</p>
            </div>
            <div className="flex h-2 w-2 items-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-success opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-success" />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[240px]">
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        activity.type === "critical" && "bg-critical/20 text-critical",
                        activity.type === "success" && "bg-success/20 text-success",
                        activity.type === "info" && "bg-info/20 text-info",
                        activity.type === "warning" && "bg-warning/20 text-warning",
                        activity.type === "error" && "bg-error/20 text-error"
                      )}
                    >
                      <activity.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-text">
                        {activity.title}
                      </p>
                      <p className="text-xs text-text-muted">
                        {activity.description}
                      </p>
                      <p className="text-xs text-text-muted">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <button className="group flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-4 transition-all hover:border-primary hover:bg-surface-hover">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary transition-transform group-hover:scale-110">
            <Shield className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="font-medium text-text">Run Scan</p>
            <p className="text-xs text-text-muted">Vulnerability scan</p>
          </div>
        </button>
        <button className="group flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-4 transition-all hover:border-primary hover:bg-surface-hover">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20 text-success transition-transform group-hover:scale-110">
            <Package className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="font-medium text-text">Deploy Patches</p>
            <p className="text-xs text-text-muted">34 pending</p>
          </div>
        </button>
        <button className="group flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-4 transition-all hover:border-primary hover:bg-surface-hover">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/20 text-info transition-transform group-hover:scale-110">
            <Activity className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="font-medium text-text">View Reports</p>
            <p className="text-xs text-text-muted">Analytics</p>
          </div>
        </button>
        <button className="group flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-4 transition-all hover:border-primary hover:bg-surface-hover">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-accent transition-transform group-hover:scale-110">
            <Monitor className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="font-medium text-text">Manage Assets</p>
            <p className="text-xs text-text-muted">165 endpoints</p>
          </div>
        </button>
      </div>
    </div>
  )
}
