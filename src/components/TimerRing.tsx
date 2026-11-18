import { memo } from 'react';
import { formatCountdownMs } from '../lib/timer';
import type { TimerStatus } from '../types';

const SIZE = 320;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const LAST_SECONDS_MS = 10_000;

interface TimerRingProps {
  remainingMs: number;
  totalMs: number;
  status: TimerStatus;
}

function TimerRingInner({ remainingMs, totalMs, status }: TimerRingProps) {
  const progress = totalMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const isLastStretch = status === 'running' && remainingMs > 0 && remainingMs <= LAST_SECONDS_MS;
  const isFinished = status === 'finished';

  return (
    <div
      className={`relative aspect-square w-[min(320px,78vw)] ${
        isFinished ? 'animate-ring-complete' : ''
      }`}
      role="timer" aria-live="off"
      aria-label={`剩余 ${formatCountdownMs(remainingMs)}`}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90" aria-hidden="true">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-300 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`text-[clamp(4rem,15vw,6.5rem)] font-semibold tabular-nums leading-none ${
            isLastStretch || isFinished ? 'animate-pulse text-primary' : 'text-ink'
          }`}
        >
          {formatCountdownMs(remainingMs)}
        </span>
      </div>
    </div>
  );
}

export const TimerRing = memo(TimerRingInner);
TimerRing.displayName = 'TimerRing';
export type { TimerRingProps };
