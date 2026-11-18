import { memo } from 'react';
import { useNoticeStore } from '../store/useNoticeStore';

function ReminderModalInner() {
  const notice = useNoticeStore((s) => s.notice);
  const dismiss = useNoticeStore((s) => s.dismiss);
  if (!notice) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      aria-label={notice.title}
    >
      <div className="w-full max-w-sm rounded-md border border-line bg-card p-6 text-center shadow-card">
        <h2 className="text-lg font-semibold text-ink">{notice.title}</h2>
        <p className="mt-2 text-sm text-muted">{notice.body}</p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-5 h-12 w-full rounded-md bg-primary text-base font-semibold text-white shadow-primary transition-colors hover:bg-primary-hover"
        >
          知道了
        </button>
      </div>
    </div>
  );
}

export const ReminderModal = memo(ReminderModalInner);
ReminderModal.displayName = 'ReminderModal';
