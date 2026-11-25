import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { getAdminUsers, getAdminUserById } from '@/lib/api';
import { storeOwnerSelectionSchema } from '@/lib/validation/adminUser';
import type { UserResponse } from '@/types/user';
import {
  UserCheck,
  Search,
  Mail,
  Store,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Check,
  Users,
} from 'lucide-react';

export interface StoreOwnerSelectionModalProps {
  value: string;
  onValueChange: (ownerUid: string) => void;
  disabled?: boolean;
  id?: string;
}

const PAGE_SIZE = 6;

export function StoreOwnerSelectionSkeleton() {
  return (
    <div className="divide-y divide-border/60 rounded-lg border">
      {Array.from({ length: PAGE_SIZE }).map((_, idx) => (
        <div key={idx} className="p-3 flex items-center justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Accessible admin selector + modal for assigning a store to any eligible user (CLIENT or MERCHANT).
 * Uses server-side search and pagination, Zod validation, and Skeleton/Empty/Error states.
 */
export function StoreOwnerSelector({
  value,
  onValueChange,
  disabled = false,
  id,
}: StoreOwnerSelectionModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserResponse | null>(null);
  const [pendingUser, setPendingUser] = React.useState<UserResponse | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [users, setUsers] = React.useState<UserResponse[]>([]);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalElements, setTotalElements] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Resolve currently selected user label when value changes externally
  React.useEffect(() => {
    let cancelled = false;
    if (!value) {
      setSelectedUser(null);
      return;
    }
    if (selectedUser?.id === value) {
      return;
    }
    getAdminUserById(value)
      .then((user) => {
        if (!cancelled) {
          setSelectedUser(user);
        }
      })
      .catch(() => {
        // Keep UUID fallback if user lookup fails
      });
    return () => {
      cancelled = true;
    };
  }, [value, selectedUser?.id]);

  // Debounce search input by 300ms
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadEligibleUsers = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAdminUsers({
        query: debouncedQuery || undefined,
        eligibleForStore: true,
        page,
        size: PAGE_SIZE,
      });
      setUsers(response.content);
      setTotalPages(Math.max(1, response.totalPages));
      setTotalElements(response.totalElements);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de charger la liste des utilisateurs éligibles.'
      );
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, page]);

  React.useEffect(() => {
    if (isOpen) {
      loadEligibleUsers();
    }
  }, [isOpen, loadEligibleUsers]);

  const handleOpenModal = () => {
    setPendingUser(selectedUser);
    setValidationError(null);
    setIsOpen(true);
  };

  const handleConfirmSelection = () => {
    const candidateId = pendingUser?.id ?? '';
    const parsed = storeOwnerSelectionSchema.safeParse({ ownerUid: candidateId });
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ?? 'Veuillez sélectionner un utilisateur valide.'
      );
      return;
    }
    setValidationError(null);
    setSelectedUser(pendingUser);
    onValueChange(parsed.data.ownerUid);
    setIsOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={handleOpenModal}
          aria-label="Sélectionner le propriétaire du commerce"
          className="w-full justify-between font-normal h-10 px-3"
        >
          <span className="flex items-center gap-2 truncate">
            <UserCheck className="size-4 text-primary shrink-0" />
            {selectedUser ? (
              <span className="truncate font-medium text-foreground">
                {selectedUser.firstName} {selectedUser.lastName}
              </span>
            ) : value ? (
              <span className="truncate text-muted-foreground font-mono text-xs">{value}</span>
            ) : (
              <span className="text-muted-foreground">Sélectionner le compte propriétaire</span>
            )}
          </span>
          {selectedUser && (
            <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
              {selectedUser.role === 'MERCHANT' ? 'Commerçant' : 'Client'}
            </Badge>
          )}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Règle ShopLoc : Un client affecté à un commerce obtient automatiquement le rôle commerçant.
      </p>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              Affecter un utilisateur au commerce
            </DialogTitle>
            <DialogDescription>
              Recherchez un utilisateur éligible par nom, prénom ou email. Un compte client sera
              automatiquement promu commerçant lors de l&apos;enregistrement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher par prénom, nom ou email..."
                aria-label="Rechercher un utilisateur"
                className="pl-9"
              />
            </div>

            {/* Error state */}
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex items-center justify-between gap-3 text-sm text-destructive">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadEligibleUsers}
                  className="shrink-0 gap-1.5"
                >
                  <RefreshCw className="size-3.5" />
                  Réessayer
                </Button>
              </div>
            )}

            {/* Loading state */}
            {isLoading && <StoreOwnerSelectionSkeleton />}

            {/* Empty state */}
            {!isLoading && !error && users.length === 0 && (
              <Empty className="py-8 border rounded-lg">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users className="size-6 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle>Aucun utilisateur trouvé</EmptyTitle>
                  <EmptyDescription>
                    {debouncedQuery
                      ? `Aucun utilisateur éligible ne correspond à « ${debouncedQuery} ».`
                      : 'Aucun utilisateur éligible disponible.'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {/* Results list */}
            {!isLoading && !error && users.length > 0 && (
              <div className="divide-y divide-border/60 rounded-lg border overflow-hidden">
                {users.map((user) => {
                  const isSelected = pendingUser?.id === user.id;
                  const storesCount = user.storesCount ?? 0;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setPendingUser(user);
                        setValidationError(null);
                      }}
                      className={`w-full text-left p-3 flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground truncate">
                            {user.firstName} {user.lastName}
                          </span>
                          <Badge
                            variant={user.role === 'MERCHANT' ? 'default' : 'secondary'}
                            className="text-[10px] h-4 px-1.5"
                          >
                            {user.role === 'MERCHANT' ? 'Commerçant' : 'Client'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                          <Mail className="size-3 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] h-5 px-2 gap-1">
                          <Store className="size-3" />
                          <span>
                            {storesCount === 0
                              ? 'Aucun commerce'
                              : `${storesCount} commerce${storesCount > 1 ? 's' : ''}`}
                          </span>
                        </Badge>
                        {isSelected && <Check className="size-4 text-primary shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && !error && totalElements > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>
                  {totalElements} utilisateur{totalElements > 1 ? 's' : ''} éligible
                  {totalElements > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="h-7 px-2 text-xs gap-1"
                  >
                    <ChevronLeft className="size-3.5" />
                    Précédent
                  </Button>
                  <span>
                    Page <strong className="text-foreground">{page + 1}</strong> / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page + 1 >= totalPages}
                    className="h-7 px-2 text-xs gap-1"
                  >
                    Suivant
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {validationError && <p className="text-destructive text-xs">{validationError}</p>}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmSelection}
              disabled={!pendingUser}
            >
              Confirmer l&apos;affectation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
