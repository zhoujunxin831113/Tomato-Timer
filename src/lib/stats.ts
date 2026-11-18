import { addLocalDays, diffLocalDays, parseLocalDateString, toLocalDateString } from './date';
import type { SessionRecord } from '../types';

export interface DayStats {
  date: string;
  count: number;
  minutes: number;
}

export function countOnDate(records: SessionRecord[], date: string): number {
  return records.reduce((n, r) => (r.date === date ? n + 1 : n), 0);
}

export function minutesOnDate(records: SessionRecord[], date: string): number {
  return records.reduce((n, r) => (r.date === date ? n + r.durationMinutes : n), 0);
}

export function todayStats(
  records: SessionRecord[],
  now: Date = new Date(),
): { count: number; minutes: number } {
  const date = toLocalDateString(now);
  return { count: countOnDate(records, date), minutes: minutesOnDate(records, date) };
}

export function aggregateLastDays(
  records: SessionRecord[],
  days: number,
  now: Date = new Date(),
): DayStats[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const result: DayStats[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addLocalDays(today, -i);
    const date = toLocalDateString(d);
    result.push({ date, count: countOnDate(records, date), minutes: minutesOnDate(records, date) });
  }
  return result;
}

export function weekCount(records: SessionRecord[], now: Date = new Date()): number {
  const today = toLocalDateString(now);
  const start = toLocalDateString(addLocalDays(now, -6));
  return records.reduce((n, r) => (r.date >= start && r.date <= today ? n + 1 : n), 0);
}

export function totalFocusMinutes(records: SessionRecord[]): number {
  return records.reduce((n, r) => n + r.durationMinutes, 0);
}

// 连续天数：最近记录早于昨天视为已断；今天无记录但昨天有仍计入
export function currentStreak(records: SessionRecord[], now: Date = new Date()): number {
  const dates = new Set(records.map((r) => r.date));
  if (dates.size === 0) return 0;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let latest: Date | null = null;
  for (const d of dates) {
    const p = parseLocalDateString(d);
    if (p && (!latest || p.getTime() > latest.getTime())) latest = p;
  }
  if (!latest) return 0;

  const gap = diffLocalDays(latest, today);
  if (gap > 1) return 0;

  let cursor = gap === 0 ? today : latest;
  let streak = 0;
  while (dates.has(toLocalDateString(cursor))) {
    streak++;
    cursor = addLocalDays(cursor, -1);
  }
  return streak;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} 小时 ${m} 分` : `${h} 小时`;
}