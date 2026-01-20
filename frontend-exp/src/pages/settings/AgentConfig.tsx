import { useState } from "react"
import {
  Bot,
  Download,
  Clock,
  Shield,
  RefreshCw,
  Save,
  CheckCircle2,
  Server,
  Wifi,
  Lock,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const agentSettings = {
  currentVersion: "2.4.1",
  releaseDate: "2024-01-10",
  autoUpdate: true,
  checkInterval: "6",
  reportInterval: "5",
  logLevel: "info",
  proxyEnabled: false,
  proxyServer: "",
  tlsVerify: true,
}

const communicationSettings = [
  { id: "heartbeat", label: "Heartbeat Interval", description: "How often agents report status", value: "5 minutes" },
  { id: "scan", label: "Scan Interval", description: "Frequency of vulnerability scans", value: "Daily" },
  { id: "patch", label: "Patch Check Interval", description: "How often to check for new patches", value: "6 hours" },
]

const securitySettings = [
  { id: "tls", label: "TLS Verification", description: "Verify server certificates", enabled: true },
  { id: "encrypt", label: "Data Encryption", description: "Encrypt all agent communications", enabled: true },
  { id: "local_admin", label: "Local Admin Required", description: "Require admin rights for agent operations", enabled: true },
  { id: "tamper", label: "Tamper Protection", description: "Prevent unauthorized agent modifications", enabled: true },
]

export function AgentConfig() {
  const [autoUpdate, setAutoUpdate] = useState(agentSettings.autoUpdate)
  const [checkInterval, setCheckInterval] = useState(agentSettings.checkInterval)
  const [logLevel, setLogLevel] = useState(agentSettings.logLevel)
  const [security, setSecurity] = useState(securitySettings)

  const toggleSecurity = (id: string) => {
    setSecurity(security.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Agent Configuration</h1>
          <p className="text-sm text-text-secondary">
            Configure endpoint agent settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download Agent
          </Button>
          <Button size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Current Version Info */}
      <Card className="glass-card border-primary/20">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-text">PatchIQ Agent</p>
                <Badge variant="success" className="text-[10px]">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Latest
                </Badge>
              </div>
              <p className="text-sm text-text-secondary">
                Version {agentSettings.currentVersion} • Released {agentSettings.releaseDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-text-muted">Deployed on</p>
              <p className="text-lg font-semibold text-text">165 endpoints</p>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Updates
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Update Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Update Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-text">Auto-Update Agents</p>
                <p className="text-xs text-text-muted">Automatically update agents when new versions are available</p>
              </div>
              <Switch checked={autoUpdate} onCheckedChange={setAutoUpdate} />
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Update Check Interval</label>
              <Select value={checkInterval} onValueChange={setCheckInterval}>
                <SelectTrigger className="w-40">
                  <Clock className="mr-2 h-4 w-4 text-text-muted" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every hour</SelectItem>
                  <SelectItem value="6">Every 6 hours</SelectItem>
                  <SelectItem value="12">Every 12 hours</SelectItem>
                  <SelectItem value="24">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Log Level</label>
              <Select value={logLevel} onValueChange={setLogLevel}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Communication Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" />
              Communication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {communicationSettings.map((setting, index) => (
              <div key={setting.id}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-text">{setting.label}</p>
                    <p className="text-xs text-text-muted">{setting.description}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {setting.value}
                  </Badge>
                </div>
                {index < communicationSettings.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Security Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security Settings
          </CardTitle>
          <CardDescription>Configure agent security features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {security.map((setting) => (
              <div
                key={setting.id}
                className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    setting.enabled ? "bg-success/15 text-success" : "bg-surface-elevated text-text-muted"
                  )}>
                    {setting.id === "tls" && <Lock className="h-4 w-4" />}
                    {setting.id === "encrypt" && <Shield className="h-4 w-4" />}
                    {setting.id === "local_admin" && <Server className="h-4 w-4" />}
                    {setting.id === "tamper" && <Eye className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{setting.label}</p>
                    <p className="text-xs text-text-muted">{setting.description}</p>
                  </div>
                </div>
                <Switch
                  checked={setting.enabled}
                  onCheckedChange={() => toggleSecurity(setting.id)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Proxy Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Proxy Configuration
          </CardTitle>
          <CardDescription>Configure proxy settings for agent communication</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Proxy Server</label>
              <Input placeholder="proxy.example.com:8080" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Username (optional)</label>
              <Input placeholder="username" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Password (optional)</label>
              <Input type="password" placeholder="••••••••" />
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm">
              Test Proxy Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
