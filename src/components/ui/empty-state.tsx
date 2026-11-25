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
  /** Heading level of the title in its page outline; h3 by default. */
  titleAs?: 'h2' | 'h3';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  titleAs: Title = 'h3',
}: EmptyStateProps) {
  return (
    <div className={cn("empty-state animate-fade-in", className)}>
      <div className="empty-state-icon">
        <Icon className="w-full h-full" />
      </div>
      <Title className="empty-state-title text-balance">{title}</Title>
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