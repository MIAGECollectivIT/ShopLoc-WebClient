import { ShieldCheck, Info } from 'lucide-react';
import { cn } from 'cn';
import { RGPD_LICENSE_PLATE_NOTICE } from '@/lib/validation/licensePlate';

export interface LicensePlateLegalNoticeProps {
  className?: string;
  variant?: 'info' | 'shield';
}

export function LicensePlateLegalNotice({
  className,
  variant = 'shield',
}: LicensePlateLegalNoticeProps) {
  const Icon = variant === 'shield' ? ShieldCheck : Info;

  return (
    <div
      role="note"
      aria-label="Information légale RGPD"
      className={cn(
        'flex items-start gap-2.5 p-3 rounded-xl border text-xs leading-relaxed transition-colors',
        'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/40 text-blue-950 dark:text-blue-200',
        className
      )}
    >
      <Icon className="size-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
      <div className="space-y-1">
        <p className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-1.5">
          <span>Information légale RGPD & Stationnement</span>
        </p>
        <p className="text-muted-foreground dark:text-blue-300/80 text-[11px] sm:text-xs">
          {RGPD_LICENSE_PLATE_NOTICE}
        </p>
      </div>
    </div>
  );
}
