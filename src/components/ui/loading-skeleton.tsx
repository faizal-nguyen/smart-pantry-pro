import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "button" | "card" | "avatar" | "badge";
  lines?: number;
}

export function LoadingSkeleton({ 
  className, 
  variant = "text", 
  lines = 1,
  ...props 
}: SkeletonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "text":
        return "h-4 w-full";
      case "button":
        return "h-10 w-32";
      case "card":
        return "h-32 w-full";
      case "avatar":
        return "h-12 w-12 rounded-full";
      case "badge":
        return "h-6 w-16 rounded-full";
      default:
        return "h-4 w-full";
    }
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "skeleton",
              getVariantClasses(),
              i === lines - 1 && "w-3/4" // Last line shorter
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("skeleton", getVariantClasses(), className)}
      {...props}
    />
  );
}

// Preset skeletons for common use cases
export function ProductCardSkeleton() {
  return (
    <div className="p-4 border border-border rounded-lg space-y-3 animate-fade-in">
      <div className="flex items-center space-x-3">
        <LoadingSkeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton variant="text" className="w-3/4" />
          <LoadingSkeleton variant="badge" />
        </div>
      </div>
      <LoadingSkeleton variant="text" lines={2} />
      <div className="flex justify-between items-center">
        <LoadingSkeleton variant="text" className="w-1/4" />
        <LoadingSkeleton variant="button" className="w-20" />
      </div>
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center space-x-3 p-3 animate-fade-in">
      <LoadingSkeleton variant="avatar" className="h-8 w-8" />
      <div className="flex-1 space-y-1">
        <LoadingSkeleton variant="text" className="w-2/3" />
        <LoadingSkeleton variant="text" className="w-1/3 h-3" />
      </div>
      <LoadingSkeleton variant="badge" />
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 animate-fade-in">
      <LoadingSkeleton variant="text" className="w-32 h-6" />
      <LoadingSkeleton variant="button" />
    </div>
  );
}