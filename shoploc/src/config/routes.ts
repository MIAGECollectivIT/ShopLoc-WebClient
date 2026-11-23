import {
  Home,
  Store,
  BookOpen,
  ShoppingCart,
  ShoppingBag,
  UserPlus,
  LogIn,
  User,
  Users,
  CreditCard,
  Wallet,
  Gift,
  ShieldCheck,
} from 'lucide-react';
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
  myStores: {
    path: '/stores/my-stores',
    label: 'Mes commerces',
    icon: Store,
  },
  storeDetail: (uid: string) => `/stores/${uid}`,
  storeScan: (uid: string) => `/stores/${uid}/scan`,
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
  gifts: {
    path: '/gifts',
    label: 'Cadeaux',
    icon: Gift,
  },
  cart: {
    path: '/cart',
    label: 'Panier',
    icon: ShoppingCart,
  },
  orders: {
    path: '/orders',
    label: 'Mes commandes',
    icon: ShoppingBag,
  },
  wallet: {
    path: '/wallet',
    label: 'Portefeuille',
    icon: Wallet,
  },
  checkout: {
    path: '/checkout',
    detail: (uid: string) => `/checkout/${uid}`,
    label: 'Règlement',
    icon: CreditCard,
  },
  orderConfirmation: {
    path: '/order-confirmation',
    detail: (uid: string) => `/order-confirmation/${uid}`,
    label: 'Confirmation de commande',
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
  adminDashboard: {
    path: '/admin',
    label: 'Administration',
    icon: ShieldCheck,
  },
  adminPartners: {
    path: '/admin/partners',
    label: 'Administration Partenaires',
    icon: Users,
  },
  adminPartnerDetail: (id: string) => `/admin/partners/${id}`,
} as const;

export const NAV_ROUTES: RouteConfig[] = [ROUTES.home, ROUTES.stores, ROUTES.catalog, ROUTES.gifts];
