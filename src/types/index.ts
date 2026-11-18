export type Phase = 'work' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

/** 计时器运行时状态（部分字段持久化，用于刷新恢复） */
export interface TimerState {
  status: TimerStatus;
  phase: Phase;
  remainingMs: number;
  endTimestamp: number | null;
  completedInCycle: number;
  startedAt: number | null;
}

export interface Settings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoCycle: boolean;
  soundEnabled: boolean;
  soundType: 'chime' | 'bell' | 'beep';
  notificationEnabled: boolean;
  dailyGoal: number;
  theme: 'light' | 'dark' | 'system';
}

/** 一条完成的番茄记录（仅 work 阶段自然到点时生成） */
export interface SessionRecord {
  id: string;
  date: string;
  startedAt: string;
  finishedAt: string;
  durationMinutes: number;
  phase: Phase;
  taskId: string | null;
  taskTitle: string | null;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface PersistedState {
  version: number;
  timer: TimerState;
  settings: Settings;
  records: SessionRecord[];
  tasks: Task[];
}
