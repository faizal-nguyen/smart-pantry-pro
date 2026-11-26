import { useEffect } from "react"
import { useTheme } from "@/hooks/useTheme"
import { Toaster as Sonner, toast, useSonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Bottom gap of every notification: the bottom navigation measures itself into
 * `--mobile-nav-total-height` (safe area included), which is 0 from 900 px and absent on public
 * routes. Passed per side so the left, right and top gaps keep Sonner's defaults.
 */
export const NAV_CLEARANCE = "calc(var(--mobile-nav-total-height, 0px) + 1rem)"

/** The previous stack showed each notification for 5 s, one at a time. */
const DURATION_MS = 5000

/**
 * The previous stack replaced a notification by the next one. `visibleToasts={1}` only hides the
 * older ones, which would come back if the newest is swiped away: they are dismissed instead.
 * `useSonner` lists the newest first.
 */
function useOneNotificationAtATime(): void {
  const { toasts } = useSonner()
  useEffect(() => {
    toasts.slice(1).forEach(older => toast.dismiss(older.id))
  }, [toasts])
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
  useOneNotificationAtATime()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="bottom-right"
      offset={{ bottom: NAV_CLEARANCE }}
      mobileOffset={{ bottom: NAV_CLEARANCE }}
      visibleToasts={1}
      duration={DURATION_MS}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          // `data-[type=error]` outranks the neutral colours above; the description selector outranks
          // the muted description colour, so the text stays readable on the red background.
          error:
            "group-[.toaster]:data-[type=error]:bg-destructive group-[.toaster]:data-[type=error]:text-destructive-foreground group-[.toaster]:data-[type=error]:border-destructive group-[.toaster]:[&_[data-description]]:text-destructive-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
