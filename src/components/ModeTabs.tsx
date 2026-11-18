import { memo } from 'react';
import { PHASE_LABELS, PHASE_ORDER } from '../constants';
import { useTimerStore } from '../store/useTimerStore';
import type { Phase } from '../types';

function ModeTabsInner() {
  const phase = useTimerStore((s) => s.phase);
  const status = useTimerStore((s) => s.status);
  const selectPhase = useTimerStore((s) => s.selectPhase);
  const isRunning = status === 'running';

  return (
    <div role="tablist" aria-label="计时模式" className="flex rounded-md bg-line/60 p-1">
      {PHASE_ORDER.map((p: Phase) => {
        const active = p === phase;
        return (
          <button
            key={p}
            role="tab"
            aria-selected={active}
            disabled={isRunning}
            onClick={() => selectPhase(p)}
            className={`min-h-[44px] flex-1 rounded-sm px-4 text-sm font-medium transition-colors ${
              active
                ? 'bg-card text-ink shadow-card'
                : 'text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-60'
            }`}
          >
            {PHASE_LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}

export const ModeTabs = memo(ModeTabsInner);
ModeTabs.displayName = 'ModeTabs';
