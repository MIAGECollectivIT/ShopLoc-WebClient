import { cn } from 'cn';
import { ROUTES } from '@/config/routes';
import { Button } from '@/components/ui/button';
import { Users, Store, ShieldCheck, ArrowRight, Settings } from 'lucide-react';

interface AdminNavHeaderProps {
  activeNav: 'users' | 'stores' | 'settings';
}

export function AdminNavHeader({ activeNav }: AdminNavHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Supervision de l&apos;Écosystème ShopLoc
            </h2>
            <p className="text-xs text-muted-foreground">
              Gestion centralisée des citoyens, commerçants partenaires et établissements locaux.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<a href={ROUTES.adminPartners.path} />}
            className="text-xs h-8 gap-1.5"
          >
            <span>Affiliations Partenaires</span>
            <ArrowRight className="size-3.5" />
          </Button>
          <Button
            variant="default"
            size="sm"
            render={<a href={ROUTES.createStore.path} />}
            className="text-xs h-8 gap-1.5"
          >
            <Store className="size-3.5" />
            <span>Nouveau commerce</span>
          </Button>
        </div>
      </div>

      {/* Navigation Pills (Direct links with real URL routing) */}
      <nav
        aria-label="Sections d'administration"
        className="inline-flex h-11 items-center justify-start rounded-xl bg-muted p-1 text-muted-foreground w-full sm:w-auto overflow-x-auto gap-1"
      >
        <a
          href={ROUTES.adminDashboard.path}
          className={cn(
            'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            activeNav === 'users'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Users className="size-4" />
          <span>Comptes Utilisateurs</span>
        </a>

        <a
          href={ROUTES.adminStores.path}
          className={cn(
            'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            activeNav === 'stores'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Store className="size-4" />
          <span>Commerces Partenaires</span>
        </a>

        <a
          href={ROUTES.adminSettings.path}
          className={cn(
            'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            activeNav === 'settings'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Settings className="size-4" />
          <span>Paramètres & Notifications</span>
        </a>
      </nav>
    </div>
  );
}
