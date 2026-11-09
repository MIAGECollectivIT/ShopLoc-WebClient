import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Label } from '@/components/ui/label';

const fieldVariants = cva('flex w-full gap-1.5', {
  variants: {
    orientation: {
      vertical: 'flex-col',
      horizontal: 'flex-row items-center justify-between',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
});

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return (
    <fieldset
      data-slot="fieldset"
      className={cn('flex flex-col gap-4 border-0 p-0 m-0', className)}
      {...props}
    />
  );
}

function FieldLegend({ className, ...props }: React.ComponentProps<'legend'>) {
  return (
    <legend
      data-slot="legend"
      className={cn('text-sm font-semibold text-foreground mb-1', className)}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="field-group" className={cn('flex flex-col gap-4', className)} {...props} />
  );
}

function FieldSeparator({ className, ...props }: React.ComponentProps<'hr'>) {
  return (
    <hr
      data-slot="field-separator"
      className={cn('border-t border-border my-2', className)}
      {...props}
    />
  );
}

interface FieldProps extends React.ComponentProps<'div'>, VariantProps<typeof fieldVariants> {}

function Field({ className, orientation, ...props }: FieldProps) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn('text-sm font-semibold flex items-center gap-1.5', className)}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

interface FieldErrorProps extends React.ComponentProps<'p'> {
  errors?: (string | undefined)[];
}

function FieldError({ className, children, errors, ...props }: FieldErrorProps) {
  const content = children || (errors && errors.filter(Boolean).join(', '));
  if (!content) return null;

  return (
    <p
      role="alert"
      data-slot="field-error"
      className={cn('text-xs font-medium text-destructive flex items-center gap-1 mt-1', className)}
      {...props}
    >
      {content}
    </p>
  );
}

export {
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldSeparator,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
};
