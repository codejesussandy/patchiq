import { useState } from "react"
import {
  Settings,
  Server,
  Database,
  Mail,
  Clock,
  Globe,
  Bell,
  Shield,
  Save,
  RefreshCw,
  CheckCircle2,
  HardDrive,
  Cpu,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

const systemStatus = {
  uptime: "45 days, 12 hours",
  version: "3.2.1",
  lastUpdate: "2024-01-10",
  cpu: 34,
  memory: 62,
  storage: 45,
}

const notificationSettings = [
  { id: "critical", label: "Critical Alerts", description: "Immediate notification for critical vulnerabilities", enabled: true },
  { id: "patches", label: "New Patches", description: "Notify when new patches are available", enabled: true },
  { id: "jobs", label: "Job Completion", description: "Notify when deployment jobs complete", enabled: false },
  { id: "reports", label: "Scheduled Reports", description: "Email scheduled report summaries", enabled: true },
]

export function SystemSettings() {
  const [notifications, setNotifications] = useState(notificationSettings)
  const [timezone, setTimezone] = useState("America/New_York")
  const [language, setLanguage] = useState("en")
  const [retentionDays, setRetentionDays] = useState("90")

  const toggleNotification = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, enabled: !n.enabled } : n
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">System Settings</h1>
          <p className="text-sm text-text-secondary">
            Configure system-wide settings
          </p>
        </div>
        <Button size="sm">
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* System Health */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-success" />
                System Health
              </CardTitle>
              <CardDescription>Current system status and resource usage</CardDescription>
            </div>
            <Badge variant="success" className="text-[10px]">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              All Systems Operational
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-text-muted" />
                  <span className="text-sm text-text-secondary">Uptime</span>
                </div>
                <span className="text-sm font-medium text-text">{systemStatus.uptime}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-text-muted" />
                  <span className="text-sm text-text-secondary">Version</span>
                </div>
                <span className="text-sm font-medium text-text">v{systemStatus.version}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-text-muted" />
                  <span className="text-text-secondary">CPU</span>
                </div>
                <span className="text-text-muted">{systemStatus.cpu}%</span>
              </div>
              <Progress value={systemStatus.cpu} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-text-muted" />
                  <span className="text-text-secondary">Memory</span>
                </div>
                <span className="text-text-muted">{systemStatus.memory}%</span>
              </div>
              <Progress value={systemStatus.memory} className={cn("h-2", systemStatus.memory > 80 && "[&>div]:bg-warning")} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-text-muted" />
                  <span className="text-text-secondary">Storage</span>
                </div>
                <span className="text-text-muted">{systemStatus.storage}%</span>
              </div>
              <Progress value={systemStatus.storage} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* General Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Timezone</label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <Globe className="mr-2 h-4 w-4 text-text-muted" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Language</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Data Retention (days)</label>
              <Input
                type="number"
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                className="w-32"
              />
              <p className="text-xs text-text-muted">How long to keep historical data</p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-text">{notification.label}</p>
                    <p className="text-xs text-text-muted">{notification.description}</p>
                  </div>
                  <Switch
                    checked={notification.enabled}
                    onCheckedChange={() => toggleNotification(notification.id)}
                  />
                </div>
                {index < notifications.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Email Configuration */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Configuration
              </CardTitle>
              <CardDescription>Configure SMTP settings for notifications</CardDescription>
            </div>
            <Badge variant="success" className="text-[10px]">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">SMTP Server</label>
              <Input placeholder="smtp.example.com" defaultValue="smtp.company.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Port</label>
              <Input placeholder="587" defaultValue="587" className="w-24" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Username</label>
              <Input placeholder="username" defaultValue="notifications@company.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">From Address</label>
              <Input placeholder="noreply@example.com" defaultValue="patchiq@company.com" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Database & Backup */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Database & Backup
              </CardTitle>
              <CardDescription>Database status and backup configuration</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-2 rounded-xl border border-border-subtle bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Database Size</span>
                <span className="text-sm font-medium text-text">24.5 GB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Records</span>
                <span className="text-sm font-medium text-text">1.2M</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Status</span>
                <Badge variant="success" className="text-[10px]">Healthy</Badge>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border-subtle bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Last Backup</span>
                <span className="text-sm font-medium text-text">2024-01-16 02:00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Backup Size</span>
                <span className="text-sm font-medium text-text">18.2 GB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Schedule</span>
                <span className="text-sm font-medium text-text">Daily 2:00 AM</span>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-2">
              <Button variant="outline" size="sm">
                <Database className="mr-2 h-4 w-4" />
                Backup Now
              </Button>
              <Button variant="outline" size="sm">
                <Clock className="mr-2 h-4 w-4" />
                Configure Schedule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
