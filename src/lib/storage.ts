import {
  DEFAULT_SETTINGS,
  RANGE_BREAK_MINUTES,
  RANGE_DAILY_GOAL,
  RANGE_LONG_BREAK_INTERVAL,
  RANGE_WORK_MINUTES,
  STATE_VERSION,
  STORAGE_KEY,
} from '../constants';
import type {
  PersistedState,
  Phase,
  SessionRecord,
  Settings,
  Task,
  TimerState,
  TimerStatus,
} from '../types';
import { isValidISODateString, parseLocalDateString } from './date';
import { clampMinutes, phaseDurationMs } from './timer';

const BROKEN_KEY_PREFIX = 'pomodoro.state.broken.';
const PHASES: readonly Phase[] = ['work', 'shortBreak', 'longBreak'];
const STATUSES: readonly TimerStatus[] = ['idle', 'running', 'paused', 'finished'];
const SOUND_TYPES: readonly Settings['soundType'][] = ['chime', 'bell', 'beep'];
const THEMES: readonly Settings['theme'][] = ['light', 'dark', 'system'];

export function isPhase(v: unknown): v is Phase {
  return typeof v === 'string' && (PHASES as readonly string[]).includes(v);
}

export function isTimerStatus(v: unknown): v is TimerStatus {
  return typeof v === 'string' && (STATUSES as readonly string[]).includes(v);
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v)
    ? clampMinutes(v, min, max)
    : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;
}

/** 缺失字段回落默认、越界 clamp；供存储解码与 settingsStore 共用 */
export function sanitizeSettings(raw: unknown): Settings {
  const s = (raw ?? {}) as Record<string, unknown>;
  return {
    workMinutes: num(s.workMinutes, DEFAULT_SETTINGS.workMinutes, RANGE_WORK_MINUTES.min, RANGE_WORK_MINUTES.max),
    shortBreakMinutes: num(
      s.shortBreakMinutes,
      DEFAULT_SETTINGS.shortBreakMinutes,
      RANGE_BREAK_MINUTES.min,
      RANGE_BREAK_MINUTES.max,
    ),
    longBreakMinutes: num(
      s.longBreakMinutes,
      DEFAULT_SETTINGS.longBreakMinutes,
      RANGE_BREAK_MINUTES.min,
      RANGE_BREAK_MINUTES.max,
    ),
    longBreakInterval: num(
      s.longBreakInterval,
      DEFAULT_SETTINGS.longBreakInterval,
      RANGE_LONG_BREAK_INTERVAL.min,
      RANGE_LONG_BREAK_INTERVAL.max,
    ),
    autoCycle: bool(s.autoCycle, DEFAULT_SETTINGS.autoCycle),
    soundEnabled: bool(s.soundEnabled, DEFAULT_SETTINGS.soundEnabled),
    soundType: oneOf(s.soundType, SOUND_TYPES, DEFAULT_SETTINGS.soundType),
    notificationEnabled: bool(s.notificationEnabled, DEFAULT_SETTINGS.notificationEnabled),
    dailyGoal: num(s.dailyGoal, DEFAULT_SETTINGS.dailyGoal, RANGE_DAILY_GOAL.min, RANGE_DAILY_GOAL.max),
    theme: oneOf(s.theme, THEMES, DEFAULT_SETTINGS.theme),
  };
}

function sanitizeTimer(raw: unknown, settings: Settings): TimerState {
  const t = (raw ?? {}) as Record<string, unknown>;
  const phase = isPhase(t.phase) ? t.phase : 'work';
  const fallbackRemaining = phaseDurationMs(phase, settings);
  let status: TimerStatus = isTimerStatus(t.status) ? t.status : 'idle';
  let endTimestamp: number | null = null;
  let remainingMs = num(t.remainingMs, fallbackRemaining, 0, Number.MAX_SAFE_INTEGER);

  if (status === 'running') {
    if (typeof t.endTimestamp === 'number' && Number.isFinite(t.endTimestamp)) {
      endTimestamp = t.endTimestamp;
    } else {
      // running 但缺少有效时间戳：降级为 paused，避免破坏不变量
      status = 'paused';
      remainingMs = fallbackRemaining;
    }
  }
  if (status !== 'running') {
    endTimestamp = null;
  }
  const completedInCycle =
    typeof t.completedInCycle === 'number' && Number.isFinite(t.completedInCycle)
      ? Math.max(0, Math.floor(t.completedInCycle))
      : 0;
  const startedAt =
    typeof t.startedAt === 'number' && Number.isFinite(t.startedAt) ? t.startedAt : null;

  return { status, phase, remainingMs, endTimestamp, completedInCycle, startedAt };
}

function sanitizeRecord(raw: unknown): SessionRecord | null {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== 'object') return null;
  if (typeof r.id !== 'string' || r.id.length === 0) return null;
  if (typeof r.date !== 'string' || !parseLocalDateString(r.date)) return null;
  if (!isValidISODateString(r.startedAt) || !isValidISODateString(r.finishedAt)) return null;
  if (typeof r.durationMinutes !== 'number' || !Number.isFinite(r.durationMinutes) || r.durationMinutes <= 0) {
    return null;
  }
  if (!isPhase(r.phase)) return null;
  return {
    id: r.id,
    date: r.date,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    durationMinutes: r.durationMinutes,
    phase: r.phase,
    taskId: typeof r.taskId === 'string' ? r.taskId : null,
    taskTitle: typeof r.taskTitle === 'string' ? r.taskTitle : null,
  };
}

