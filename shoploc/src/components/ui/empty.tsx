import * as React from 'react';
import { cn } from 'cn';

function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center animate-in fade-in-50',
        className
      )}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={cn('flex flex-col items-center justify-center gap-1.5', className)}
      {...props}
    />
  );
}

function EmptyMedia({
  className,
  variant = 'icon',
  ...props
}: React.ComponentProps<'div'> & { variant?: 'icon' | 'default' }) {
  return (
    <div
      data-slot="empty-media"
      data-variant={variant}
      className={cn(
        'mb-2 flex items-center justify-center text-muted-foreground',
        variant === 'icon' && 'size-12 rounded-full bg-muted/60 p-2.5 [&_svg]:size-6',
        className
      )}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="empty-title"
      className={cn('text-base font-semibold tracking-tight text-foreground', className)}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="empty-description"
      className={cn('text-sm text-muted-foreground max-w-sm', className)}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn('mt-4 flex items-center justify-center gap-2', className)}
      {...props}
    />
  );
}

export { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent };
