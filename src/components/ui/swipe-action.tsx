import { ReactNode, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Trash2, Edit } from "lucide-react";

interface SwipeActionProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  disabled?: boolean;
}

export function SwipeAction({
  children,
  onEdit,
  onDelete,
  className,
  disabled = false,
}: SwipeActionProps) {
  const [deltaX, setDeltaX] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [actionTriggered, setActionTriggered] = useState<"edit" | "delete" | null>(null);
  const startX = useRef(0);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 80; // Minimum distance to trigger action
  const actionThreshold = 120; // Distance to auto-trigger action

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
    setIsSwipeActive(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || disabled) return;
    
    const currentX = e.touches[0].clientX;
    const newDeltaX = currentX - startX.current;
    
    // Limit swipe distance
    const maxSwipe = 150;
    const constrainedDelta = Math.max(-maxSwipe, Math.min(maxSwipe, newDeltaX));
    
    setDeltaX(constrainedDelta);

    // Determine which action would be triggered
    if (constrainedDelta > threshold && onEdit) {
      setActionTriggered("edit");
    } else if (constrainedDelta < -threshold && onDelete) {
      setActionTriggered("delete");
    } else {
      setActionTriggered(null);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || disabled) return;
    
    isDragging.current = false;
    setIsSwipeActive(false);

    // Auto-trigger if swiped far enough
    if (Math.abs(deltaX) >= actionThreshold) {
      if (deltaX > 0 && onEdit) {
        onEdit();
      } else if (deltaX < 0 && onDelete) {
        onDelete();
      }
    }
    // Manual trigger if action is highlighted
    else if (actionTriggered === "edit" && onEdit) {
      onEdit();
    } else if (actionTriggered === "delete" && onDelete) {
      onDelete();
    }

    // Reset state
    setDeltaX(0);
    setActionTriggered(null);
  };

  // Mouse events for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    startX.current = e.clientX;
    isDragging.current = true;
    setIsSwipeActive(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || disabled) return;
    
    const currentX = e.clientX;
    const newDeltaX = currentX - startX.current;
    const maxSwipe = 150;
    const constrainedDelta = Math.max(-maxSwipe, Math.min(maxSwipe, newDeltaX));
    
    setDeltaX(constrainedDelta);

    if (constrainedDelta > threshold && onEdit) {
      setActionTriggered("edit");
    } else if (constrainedDelta < -threshold && onDelete) {
      setActionTriggered("delete");
    } else {
      setActionTriggered(null);
    }
  };

  const handleMouseUp = () => {
    handleTouchEnd();
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const currentX = e.clientX;
        const newDeltaX = currentX - startX.current;
        const maxSwipe = 150;
        const constrainedDelta = Math.max(-maxSwipe, Math.min(maxSwipe, newDeltaX));
        
        setDeltaX(constrainedDelta);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging.current) {
        handleTouchEnd();
      }
    };

    if (isSwipeActive) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isSwipeActive]);

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden touch-pan-y", className)}
    >
      {/* Left action (Edit) */}
      {onEdit && (
        <div 
          className={cn(
            "swipe-action swipe-edit transition-all duration-200",
            deltaX > threshold ? "bg-warning" : "bg-warning/70",
            deltaX > 0 ? "translate-x-0" : "-translate-x-full"
          )}
          style={{ 
            width: Math.max(0, deltaX),
            opacity: deltaX > 0 ? Math.min(1, deltaX / threshold) : 0
          }}
        >
          <Edit className="w-5 h-5" />
        </div>
      )}

      {/* Right action (Delete) */}
      {onDelete && (
        <div 
          className={cn(
            "swipe-action swipe-delete transition-all duration-200",
            deltaX < -threshold ? "bg-destructive" : "bg-destructive/70",
            deltaX < 0 ? "translate-x-0" : "translate-x-full"
          )}
          style={{ 
            width: Math.max(0, -deltaX),
            opacity: deltaX < 0 ? Math.min(1, -deltaX / threshold) : 0
          }}
        >
          <Trash2 className="w-5 h-5" />
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          "relative z-10 transition-transform duration-200 bg-card",
          disabled && "pointer-events-none opacity-50"
        )}
        style={{
          transform: `translateX(${deltaX}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {children}
      </div>
    </div>
  );
}