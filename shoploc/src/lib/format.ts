/**
 * Formats an amount in euros using French comma decimal separator.
 */
export function formatMoney(val: number | undefined | null): string {
  if (val === undefined || val === null) {
    return '0,00 €';
  }
  return `${Number(val).toFixed(2).replace('.', ',')} €`;
}

/**
 * Formats a loyalty points value with one decimal place using French formatting.
 */
export function formatPoints(val: number | undefined | null): string {
  if (val === undefined || val === null) {
    return '0,0';
  }
  return Number(val).toFixed(1).replace('.', ',');
}

/**
 * Formats an ISO timestamp in French local time (Europe/Paris).
 */
export function formatDateTimeFr(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) {
      return isoStr;
    }
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    }).format(d);
  } catch {
    return isoStr;
  }
}
