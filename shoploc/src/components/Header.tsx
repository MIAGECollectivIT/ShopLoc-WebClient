import { MainNav } from './MainNav';
import { ModeToggle } from './ModeToggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/lib/auth';
import { UserPlus, LogIn, LogOut, PlusCircle, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  currentPath: string;
}

export function Header({ currentPath }: HeaderProps) {
  const isRegister = currentPath === ROUTES.register.path;
  const isLogin = currentPath === ROUTES.login.path;
  const { user, isAuthenticated, role, logout } = useAuth();

  const getRoleBadge = () => {
    switch (role) {
      case 'ADMIN':
        return (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
            Admin
          </Badge>
        );
      case 'MERCHANT':
        return (
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
          >
            Commerçant
          </Badge>
        );
      case 'CLIENT':
      default:
        return (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            Citoyen
          </Badge>
        );
    }
  };

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
          {isAuthenticated && user ? (
            <>
              {(role === 'ADMIN' || role === 'MERCHANT') && (
                <a
                  href="/stores/new"
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                    className: 'gap-1.5 hidden md:inline-flex',
                  })}
                >
                  <PlusCircle className="size-3.5" />
                  <span>Nouveau commerce</span>
                </a>
              )}

              <a
                href={role === 'CLIENT' ? ROUTES.profile.path : ROUTES.login.path}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/60 hover:bg-muted border text-xs transition-colors"
                title="Accéder à mon profil"
              >
                <UserIcon className="size-3.5 text-primary" />
                <span className="font-medium max-w-[120px] truncate hidden sm:inline">
                  {user.firstName || user.email}
                </span>
                {getRoleBadge()}
              </a>

              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => logout()}
                title="Se déconnecter"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </>
          ) : (
            <>
              <a
                href={ROUTES.login.path}
                className={buttonVariants({
                  variant: isLogin ? 'default' : 'ghost',
                  size: 'sm',
                  className: 'gap-1.5',
                })}
              >
                <LogIn className="size-3.5" />
                <span className="hidden sm:inline">{ROUTES.login.label}</span>
              </a>

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
            </>
          )}

          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
