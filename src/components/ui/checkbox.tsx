'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <label className={cn('inline-flex items-center gap-2 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            'peer h-4 w-4 shrink-0 rounded-sm border border-input',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          {...props}
        />
        <span className={cn('flex items-center justify-center text-current peer-data-[state=checked]:text-primary')}>
          <Check className="h-3.5 w-3.5 opacity-0 peer-data-[state=checked]:opacity-100 transition-opacity" />
        </span>
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };