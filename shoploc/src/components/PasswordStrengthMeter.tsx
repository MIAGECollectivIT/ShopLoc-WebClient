import {
  getPasswordRequirements,
  calculatePasswordStrength,
  type PasswordStrength,
} from '@/lib/validation/register';
import { Check, X } from 'lucide-react';
import { cn } from 'cn';

interface PasswordStrengthMeterProps {
  password: string;
}

const STRENGTH_CONFIG: Record<
  PasswordStrength,
  { label: string; color: string; width: string; textColor: string }
> = {
  weak: {
    label: 'Faible',
    color: 'bg-destructive',
    width: 'w-1/3',
    textColor: 'text-destructive',
  },
  medium: {
    label: 'Moyen',
    color: 'bg-amber-500',
    width: 'w-2/3',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  strong: {
    label: 'Fort',
    color: 'bg-emerald-500',
    width: 'w-full',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) {
    return null;
  }

  const requirements = getPasswordRequirements(password);
  const strength = calculatePasswordStrength(requirements);
  const currentConfig = STRENGTH_CONFIG[strength];

  return (
    <div className="space-y-2.5 pt-1">
      {/* Dynamic Gauge */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Force du mot de passe</span>
          <span className={cn('font-semibold', currentConfig.textColor)}>
            {currentConfig.label}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300 rounded-full',
              currentConfig.color,
              currentConfig.width
            )}
          />
        </div>
      </div>

      {/* Checklist of Requirements */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
        {requirements.map((req) => (
          <li
            key={req.id}
            className={cn(
              'flex items-center gap-1.5 transition-colors',
              req.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
            )}
          >
            {req.met ? (
              <Check className="size-3.5 shrink-0 stroke-[2.5]" />
            ) : (
              <X className="size-3.5 shrink-0 opacity-40" />
            )}
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
