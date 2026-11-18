import type { Phase, Settings } from '../types';

export const STORAGE_KEY = 'pomodoro.state.v1';
export const STATE_VERSION = 1;

export const DEFAULT_WORK_MINUTES = 25;
export const DEFAULT_SHORT_BREAK_MINUTES = 5;
export const DEFAULT_LONG_BREAK_MINUTES = 15;
export const DEFAULT_LONG_BREAK_INTERVAL = 4;
export const DEFAULT_DAILY_GOAL = 8;

export const RANGE_WORK_MINUTES = { min: 1, max: 180 } as const;
export const RANGE_BREAK_MINUTES = { min: 1, max: 60 } as const;
export const RANGE_LONG_BREAK_INTERVAL = { min: 1, max: 12 } as const;
export const RANGE_DAILY_GOAL = { min: 1, max: 50 } as const;

export const PHASE_ORDER: readonly Phase[] = ['work', 'shortBreak', 'longBreak'];

export const PHASE_LABELS: Record<Phase, string> = {
  work: '专注',
  shortBreak: '短休',
  longBreak: '长休',
};

/** 各阶段主色与 hover 色（PRD 4.2），运行时经 CSS 变量注入 */
export const PHASE_COLORS: Record<Phase, { primary: string; hover: string }> = {
  work: { primary: '#EF4444', hover: '#DC2626' },
  shortBreak: { primary: '#10B981', hover: '#059669' },
  longBreak: { primary: '#3B82F6', hover: '#2563EB' },
};

export const DEFAULT_SETTINGS: Settings = {
  workMinutes: DEFAULT_WORK_MINUTES,
  shortBreakMinutes: DEFAULT_SHORT_BREAK_MINUTES,
  longBreakMinutes: DEFAULT_LONG_BREAK_MINUTES,
  longBreakInterval: DEFAULT_LONG_BREAK_INTERVAL,
  autoCycle: false,
  soundEnabled: true,
  soundType: 'chime',
  notificationEnabled: true,
  dailyGoal: DEFAULT_DAILY_GOAL,
  theme: 'system',
};
