import * as React from 'react';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { NAV_ROUTES, ROUTES } from '@/config/routes';
import { useCart } from '@/hooks/useCart';

interface NavMenuProps {
  currentPath?: string;
}

export function MainNav({ currentPath = '/' }: NavMenuProps) {
  const { totalItemCount } = useCart();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const displayCount = mounted ? totalItemCount : 0;

  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-1">
        {NAV_ROUTES.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/' ? currentPath === '/' : currentPath.startsWith(item.path);
          const isCart = item.path === ROUTES.cart.path;

          return (
            <NavigationMenuItem key={item.path}>
              <NavigationMenuLink
                href={item.path}
                className={navigationMenuTriggerStyle({
                  className: `gap-1.5 cursor-pointer text-xs sm:text-sm font-medium ${
                    isActive
                      ? 'bg-muted text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`,
                })}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
                {isCart && displayCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-primary/15 text-primary">
                    {displayCount}
                  </span>
                )}
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
