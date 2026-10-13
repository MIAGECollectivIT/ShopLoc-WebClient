import { MapPin, Store as StoreIcon } from 'lucide-react';
import type { Store } from '@/types/store';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  return (
    <Card>
      {store.url ? (
        <img src={store.url} alt={store.name} className="h-40 w-full object-cover" loading="lazy" />
      ) : (
        <div className="h-40 bg-muted flex flex-col items-center justify-center text-muted-foreground">
          <StoreIcon className="size-8" />
          <span className="text-xs">Pas d'image</span>
        </div>
      )}

      <CardHeader>
        <CardTitle>{store.name}</CardTitle>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="size-3.5" />
          <span className="truncate">{store.address}</span>
        </CardDescription>
        {store.id && (
          <CardAction>
            <Badge variant="outline">#{store.id}</Badge>
          </CardAction>
        )}
      </CardHeader>

      <CardFooter className="justify-between">
        <Badge variant="secondary">Partenaire</Badge>
        {store.id && (
          <Button variant="outline" size="sm" render={<a href={ROUTES.storeDetail(store.id)} />}>
            Détails
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
