import * as React from 'react';
import { cn } from 'cn';
import type { UserResponse } from '@/types/user';
import type { Store as StoreType } from '@/types/store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminStoresTab } from './AdminStoresTab';
import { Users, Store, ShieldCheck, ArrowRight } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { Button } from '@/components/ui/button';

interface AdminDashboardViewProps {
  initialUsers?: UserResponse[];
  initialStores?: StoreType[];
  defaultTab?: string;
}

export function AdminDashboardView({
  initialUsers = [],
  initialStores = [],
  defaultTab = 'users',
}: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = React.useState<string>(defaultTab);

  // Sync tab from URL search parameters on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'users' || tabParam === 'stores') {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Update URL search parameters when tab changes
  const handleTabChange = (value: string | number) => {
    const tabStr = String(value);
    setActiveTab(tabStr);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabStr);
      window.history.replaceState({}, '', url.toString());
    }
  };

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

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-10">
          <TabsTrigger
            value="users"
            className={cn(
              'gap-2 text-xs transition-all',
              activeTab === 'users'
                ? 'bg-background text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Users className="size-4" />
            <span>Comptes Utilisateurs</span>
          </TabsTrigger>
          <TabsTrigger
            value="stores"
            className={cn(
              'gap-2 text-xs transition-all',
              activeTab === 'stores'
                ? 'bg-background text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Store className="size-4" />
            <span>Commerces Partenaires</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="focus-visible:outline-none">
          <AdminUsersTab initialUsers={initialUsers} />
        </TabsContent>

        <TabsContent value="stores" className="focus-visible:outline-none">
          <AdminStoresTab initialStores={initialStores} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
