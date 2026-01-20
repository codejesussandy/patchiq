import { useState } from "react"
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  MessageSquare,
  Building2,
  Sun,
  Moon,
} from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface HeaderProps {
  onCommandPaletteOpen: () => void
  onAIChatToggle: () => void
  isAIChatOpen: boolean
}

const organizations = [
  { id: "org1", name: "Gurugram HQ" },
  { id: "org2", name: "Mumbai Office" },
  { id: "org3", name: "Bangalore DC" },
]

const notifications = [
  {
    id: 1,
    title: "Critical vulnerability detected",
    description: "CVE-2024-1234 affects 15 endpoints",
    time: "5m ago",
    type: "critical",
  },
  {
    id: 2,
    title: "Patch deployment complete",
    description: "Successfully patched 47 endpoints",
    time: "1h ago",
    type: "success",
  },
  {
    id: 3,
    title: "New agent registered",
    description: "WIN-SERVER-05 joined the network",
    time: "2h ago",
    type: "info",
  },
]

export function Header({
  onCommandPaletteOpen,
  onAIChatToggle,
  isAIChatOpen,
}: HeaderProps) {
  const [selectedOrg, setSelectedOrg] = useState(organizations[0].id)
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-subtle header-blur px-6">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Organization Selector */}
        <Select value={selectedOrg} onValueChange={setSelectedOrg}>
          <SelectTrigger className="w-[180px] border-border-subtle bg-surface-elevated">
            <Building2 className="mr-2 h-4 w-4 text-text-muted" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Center - Search/Command */}
      <button
        onClick={onCommandPaletteOpen}
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm text-text-muted transition-colors",
          "hover:border-border-focus hover:text-text w-96"
        )}
      >
        <Search className="h-4 w-4" />
        <span>Search or type a command...</span>
        <div className="ml-auto flex items-center gap-1">
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </div>
      </button>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="relative"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* AI Chat Toggle */}
        <Button
          variant={isAIChatOpen ? "default" : "ghost"}
          size="icon"
          onClick={onAIChatToggle}
          className={cn(
            "relative",
            isAIChatOpen && "glow-primary"
          )}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-critical text-[10px] font-bold text-white">
                3
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary">
                Mark all read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start gap-1 p-3"
              >
                <div className="flex w-full items-start justify-between">
                  <span className="font-medium">{notification.title}</span>
                  <Badge
                    variant={
                      notification.type === "critical"
                        ? "critical"
                        : notification.type === "success"
                        ? "success"
                        : "info"
                    }
                    className="text-[10px]"
                  >
                    {notification.type}
                  </Badge>
                </div>
                <span className="text-xs text-text-muted">
                  {notification.description}
                </span>
                <span className="text-xs text-text-muted">
                  {notification.time}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-9 w-9 border-2 border-primary/50">
                <AvatarImage src="/avatar.png" alt="User" />
                <AvatarFallback className="bg-primary/20 text-primary">
                  CH
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Charlie Hills</p>
                <p className="text-xs text-text-muted">admin@infraon.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-error focus:text-error">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
