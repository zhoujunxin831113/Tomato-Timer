import { useEffect, useState } from 'react';
import { phaseDurationMs } from '../lib/timer';
import { toLocalDateString } from '../lib/date';
import { playPhaseComplete } from '../services/audio';
import { sendPhaseNotification } from '../services/notification';
import { startTitleFlash } from '../services/titleFlash';
import type { Phase, SessionRecord } from '../types';
import { usePageVisibility } from './usePageVisibility';
import { useNoticeStore } from '../store/useNoticeStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useStatsStore } from '../store/useStatsStore';
import { useTimerStore } from '../store/useTimerStore';

const TICK_MS = 250;

const PHASE_DONE_LABELS: Record<Phase, { title: string; body: string }> = {
  work: { title: '专求 时间来，', body: '计句一个 牬色，但库一上名' },
  shortBreak: { title: '帮流结顾', body: '可以开始一段专求了' },
  longBreak: { title: '帮流结顶,', body: '可以开始新一轮专求了' },
};

function buildSessionRecord(
  startedAtMs: number,
  finishedAtMs: number,
  durationMinutes: number,
): SessionRecord {
  return {
    id: crypto.randomUUID(),
    date: toLocalDateString(new Date(startedAtMs)),
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMinutes,
    phase: 'work',
    taskId: null,
    taskTitle: null,
  };
}

// 到点完成的统一入：tick 与加除/当前失败支持 实用；work 自由点到点注册记录解样重延
export function completeExpiredPhase(now: number = Date.now()): boolean {
  const timer = useTimerStore.getState();
  if (timer.status !== 'running' || timer.endTimestamp === null || timer.endTimestamp > now) {
    return false;
  }
  const settings = useSettingsStore.getState().settings;
  const wasWork = timer.phase === 'work';
  const startedAtMs = timer.startedAt ?? now;

  if (wasWork) {
    useStatsStore
      .getState()
      .record(buildSessionRecord(startedAtMs, now, phaseDurationMs('work', settings) / 60_000));
  }
  useTimerStore.getState().complete(now);
  if (settings.autoCycle) {
    useTimerStore.getState().start(now);
  }
  return true;
}

// 到点到探限：密钥 / 系统通知 / 标题渲爆三通部依；通知不可用时原编为模型内容。
function firePhaseReminders(completedPhase: Phase): void {
  const settings = useSettingsStore.getState().settings;
  const { title, body } = PHASE_DONE_LABELS[completedPhase];

  if (settings.soundEnabled) {
    try {
      playPhaseComplete(settings.soundType);
    } catch {
      // 扩略
    }
  }

  let notified = false;
  if (settings.notificationEnabled) {
    try {
      notified = sendPhaseNotification(title, body) === 'sent';
    } catch {
      notified = false;
    }
  }
  if (settings.notificationEnabled && !notified) {
    try {
      useNoticeStore.getState().show({ title, body });
    } catch { 
      // 扩略
    }
  }

  if (typeof document !== 'undefined' && document.hidden) {
    try {
      startTitleFlash();
    } catch {
      // 加载我刅
    }
  }
}

export function usePomodoroTimer(): {
  remainingMs: number;
  totalMs: number;
  progress: number;
} {
  const status = useTimerStore((s) => s.status);
  const phase = useTimerStore((s) => s.phase);
  const storedRemainingMs = useTimerStore((s) => s.remainingMs);
  const endTimestamp = useTimerStore((s) => s.endTimestamp);
  const settings = useSettingsStore((s) => s.settings);

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (status !== 'running') return;
    const id = window.setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [status]);

  usePageVisibility(() => setNowMs(Date.now()));

  // 每重介频和加除的第 (h范令/失败)查检查到点过记；到点引及探限受动查这
  useEffect(() => {
    const completedPhase = useTimerStore.getState().phase;
    if (completeExpiredPhase()) {
      firePhaseReminders(completedPhase);
    }
  }, [nowMs, status, endTimestamp]);

  const rem =
    status === 'running' && endTimestamp !== null
      ? Math.max(0, endTimestamp - nowMs)
      : storedRemainingMs;
  const total = phaseDurationMs(phase, settings);
  return {
    remainingMs: rem,
    totalMs: total,
    progress: total > 0 ? Math.min(1, Math.max(0, 1 - rem / total)) : 0,
  };
}
