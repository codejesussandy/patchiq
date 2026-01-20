import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Package,
  Monitor,
  Shield,
  Search,
  Briefcase,
  Settings,
  FileText,
  Plus,
  Download,
  RefreshCw,
  Bot,
  Zap,
  Terminal,
  MessageSquare,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAIChatOpen: () => void
}

const navigationCommands = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", shortcut: "⌘D" },
  { label: "All Patches", icon: Package, path: "/patches/all", shortcut: "⌘P" },
  { label: "All Assets", icon: Monitor, path: "/assets/all", shortcut: "⌘A" },
  { label: "Vulnerabilities", icon: Shield, path: "/vulnerability/all", shortcut: "⌘V" },
  { label: "Jobs", icon: Briefcase, path: "/jobs/patch", shortcut: "⌘J" },
  { label: "Reports", icon: FileText, path: "/reports", shortcut: "⌘R" },
  { label: "Settings", icon: Settings, path: "/settings/users", shortcut: "⌘," },
]

const quickActions = [
  { label: "Scan for vulnerabilities", icon: Search, action: "scan" },
  { label: "Deploy patches", icon: Package, action: "deploy" },
  { label: "Export report", icon: Download, action: "export" },
  { label: "Refresh data", icon: RefreshCw, action: "refresh" },
  { label: "Create new job", icon: Plus, action: "create-job" },
]

const aiCommands = [
  { label: "Ask AI about vulnerabilities", icon: MessageSquare, action: "ai-vuln" },
  { label: "AI patch recommendations", icon: Bot, action: "ai-patch" },
  { label: "Generate compliance report", icon: FileText, action: "ai-report" },
  { label: "Automate remediation", icon: Zap, action: "ai-automate" },
]

export function CommandPalette({ open, onOpenChange, onAIChatOpen }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false)
      command()
    },
    [onOpenChange]
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  // Handle navigation shortcuts
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return

      const shortcuts: Record<string, string> = {
        d: "/dashboard",
        p: "/patches/all",
        a: "/assets/all",
        v: "/vulnerability/all",
        j: "/jobs/patch",
        r: "/reports",
      }

      if (shortcuts[e.key]) {
        e.preventDefault()
        navigate(shortcuts[e.key])
      }
    }

    document.addEventListener("keydown", handleShortcut)
    return () => document.removeEventListener("keydown", handleShortcut)
  }, [navigate])

  const handleAction = (action: string) => {
    switch (action) {
      case "scan":
        console.log("Scanning for vulnerabilities...")
        break
      case "deploy":
        navigate("/patches/deployed")
        break
      case "export":
        navigate("/reports")
        break
      case "refresh":
        window.location.reload()
        break
      case "create-job":
        navigate("/jobs/patch")
        break
      case "ai-vuln":
      case "ai-patch":
      case "ai-report":
      case "ai-automate":
        onAIChatOpen()
        break
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navigationCommands.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => runCommand(() => navigate(item.path))}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
              <CommandShortcut>{item.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          {quickActions.map((item) => (
            <CommandItem
              key={item.action}
              onSelect={() => runCommand(() => handleAction(item.action))}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="AI Assistant">
          {aiCommands.map((item) => (
            <CommandItem
              key={item.action}
              onSelect={() => runCommand(() => handleAction(item.action))}
              className="group"
            >
              <item.icon className="mr-2 h-4 w-4 text-primary group-hover:text-primary" />
              <span>{item.label}</span>
              <span className="ml-auto text-xs text-text-muted">AI</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Developer">
          <CommandItem onSelect={() => runCommand(() => console.log("Opening console..."))}>
            <Terminal className="mr-2 h-4 w-4" />
            <span>Open Console</span>
            <CommandShortcut>⌘⇧I</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
