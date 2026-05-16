/**
 * Material You Button Component
 * Extends existing Button with Material Design 3 styling
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button as BaseButton, ButtonProps as BaseButtonProps } from '@/components/ui/button';
import { useMaterialYouTheme } from '@/contexts/MaterialYouThemeContext';
import { motion, HTMLMotionProps } from 'framer-motion';
import { getFramerEasing } from '@/lib/motion-utils';
import { prepareColorForAnimation } from '@/lib/color-utils';

export interface MaterialButtonProps extends Omit<BaseButtonProps, 'variant'> {
  variant?: 'elevated' | 'filled' | 'tonal' | 'outlined' | 'text';
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
}

type MotionButtonProps = MaterialButtonProps & HTMLMotionProps<'button'>;

export const MaterialButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ 
    className, 
    variant = 'filled', 
    size = 'default',
    icon,
    iconPosition = 'start',
    fullWidth = false,
    children,
    disabled,
    onClick,
    ...props 
  }, ref) => {
    const { theme } = useMaterialYouTheme();
    const colors = theme.isDark ? theme.colorScheme?.styles.dark : theme.colorScheme?.styles.light;
    
    // Material You state layer opacities with fallback
    const stateOpacity = theme.state?.opacity || {
      hover: 0.08,
      focus: 0.12,
      pressed: 0.12,
      dragged: 0.16,
      disabled: 0.38,
    };
    
    // Variant-specific styles with fallbacks
    const variantStyles = {
      elevated: {
        backgroundColor: colors?.surfaceVariant || 'oklch(var(--secondary))',
        color: colors?.onSurfaceVariant || 'oklch(var(--secondary-foreground))',
        boxShadow: theme.elevation?.level1?.shadow || '0px 1px 2px rgba(0, 0, 0, 0.3)',
        border: 'none',
        hover: {
          boxShadow: theme.elevation?.level2?.shadow || '0px 1px 2px rgba(0, 0, 0, 0.3)',
        },
        active: {
          boxShadow: theme.elevation?.level1?.shadow || '0px 1px 2px rgba(0, 0, 0, 0.3)',
        },
      },
      filled: {
        backgroundColor: colors?.primary || 'oklch(var(--primary))',
        color: colors?.onPrimary || 'oklch(var(--primary-foreground))',
        border: 'none',
        hover: {
          boxShadow: theme.elevation?.level1?.shadow || '0px 1px 2px rgba(0, 0, 0, 0.3)',
        },
        active: {
          boxShadow: 'none',
        },
      },
      tonal: {
        backgroundColor: colors?.secondaryContainer || 'oklch(var(--secondary))',
        color: colors?.onSecondaryContainer || 'oklch(var(--secondary-foreground))',
        border: 'none',
        hover: {
          boxShadow: theme.elevation?.level1?.shadow || '0px 1px 2px rgba(0, 0, 0, 0.3)',
        },
        active: {
          boxShadow: 'none',
        },
      },
      outlined: {
        backgroundColor: prepareColorForAnimation('transparent'),
        color: colors?.primary || 'oklch(var(--primary))',
        border: `1px solid ${colors?.outline || 'oklch(var(--border))'}`,
        hover: {
          backgroundColor: `${colors?.primary || 'oklch(var(--primary))'}${Math.round(stateOpacity.hover * 255).toString(16).padStart(2, '0')}`,
        },
        active: {
          backgroundColor: `${colors?.primary || 'oklch(var(--primary))'}${Math.round(stateOpacity.pressed * 255).toString(16).padStart(2, '0')}`,
        },
      },
      text: {
        backgroundColor: prepareColorForAnimation('transparent'),
        color: colors?.primary || 'oklch(var(--primary))',
        border: 'none',
        hover: {
          backgroundColor: `${colors?.primary || 'oklch(var(--primary))'}${Math.round(stateOpacity.hover * 255).toString(16).padStart(2, '0')}`,
        },
        active: {
          backgroundColor: `${colors?.primary || 'oklch(var(--primary))'}${Math.round(stateOpacity.pressed * 255).toString(16).padStart(2, '0')}`,
        },
      },
    };
    
    const currentVariant = variantStyles[variant];
    
    // Size-specific styles following Material 3 with fallbacks
    const sizeStyles = {
      sm: {
        height: '32px',
        paddingX: icon && !children ? '12px' : '16px',
        gap: '8px',
        fontSize: theme.typography?.typeScale?.labelMedium?.fontSize || 12,
        borderRadius: theme.shape?.corner?.medium || 12,
      },
      default: {
        height: '40px',
        paddingX: icon && !children ? '16px' : '24px',
        gap: '8px',
        fontSize: theme.typography?.typeScale?.labelLarge?.fontSize || 14,
        borderRadius: theme.shape?.corner?.large || 16,
      },
      lg: {
        height: '48px',
        paddingX: icon && !children ? '20px' : '32px',
        gap: '12px',
        fontSize: theme.typography?.typeScale?.titleMedium?.fontSize || 16,
        borderRadius: theme.shape?.corner?.large || 16,
      },
    };
    
    const currentSize = sizeStyles[size || 'default'];
    
    return (
      <motion.button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          fullWidth && 'w-full',
          className
        )}
        style={{
          backgroundColor: currentVariant.backgroundColor,
          color: currentVariant.color,
          border: currentVariant.border,
          boxShadow: currentVariant.boxShadow,
          height: currentSize.height,
          paddingLeft: currentSize.paddingX,
          paddingRight: currentSize.paddingX,
          gap: currentSize.gap,
          fontSize: `${currentSize.fontSize}px`,
          borderRadius: typeof currentSize.borderRadius === 'number' 
            ? `${currentSize.borderRadius}px` 
            : currentSize.borderRadius,
          fontFamily: theme.typography?.fontFamily?.default || 'Inter, system-ui',
          letterSpacing: theme.typography?.typeScale?.labelLarge?.letterSpacing || 0.1,
          lineHeight: `${theme.typography?.typeScale?.labelLarge?.lineHeight || 20}px`,
          fontWeight: theme.typography?.typeScale?.labelLarge?.fontWeight || 500,
        }}
        whileHover={
          !disabled
            ? {
                ...currentVariant.hover,
                scale: 1.02,
                transition: {
                  duration: (theme.motion?.duration?.short4 || 200) / 1000,
                  ease: getFramerEasing(theme.motion?.easing?.standard),
                },
              }
            : undefined
        }
        whileTap={
          !disabled
            ? {
                ...currentVariant.active,
                scale: 0.98,
                transition: {
                  duration: (theme.motion?.duration?.short2 || 100) / 1000,
                  ease: getFramerEasing(theme.motion?.easing?.standard),
                },
              }
            : undefined
        }
        initial={false}
        disabled={disabled}
        onClick={onClick}
        {...props}
      >
        {icon && iconPosition === 'start' && (
          <span className="inline-flex">{icon}</span>
        )}
        {children}
        {icon && iconPosition === 'end' && (
          <span className="inline-flex">{icon}</span>
        )}
      </motion.button>
    );
  }
);

MaterialButton.displayName = 'MaterialButton';

export default MaterialButton;