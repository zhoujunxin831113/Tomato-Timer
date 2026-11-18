import { memo } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { initAudio } from '../services/audio';
import { requestNotificationPermission } from '../services/notification';
import { useTimerStore } from '../store/useTimerStore';

function primeReminders(): void {
  initAudio();
  void requestNotificationPermission();
}

function ControlButtonsInner() {
  const status = useTimerStore((s) => s.status);
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const reset = useTimerStore((s) => s.reset);
  const skip = useTimerStore((s) => s.skip);

  const isRunning = status === 'running';
  const isIdle = status === 'idle';
  const primaryLabel = isRunning ? '暂停' : status === 'paused' ? '继续' : '开始';

  return (
    <div className="flex w-full max-w-md items-stretch gap-3">
      <button
        type="button"
        onClick={() => {
          if (!isRunning) primeReminders();
          if (isRunning) pause();
          else start();
        }}
        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-6 text-base font-semibold text-white shadow-primary transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {isRunning ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        {primaryLabel}
      </button>
      <button
        type="button"
        onClick={() => reset()}
        disabled={isIdle}
        aria-label="重置"
        className="flex h-12 min-w-[44px] items-center justify-center gap-2 rounded-md border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RotateCcw size={18} aria-hidden="true" />
        <span className="hidden sm:inline">重置</span>
      </button>
      <button
        type="button"
        onClick={() => skip()}
        disabled={isIdle}
        aria-label="跳过"
        className="flex h-12 min-w-[44px] items-center justify-center gap-2 rounded-md border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SkipForward size={18} aria-hidden="true" />
        <span className="hidden sm:inline">跳过</span>
      </button>
    </div>
  );
}

export const ControlButtons = memo(ControlButtonsInner);
ControlButtons.displayName = 'ControlButtons';