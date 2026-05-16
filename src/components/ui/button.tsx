import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button — PRP-237 PR1.
 *
 * Variants required by §8 :
 *   default (= primary)   saffron action principale
 *   secondary             low-emphasis surface
 *   outline               border + transparent fill
 *   ghost                 nav / discrete actions
 *   destructive           irreversible mutation
 *   link                  inline text action
 *   ai                    accent-ai assistant action (was: random purple)
 *
 * Sizes :
 *   default               h-10 (40px)
 *   sm                    h-9 (36px)
 *   lg                    h-11 (44px)
 *   icon                  44x44 tap target (was: 40x40)
 *
 * Notes :
 *   - Tap targets : `lg` and `icon` meet the 44x44 minimum required by
 *     PRP-231/237 a11y. `default` is fine for inline non-touch actions.
 *   - `rounded-md` derives from `--radius` (8px in PRP-237) ; was hard
 *     `rounded-md` already so visual delta is small.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-muted hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        ai: "bg-accent-ai text-accent-ai-foreground hover:bg-accent-ai/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
