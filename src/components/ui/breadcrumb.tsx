'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbProps extends React.ComponentPropsWithoutRef<'nav'> {}

function Breadcrumb({ className, ...props }: BreadcrumbProps) {
  return (
    <nav
      className={cn('flex items-center space-x-2', className)}
      aria-label="Breadcrumb"
      {...props}
    />
  );
}

interface BreadcrumbListProps extends React.ComponentPropsWithoutRef<'ol'> {}

function BreadcrumbList({ className, ...props }: BreadcrumbListProps) {
  return <ol className={cn('flex items-center space-x-2', className)} {...props} />;
}

interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<'li'> {}

function BreadcrumbItem({ className, ...props }: BreadcrumbItemProps) {
  return <li className={cn('inline-flex items-center space-x-2', className)} {...props} />;
}

interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<'a'> {
  asChild?: boolean;
}

function BreadcrumbLink({ asChild, className, ...props }: BreadcrumbLinkProps) {
  const Comp = asChild ? Slot : 'a';
  return (
    <Comp
      className={cn(
        'transition-colors hover:text-foreground text-sm font-medium text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

interface BreadcrumbPageProps extends React.ComponentPropsWithoutRef<'span'> {}

function BreadcrumbPage({ className, ...props }: BreadcrumbPageProps) {
  return (
    <span
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('text-sm font-medium text-foreground truncate max-w-[150px]', className)}
      {...props}
    />
  );
}

interface BreadcrumbSeparatorProps extends React.ComponentPropsWithoutRef<'li'> {}

function BreadcrumbSeparator({ className, children, ...props }: BreadcrumbSeparatorProps) {
  return (
    <li className={cn('flex h-9 items-center', className)} aria-hidden="true" {...props}>
      {children ?? <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </li>
  );
}

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator };