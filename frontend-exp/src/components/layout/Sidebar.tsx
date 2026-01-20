import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Package,
  Monitor,
  Shield,
  Search,
  Briefcase,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Cpu,
  Users,
  Server,
  Lock,
  Store,
  Network,
  Bot,
  ScrollText,
  Key,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavItem {
  label: string
  icon: React.ElementType
  path?: string
  children?: NavItem[]
}

const navigation: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  {
    label: "Patches",
    icon: Package,
    children: [
      { label: "All Patches", icon: Package, path: "/patches/all" },
      { label: "Deployed", icon: Package, path: "/patches/deployed" },
      { label: "Test & Approve", icon: Package, path: "/patches/test-approve" },
      { label: "Zero Touch", icon: Bot, path: "/patches/zero-touch" },
    ],
  },
  {
    label: "Assets",
    icon: Monitor,
    children: [
      { label: "All Assets", icon: Monitor, path: "/assets/all" },
      { label: "Software Inventory", icon: Cpu, path: "/assets/software" },
      { label: "Software License", icon: Key, path: "/assets/licenses" },
    ],
  },
  {
    label: "Vulnerability",
    icon: Shield,
    children: [
      { label: "Zero Day", icon: Shield, path: "/vulnerability/zero-day" },
      { label: "All Vulnerabilities", icon: Shield, path: "/vulnerability/all" },
      { label: "Exceptions", icon: ScrollText, path: "/vulnerability/exceptions" },
    ],
  },
  {
    label: "Discovery",
    icon: Search,
    children: [
      { label: "IP Discovery", icon: Network, path: "/discovery/ip" },
      { label: "Credentials", icon: Lock, path: "/discovery/credentials" },
      { label: "Agents", icon: Bot, path: "/discovery/agents" },
    ],
  },
  {
    label: "Jobs",
    icon: Briefcase,
    children: [
      { label: "Patch Jobs", icon: Briefcase, path: "/jobs/patch" },
      { label: "Software Jobs", icon: Briefcase, path: "/jobs/software" },
      { label: "Config Jobs", icon: Briefcase, path: "/jobs/config" },
      { label: "Vuln Jobs", icon: Briefcase, path: "/jobs/vulnerability" },
    ],
  },
  { label: "Reports", icon: FileText, path: "/reports" },
]

const settingsNav: NavItem[] = [
  {
    label: "Settings",
    icon: Settings,
    children: [
      { label: "User Management", icon: Users, path: "/settings/users" },
      { label: "System Settings", icon: Server, path: "/settings/system" },
      { label: "Marketplace", icon: Store, path: "/settings/marketplace" },
      { label: "Agent Config", icon: Bot, path: "/settings/agents" },
      { label: "Security", icon: Lock, path: "/settings/security" },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const [expanded, setExpanded] = useState<string[]>([])

  const toggleExpand = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    )
  }

  const isActive = (path?: string) => {
    if (!path) return false
    return location.pathname === path || location.pathname.startsWith(path + "/")
  }

  const isGroupActive = (item: NavItem) => {
    if (item.path) return isActive(item.path)
    return item.children?.some((child) => isActive(child.path))
  }

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expanded.includes(item.label)
    const active = isGroupActive(item)

    if (collapsed && level === 0) {
      if (hasChildren) {
        return (
          <Tooltip key={item.label} delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-primary/20 text-primary"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text"
                )}
              >
                <item.icon className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="flex flex-col gap-1 p-2">
              <span className="font-medium">{item.label}</span>
              {item.children?.map((child) => (
                <NavLink
                  key={child.path}
                  to={child.path!}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-2 py-1 text-sm transition-colors",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "hover:bg-surface-hover"
                    )
                  }
                >
                  {child.label}
                </NavLink>
              ))}
            </TooltipContent>
          </Tooltip>
        )
      }

      return (
        <Tooltip key={item.label} delayDuration={0}>
          <TooltipTrigger asChild>
            <NavLink
              to={item.path!}
              className={({ isActive }) =>
                cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text"
                )
              }
            >
              <item.icon className="h-5 w-5" />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      )
    }

    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleExpand(item.label)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-text-secondary hover:bg-surface-hover hover:text-text"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-180"
              )}
            />
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1 border-l border-border-subtle pl-3">
              {item.children?.map((child) => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <NavLink
        key={item.path}
        to={item.path!}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            isActive
              ? "bg-primary/20 text-primary font-medium"
              : "text-text-secondary hover:bg-surface-hover hover:text-text"
          )
        }
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    )
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border-subtle sidebar-gradient transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border-subtle px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-text">PatchIQ</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary mx-auto">
            <Shield className="h-5 w-5 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => renderNavItem(item))}
        </nav>

        <div className="my-4 border-t border-border-subtle" />

        <nav className="space-y-1">
          {settingsNav.map((item) => renderNavItem(item))}
        </nav>
      </ScrollArea>

      {/* AI Assistant Indicator */}
      {!collapsed && (
        <div className="border-t border-border-subtle p-3">
          <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/30">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-text">AI Assistant</p>
              <p className="text-xs text-text-muted">Ready to help</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggle}
        className="absolute -right-3 top-20 z-50 rounded-full border border-border bg-surface shadow-md hover:bg-surface-hover"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </aside>
  )
}
