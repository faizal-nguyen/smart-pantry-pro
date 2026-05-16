import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge — PRP-237 PR1 §8.
 *
 * Semantic variants drive color from tokens, never from hardcoded
 * Tailwind palette utilities. New variants over the legacy set :
 *   success / warning / info       — semantic states (success stays the
 *                                    only legitimate green in the app)
 *   ai                              — assistant accent (electric blue)
 *
 * Legacy `secondary` and `outline` remain ; `outline` now uses
 * `border-border` for clarity.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/85",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/85",
        outline: "border-border text-foreground",
        success:
          "border-transparent bg-success text-success-foreground hover:bg-success/85",
        warning:
          "border-transparent bg-warning text-warning-foreground hover:bg-warning/85",
        info:
          "border-transparent bg-info text-info-foreground hover:bg-info/85",
        ai:
          "border-transparent bg-accent-ai text-accent-ai-foreground hover:bg-accent-ai/85",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
