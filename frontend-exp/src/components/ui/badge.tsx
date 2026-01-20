import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/20 text-primary border border-primary/30",
        secondary: "bg-surface-elevated text-text-secondary border border-border",
        outline: "text-text border border-border",
        critical: "bg-critical-bg text-critical border border-critical/30",
        high: "bg-high-bg text-high border border-high/30",
        medium: "bg-medium-bg text-medium border border-medium/30",
        low: "bg-low-bg text-low border border-low/30",
        info: "bg-info-bg text-info border border-info/30",
        success: "bg-success-bg text-success border border-success/30",
        warning: "bg-warning-bg text-warning border border-warning/30",
        error: "bg-error-bg text-error border border-error/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  pulse?: boolean
}

function Badge({ className, variant, dot, pulse, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "mr-1.5 h-1.5 w-1.5 rounded-full",
            {
              critical: "bg-critical",
              high: "bg-high",
              medium: "bg-medium",
              low: "bg-low",
              info: "bg-info",
              success: "bg-success",
              warning: "bg-warning",
              error: "bg-error",
              default: "bg-primary",
              secondary: "bg-text-secondary",
              outline: "bg-text",
            }[variant || "default"],
            pulse && "animate-pulse"
          )}
        />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
