import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  RANGE_BREAK_MINUTES,
  RANGE_DAILY_GOAL,
  RANGE_LONG_BREAK_INTERVAL,
  RANGE_WORK_MINUTES,
  STATE_VERSION,
  STORAGE_KEY,
} from '../constants';
import { useSettingsStore } from '../store/useSettingsStore';

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS } });
});

describe('update + clamp', () => {
  it('合法 patch 即时生效', () => {
    useSettingsStore.getState().update({ workMinutes: 45, autoCycle: true });
    const s = useSettingsStore.getState().settings;
    expect(s.workMinutes).toBe(45);
    expect(s.autoCycle).toBe(true);
  });

  it('越界数值被 clamp 到范围', () => {
    const { update } = useSettingsStore.getState();
    update({ workMinutes: 999 });
    expect(useSettingsStore.getState().settings.workMinutes).toBe(RANGE_WORK_MINUTES.max);
    update({ workMinutes: 0 });
    expect(useSettingsStore.getState().settings.workMinutes).toBe(RANGE_WORK_MINUTES.min);
    update({ shortBreakMinutes: 999 });
    expect(useSettingsStore.getState().settings.shortBreakMinutes).toBe(RANGE_BREAK_MINUTES.max);
    update({ longBreakInterval: 0 });
    expect(useSettingsStore.getState().settings.longBreakInterval).toBe(
      RANGE_LONG_BREAK_INTERVAL.min,
    );
    update({ dailyGoal: 999 });
    expect(useSettingsStore.getState().settings.dailyGoal).toBe(RANGE_DAILY_GOAL.max);
  });

  it('非法值（NaN / 非法枚举）回落为合法值', () => {
    const { update } = useSettingsStore.getState();
    update({ workMinutes: Number.NaN });
    const s = useSettingsStore.getState().settings;
    expect(Number.isFinite(s.workMinutes)).toBe(true);
    expect(s.workMinutes).toBeGreaterThanOrEqual(RANGE_WORK_MINUTES.min);
    update({ soundType: 'invalid' as never, theme: 'neon' as never });
    const s2 = useSettingsStore.getState().settings;
    expect(['chime', 'bell', 'beep']).toContain(s2.soundType);
    expect(['light', 'dark', 'system']).toContain(s2.theme);
  });

  it('reset 恢复默认', () => {
    useSettingsStore.getState().update({ workMinutes: 90 });
    useSettingsStore.getState().reset();
    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('persistence', () => {
  it('update 后写入 pomodoro.state.v1，重新加载保留', async () => {
    useSettingsStore.getState().update({ workMinutes: 50, dailyGoal: 10 });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const doc = JSON.parse(raw as string) as {
      version: number;
      settings: { workMinutes: number; dailyGoal: number };
    };
    expect(doc.version).toBe(STATE_VERSION);
    expect(doc.settings.workMinutes).toBe(50);
    expect(doc.settings.dailyGoal).toBe(10);

    // 模拟刷新：清空内存态后从存储恢复
    const { loadPersistedState } = await import('../lib/storage');
    const restored = loadPersistedState();
    expect(restored.settings.workMinutes).toBe(50);
    expect(restored.settings.dailyGoal).toBe(10);
  });
});
