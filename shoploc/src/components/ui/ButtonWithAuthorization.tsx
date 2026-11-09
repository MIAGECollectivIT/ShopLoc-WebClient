import * as React from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/types/user';
import type { VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Plus } from 'lucide-react';

export type ButtonFallbackMode = 'remove' | 'hidden' | 'disabled';

export interface ButtonWithAuthorizationProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /**
   * User roles permitted to view and interact with this button.
   * If omitted or empty, the button is accessible to all users.
   */
  allowedRoles?: UserRole[];

  /**
   * Behavior when the current user does not meet authorization requirements:
   * - 'remove': Does not render anything (returns null) [Default].
   * - 'hidden': Preserved in the DOM with the 'hidden' CSS class (display: none).
   * - 'disabled': Rendered visibly but dimmed and non-interactive.
   */
  fallbackMode?: ButtonFallbackMode;

  /**
   * Explanatory tooltip or title attribute displayed when the button is disabled due to missing permissions.
   */
  disabledTooltip?: string;

  /**
   * Optional navigation destination URL. When provided, renders an <a> anchor styled as a button.
   */
  href?: string;

  /**
   * Optional icon component rendered preceding the label text.
   */
  icon?: React.ComponentType<{ className?: string }>;

  /**
   * Optional button label text if not supplied via children.
   */
  label?: string;
}

/**
 * Polymorphic button component with Role-Based Access Control (RBAC).
 * Supports rendering either as an interactive action button or a navigation link,
 * featuring configurable unauthorized fallback strategies (remove, hidden, disabled).
 * Prevents SSR hydration mismatches by synchronizing initial mount on the client.
 */
export function ButtonWithAuthorization({
  allowedRoles,
  fallbackMode = 'remove',
  disabledTooltip = 'This action is restricted to authorized users.',
  href,
  icon: Icon,
  label,
  children,
  className,
  variant = 'default',
  size = 'default',
  disabled,
  title,
  ...props
}: ButtonWithAuthorizationProps) {
  const { role, isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid SSR / client hydration mismatches before localStorage session is loaded
  if (!mounted || isLoading) {
    if (fallbackMode === 'hidden') {
      return (
        <span className="hidden" aria-hidden="true">
          {children || label}
        </span>
      );
    }
    return null;
  }

  // If no role restriction is specified, access is universally granted
  const isAuthorized =
    !allowedRoles ||
    allowedRoles.length === 0 ||
    (Boolean(isAuthenticated) && Boolean(role) && allowedRoles.includes(role as UserRole));

  const renderIcon = () => {
    if (
      typeof Icon === 'function' ||
      (typeof Icon === 'object' && Icon !== null && 'render' in Icon)
    ) {
      const Comp = Icon;
      return <Comp className="size-3.5" />;
    }
    if (href?.includes('stores/new') || label?.toLowerCase().includes('ajouter')) {
      return <Plus className="size-3.5" />;
    }
    return null;
  };

  // Handle unauthorized state
  if (!isAuthorized) {
    if (fallbackMode === 'remove') {
      return null;
    }

    if (fallbackMode === 'hidden') {
      return (
        <span className="hidden" aria-hidden="true">
          {children || label}
        </span>
      );
    }

    // fallbackMode === 'disabled'
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={cn('cursor-not-allowed opacity-50', className)}
        title={disabledTooltip || title}
        aria-disabled="true"
        {...props}
      >
        {renderIcon()}
        {children || label}
      </Button>
    );
  }

  // Authorized state: Render as navigation link
  if (href) {
    return (
      <a href={href} className={cn(buttonVariants({ variant, size, className }))} title={title}>
        {renderIcon()}
        {children || label}
      </a>
    );
  }

  // Authorized state: Render as standard action button
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      className={className}
      title={title}
      {...props}
    >
      {renderIcon()}
      {children || label}
    </Button>
  );
}
