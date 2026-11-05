import { useAuth } from '@/lib/auth';
import { ROUTES } from '@/config/routes';
import { Plus } from 'lucide-react';

interface CreateStoreButtonProps {
  initialIsAdmin?: boolean;
}

export function CreateStoreButton({ initialIsAdmin = false }: CreateStoreButtonProps) {
  const { role, isLoading, isAuthenticated } = useAuth();

  // En cours de chargement côté client, se baser sur la valeur pré-rendue par le SSR
  const isAdmin = isLoading ? initialIsAdmin : isAuthenticated && role === 'ADMIN';

  if (!isAdmin) {
    return null;
  }

  return (
    <a
      href={ROUTES.createStore.path}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
    >
      <Plus className="size-3.5" />
      <span>Ajouter un établissement</span>
    </a>
  );
}
