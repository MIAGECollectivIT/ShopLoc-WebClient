import type { StoreAbsence } from '@/types/store';

export interface DaySchedule {
  day: string;
  shortDay: string;
  open: boolean;
  start: string;
  end: string;
}

export const DAYS_ORDER: { day: string; shortDay: string; dayIndex: number }[] = [
  { day: 'Lundi', shortDay: 'Lun', dayIndex: 1 },
  { day: 'Mardi', shortDay: 'Mar', dayIndex: 2 },
  { day: 'Mercredi', shortDay: 'Mer', dayIndex: 3 },
  { day: 'Jeudi', shortDay: 'Jeu', dayIndex: 4 },
  { day: 'Vendredi', shortDay: 'Ven', dayIndex: 5 },
  { day: 'Samedi', shortDay: 'Sam', dayIndex: 6 },
  { day: 'Dimanche', shortDay: 'Dim', dayIndex: 0 },
];

export function getDefaultSchedule(): DaySchedule[] {
  return [
    { day: 'Lundi', shortDay: 'Lun', open: true, start: '09:00', end: '19:00' },
    { day: 'Mardi', shortDay: 'Mar', open: true, start: '09:00', end: '19:00' },
    { day: 'Mercredi', shortDay: 'Mer', open: true, start: '09:00', end: '19:00' },
    { day: 'Jeudi', shortDay: 'Jeu', open: true, start: '09:00', end: '19:00' },
    { day: 'Vendredi', shortDay: 'Ven', open: true, start: '09:00', end: '19:00' },
    { day: 'Samedi', shortDay: 'Sam', open: true, start: '10:00', end: '18:00' },
    { day: 'Dimanche', shortDay: 'Dim', open: false, start: '09:00', end: '12:00' },
  ];
}

/**
 * Parses raw openingHours string into a structured 7-day schedule.
 * Accurately recognizes previously saved formats (e.g. Lun-Ven 09:00-19:00, list per day, or JSON).
 */
export function parseOpeningHours(rawHours?: string | null): DaySchedule[] {
  const schedule = getDefaultSchedule();
  if (!rawHours || !rawHours.trim()) {
    return schedule;
  }

  const trimmed = rawHours.trim();

  // 1. JSON format support
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return schedule.map((item) => {
          const match = parsed.find(
            (p: { day?: string }) => p.day && p.day.toLowerCase() === item.day.toLowerCase()
          );
          if (match) {
            return {
              ...item,
              open: Boolean(match.open),
              start: match.start || item.start,
              end: match.end || item.end,
            };
          }
          return item;
        });
      }
    } catch {
      // Fallback to text parsing
    }
  }

  // 2. Structured lines or comma-separated days support
  const normalized = trimmed.replace(/\r/g, '');
  const linesOrSegments = normalized.split(/\n|,/);

  // Check if each day is explicitly mentioned
  for (const item of schedule) {
    for (const segment of linesOrSegments) {
      if (
        segment.toLowerCase().includes(item.day.toLowerCase()) ||
        segment.toLowerCase().includes(item.shortDay.toLowerCase())
      ) {
        if (/fermé|closed/i.test(segment)) {
          item.open = false;
        } else {
          const timeMatches = segment.match(/([0-9]{1,2})[:h]([0-9]{2})/gi);
          if (timeMatches && timeMatches.length >= 2) {
            item.open = true;
            item.start = normalizeTimeString(timeMatches[0]);
            item.end = normalizeTimeString(timeMatches[1]);
          } else if (timeMatches && timeMatches.length === 1) {
            item.open = true;
            item.start = normalizeTimeString(timeMatches[0]);
          }
        }
      }
    }
  }

  // 3. Compact pattern detection: e.g. "Lun-Ven 09:00 - 19:00"
  const rangeMatch = normalized.match(
    /(?:lun(?:di)?\s*[-–]\s*ven(?:dredi)?)\s*[:\\-]?\s*([0-9]{1,2}[:h][0-9]{2})\s*[-–àa]\s*([0-9]{1,2}[:h][0-9]{2})/i
  );
  if (rangeMatch) {
    const start = normalizeTimeString(rangeMatch[1]);
    const end = normalizeTimeString(rangeMatch[2]);
    for (let i = 0; i < 5; i++) {
      schedule[i].open = true;
      schedule[i].start = start;
      schedule[i].end = end;
    }
  }

  const satMatch = normalized.match(
    /(?:sam(?:edi)?)\s*[:\\-]?\s*([0-9]{1,2}[:h][0-9]{2})\s*[-–àa]\s*([0-9]{1,2}[:h][0-9]{2})/i
  );
  if (satMatch) {
    schedule[5].open = true;
    schedule[5].start = normalizeTimeString(satMatch[1]);
    schedule[5].end = normalizeTimeString(satMatch[2]);
  }

  if (/dim(?:anche)?\s*[:\\-]?\s*fermé/i.test(normalized)) {
    schedule[6].open = false;
  }

  return schedule;
}

