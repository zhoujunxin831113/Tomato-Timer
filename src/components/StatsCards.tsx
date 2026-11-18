import { memo, useMemo } from 'react';
import { currentStreak, formatMinutes, todayStats, totalFocusMinutes, weekCount } from '../lib/stats';
import { useStatsStore } from '../store/useStatsStore';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-line bg-card p-4 text-center shadow-card">
      <div className="text-2xl font-semibold tabular-nums text-ink">{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

function StatsCardsInner() {
  const records = useStatsStore((s) => s.records);
  const stats = useMemo(() => {
    const today = todayStats(records);
    return {
      todayCount: today.count,
      todayMinutes: today.minutes,
      week: weekCount(records),
      totalMinutes: totalFocusMinutes(records),
      streak: currentStreak(records),
    };
  }, [records]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="今日番茄" value={String(stats.todayCount)} sub={formatMinutes(stats.todayMinutes)} />
      <StatCard label="本周番茄" value={String(stats.week)} />
      <StatCard label="累计专注" value={formatMinutes(stats.totalMinutes)} />
      <StatCard label="连续天数" value={`${stats.streak} 天`} />
    </div>
  );
}

export const StatsCards = memo(StatsCardsInner);
StatsCards.displayName = 'StatsCards';