import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Store, BookOpen, ShoppingCart } from 'lucide-react';

interface NavMenuProps {
  currentPath?: string;
}

export function MainNav({ currentPath = '/' }: NavMenuProps) {
  const navItems = [
    {
      title: 'Magasins',
      href: '/',
      icon: Store,
    },
    {
      title: 'Catalogue',
      href: '/catalogue',
      icon: BookOpen,
    },
    {
      title: 'Panier',
      href: '/panier',
      icon: ShoppingCart,
    },
  ];

  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));

          return (
            <NavigationMenuItem key={item.href}>
              <NavigationMenuLink
                href={item.href}
                className={navigationMenuTriggerStyle({
                  className: `gap-1.5 cursor-pointer text-xs sm:text-sm font-medium ${
                    isActive
                      ? 'bg-muted text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`,
                })}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.title}</span>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
