'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const variantStyles = {
  default: 'border-transparent bg-primary/10 text-primary dark:bg-primary/20 hover:bg-primary/20',
  secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20 hover:bg-destructive/20',
  outline: 'border-border bg-transparent',
  success: 'border-transparent bg-success/10 text-success dark:bg-success/20 hover:bg-success/20',
  warning: 'border-transparent bg-warning/10 text-warning dark:bg-warning/20 hover:bg-warning/20',
};

export const badgeVariants = variantStyles;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantStyles;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };