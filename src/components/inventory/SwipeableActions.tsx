import React from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';

interface SwipeAction {
  icon: string;
  color: string;
  label: string;
}

interface SwipeableActionsProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  children?: React.ReactNode;
}

export const SwipeableActions: React.FC<SwipeableActionsProps> = ({
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  children
}) => {
  const x = useMotionValue(0);
  const controls = useAnimation();
  
  const leftActionOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const rightActionOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1]);
  
  const handleDragEnd = async (event: any, info: any) => {
    const threshold = 100;
    
    if (info.offset.x < -threshold && onSwipeLeft) {
      await controls.start({ x: -200, opacity: 0 });
      onSwipeLeft();
      await controls.start({ x: 0, opacity: 1 });
    } else if (info.offset.x > threshold && onSwipeRight) {
      await controls.start({ x: 200, opacity: 0 });
      onSwipeRight();
      await controls.start({ x: 0, opacity: 1 });
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Left Action Background */}
      {leftAction && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center justify-start pl-4"
          style={{ 
            opacity: leftActionOpacity,
            backgroundColor: leftAction.color === 'blue' ? '#3B82F6' : '#10B981'
          }}
        >
          <div className="text-white">
            <span className="text-2xl">{leftAction.icon}</span>
            <p className="text-xs mt-1">{leftAction.label}</p>
          </div>
        </motion.div>
      )}

      {/* Right Action Background */}
      {rightAction && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center justify-end pr-4"
          style={{ 
            opacity: rightActionOpacity,
            backgroundColor: rightAction.color === 'green' ? '#10B981' : '#EF4444'
          }}
        >
          <div className="text-white text-right">
            <span className="text-2xl">{rightAction.icon}</span>
            <p className="text-xs mt-1">{rightAction.label}</p>
          </div>
        </motion.div>
      )}

      {/* Swipeable Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="relative bg-white"
      >
        {children}
      </motion.div>
    </div>
  );
};