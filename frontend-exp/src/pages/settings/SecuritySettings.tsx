import { useState } from "react"
import {
  Shield,
  Key,
  Fingerprint,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Save,
  History,
  Smartphone,
  Globe,
  Server,
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

const authSettings = [
  { id: "mfa", label: "Require MFA", description: "Enforce multi-factor authentication for all users", enabled: true },
  { id: "sso", label: "Single Sign-On (SSO)", description: "Enable SAML/OIDC authentication", enabled: true },
  { id: "remember", label: "Remember Device", description: "Allow users to trust devices for 30 days", enabled: false },
]

const sessionSettings = {
  timeout: "30",
  maxSessions: "3",
  lockoutAttempts: "5",
  lockoutDuration: "15",
}

const auditEvents = [
  { action: "Login successful", user: "john.smith@company.com", ip: "192.168.1.100", time: "2 min ago", status: "success" },
  { action: "Password changed", user: "jane.doe@company.com", ip: "192.168.1.45", time: "1 hour ago", status: "success" },
  { action: "Failed login attempt", user: "unknown@attacker.com", ip: "203.0.113.50", time: "2 hours ago", status: "failed" },
  { action: "MFA enabled", user: "mike.johnson@company.com", ip: "192.168.1.112", time: "5 hours ago", status: "success" },
  { action: "User created", user: "admin@company.com", ip: "192.168.1.10", time: "1 day ago", status: "success" },
]

export function SecuritySettings() {
  const [auth, setAuth] = useState(authSettings)
  const [timeout, setTimeout] = useState(sessionSettings.timeout)
  const [maxSessions, setMaxSessions] = useState(sessionSettings.maxSessions)
  const [lockoutAttempts, setLockoutAttempts] = useState(sessionSettings.lockoutAttempts)

  const toggleAuth = (id: string) => {
    setAuth(auth.map(a =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Security Settings</h1>
          <p className="text-sm text-text-secondary">
            Security and authentication settings
          </p>
        </div>
        <Button size="sm">
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* Security Score */}
      <Card className="glass-card border-success/20">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-success/15 text-success">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Security Score</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-text">92</p>
                <span className="text-sm text-text-muted">/ 100</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="success" className="text-[10px]">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Excellent
            </Badge>
            <p className="text-xs text-text-muted mt-1">Last assessed: Today</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Authentication Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-primary" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {auth.map((setting, index) => (
              <div key={setting.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      setting.enabled ? "bg-success/15 text-success" : "bg-surface-elevated text-text-muted"
                    )}>
                      {setting.id === "mfa" && <Smartphone className="h-4 w-4" />}
                      {setting.id === "sso" && <Globe className="h-4 w-4" />}
                      {setting.id === "remember" && <Server className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text">{setting.label}</p>
                      <p className="text-xs text-text-muted">{setting.description}</p>
                    </div>
                  </div>
                  <Switch checked={setting.enabled} onCheckedChange={() => toggleAuth(setting.id)} />
                </div>
                {index < auth.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Session Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Session Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text">Session Timeout</p>
                <p className="text-xs text-text-muted">Inactive session expiration</p>
              </div>
              <Select value={timeout} onValueChange={setTimeout}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text">Max Concurrent Sessions</p>
                <p className="text-xs text-text-muted">Sessions per user</p>
              </div>
              <Select value={maxSessions} onValueChange={setMaxSessions}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 session</SelectItem>
                  <SelectItem value="3">3 sessions</SelectItem>
                  <SelectItem value="5">5 sessions</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text">Lockout Threshold</p>
                <p className="text-xs text-text-muted">Failed attempts before lockout</p>
              </div>
              <Select value={lockoutAttempts} onValueChange={setLockoutAttempts}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 attempts</SelectItem>
                  <SelectItem value="5">5 attempts</SelectItem>
                  <SelectItem value="10">10 attempts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Password Policy */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Password Policy
          </CardTitle>
          <CardDescription>Configure password requirements for all users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Minimum Length</label>
              <Input type="number" defaultValue="12" className="w-24" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Password Expiry (days)</label>
              <Input type="number" defaultValue="90" className="w-24" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">History (previous passwords)</label>
              <Input type="number" defaultValue="5" className="w-24" />
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Force Password Reset
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm text-text-secondary">Uppercase required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm text-text-secondary">Lowercase required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm text-text-secondary">Number required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm text-text-secondary">Special char required</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Recent Security Events
              </CardTitle>
              <CardDescription>Latest authentication and security activities</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View All Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auditEvents.map((event, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface p-3"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    event.status === "success" ? "bg-success/15 text-success" : "bg-error/15 text-error"
                  )}>
                    {event.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{event.action}</p>
                    <p className="text-xs text-text-muted">{event.user}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-text-muted">IP: {event.ip}</p>
                    <p className="text-xs text-text-muted">{event.time}</p>
                  </div>
                  <Badge variant={event.status === "success" ? "success" : "error"} className="text-[10px]">
                    {event.status}
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
