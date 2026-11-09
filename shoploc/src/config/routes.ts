import { Home, Store, BookOpen, ShoppingCart, UserPlus, LogIn, User, Users } from 'lucide-react';
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
  stores: {
    path: '/stores',
    label: 'Magasins',
    icon: Store,
  },
  storeDetail: (id: string | number) => `/stores/${id}`,
  storeScan: (id: string | number) => `/stores/${id}/scan`,
  createStore: {
    path: '/stores/new',
    label: 'Ajouter un établissement',
    icon: Store,
  },
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
  login: {
    path: '/login',
    label: 'Connexion',
    icon: LogIn,
  },
  register: {
    path: '/register',
    label: 'Inscription',
    icon: UserPlus,
  },
  profile: {
    path: '/profile',
    label: 'Mon Profil',
    icon: User,
  },
  adminPartners: {
    path: '/admin/partners',
    label: 'Administration Partenaires',
    icon: Users,
  },
  adminPartnerDetail: (id: string | number) => `/admin/partners/${id}`,
} as const;

export const NAV_ROUTES: RouteConfig[] = [ROUTES.home, ROUTES.stores, ROUTES.catalog, ROUTES.cart];
