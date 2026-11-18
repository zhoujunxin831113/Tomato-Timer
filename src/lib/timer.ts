import type { Phase, Settings, TimerState } from '../types';

export function clampMinutes(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function phaseDurationMs(phase: Phase, settings: Settings): number {
  const minutes =
    phase === 'work'
      ? settings.workMinutes
      : phase === 'shortBreak'
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes;
  return minutes * 60_000;
}

/** 运行中以 endTimestamp 差值为准（唯一真相），其余状态用 remainingMs */
export function remainingMs(timer: TimerState, now: number): number {
  if (timer.status === 'running' && timer.endTimestamp !== null) {
    return Math.max(0, timer.endTimestamp - now);
  }
  return Math.max(0, timer.remainingMs);
}

/**
 * 自然到点后的阶段推进：work 完成计数 +1，
 * 计数达到 interval 进长休，否则短休；长休结束回工作并归零。
 */
export function nextPhase(
  current: Phase,
  completedInCycle: number,
  interval: number,
): { phase: Phase; completedInCycle: number } {
  if (current === 'work') {
    const count = completedInCycle + 1;
    return {
      phase: count % interval === 0 ? 'longBreak' : 'shortBreak',
      completedInCycle: count,
    };
  }
  if (current === 'shortBreak') {
    return { phase: 'work', completedInCycle };
  }
  return { phase: 'work', completedInCycle: 0 };
}

/** 跳过当前阶段：不计数；跳过长休视为本轮结束，计数归零 */
export function phaseAfterSkip(
  current: Phase,
  completedInCycle: number,
): { phase: Phase; completedInCycle: number } {
  if (current === 'work') return { phase: 'shortBreak', completedInCycle };
  if (current === 'shortBreak') return { phase: 'work', completedInCycle };
  return { phase: 'work', completedInCycle: 0 };
}

/** 倒计时显示：不足 1 小时 mm:ss，超过显示 h:mm:ss */
export function formatCountdownMs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
