import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { NAV_ROUTES } from '@/config/routes';

interface NavMenuProps {
  currentPath?: string;
}

export function MainNav({ currentPath = '/' }: NavMenuProps) {
  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-1">
        {NAV_ROUTES.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/' ? currentPath === '/' : currentPath.startsWith(item.path);

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
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
