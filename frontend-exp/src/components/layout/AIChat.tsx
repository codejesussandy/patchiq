import { useState, useRef, useEffect } from "react"
import {
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Maximize2,
  Minimize2,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  suggestions?: string[]
}

interface AIChatProps {
  isOpen: boolean
  onClose: () => void
}

const quickPrompts = [
  "What are the critical vulnerabilities?",
  "Show pending patch deployments",
  "Generate a security report",
  "Analyze endpoint compliance",
]

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Hello! I'm your AI security assistant. I can help you with vulnerability analysis, patch management, compliance reports, and more. How can I assist you today?",
    timestamp: new Date(),
    suggestions: quickPrompts,
  },
]

export function AIChat({ isOpen, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateResponse(userMessage.content),
        timestamp: new Date(),
        suggestions: generateSuggestions(userMessage.content),
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsLoading(false)
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  if (!isOpen) return null

  return (
    <div
      className={cn(
        "fixed right-0 top-0 z-50 flex h-screen flex-col border-l border-border-subtle bg-surface transition-all duration-300",
        isExpanded ? "w-[600px]" : "w-[400px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-text">AI Assistant</h3>
            <p className="text-xs text-text-muted">Powered by PatchIQ AI</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "flex-row-reverse" : ""
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  message.role === "assistant"
                    ? "bg-gradient-to-br from-primary/20 to-accent/20"
                    : "bg-surface-elevated"
                )}
              >
                {message.role === "assistant" ? (
                  <Sparkles className="h-4 w-4 text-primary" />
                ) : (
                  <User className="h-4 w-4 text-text-secondary" />
                )}
              </div>
              <div
                className={cn(
                  "flex max-w-[80%] flex-col gap-2",
                  message.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm",
                    message.role === "assistant"
                      ? "bg-surface-elevated text-text rounded-tl-md"
                      : "bg-primary text-white rounded-tr-md"
                  )}
                >
                  {message.content}
                </div>

                {/* Message actions for AI */}
                {message.role === "assistant" && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickPrompt(suggestion)}
                        className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-text-secondary transition-colors hover:border-primary hover:text-primary"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                <span className="text-[10px] text-text-muted">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-surface-elevated px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-text-muted">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border-subtle p-4">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-surface-elevated p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your security posture..."
            className="min-h-[40px] max-h-[120px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-text-muted">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}

function generateResponse(input: string): string {
  const lower = input.toLowerCase()

  if (lower.includes("critical") || lower.includes("vulnerability")) {
    return "Based on my analysis, you currently have 3 critical vulnerabilities affecting 15 endpoints:\n\n1. CVE-2024-1234 - Remote Code Execution (CVSS 9.8)\n2. CVE-2024-5678 - Privilege Escalation (CVSS 9.1)\n3. CVE-2024-9012 - SQL Injection (CVSS 8.9)\n\nI recommend prioritizing CVE-2024-1234 as it has known active exploits in the wild. Would you like me to create a remediation plan?"
  }

  if (lower.includes("patch") || lower.includes("deployment")) {
    return "You have 47 patches pending deployment across your environment:\n\n• 12 Critical patches (immediate action required)\n• 23 High priority patches (deploy within 7 days)\n• 12 Medium priority patches (deploy within 30 days)\n\nI can help you create an automated deployment schedule that minimizes downtime. Would you like me to proceed?"
  }

  if (lower.includes("report") || lower.includes("compliance")) {
    return "I can generate several types of security reports:\n\n1. Executive Summary - High-level security posture overview\n2. Compliance Report - SOC2, HIPAA, PCI-DSS status\n3. Vulnerability Assessment - Detailed CVE analysis\n4. Patch Management - Deployment status and coverage\n\nWhich report would you like me to generate?"
  }

  return "I understand you're asking about your security environment. I can help you with:\n\n• Vulnerability analysis and prioritization\n• Patch deployment recommendations\n• Compliance reporting\n• Asset inventory management\n• Risk assessment\n\nCould you provide more details about what you'd like to accomplish?"
}

function generateSuggestions(input: string): string[] {
  const lower = input.toLowerCase()

  if (lower.includes("vulnerability")) {
    return [
      "Show affected endpoints",
      "Create remediation plan",
      "View exploit details",
    ]
  }

  if (lower.includes("patch")) {
    return [
      "Schedule deployment",
      "View patch details",
      "Check compatibility",
    ]
  }

  return [
    "View dashboard",
    "Generate report",
    "Check compliance status",
  ]
}
