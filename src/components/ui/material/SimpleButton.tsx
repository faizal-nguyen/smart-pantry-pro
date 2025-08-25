/**
 * Simplified Material You Button for testing
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface SimpleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outlined' | 'text';
  fullWidth?: boolean;
}

export const SimpleButton: React.FC<SimpleButtonProps> = ({
  variant = 'filled',
  fullWidth = false,
  className,
  children,
  onClick,
  ...props
}) => {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2';
  
  const variantStyles = {
    filled: 'bg-primary text-primary-foreground hover:opacity-90',
    outlined: 'border-2 border-primary text-primary hover:bg-primary/10',
    text: 'text-primary hover:bg-primary/10',
  };
  
  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        fullWidth && 'w-full',
        className
      )}
      onClick={(e) => {
        console.log('SimpleButton clicked!', e);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
};