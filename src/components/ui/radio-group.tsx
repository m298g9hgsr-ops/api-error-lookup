'use client';

import * as React from 'react';
import * as RadioGroupPrimitives from '@radix-ui/react-radio-group';
import { cn } from '@/lib/utils';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitives.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitives.Root className={cn('grid gap-2', className)} {...props} ref={ref} />
));
RadioGroup.displayName = RadioGroupPrimitives.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitives.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitives.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitives.Item
    ref={ref}
    className={cn(
      'aspect-square h-4 w-4 rounded-full border border-primary text-current ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    <RadioGroupPrimitives.Indicator className="flex items-center justify-center">
      <span className="h-2.5 w-2.5 rounded-full bg-current" />
    </RadioGroupPrimitives.Indicator>
  </RadioGroupPrimitives.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitives.Item.displayName;

interface RadioGroupItemLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
}

const RadioGroupItemLabel = React.forwardRef<HTMLLabelElement, RadioGroupItemLabelProps>(
  ({ className, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('flex items-center gap-2 cursor-pointer text-sm font-medium select-none', className)}
      {...props}
    >
      {children}
    </label>
  )
);
RadioGroupItemLabel.displayName = 'RadioGroupItemLabel';

export { RadioGroup, RadioGroupItem, RadioGroupItemLabel };