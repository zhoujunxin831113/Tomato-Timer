import { memo } from 'react';

interface SessionProgressProps {
  completed: number;
  total: number;
}

function SessionProgressInner({ completed, total }: SessionProgressProps) {
  const safeTotal = Math.max(1, total);
  const filled = Math.min(safeTotal, Math.max(0, completed));

  return (
    <div
      className="flex items-center gap-1.5 text-sm text-muted"
      role="img"
      aria-label={`本轮已完成 ${filled}/${safeTotal} 个番茄`}
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: safeTotal }, (_, i) => (
          <span
            key={i}
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              i < filled ? 'bg-primary' : 'border border-line bg-transparent'
            }`}
          />
        ))}
      </span>
      <span>
        {filled}/{safeTotal}
      </span>
    </div>
  );
}

export const SessionProgress = memo(SessionProgressInner);
SessionProgress.displayName = 'SessionProgress';
