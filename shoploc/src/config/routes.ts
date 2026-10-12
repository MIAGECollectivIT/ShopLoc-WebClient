import { Home, Store, BookOpen, ShoppingCart } from 'lucide-react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

export interface RouteConfig {
  path: string;
  label: string;
  icon: ComponentType<LucideProps>;
}

export const ROUTES = {
  home: {
    path: '/',
    label: 'Accueil',
    icon: Home,
  },
  shops: {
    path: '/shops',
    label: 'Magasins',
    icon: Store,
  },
  shopDetail: (id: string | number) => `/shops/${id}`,
  catalog: {
    path: '/catalog',
    label: 'Catalogue',
    icon: BookOpen,
  },
  cart: {
    path: '/cart',
    label: 'Panier',
    icon: ShoppingCart,
  },
} as const;

export const NAV_ROUTES: RouteConfig[] = [ROUTES.home, ROUTES.shops, ROUTES.catalog, ROUTES.cart];
