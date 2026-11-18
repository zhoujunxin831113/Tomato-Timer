import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_SETTINGS, STATE_VERSION, STORAGE_KEY } from '../constants';
import { nextPhase, phaseAfterSkip, phaseDurationMs } from '../lib/timer';
import { createDefaultTimerState, createSliceStorage } from '../lib/storage';
import type { PersistedState, Phase, TimerState } from '../types';
import { useSettingsStore } from './useSettingsStore';

type TimerSlice = TimerState;

const readSlice = (doc: PersistedState): TimerSlice => ({ ...doc.timer });
const writeSlice = (doc: PersistedState, slice: TimerSlice): void => {
  doc.timer = { ...slice };
};

interface TimerStore extends TimerState {
  start: (now?: number) => void;
  pause: (now?: number) => void;
  reset: () => void;
  skip: () => void;
  complete: (now?: number) => void;
  // 模式页签手动切换阶段：仅非 running 时生效，重置为该阶段满时长
  selectPhase: (phase: Phase) => void;
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      ...createDefaultTimerState(),

      // idle/paused/finished → running；finished 表示上阶段已自然到点、等待手动进入下一阶段
      start: (now = Date.now()) =>
        set((s) => {
          if (s.status === 'running') return {};
          const settings = useSettingsStore.getState().settings;
          const remaining =
            s.remainingMs > 0 ? s.remainingMs : phaseDurationMs(s.phase, settings);
          return {
            status: 'running',
            remainingMs: remaining,
            endTimestamp: now + remaining,
            startedAt: s.status === 'paused' && s.startedAt !== null ? s.startedAt : now,
          };
        }),

      pause: (now = Date.now()) =>
        set((s) => {
          if (s.status !== 'running' || s.endTimestamp === null) return {};
          return {
            status: 'paused',
            remainingMs: Math.max(0, s.endTimestamp - now),
            endTimestamp: null,
          };
        }),

      reset: () =>
        set(() => {
          const settings = useSettingsStore.getState().settings;
          const s = get();
          return {
            status: 'idle',
            remainingMs: phaseDurationMs(s.phase, settings),
            endTimestamp: null,
            startedAt: null,
          };
        }),

      // 跳过当前阶段：不计数、不生成记录
      skip: () =>
        set(() => {
          const s = get();
          if (s.status === 'idle') return {};
          const settings = useSettingsStore.getState().settings;
          const next = phaseAfterSkip(s.phase, s.completedInCycle);
          return {
            status: 'idle',
            phase: next.phase,
            completedInCycle: next.completedInCycle,
            remainingMs: phaseDurationMs(next.phase, settings),
            endTimestamp: null,
            startedAt: null,
          };
        }),

      // 仅 running 且已到点时生效；推进到下一阶段并停在 finished
      complete: (now = Date.now()) =>
        set(() => {
          const s = get();
          if (
            s.status !== 'running' ||
            s.endTimestamp === null ||
            s.endTimestamp > now
          ) {
            return {};
          }
          const settings = useSettingsStore.getState().settings;
          const next = nextPhase(s.phase, s.completedInCycle, settings.longBreakInterval);
          return {
            status: 'finished',
            phase: next.phase,
            completedInCycle: next.completedInCycle,
            remainingMs: phaseDurationMs(next.phase, settings),
            endTimestamp: null,
            startedAt: null,
          };
        }),

      // 页签切换：不计数不记录，直接选中目标阶段并回到 idle 满时长
      selectPhase: (phase) =>
        set((s) => {
          if (s.status === 'running') return {};
          const settings = useSettingsStore.getState().settings;
          return {
            status: 'idle',
            phase,
            remainingMs: phaseDurationMs(phase, settings),
            endTimestamp: null,
            startedAt: null,
          };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: STATE_VERSION,
      storage: createJSONStorage(() =>
        createSliceStorage<TimerSlice>(readSlice, writeSlice, () =>
          createDefaultTimerState(DEFAULT_SETTINGS),
        ),
      ),
      partialize: (s): TimerSlice => ({
        status: s.status,
        phase: s.phase,
        remainingMs: s.remainingMs,
        endTimestamp: s.endTimestamp,
        completedInCycle: s.completedInCycle,
        startedAt: s.startedAt,
      }),
    },
  ),
);

export type { TimerSlice };
