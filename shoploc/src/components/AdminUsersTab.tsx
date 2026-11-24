import * as React from 'react';
import type { UserResponse, UserRole } from '@/types/user';
import { getAdminUsers, updateAdminUser, unlockAdminUser } from '@/lib/api';
import { adminUserUpdateSchema, type AdminUserUpdateFormValues } from '@/lib/validation/adminUser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  Search,
  Users,
  Unlock,
  Edit,
  X,
  RefreshCw,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { ROUTES } from '@/config/routes';

interface AdminUsersTabProps {
  initialUsers?: UserResponse[];
}

export function AdminUsersSkeleton() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden space-y-0">
      <div className="p-3.5 border-b bg-muted/30 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Skeleton className="size-9 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1 max-w-xs">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 hidden sm:block" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-28 hidden md:block" />
            <Skeleton className="h-4 w-24 hidden lg:block" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminUsersTab({ initialUsers = [] }: AdminUsersTabProps) {
  const [users, setUsers] = React.useState<UserResponse[]>(initialUsers);
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('ALL');
  const [securityFilter, setSecurityFilter] = React.useState<string>('ALL');
  const [page, setPage] = React.useState(0);
  const [pageSize] = React.useState(10);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalElements, setTotalElements] = React.useState(initialUsers.length);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = React.useState<string | null>(null);

  // Edit user modal state
  const [editingUser, setEditingUser] = React.useState<UserResponse | null>(null);
  const [editFormData, setEditFormData] = React.useState<AdminUserUpdateFormValues>({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [editFormErrors, setEditFormErrors] = React.useState<Record<string, string>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);

  // Unlock confirmation state
  const [unlockTargetUser, setUnlockTargetUser] = React.useState<UserResponse | null>(null);
  const [isSubmittingUnlock, setIsSubmittingUnlock] = React.useState(false);

  // Debounce search input by 300ms
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch users with filters
  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const roleParam = roleFilter === 'ALL' ? undefined : (roleFilter as UserRole);
      const lockedParam =
        securityFilter === 'LOCKED' ? true : securityFilter === 'ACTIVE' ? false : undefined;

      const pageResponse = await getAdminUsers({
        query: debouncedQuery.trim() || undefined,
        role: roleParam,
        locked: lockedParam,
        page,
        size: pageSize,
      });

      setUsers(pageResponse.content);
      setTotalPages(pageResponse.totalPages);
      setTotalElements(pageResponse.totalElements);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Impossible de récupérer la liste des utilisateurs.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, roleFilter, securityFilter, page, pageSize]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Success message auto-dismiss
  React.useEffect(() => {
    if (actionSuccessMessage) {
      const timer = setTimeout(() => setActionSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccessMessage]);

  const handleClearFilters = () => {
    setQuery('');
    setRoleFilter('ALL');
    setSecurityFilter('ALL');
    setPage(0);
  };

  // Open Edit Dialog
  const handleOpenEdit = (user: UserResponse) => {
    setEditingUser(user);
    setEditFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });
    setEditFormErrors({});
  };

  // Submit Edit Form with Zod validation
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const validationResult = adminUserUpdateSchema.safeParse(editFormData);
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setEditFormErrors(errors);
      return;
    }

    setIsSubmittingEdit(true);
    setEditFormErrors({});
    try {
      const payload = {
        firstName: validationResult.data.firstName,
        lastName: validationResult.data.lastName,
        email: validationResult.data.email,
      };
      const updated = await updateAdminUser(editingUser.id, payload);
      setActionSuccessMessage(
        `Le compte de ${updated.firstName} ${updated.lastName} a été mis à jour avec succès.`
      );
      setEditingUser(null);
      await fetchUsers();
    } catch (err: unknown) {
      setEditFormErrors({
        root:
          err instanceof Error
            ? err.message
            : 'Erreur lors de la mise à jour des informations utilisateur.',
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Unlock User Account
  const handleConfirmUnlock = async () => {
    if (!unlockTargetUser) return;
    setIsSubmittingUnlock(true);
    try {
      await unlockAdminUser(unlockTargetUser.id);
      setActionSuccessMessage(
        `Le compte de ${unlockTargetUser.firstName} ${unlockTargetUser.lastName} a été déverrouillé.`
      );
      setUnlockTargetUser(null);
      await fetchUsers();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors du déverrouillage du compte utilisateur.'
      );
    } finally {
      setIsSubmittingUnlock(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <Badge variant="destructive" className="text-[10px] uppercase font-semibold">
            Admin
          </Badge>
        );
      case 'MERCHANT':
        return (
          <Badge
            variant="secondary"
            className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px] uppercase font-semibold"
          >
            Commerçant
          </Badge>
        );
      case 'CLIENT':
      default:
        return (
          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
            Citoyen
          </Badge>
        );
    }
  };

  const getStatusBadge = (user: UserResponse) => {
    if (user.isLocked) {
      return (
        <Badge
          variant="destructive"
          className="bg-amber-600 hover:bg-amber-700 text-[10px] uppercase font-semibold flex items-center gap-1"
        >
          <Lock className="size-2.5" />
          Verrouillé
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] uppercase font-semibold"
      >
        Actif
      </Badge>
    );
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:opacity-75"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Rechercher par nom, prénom, email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              aria-label="Effacer la recherche"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Dropdowns Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs bg-muted/60 p-1 rounded-lg border">
            <span className="text-muted-foreground ml-1">Rôle :</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
              className="bg-transparent text-foreground border-none text-xs focus:outline-none pr-2 py-0.5 cursor-pointer font-medium"
              aria-label="Filtrer par rôle"
            >
              <option value="ALL">Tous les rôles</option>
              <option value="CLIENT">Citoyen (Client)</option>
              <option value="MERCHANT">Commerçant</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>

          {/* Security Status Filter */}
          <div className="flex items-center gap-1.5 text-xs bg-muted/60 p-1 rounded-lg border">
            <span className="text-muted-foreground ml-1">Accès :</span>
            <select
              value={securityFilter}
              onChange={(e) => {
                setSecurityFilter(e.target.value);
                setPage(0);
              }}
              className="bg-transparent text-foreground border-none text-xs focus:outline-none pr-2 py-0.5 cursor-pointer font-medium"
              aria-label="Filtrer par état de verrouillage"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIVE">Actifs uniquement</option>
              <option value="LOCKED">Verrouillés uniquement</option>
            </select>
          </div>

          {(query || roleFilter !== 'ALL' || securityFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs h-8 text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="size-3" />
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchUsers()} className="h-8 gap-1.5">
            <RefreshCw className="size-3.5" />
            Réessayer
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && <AdminUsersSkeleton />}

      {/* Users Data Table */}
      {!isLoading && !error && users.length > 0 && (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border/60">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Utilisateur
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Rôle
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Statut
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold hidden md:table-cell">
                    Code client
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold hidden lg:table-cell">
                    Inscrit le
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-muted/40 transition-colors ${
                      user.isLocked ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    {/* User Identity */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <a
                          href={`${ROUTES.profile.path}?userId=${user.id}`}
                          className="size-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20 shrink-0 hover:bg-primary/20 transition-colors cursor-pointer"
                          title={`Consulter le profil de ${user.firstName} ${user.lastName}`}
                        >
                          {getInitials(user.firstName, user.lastName)}
                        </a>
                        <div className="min-w-0">
                          <a
                            href={`${ROUTES.profile.path}?userId=${user.id}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline truncate max-w-[200px] block transition-colors cursor-pointer"
                            title={`Consulter le profil de ${user.firstName} ${user.lastName}`}
                          >
                            {user.firstName} {user.lastName}
                          </a>
                          <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">{getRoleBadge(user.role)}</td>

                    {/* Status */}
                    <td className="px-4 py-3">{getStatusBadge(user)}</td>

                    {/* Client Code */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {user.clientCode ? (
                        <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-1 rounded border border-border/50">
                          {user.clientCode}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Registration Date */}
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3 text-muted-foreground" />
                        <span>{formatDate(user.createdAt)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(user)}
                          className="h-8 px-2.5 text-xs gap-1"
                        >
                          <Edit className="size-3.5" />
                          <span>Modifier</span>
                        </Button>

                        {user.isLocked && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setUnlockTargetUser(user)}
                            className="h-8 px-2.5 text-xs gap-1 text-amber-700 dark:text-amber-300"
                            title="Déverrouiller le compte"
                          >
                            <Unlock className="size-3.5" />
                            <span>Débloquer</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Affichage de <span className="font-medium text-foreground">{users.length}</span> sur{' '}
              <span className="font-medium text-foreground">{totalElements}</span> utilisateur
              {totalElements > 1 ? 's' : ''}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isLoading}
                  className="h-7 px-2.5 text-xs gap-1"
                >
                  <ChevronLeft className="size-3.5" />
                  Précédent
                </Button>
                <span>
                  Page <strong className="text-foreground">{page + 1}</strong> sur{' '}
                  <strong className="text-foreground">{totalPages}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || isLoading}
                  className="h-7 px-2.5 text-xs gap-1"
                >
                  Suivant
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && users.length === 0 && (
        <Empty className="py-12 border rounded-xl bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users className="size-8 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>Aucun utilisateur trouvé</EmptyTitle>
            <EmptyDescription>
              {query || roleFilter !== 'ALL' || securityFilter !== 'ALL'
                ? 'Aucun compte ne correspond aux filtres de recherche sélectionnés.'
                : 'Aucun compte utilisateur enregistré dans le système.'}
            </EmptyDescription>
          </EmptyHeader>
          {(query || roleFilter !== 'ALL' || securityFilter !== 'ALL') && (
            <div className="pt-4 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearFilters}
                className="gap-1.5"
              >
                <X className="size-3.5" />
                Effacer les filtres
              </Button>
            </div>
          )}
        </Empty>
      )}

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Edit className="size-4 text-primary" />
              Modifier l&apos;utilisateur
            </DialogTitle>
            <DialogDescription>
              Mise à jour des coordonnées et privilèges de{' '}
              <strong className="text-foreground">
                {editingUser?.firstName} {editingUser?.lastName}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4 py-2">
            {editFormErrors.root && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                {editFormErrors.root}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Prénom</label>
                <Input
                  type="text"
                  value={editFormData.firstName}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  disabled={isSubmittingEdit}
                />
                {editFormErrors.firstName && (
                  <p className="text-destructive text-xs">{editFormErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Nom</label>
                <Input
                  type="text"
                  value={editFormData.lastName}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                  disabled={isSubmittingEdit}
                />
                {editFormErrors.lastName && (
                  <p className="text-destructive text-xs">{editFormErrors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Adresse email</label>
              <Input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, email: e.target.value }))}
                disabled={isSubmittingEdit}
              />
              {editFormErrors.email && (
                <p className="text-destructive text-xs">{editFormErrors.email}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Rôle du compte</label>
              <div className="flex items-center gap-2 pt-1">
                {editingUser && getRoleBadge(editingUser.role)}
                <span className="text-xs text-muted-foreground italic">(Non modifiable)</span>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingUser(null)}
                disabled={isSubmittingEdit}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isSubmittingEdit}>
                {isSubmittingEdit ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unlock Confirmation Modal */}
      <Dialog open={!!unlockTargetUser} onOpenChange={(open) => !open && setUnlockTargetUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Unlock className="size-5 text-amber-600" />
              Déverrouiller le compte utilisateur
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                Le compte de{' '}
                <strong className="text-foreground">
                  {unlockTargetUser?.firstName} {unlockTargetUser?.lastName}
                </strong>{' '}
                ({unlockTargetUser?.email}) a été temporairement verrouillé à la suite de trop
                nombreux échecs de connexion consécutifs.
              </p>
              <p className="text-xs text-muted-foreground">
                Cette action réinitialisera immédiatement le compteur de tentatives et lèvera le
                verrouillage de sécurité, permettant à l&apos;utilisateur de se reconnecter.
              </p>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnlockTargetUser(null)}
              disabled={isSubmittingUnlock}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmUnlock}
              disabled={isSubmittingUnlock}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmittingUnlock ? 'Déverrouillage...' : 'Confirmer le déverrouillage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
