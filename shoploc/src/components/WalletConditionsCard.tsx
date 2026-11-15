import { Lock } from 'lucide-react';

export function WalletConditionsCard() {
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-muted/20 space-y-2.5 text-xs text-muted-foreground">
      <div className="font-semibold text-foreground flex items-center gap-2">
        <Lock className="size-3.5 text-primary" />
        Conditions d'utilisation du porte-monnaie
      </div>
      <ul className="space-y-1 list-disc list-inside">
        <li>
          Rechargement en ligne sécurisé par carte bancaire de <strong>5,00 € à 100,00 €</strong>.
        </li>
        <li>
          Plafond anti-blanchiment / sécurité :{' '}
          <strong>250,00 € maximum sur 7 jours glissants</strong>.
        </li>
        <li>Protection anti-doublon idempotente (identifiant unique généré par transaction).</li>
        <li>
          Utilisable pour régler vos achats Click &amp; Collect ou directement en caisse chez les
          commerçants partenaires.
        </li>
        <li>Aucuns frais de gestion ni date d'expiration sur votre solde.</li>
      </ul>
    </div>
  );
}
