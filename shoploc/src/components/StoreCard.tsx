import { MapPin, Store as StoreIcon, ShieldCheck } from 'lucide-react';
import type { Store } from '@/types/store';
import { resolveStoreImageUrl } from '@/lib/image';
import { useAuth } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  const { user, role } = useAuth();
  const resolvedImageUrl = resolveStoreImageUrl(store.url, store.id);

  const isMyStore =
    role === 'MERCHANT' &&
    store.userId != null &&
    ((user?.dbId != null && String(user.dbId) === String(store.userId)) ||
      (user?.id != null && String(user.id) === String(store.userId)));

  return (
    <Card className={isMyStore ? 'ring-2 ring-primary/40 border-primary/50' : undefined}>
      {resolvedImageUrl ? (
        <img
          src={resolvedImageUrl}
          alt={store.name}
          className="h-40 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="h-40 bg-muted flex flex-col items-center justify-center text-muted-foreground">
          <StoreIcon className="size-8" />
          <span className="text-xs">Pas d'image</span>
        </div>
      )}

      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="truncate">{store.name}</span>
          {isMyStore && (
            <Badge
              variant="secondary"
              className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] shrink-0 gap-1 font-semibold"
            >
              <ShieldCheck className="size-3" />
              Votre commerce
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{store.address}</span>
        </CardDescription>
      </CardHeader>

      <CardFooter className="justify-between">
        <Badge variant="secondary">Partenaire</Badge>
        {(store.uid || store.id) && (
          <Button
            variant={isMyStore ? 'default' : 'outline'}
            size="sm"
            render={<a href={ROUTES.storeDetail(store.uid || store.id!)} />}
          >
            {isMyStore ? 'Gérer mon commerce' : 'Détails'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
