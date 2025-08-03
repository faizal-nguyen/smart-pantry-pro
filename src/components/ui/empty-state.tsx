import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("empty-state animate-fade-in", className)}>
      <div className="empty-state-icon">
        <Icon className="w-full h-full" />
      </div>
      <h3 className="empty-state-title text-balance">{title}</h3>
      <p className="empty-state-description text-balance">{description}</p>
      {action && (
        <Button
          onClick={action.onClick}
          className="press-effect"
          size="lg"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}