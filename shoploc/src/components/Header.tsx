import { MainNav } from './MainNav';
import { ModeToggle } from './ModeToggle';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface HeaderProps {
  currentPath: string;
}

export function Header({ currentPath }: HeaderProps) {
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
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
