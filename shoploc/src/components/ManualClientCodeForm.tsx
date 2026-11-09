import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clientCodeSchema } from '@/lib/validation/clientCode';
import { Search, Loader2, Hash, AlertCircle } from 'lucide-react';
import { cn } from 'cn';

export interface ManualClientCodeFormProps {
  onSubmitCode: (code: string) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Manual client code entry form for merchants when QR code scanning is unavailable.
 * Restricts input to 7 alphanumeric characters with uppercase formatting and visual feedback.
 */
export function ManualClientCodeForm({
  onSubmitCode,
  isLoading = false,
  className,
}: ManualClientCodeFormProps) {
  const [code, setCode] = React.useState('');
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip non-alphanumeric characters and restrict to 7 characters max
    const rawVal = e.target.value;
    const sanitized = rawVal
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 7);

    setCode(sanitized);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const parseResult = clientCodeSchema.safeParse(code);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      setValidationError(issue ? issue.message : 'Code client invalide.');
      return;
    }

    setValidationError(null);
    onSubmitCode(parseResult.data);
  };

  const isComplete = code.length === 7;

  return (
    <form onSubmit={handleSubmit} className={cn('w-full max-w-sm space-y-3', className)} noValidate>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="manual-client-code"
            className="text-xs font-semibold text-foreground flex items-center gap-1.5"
          >
            <Hash className="size-3.5 text-primary" />
            <span>Saisie manuelle de l'identifiant</span>
          </Label>

          <span
            className={cn(
              'text-[11px] font-mono font-medium',
              isComplete
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-muted-foreground'
            )}
            aria-live="polite"
          >
            {code.length}/7 caractères
          </span>
        </div>

        <div className="relative">
          <Input
            id="manual-client-code"
            type="text"
            value={code}
            onChange={handleInputChange}
            placeholder="Ex : K7P9XQ2"
            maxLength={7}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={isLoading}
            className={cn(
              'h-11 font-mono text-center text-lg font-bold tracking-widest uppercase transition-all',
              'focus-visible:ring-2',
              validationError
                ? 'border-destructive focus-visible:ring-destructive/30'
                : isComplete
                  ? 'border-emerald-500/50 focus-visible:ring-emerald-500/30 bg-emerald-500/5'
                  : ''
            )}
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? 'client-code-error' : undefined}
          />
        </div>

        {validationError && (
          <p
            id="client-code-error"
            className="text-xs text-destructive flex items-center gap-1.5 pt-0.5"
            role="alert"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{validationError}</span>
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="default"
        disabled={isLoading || !isComplete}
        className="w-full h-10 gap-2 font-medium"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span>Vérification en cours...</span>
          </>
        ) : (
          <>
            <Search className="size-4" />
            <span>Identifier le client</span>
          </>
        )}
      </Button>

      <p className="text-[11px] text-center text-muted-foreground">
        Code alphanumérique à 7 caractères figurant sous le QR code ou sur la carte physique.
      </p>
    </form>
  );
}