function normalizeTimeString(raw: string): string {
  const clean = raw.replace(/h/i, ':');
  const [h, m] = clean.split(':');
  const hh = (h || '0').padStart(2, '0');
  const mm = (m || '00').padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Formats a schedule array into a readable multiline or structured representation.
 */
export function formatOpeningHours(schedule: DaySchedule[]): string {
  // If weekdays are all identical and open
  const weekdays = schedule.slice(0, 5);
  const allWeekdaysSame = weekdays.every(
    (d) => d.open === weekdays[0].open && d.start === weekdays[0].start && d.end === weekdays[0].end
  );

  const sat = schedule[5];
  const sun = schedule[6];

  if (allWeekdaysSame && weekdays[0].open) {
    const parts = [
      `Lun-Ven : ${weekdays[0].start} - ${weekdays[0].end}`,
      sat.open ? `Sam : ${sat.start} - ${sat.end}` : 'Sam : Fermé',
      sun.open ? `Dim : ${sun.start} - ${sun.end}` : 'Dim : Fermé',
    ];
    return parts.join(', ');
  }

  // Standard line-by-line format
  return schedule
    .map((item) =>
      item.open ? `${item.day} : ${item.start} - ${item.end}` : `${item.day} : Fermé`
    )
    .join(', ');
}

export interface StoreOpenStatus {
  isOpen: boolean;
  isAbsent: boolean;
  hasHours: boolean;
  label: string;
  statusText: string;
  badgeVariant: 'open' | 'closed' | 'absent';
}

/**
 * Calculates current real-time store opening status:
 * 1. Checks absence period.
 * 2. Checks weekly opening hours for the current day and minute.
 */
export function computeStoreOpenStatus(
  openingHours?: string | null,
  absenceStartDate?: string | null,
  absenceEndDate?: string | null,
  absences?: StoreAbsence[] | null,
  now: Date = new Date()
): StoreOpenStatus {
  // 1. Check list of absences first
  if (absences && Array.isArray(absences) && absences.length > 0) {
    const currentMs = now.getTime();
    const activeAbsence = absences.find((a) => {
      if (!a.startDate) return false;
      const startMs = new Date(a.startDate).getTime();
      const endMs = a.endDate ? new Date(a.endDate).getTime() : null;
      return currentMs >= startMs && (!endMs || currentMs <= endMs);
    });

    if (activeAbsence) {
      const end = activeAbsence.endDate ? new Date(activeAbsence.endDate) : null;
      return {
        isOpen: false,
        isAbsent: true,
        hasHours: Boolean(openingHours),
        label: 'Fermé pour absence',
        statusText: end ? `Jusqu'au ${end.toLocaleDateString('fr-FR')}` : 'Durée indéterminée',
        badgeVariant: 'absent',
      };
    }
  }

  // Fallback to legacy single absence evaluation
  if (absenceStartDate) {
    const start = new Date(absenceStartDate);
    const end = absenceEndDate ? new Date(absenceEndDate) : null;
    const currentMs = now.getTime();

    const isAfterStart = currentMs >= start.getTime();
    const isBeforeEnd = !end || currentMs <= end.getTime();

    if (isAfterStart && isBeforeEnd) {
      return {
        isOpen: false,
        isAbsent: true,
        hasHours: Boolean(openingHours),
        label: 'Fermé pour absence',
        statusText: end ? `Jusqu'au ${end.toLocaleDateString('fr-FR')}` : 'Durée indéterminée',
        badgeVariant: 'absent',
      };
    }
  }

  // 2. Opening hours evaluation
  if (!openingHours || !openingHours.trim()) {
    return {
      isOpen: false,
      isAbsent: false,
      hasHours: false,
      label: 'Horaires non renseignés',
      statusText: 'Consultez la boutique pour les horaires',
      badgeVariant: 'closed',
    };
  }

  const schedule = parseOpeningHours(openingHours);
  const currentDayIndex = now.getDay(); // 0 = Dimanche, 1 = Lundi, ...

  const daySchedule = schedule.find((item) => {
    const target = DAYS_ORDER.find((d) => d.dayIndex === currentDayIndex);
    return target && target.day.toLowerCase() === item.day.toLowerCase();
  });

  if (!daySchedule || !daySchedule.open) {
    return {
      isOpen: false,
      isAbsent: false,
      hasHours: true,
      label: 'Fermé actuellement',
      statusText: 'Fermé aujourd’hui',
      badgeVariant: 'closed',
    };
  }

  const currentHH = String(now.getHours()).padStart(2, '0');
  const currentMM = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHH}:${currentMM}`;

  if (currentTime >= daySchedule.start && currentTime < daySchedule.end) {
    return {
      isOpen: true,
      isAbsent: false,
      hasHours: true,
      label: 'Ouvert actuellement',
      statusText: `Jusqu'à ${daySchedule.end}`,
      badgeVariant: 'open',
    };
  }

  return {
    isOpen: false,
    isAbsent: false,
    hasHours: true,
    label: 'Fermé actuellement',
    statusText: `Ouvre à ${daySchedule.start}`,
    badgeVariant: 'closed',
  };
}
