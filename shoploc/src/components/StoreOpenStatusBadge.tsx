import * as React from 'react';
import type { StoreAbsence } from '@/types/store';
import { computeStoreOpenStatus, parseOpeningHours, DAYS_ORDER } from '@/lib/opening-hours';
import { Clock, CalendarOff, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface StoreOpenStatusBadgeProps {
  openingHours?: string | null;
  absenceStartDate?: string | null;
  absenceEndDate?: string | null;
  absenceReason?: string | null;
  absences?: StoreAbsence[];
  showScheduleDropdown?: boolean;
  onlyWhenOpen?: boolean;
  className?: string;
}

export function StoreOpenStatusBadge({
  openingHours,
  absenceStartDate,
  absenceEndDate,
  absenceReason,
  absences,
  showScheduleDropdown = true,
  onlyWhenOpen = false,
  className = '',
}: StoreOpenStatusBadgeProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [status, setStatus] = React.useState(() =>
    computeStoreOpenStatus(openingHours, absenceStartDate, absenceEndDate, absences)
  );

  React.useEffect(() => {
    setStatus(computeStoreOpenStatus(openingHours, absenceStartDate, absenceEndDate, absences));
  }, [openingHours, absenceStartDate, absenceEndDate, absences]);

  if (onlyWhenOpen && status.badgeVariant !== 'open') {
    return null;
  }

  const schedule = React.useMemo(() => {
    return openingHours ? parseOpeningHours(openingHours) : [];
  }, [openingHours]);

  const activeAbsence = React.useMemo(() => {
    if (!status.isAbsent) return null;
    if (absences && absences.length > 0) {
      const nowMs = Date.now();
      const match = absences.find((a) => {
        if (!a.startDate) return false;
        const startMs = new Date(a.startDate).getTime();
        const endMs = a.endDate ? new Date(a.endDate).getTime() : null;
        return nowMs >= startMs && (!endMs || nowMs <= endMs);
      });
      if (match) return match;
    }
    if (absenceStartDate) {
      return {
        startDate: absenceStartDate,
        endDate: absenceEndDate,
        reason: absenceReason,
      };
    }
    return null;
  }, [status.isAbsent, absences, absenceStartDate, absenceEndDate, absenceReason]);

  const currentDayIndex = new Date().getDay();
  const currentDayName = DAYS_ORDER.find((d) => d.dayIndex === currentDayIndex)?.day;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Real-time open/closed/absent status pill */}
      <div className="flex flex-wrap items-center gap-2">
        {status.badgeVariant === 'open' && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ouvert actuellement</span>
            <span className="text-[10px] opacity-80">&bull; {status.statusText}</span>
          </div>
        )}

        {status.badgeVariant === 'closed' && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 shadow-xs">
            <span className="size-2 rounded-full bg-rose-500" />
            <span>Fermé actuellement</span>
            {status.hasHours && (
              <span className="text-[10px] opacity-80">&bull; {status.statusText}</span>
            )}
          </div>
        )}

        {status.badgeVariant === 'absent' && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-xs">
            <CalendarOff className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Fermé pour absence</span>
            <span className="text-[10px] opacity-80">&bull; {status.statusText}</span>
          </div>
        )}

        {/* Schedule Accordion Toggle Button */}
        {showScheduleDropdown && openingHours && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors border border-border/60 cursor-pointer"
          >
            <Clock className="size-3.5 text-primary" />
            <span>Horaires</span>
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        )}
      </div>

      {/* Notice when absence scheduled or active */}
      {status.isAbsent && activeAbsence && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Boutique temporairement fermée</p>
            <p className="text-[11px] opacity-90">
              Du{' '}
              {activeAbsence.startDate
                ? new Date(activeAbsence.startDate).toLocaleDateString('fr-FR')
                : ''}{' '}
              au{' '}
              {activeAbsence.endDate
                ? new Date(activeAbsence.endDate).toLocaleDateString('fr-FR')
                : ''}
              {activeAbsence.reason ? ` — Motif : ${activeAbsence.reason}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Expanded weekly schedule panel */}
      {expanded && schedule.length > 0 && (
        <div className="p-3.5 bg-muted/40 rounded-xl border border-border/70 space-y-1.5 text-xs animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-border/40 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
            <span>Jour</span>
            <span>Horaires d'ouverture</span>
          </div>
          <div className="grid grid-cols-1 gap-1">
            {schedule.map((item) => {
              const isToday =
                currentDayName && item.day.toLowerCase() === currentDayName.toLowerCase();
              return (
                <div
                  key={item.day}
                  className={`flex items-center justify-between py-1 px-2 rounded-md ${
                    isToday
                      ? 'bg-primary/10 text-primary font-bold border border-primary/20'
                      : 'text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {item.day}
                    {isToday && (
                      <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-sm bg-primary text-primary-foreground">
                        Aujourd'hui
                      </span>
                    )}
                  </span>
                  <span>{item.open ? `${item.start} - ${item.end}` : 'Fermé'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
