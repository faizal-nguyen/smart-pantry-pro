import { ReactNode, useRef, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  className,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  
  const startY = useRef(0);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop > 0) return; // Only trigger when at top
    
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || disabled || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;
    
    if (deltaY > 0) {
      // Prevent default scrolling behavior
      e.preventDefault();
      
      // Apply resistance curve to make pulling feel natural
      const resistance = Math.min(1, deltaY / (threshold * 2));
      const distance = deltaY * resistance;
      
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  }, [disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current || disabled) return;
    
    isDragging.current = false;
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
  }, [disabled, pullDistance, threshold, isRefreshing, onRefresh]);

  const refreshProgress = Math.min(1, pullDistance / threshold);
  const shouldTrigger = pullDistance >= threshold;

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-center bg-primary/10 transition-all duration-200 z-10",
          (isPulling || isRefreshing) ? "translate-y-0" : "-translate-y-full"
        )}
        style={{
          height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px`,
        }}
      >
        <div className="flex items-center space-x-2 text-primary">
          <RefreshCw 
            className={cn(
              "w-5 h-5 transition-transform duration-200",
              isRefreshing && "animate-spin",
              shouldTrigger && !isRefreshing && "rotate-180"
            )}
            style={{
              transform: !isRefreshing ? `rotate(${refreshProgress * 180}deg)` : undefined,
            }}
          />
          <span className="text-sm font-medium">
            {isRefreshing
              ? "Actualisation..."
              : shouldTrigger
              ? "Relâchez pour actualiser"
              : "Tirez pour actualiser"
            }
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${isPulling || isRefreshing ? Math.max(pullDistance, isRefreshing ? 60 : 0) : 0}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}