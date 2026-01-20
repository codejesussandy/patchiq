import { useState } from "react"
import {
  Users,
  Plus,
  Shield,
  Mail,
  MoreHorizontal,
  Edit,
  Trash2,
  Key,
  Clock,
  CheckCircle2,
  XCircle,
  UserCog,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DataTable, type Column } from "@/components/shared/DataTable"
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

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "security_analyst" | "operator" | "viewer"
  status: "active" | "inactive" | "pending"
  lastLogin: string
  createdAt: string
  mfaEnabled: boolean
}

const mockUsers: User[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@company.com",
    role: "admin",
    status: "active",
    lastLogin: "Just now",
    createdAt: "2023-06-15",
    mfaEnabled: true,
  },
  {
    id: "2",
    name: "Jane Doe",
    email: "jane.doe@company.com",
    role: "security_analyst",
    status: "active",
    lastLogin: "2 hours ago",
    createdAt: "2023-07-20",
    mfaEnabled: true,
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike.johnson@company.com",
    role: "operator",
    status: "active",
    lastLogin: "1 day ago",
    createdAt: "2023-08-10",
    mfaEnabled: false,
  },
  {
    id: "4",
    name: "Sarah Williams",
    email: "sarah.williams@company.com",
    role: "viewer",
    status: "inactive",
    lastLogin: "2 weeks ago",
    createdAt: "2023-09-05",
    mfaEnabled: false,
  },
  {
    id: "5",
    name: "Tom Brown",
    email: "tom.brown@company.com",
    role: "security_analyst",
    status: "pending",
    lastLogin: "Never",
    createdAt: "2024-01-15",
    mfaEnabled: false,
  },
]

const roles = [
  { value: "admin", label: "Administrator", description: "Full system access", color: "critical" },
  { value: "security_analyst", label: "Security Analyst", description: "View and analyze security data", color: "primary" },
  { value: "operator", label: "Operator", description: "Manage patches and deployments", color: "info" },
  { value: "viewer", label: "Viewer", description: "Read-only access", color: "secondary" },
]

const stats = [
  { label: "Total Users", value: 24, icon: Users, color: "primary" },
  { label: "Active", value: 20, icon: CheckCircle2, color: "success" },
  { label: "Pending", value: 2, icon: Clock, color: "warning" },
  { label: "Inactive", value: 2, icon: XCircle, color: "error" },
]

export function UserManagement() {
  const [activeTab, setActiveTab] = useState("all")

  const getRoleConfig = (role: User["role"]) => {
    const config = roles.find((r) => r.value === role)
    return config || { label: role, color: "secondary" }
  }

  const getStatusConfig = (status: User["status"]) => {
    switch (status) {
      case "active":
        return { label: "Active", variant: "success" as const }
      case "inactive":
        return { label: "Inactive", variant: "secondary" as const }
      case "pending":
        return { label: "Pending", variant: "warning" as const }
      default:
        return { label: status, variant: "secondary" as const }
    }
  }

  const columns: Column<User>[] = [
    {
      key: "name",
      label: "User",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/15 text-primary text-sm">
              {item.name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-text">{item.name}</p>
            <p className="text-xs text-text-muted">{item.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      width: "w-40",
      render: (item) => {
        const roleConfig = getRoleConfig(item.role)
        return (
          <Badge variant={roleConfig.color as any} className="text-[10px]">
            <UserCog className="mr-1 h-3 w-3" />
            {roleConfig.label}
          </Badge>
        )
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      width: "w-28",
      render: (item) => {
        const statusConfig = getStatusConfig(item.status)
        return (
          <Badge variant={statusConfig.variant} className="text-[10px]">
            {statusConfig.label}
          </Badge>
        )
      },
    },
    {
      key: "mfaEnabled",
      label: "MFA",
      width: "w-20",
      render: (item) => (
        <span className={cn(
          "text-xs",
          item.mfaEnabled ? "text-success" : "text-warning"
        )}>
          {item.mfaEnabled ? "Enabled" : "Disabled"}
        </span>
      ),
    },
    {
      key: "lastLogin",
      label: "Last Login",
      sortable: true,
      width: "w-28",
      render: (item) => (
        <span className="text-sm text-text-secondary">{item.lastLogin}</span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      width: "w-28",
      render: (item) => (
        <span className="text-xs text-text-muted">{item.createdAt}</span>
      ),
    },
  ]

  const filteredData = mockUsers.filter((user) => {
    if (activeTab === "all") return true
    return user.status === activeTab
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">User Management</h1>
          <p className="text-sm text-text-secondary">
            Manage users, roles, and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Invite a new user to the platform
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 text-center text-text-muted">
                User form would go here
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

      {/* Roles Overview */}
      <Card className="glass-card">
        <CardHeader className="border-b border-border-subtle">
          <CardTitle>Available Roles</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <div
                key={role.value}
                className="rounded-xl border border-border-subtle bg-surface p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield className={cn(
                    "h-4 w-4",
                    role.color === "critical" && "text-critical",
                    role.color === "primary" && "text-primary",
                    role.color === "info" && "text-info",
                    role.color === "secondary" && "text-text-muted"
                  )} />
                  <span className="font-medium text-text">{role.label}</span>
                </div>
                <p className="text-xs text-text-muted">{role.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="glass-card overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
            <TabsList>
              <TabsTrigger value="all">All Users</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-0">
            <DataTable
              data={filteredData}
              columns={columns}
              searchPlaceholder="Search users..."
              actions={(_item) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Key className="mr-2 h-4 w-4" />
                      Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Shield className="mr-2 h-4 w-4" />
                      Change Role
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Invite
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-error">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete User
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
