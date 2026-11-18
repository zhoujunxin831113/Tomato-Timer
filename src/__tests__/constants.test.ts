import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DAILY_GOAL,
  DEFAULT_LONG_BREAK_INTERVAL,
  DEFAULT_LONG_BREAK_MINUTES,
  DEFAULT_SETTINGS,
  DEFAULT_SHORT_BREAK_MINUTES,
  DEFAULT_WORK_MINUTES,
  RANGE_WORK_MINUTES,
  STATE_VERSION,
  STORAGE_KEY,
} from '../constants';

describe('constants', () => {
  it('默认时长与 PRD 一致', () => {
    expect(DEFAULT_WORK_MINUTES).toBe(25);
    expect(DEFAULT_SHORT_BREAK_MINUTES).toBe(5);
    expect(DEFAULT_LONG_BREAK_MINUTES).toBe(15);
    expect(DEFAULT_LONG_BREAK_INTERVAL).toBe(4);
    expect(DEFAULT_DAILY_GOAL).toBe(8);
  });

  it('数值范围符合 PRD 2.2', () => {
    expect(RANGE_WORK_MINUTES).toEqual({ min: 1, max: 180 });
    expect(DEFAULT_SETTINGS.theme).toBe('system');
  });

  it('持久化键与版本固定', () => {
    expect(STORAGE_KEY).toBe('pomodoro.state.v1');
    expect(STATE_VERSION).toBe(1);
  });
});
