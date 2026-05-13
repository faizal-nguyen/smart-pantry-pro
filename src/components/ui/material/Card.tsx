/**
 * Material You Card Component
 * Implements Material Design 3 card patterns
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useMaterialYouTheme } from '@/contexts/MaterialYouThemeContext';
import { getFramerEasing } from '@/lib/motion-utils';

export interface MaterialCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'filled' | 'outlined';
  interactive?: boolean;
  selected?: boolean;
  draggable?: boolean;
}

type MotionCardProps = MaterialCardProps & HTMLMotionProps<'div'>;

export const MaterialCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  ({ 
    className, 
    variant = 'elevated',
    interactive = false,
    selected = false,
    draggable = false,
    children,
    ...props 
  }, ref) => {
    const { theme } = useMaterialYouTheme();
    const colors = theme.isDark ? theme.colorScheme?.styles.dark : theme.colorScheme?.styles.light;
    
    const variantStyles = {
      elevated: {
        backgroundColor: colors?.surface || 'oklch(var(--card))',
        color: colors?.onSurface || 'oklch(var(--card-foreground))',
        boxShadow: theme.elevation.level1.shadow,
        border: 'none',
        hover: {
          boxShadow: theme.elevation.level2.shadow,
        },
      },
      filled: {
        backgroundColor: colors?.surfaceVariant || 'oklch(var(--secondary))',
        color: colors?.onSurfaceVariant || 'oklch(var(--secondary-foreground))',
        boxShadow: 'none',
        border: 'none',
        hover: {
          boxShadow: theme.elevation.level1.shadow,
        },
      },
      outlined: {
        backgroundColor: colors?.surface || 'oklch(var(--card))',
        color: colors?.onSurface || 'oklch(var(--card-foreground))',
        boxShadow: 'none',
        border: `1px solid ${colors?.outlineVariant || 'oklch(var(--border))'}`,
        hover: {
          boxShadow: theme.elevation.level1.shadow,
          borderColor: colors?.outline || 'oklch(var(--border))',
        },
      },
    };
    
    const currentVariant = variantStyles[variant];
    
    return (
      <motion.div
        ref={ref}
        className={cn(
          'rounded-lg overflow-hidden',
          interactive && 'cursor-pointer',
          draggable && 'cursor-move',
          selected && 'ring-2 ring-offset-2',
          className
        )}
        style={{
          backgroundColor: currentVariant.backgroundColor,
          color: currentVariant.color,
          boxShadow: currentVariant.boxShadow,
          border: currentVariant.border,
          borderRadius: `${theme.shape.corner.large}px`,
          ringColor: selected ? (colors?.primary || 'oklch(var(--primary))') : undefined,
        }}
        whileHover={
          interactive
            ? {
                ...currentVariant.hover,
                y: -2,
                transition: {
                  duration: theme.motion.duration.short4 / 1000,
                  ease: getFramerEasing(theme.motion.easing.standard),
                },
              }
            : undefined
        }
        whileTap={
          interactive
            ? {
                scale: 0.98,
                transition: {
                  duration: theme.motion.duration.short2 / 1000,
                  ease: getFramerEasing(theme.motion.easing.standard),
                },
              }
            : undefined
        }
        whileDrag={
          draggable
            ? {
                scale: 1.05,
                boxShadow: theme.elevation.level4.shadow,
                transition: {
                  duration: theme.motion.duration.short2 / 1000,
                  ease: getFramerEasing(theme.motion.easing.standard),
                },
              }
            : undefined
        }
        drag={draggable}
        dragConstraints={draggable ? { top: 0, left: 0, right: 0, bottom: 0 } : undefined}
        dragElastic={0.1}
        initial={false}
        layout
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

MaterialCard.displayName = 'MaterialCard';

// Card Header Component
export const MaterialCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { theme } = useMaterialYouTheme();
  
  return (
    <div
      ref={ref}
      className={cn('p-4', className)}
      style={{
        paddingLeft: `${theme.spacing.scale.md}px`,
        paddingRight: `${theme.spacing.scale.md}px`,
        paddingTop: `${theme.spacing.scale.md}px`,
        paddingBottom: `${theme.spacing.scale.sm}px`,
      }}
      {...props}
    />
  );
});

MaterialCardHeader.displayName = 'MaterialCardHeader';

// Card Content Component
export const MaterialCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { theme } = useMaterialYouTheme();
  
  return (
    <div
      ref={ref}
      className={cn('px-4 pb-4', className)}
      style={{
        paddingLeft: `${theme.spacing.scale.md}px`,
        paddingRight: `${theme.spacing.scale.md}px`,
        paddingBottom: `${theme.spacing.scale.md}px`,
      }}
      {...props}
    />
  );
});

MaterialCardContent.displayName = 'MaterialCardContent';

// Card Actions Component
export const MaterialCardActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { theme } = useMaterialYouTheme();
  
  return (
    <div
      ref={ref}
      className={cn('flex items-center gap-2 p-4 pt-0', className)}
      style={{
        paddingLeft: `${theme.spacing.scale.md}px`,
        paddingRight: `${theme.spacing.scale.md}px`,
        paddingBottom: `${theme.spacing.scale.md}px`,
        gap: `${theme.spacing.scale.xs}px`,
      }}
      {...props}
    />
  );
});

MaterialCardActions.displayName = 'MaterialCardActions';

// Food-specific card variant
export const FoodCard = React.forwardRef<HTMLDivElement, MotionCardProps & { 
  foodImage?: string;
  fresh?: boolean;
  expired?: boolean;
}>(({ 
  foodImage,
  fresh,
  expired,
  children,
  className,
  ...props 
}, ref) => {
  const { theme, extractColorFromImage } = useMaterialYouTheme();
  const [isHovered, setIsHovered] = React.useState(false);
  
  // Extract color from food image on hover
  React.useEffect(() => {
    if (isHovered && foodImage) {
      extractColorFromImage(foodImage).catch(console.error);
    }
  }, [isHovered, foodImage, extractColorFromImage]);
  
  const statusColor = fresh 
    ? theme.colors.semantic.fresh.value
    : expired 
    ? theme.colors.semantic.expired.value
    : undefined;
  
  return (
    <MaterialCard
      ref={ref}
      className={cn('relative overflow-hidden', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      interactive
      {...props}
    >
      {statusColor && (
        <div 
          className="absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rotate-45"
          style={{ backgroundColor: statusColor }}
        />
      )}
      {children}
    </MaterialCard>
  );
});

FoodCard.displayName = 'FoodCard';

export default MaterialCard;