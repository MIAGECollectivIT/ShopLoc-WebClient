import { MapPin, Store } from 'lucide-react';
import type { Shop } from '@/types/shop';
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

interface ShopCardProps {
  shop: Shop;
}

export function ShopCard({ shop }: ShopCardProps) {
  return (
    <Card>
      {shop.url ? (
        <img src={shop.url} alt={shop.name} className="h-40 w-full object-cover" loading="lazy" />
      ) : (
        <div className="h-40 bg-muted flex flex-col items-center justify-center text-muted-foreground">
          <Store className="size-8" />
          <span className="text-xs">Pas d'image</span>
        </div>
      )}

      <CardHeader>
        <CardTitle>{shop.name}</CardTitle>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="size-3.5" />
          <span className="truncate">{shop.address}</span>
        </CardDescription>
        {shop.id && (
          <CardAction>
            <Badge variant="outline">#{shop.id}</Badge>
          </CardAction>
        )}
      </CardHeader>

      <CardFooter className="justify-between">
        <Badge variant="secondary">Partenaire</Badge>
        {shop.id && (
          <Button variant="outline" size="sm" render={<a href={`/shops/${shop.id}`} />}>
            Détails
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
