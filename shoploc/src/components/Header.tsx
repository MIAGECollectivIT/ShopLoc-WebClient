import { MainNav } from './MainNav';
import { ModeToggle } from './ModeToggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { UserPlus } from 'lucide-react';

interface HeaderProps {
  currentPath: string;
}

export function Header({ currentPath }: HeaderProps) {
  const isRegister = currentPath === ROUTES.register.path;

  return (
    <header className="border-b">
      <div className="max-w-5xl mx-auto flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          <SidebarTrigger className="size-8" />

          <a href="/" className="flex items-center gap-2 font-semibold">
            <span>ShopLoc</span>
            <span className="text-xs text-muted-foreground font-normal border-l pl-2 hidden sm:inline">
              Collectiv'IT
            </span>
          </a>

          <MainNav currentPath={currentPath} />
        </div>

        <div className="flex items-center gap-2">
          <a
            href={ROUTES.register.path}
            className={buttonVariants({
              variant: isRegister ? 'default' : 'outline',
              size: 'sm',
              className: 'gap-1.5',
            })}
          >
            <UserPlus className="size-3.5" />
            <span className="hidden sm:inline">{ROUTES.register.label}</span>
          </a>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
