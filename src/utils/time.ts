import {
  addDays,
  addHours,
  differenceInMinutes,
  format,
  isValid,
  parse,
  parseISO,
} from "date-fns";

export const BASE_PROFORMA_START_ISO = "2026-01-05T08:00:00.000Z";

export function dateFromIso(iso: string): Date {
  const date = parseISO(iso);
  return isValid(date) ? date : new Date(BASE_PROFORMA_START_ISO);
}

export function addHoursToIso(iso: string, hours: number): string {
  return addHours(dateFromIso(iso), hours).toISOString();
}

export function formatDate(iso: string): string {
  return format(dateFromIso(iso), "yyyy-MM-dd");
}

export function formatTime(iso: string): string {
  return format(dateFromIso(iso), "HH:mm");
}

export function formatDayName(iso: string): string {
  return format(dateFromIso(iso), "EEE");
}

export function combineDateTime(dateText: string, timeText: string): string {
  const parsed = parse(`${dateText} ${timeText || "00:00"}`, "yyyy-MM-dd HH:mm", new Date());
  return isValid(parsed) ? parsed.toISOString() : new Date().toISOString();
}

export function setIsoTime(iso: string, timeText: string): string {
  return combineDateTime(formatDate(iso), timeText);
}

export function setIsoDate(iso: string, dateText: string): string {
  return combineDateTime(dateText, formatTime(iso));
}

export function roundUpBufferToNextHourHours(iso: string): number {
  const date = dateFromIso(iso);
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();

  if (minutes === 0 && seconds === 0 && milliseconds === 0) {
    return 0;
  }

  const remainingMinutes = 60 - minutes - (seconds > 0 || milliseconds > 0 ? 1 : 0);
  const secondAdjustment = seconds > 0 || milliseconds > 0 ? (60 - seconds) / 60 : 0;
  return (remainingMinutes + secondAdjustment) / 60;
}

export function formatDuration(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || Number.isNaN(hours)) {
    return "";
  }

  const sign = hours < 0 ? "-" : "";
  const absMinutes = Math.round(Math.abs(hours) * 60);
  const hh = Math.floor(absMinutes / 60);
  const mm = absMinutes % 60;

  return `${sign}${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function formatDurationDayHourMinute(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || Number.isNaN(hours)) {
    return "";
  }

  const sign = hours < 0 ? "-" : "";
  const absMinutes = Math.round(Math.abs(hours) * 60);
  const days = Math.floor(absMinutes / 1440);
  const remain = absMinutes - days * 1440;
  const hh = Math.floor(remain / 60);
  const mm = absMinutes % 60;

  return `${sign}${days}D : ${String(hh).padStart(2, "0")}H : ${String(mm).padStart(2, "0")}M`;
}

function normalizeCompactTime(value: string): string {
  const trimmed = value.trim();
  const sign = trimmed.startsWith("-") ? "-" : "";
  const unsigned = trimmed.replace(/^[+-]/, "");

  if (/^\d{4}$/.test(unsigned)) {
    return `${sign}${unsigned.slice(0, 2)}:${unsigned.slice(2)}`;
  }

  return trimmed;
}

export function parseDurationToHours(value: string): number {
  const normalized = normalizeCompactTime(value).toUpperCase();
  if (!normalized) return 0;

  const dayMatch = normalized.match(/(-?\d+(?:\.\d+)?)\s*D/);
  const timeMatch = normalized.match(/(-?\d{1,3}):(\d{2})/);

  if (dayMatch || timeMatch) {
    const days = dayMatch ? Number(dayMatch[1]) : 0;
    const sign = days < 0 || normalized.startsWith("-") ? -1 : 1;
    const hourPart = timeMatch ? Math.abs(Number(timeMatch[1])) : 0;
    const minutePart = timeMatch ? Number(timeMatch[2]) : 0;
    return days * 24 + sign * (hourPart + minutePart / 60);
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function formatDelay(hours: number): string {
  const minutes = Math.round(hours * 60);
  if (Math.abs(minutes) < 1) return "On Time";

  const sign = minutes > 0 ? "+" : "-";
  const absMinutes = Math.abs(minutes);
  const days = Math.floor(absMinutes / 1440);
  const remain = absMinutes - days * 1440;
  const hh = Math.floor(remain / 60);

  if (days > 0) {
    return `${sign}${days}D ${String(hh).padStart(2, "0")}H`;
  }

  return `${sign}${String(hh).padStart(2, "0")}H`;
}

export function diffHours(laterIso: string, earlierIso: string): number {
  return differenceInMinutes(dateFromIso(laterIso), dateFromIso(earlierIso)) / 60;
}

export function shiftProformaIso(baseStartIso: string, sourceIso: string, actualStartIso: string): string {
  const deltaMinutes = differenceInMinutes(dateFromIso(sourceIso), dateFromIso(baseStartIso));
  return addHours(dateFromIso(actualStartIso), deltaMinutes / 60).toISOString();
}

export function addCycle(firstIso: string, cycleDays: number, index: number): string {
  return addDays(dateFromIso(firstIso), cycleDays * index).toISOString();
}
