import { useState } from "react"
import { Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { CommandPalette } from "./CommandPalette"
import { AIChat } from "./AIChat"
import { TooltipProvider } from "@/components/ui/tooltip"

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [aiChatOpen, setAiChatOpen] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background">
        {/* Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content Area */}
        <div
          className={cn(
            "flex flex-col transition-all duration-300",
            sidebarCollapsed ? "ml-[72px]" : "ml-64",
            aiChatOpen ? "mr-[400px]" : ""
          )}
        >
          {/* Header */}
          <Header
            onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
            onAIChatToggle={() => setAiChatOpen(!aiChatOpen)}
            isAIChatOpen={aiChatOpen}
          />

          {/* Page Content */}
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>

        {/* Command Palette */}
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          onAIChatOpen={() => setAiChatOpen(true)}
        />

        {/* AI Chat Panel */}
        <AIChat isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />
      </div>
    </TooltipProvider>
  )
}
