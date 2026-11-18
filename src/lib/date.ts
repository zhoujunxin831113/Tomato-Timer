const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 本地 YYYY-MM-DD；字典序即时间序，禁止用 new Date('YYYY-MM-DD') 解析 */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 解析本地 YYYY-MM-DD 为本地零点 Date；非法返回 null */
export function parseLocalDateString(s: string): Date | null {
  const m = LOCAL_DATE_RE.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isValidISODateString(s: unknown): s is string {
  return typeof s === 'string' && s.length > 0 && !Number.isNaN(Date.parse(s));
}

export function addLocalDays(d: Date, days: number): Date {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/** 两个本地日期相差的天数（b - a） */
export function diffLocalDays(a: Date, b: Date): number {
  const ms =
    new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime() -
    new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  return Math.round(ms / 86_400_000);
}
