import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

interface LoadingSkeletonProps {
  /** Said by assistive technologies, hidden on screen: the text the wait used to show. */
  label: string
  /** Placeholders, in the shape of the content being loaded. */
  count?: number
  /** Layout of the placeholders (grid of cards, stack of rows). */
  className?: string
  /** Size of each placeholder. */
  itemClassName?: string
}

/**
 * V11-06 rule: a skeleton when the shape of the content is known (lists, cards); a short wait inside
 * a panel keeps a `role="status"` text instead.
 */
function LoadingSkeleton({ label, count = 3, className, itemClassName = "h-12" }: LoadingSkeletonProps) {
  return (
    <div role="status" className={className ?? "space-y-2"}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} aria-hidden="true" className={itemClassName} />
      ))}
    </div>
  )
}

export { LoadingSkeleton, Skeleton }
