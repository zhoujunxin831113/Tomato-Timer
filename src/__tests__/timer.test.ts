import { describe, expect, it } from 'vitest';
import {
  clampMinutes,
  formatCountdownMs,
  nextPhase,
  phaseAfterSkip,
  phaseDurationMs,
  remainingMs,
} from '../lib/timer';
import { DEFAULT_SETTINGS } from '../constants';
import type { TimerState } from '../types';

const baseTimer: TimerState = {
  status: 'idle',
  phase: 'work',
  remainingMs: 1_500_000,
  endTimestamp: null,
  completedInCycle: 0,
  startedAt: null,
};

describe('remainingMs（时间戳方案）', () => {
  it('运行中剩余 = endTimestamp - now，后台 5 分钟返回误差 ≤1s', () => {
    const now = 1_000_000;
    const timer: TimerState = { ...baseTimer, status: 'running', endTimestamp: now + 300_000 };
    expect(remainingMs(timer, now)).toBe(300_000);
    // 模拟后台 5 分钟：真实经过 300s，剩余精确归零
    expect(remainingMs(timer, now + 300_000)).toBe(0);
    expect(remainingMs(timer, now + 299_000)).toBe(1_000);
    expect(remainingMs(timer, now + 299_999)).toBe(1);
  });

  it('非 running 状态使用 remainingMs', () => {
    expect(remainingMs({ ...baseTimer, status: 'paused' }, now0())).toBe(1_500_000);
    expect(remainingMs({ ...baseTimer, status: 'finished' }, now0())).toBe(1_500_000);
  });
});

function now0(): number {
  return 2_000_000;
}

describe('nextPhase（自然到点推进）', () => {
  it('work → shortBreak，计数 +1', () => {
    expect(nextPhase('work', 0, 4)).toEqual({ phase: 'shortBreak', completedInCycle: 1 });
  });

  it('第 interval 个 work → longBreak', () => {
    expect(nextPhase('work', 3, 4)).toEqual({ phase: 'longBreak', completedInCycle: 4 });
  });

  it('longBreak → work 且计数归零', () => {
    expect(nextPhase('longBreak', 4, 4)).toEqual({ phase: 'work', completedInCycle: 0 });
  });

  it('shortBreak → work，计数保留', () => {
    expect(nextPhase('shortBreak', 2, 4)).toEqual({ phase: 'work', completedInCycle: 2 });
  });
});

describe('phaseAfterSkip（跳过不计）', () => {
  it('work → shortBreak，计数不变', () => {
    expect(phaseAfterSkip('work', 2)).toEqual({ phase: 'shortBreak', completedInCycle: 2 });
  });

  it('longBreak → work 归零', () => {
    expect(phaseAfterSkip('longBreak', 4)).toEqual({ phase: 'work', completedInCycle: 0 });
  });
});

describe('clampMinutes / phaseDurationMs', () => {
  it('越界 clamp、非数字回落下限', () => {
    expect(clampMinutes(0, 1, 180)).toBe(1);
    expect(clampMinutes(999, 1, 180)).toBe(180);
    expect(clampMinutes(Number.NaN, 1, 180)).toBe(1);
    expect(clampMinutes(25.6, 1, 180)).toBe(26);
  });

  it('各阶段时长来自 settings', () => {
    expect(phaseDurationMs('work', DEFAULT_SETTINGS)).toBe(1_500_000);
    expect(phaseDurationMs('shortBreak', DEFAULT_SETTINGS)).toBe(300_000);
    expect(phaseDurationMs('longBreak', DEFAULT_SETTINGS)).toBe(900_000);
  });
});

describe('formatCountdownMs', () => {
  it('不足 1 小时显示 mm:ss', () => {
    expect(formatCountdownMs(1_500_000)).toBe('25:00');
    expect(formatCountdownMs(65_000)).toBe('01:05');
    expect(formatCountdownMs(999)).toBe('00:01');
    expect(formatCountdownMs(0)).toBe('00:00');
  });

  it('超过 1 小时显示 h:mm:ss', () => {
    expect(formatCountdownMs(3_725_000)).toBe('1:02:05');
  });
});