function sanitizeTask(raw: unknown): Task | null {
  const t = raw as Record<string, unknown> | null;
  if (!t || typeof t !== 'object') return null;
  if (typeof t.id !== 'string' || t.id.length === 0) return null;
  if (typeof t.title !== 'string') return null;
  const title = t.title.trim();
  if (title.length === 0 || title.length > 100) return null;
  if (!isValidISODateString(t.createdAt)) return null;
  const completed = t.completed === true;
  const completedAt = completed
    ? isValidISODateString(t.completedAt)
      ? t.completedAt
      : t.createdAt
    : null;
  return { id: t.id, title, completed, createdAt: t.createdAt, completedAt };
}

export function createDefaultTimerState(settings: Settings = DEFAULT_SETTINGS): TimerState {
  return {
    status: 'idle',
    phase: 'work',
    remainingMs: phaseDurationMs('work', settings),
    endTimestamp: null,
    completedInCycle: 0,
    startedAt: null,
  };
}

export function createDefaultPersistedState(): PersistedState {
  return {
    version: STATE_VERSION,
    timer: createDefaultTimerState(),
    settings: { ...DEFAULT_SETTINGS },
    records: [],
    tasks: [],
  };
}

/** version 链式迁移；当前仅 v1，低于 1 视为不可迁移 */
const MIGRATIONS: Record<number, (data: unknown) => unknown> = {};

export type ParseStatus = 'ok' | 'missing' | 'corrupt';

export interface ParseResult {
  state: PersistedState;
  status: ParseStatus;
}

function assembleState(data: Record<string, unknown>): PersistedState {
  const settings = sanitizeSettings(data.settings);
  return {
    version: STATE_VERSION,
    timer: sanitizeTimer(data.timer, settings),
    settings,
    records: Array.isArray(data.records)
      ? data.records.map(sanitizeRecord).filter((r): r is SessionRecord => r !== null)
      : [],
    tasks: Array.isArray(data.tasks)
      ? data.tasks.map(sanitizeTask).filter((t): t is Task => t !== null)
      : [],
  };
}

export function parsePersistedState(raw: string | null): ParseResult {
  if (raw === null || raw === '') {
    return { state: createDefaultPersistedState(), status: 'missing' };
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { state: createDefaultPersistedState(), status: 'corrupt' };
  }
  if (!json || typeof json !== 'object') {
    return { state: createDefaultPersistedState(), status: 'corrupt' };
  }
  const version = (json as Record<string, unknown>).version;
  if (typeof version !== 'number') {
    return { state: createDefaultPersistedState(), status: 'corrupt' };
  }
  if (version > STATE_VERSION) {
    return { state: createDefaultPersistedState(), status: 'corrupt' };
  }
  let data: unknown = json;
  let v = version;
  while (v < STATE_VERSION) {
    const migrate = MIGRATIONS[v];
    if (!migrate) return { state: createDefaultPersistedState(), status: 'corrupt' };
    data = migrate(data);
    v += 1;
  }
  if (!data || typeof data !== 'object') {
    return { state: createDefaultPersistedState(), status: 'corrupt' };
  }
  return { state: assembleState(data as Record<string, unknown>), status: 'ok' };
}

// ---- localStorage 读写（全链路 try/catch；损坏备份；配额/隐私模式降级内存态）----

let memoryDoc: PersistedState | null = null;
let storagePersistent = true;

export function isStoragePersistent(): boolean {
  return storagePersistent;
}

export function loadPersistedState(): PersistedState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    storagePersistent = false;
    memoryDoc ??= createDefaultPersistedState();
    return memoryDoc;
  }
  const parsed = parsePersistedState(raw);
  if (parsed.status === 'corrupt' && raw !== null) {
    try {
      localStorage.setItem(`${BROKEN_KEY_PREFIX}${Date.now()}`, raw);
    } catch {
      storagePersistent = false;
    }
    memoryDoc = createDefaultPersistedState();
    return memoryDoc;
  }
  if (parsed.status === 'missing') {
    memoryDoc = parsed.state;
    return parsed.state;
  }
  memoryDoc = parsed.state;
  return parsed.state;
}

export function savePersistedState(state: PersistedState): boolean {
  memoryDoc = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storagePersistent = true;
    return true;
  } catch {
    storagePersistent = false;
    return false;
  }
}

/** Zustand persist 用的 StateStorage 适配器：把各 store 的 slice 合并进单键文档 */
export interface SliceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createSliceStorage<S>(
  read: (doc: PersistedState) => S,
  write: (doc: PersistedState, slice: S) => void,
  fallback: () => S,
): SliceStorage {
  return {
    getItem() {
      const doc = loadPersistedState();
      return JSON.stringify({ state: read(doc), version: STATE_VERSION });
    },
    setItem(_key, value) {
      let slice: S;
      try {
        const parsed = JSON.parse(value) as { state?: S };
        slice = parsed.state ?? fallback();
      } catch {
        slice = fallback();
      }
      const doc = loadPersistedState();
      write(doc, slice);
      savePersistedState(doc);
    },
    removeItem() {
      const doc = loadPersistedState();
      write(doc, fallback());
      savePersistedState(doc);
    },
  };
}
