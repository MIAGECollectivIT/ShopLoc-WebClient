import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { CreditCard, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { formatRibOrIban, isValidRibOrIban } from '@/lib/validation/store';

export interface RibInputFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  className?: string;
}

/**
 * Reusable bank RIB / IBAN input field with real-time modulo 97 validation
 * and formatted grouping preview.
 */
export function RibInputField({
  id = 'rib',
  value,
  onChange,
  error,
  disabled = false,
  required = true,
  label = 'Coordonnées bancaires (RIB / IBAN)',
  className,
}: RibInputFieldProps) {
  const isAlgorithmicValid = React.useMemo(() => {
    return isValidRibOrIban(value);
  }, [value]);

  return (
    <Field className={className}>
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor={id}>
          <span>{label}</span>
          {required && <span className="text-destructive">*</span>}
        </FieldLabel>
        <span className="text-[11px] text-muted-foreground font-normal flex items-center gap-1">
          <ShieldCheck className="size-3 text-primary" />
          Contrôle modulo 97
        </span>
      </div>
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex: FR76 3000 6000 0112 3456 7890 189 ou RIB 23 car."
          disabled={disabled}
          className={
            error
              ? 'border-destructive focus-visible:ring-destructive font-mono text-xs pr-8'
              : 'font-mono text-xs pr-8'
          }
        />
        <CreditCard className="absolute right-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
      </div>

      {/* Live validation feedback */}
      {value.trim().length > 0 && isAlgorithmicValid && !error && (
        <p className="text-[11px] text-green-600 dark:text-green-400 flex items-center gap-1 mt-1 font-mono">
          <CheckCircle2 className="size-3 shrink-0" />
          <span>Format & clé modulo 97 valides : {formatRibOrIban(value)}</span>
        </p>
      )}

      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
