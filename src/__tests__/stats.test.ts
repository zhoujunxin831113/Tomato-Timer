import { describe, expect, it } from 'vitest';
import {
  aggregateLastDays,
  countOnDate,
  currentStreak,
  formatMinutes,
  minutesOnDate,
  todayStats,
  totalFocusMinutes,
  weekCount,
} from '../lib/stats';
import type { SessionRecord } from '../types';

function rec(date: string, minutes = 25, startedAt?: string): SessionRecord {
  return {
    id: `${date}-${minutes}-${Math.random()}`,
    date,
    startedAt: startedAt ?? `${date}T09:00:00.000Z`,
    finishedAt: `${date}T09:25:00.000Z`,
    durationMinutes: minutes,
    phase: 'work',
    taskId: null,
    taskTitle: null,
  };
}

// 固定“今天”为 2026-11-18
const NOW = new Date(2026, 10, 18, 15, 0, 0);

describe('countOnDate / minutesOnDate / 分母为 0', () => {
  it('空记录全部返回 0', () => {
    expect(countOnDate([], '2026-11-18')).toBe(0);
    expect(minutesOnDate([], '2026-11-18')).toBe(0);
    expect(todayStats([], NOW)).toEqual({ count: 0, minutes: 0 });
    expect(weekCount([], NOW)).toBe(0);
    expect(totalFocusMinutes([])).toBe(0);
    expect(currentStreak([], NOW)).toBe(0);
  });

  it('按 date 字段聚合', () => {
    const records = [rec('2026-11-18'), rec('2026-11-18'), rec('2026-11-17')];
    expect(countOnDate(records, '2026-11-18')).toBe(2);
    expect(minutesOnDate(records, '2026-11-18')).toBe(50);
  });
});

describe('跨午夜按开始日归属', () => {
  it('23:50 开始的记录归到开始日', () => {
    // startedAt 23:50 前一日，finishedAt 跨零点；date 字段为开始日
    const r = rec('2026-11-17', 25, '2026-11-17T23:50:00');
    const records = [r];
    expect(countOnDate(records, '2026-11-17')).toBe(1);
    expect(countOnDate(records, '2026-11-18')).toBe(0);
    expect(todayStats(records, NOW).count).toBe(0);
  });
});

describe('currentStreak 连续/断天', () => {
  it('连续多天计数', () => {
    const records = [rec('2026-11-18'), rec('2026-11-17'), rec('2026-11-16')];
    expect(currentStreak(records, NOW)).toBe(3);
  });

  it('中间断一天后只数最近连续段', () => {
    const records = [rec('2026-11-18'), rec('2026-11-16'), rec('2026-11-15')];
    expect(currentStreak(records, NOW)).toBe(1);
  });

  it('今天无记录但昨天有：仍计入', () => {
    const records = [rec('2026-11-17'), rec('2026-11-16')];
    expect(currentStreak(records, NOW)).toBe(2);
  });

  it('最近记录早于昨天：归零', () => {
    const records = [rec('2026-11-15'), rec('2026-11-14')];
    expect(currentStreak(records, NOW)).toBe(0);
  });
});

describe('周聚合与格式化', () => {
  it('weekCount 统计最近 7 天', () => {
    const records = [rec('2026-11-18'), rec('2026-11-12'), rec('2026-11-11')];
    expect(weekCount(records, NOW)).toBe(2); // 11-11 在 7 天窗口外
  });

  it('aggregateLastDays 补 0 且升序', () => {
    const days = aggregateLastDays([rec('2026-11-18')], 3, NOW);
    expect(days.map((d) => d.date)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18']);
    expect(days[2].count).toBe(1);
    expect(days[0].count).toBe(0);
  });

  it('formatMinutes', () => {
    expect(formatMinutes(0)).toBe('0 分钟');
    expect(formatMinutes(45)).toBe('45 分钟');
    expect(formatMinutes(90)).toBe('1 小时 30 分');
    expect(formatMinutes(120)).toBe('2 小时');
  });
});