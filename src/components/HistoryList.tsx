import { memo } from 'react';
import { PHASE_LABELS } from '../constants';
import { useStatsStore } from '../store/useStatsStore';
import type { SessionRecord } from '../types';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function HistoryItem({ record }: { record: SessionRecord }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-sm border border-line bg-card px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-ink">
          {record.taskTitle ?? PHASE_LABELS[record.phase]}
        </div>
        <div className="text-xs text-muted">
          {record.date} {formatTime(record.startedAt)}–{formatTime(record.finishedAt)}
        </div>
      </div>
      <div className="shrink-0 text-sm tabular-nums text-muted">{record.durationMinutes} 分钟</div>
    </li>
  );
}

function HistoryListInner() {
  const records = useStatsStore((s) => s.records);
  if (records.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">暂无记录，完成一个番茄后会显示在这里</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {records.map((r) => (
        <HistoryItem key={r.id} record={r} />
      ))}
    </ul>
  );
}

export const HistoryList = memo(HistoryListInner);
HistoryList.displayName = 'HistoryList';