import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { PHASE_COLORS, PHASE_LABELS } from './constants';
import { toLocalDateString } from './lib/date';
import { usePomodoroTimer } from './hooks/usePomodoroTimer';
import { useSettingsStore } from './store/useSettingsStore';
import { useStatsStore } from './store/useStatsStore';
import { useTimerStore } from './store/useTimerStore';
import { ControlButtons } from './components/ControlButtons';
import { ModeTabs } from './components/ModeTabs';
import { SessionProgress } from './components/SessionProgress';
import { SettingsPanel } from './components/SettingsPanel';
import { HistoryList } from './components/HistoryList';
import { ReminderModal } from './components/ReminderModal';
import { StatsCards } from './components/StatsCards';
import { TimerRing } from './components/TimerRing';
import type { Phase } from './types';

type View = 'timer' | 'stats' | 'settings';

const VIEW_LABELS: Record<View, string> = {
  timer: '计时',
  stats: '统计',
  settings: '设置',
};

const VIEWS: readonly View[] = ['timer', 'stats', 'settings'];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 主题应用：light/dark 直接设置 data-theme；system 跟随系统并监听变化
function useTheme(theme: 'light' | 'dark' | 'system'): void {
  useEffect(() => {
    const root = document.documentElement;
    if (theme !== 'system') {
      root.dataset.theme = theme;
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (dark: boolean) => {
      root.dataset.theme = dark ? 'dark' : 'light';
    };
    apply(mq.matches);
    const onChange = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);
}

function TimerPage() {
  const phase = useTimerStore((s) => s.phase);
  const status = useTimerStore((s) => s.status);
  const completedInCycle = useTimerStore((s) => s.completedInCycle);
  const settings = useSettingsStore((s) => s.settings);
  const records = useStatsStore((s) => s.records);
  const { remainingMs, totalMs } = usePomodoroTimer();

  const todayCount = useMemo(() => {
    const today = toLocalDateString(new Date());
    return records.filter((r) => r.date === today).length;
  }, [records]);

  const colors = PHASE_COLORS[phase];
  const phaseStyle = {
    '--color-primary': colors.primary,
    '--color-primary-hover': colors.hover,
    '--shadow-primary': `0 4px 12px ${hexToRgba(colors.primary, 0.28)}`,
  } as CSSProperties;

  return (
    <div style={phaseStyle} className="flex flex-1 flex-col items-center gap-6 py-8">
      <ModeTabs />

      <div className="flex w-full max-w-md flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>
          今日番茄 {todayCount}/{settings.dailyGoal}
        </span>
        <SessionProgress completed={completedInCycle} total={settings.longBreakInterval} />
      </div>

      <TimerRing remainingMs={remainingMs} totalMs={totalMs} status={status} />

      <p className="text-sm text-muted">{PHASE_LABELS[phase as Phase]}</p>

      <ControlButtons />
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('timer');
  const theme = useSettingsStore((s) => s.settings.theme);
  useTheme(theme);

  return (
    <main className="min-h-screen bg-page text-ink [padding-bottom:env(safe-area-inset-bottom)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[720px] flex-col px-4 md:max-w-[560px] lg:max-w-[720px]">
        <header className="flex items-center justify-between py-4">
          <h1 className="text-lg font-semibold">番茄钟</h1>
          <nav className="flex gap-1 rounded-md bg-line/60 p-1" aria-label="视图切换">
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-current={view === v ? 'page' : undefined}
                className={`min-h-[44px] rounded-sm px-4 text-sm font-medium transition-colors ${
                  view === v ? 'bg-card text-ink shadow-card' : 'text-muted hover:text-ink'
                }`}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </nav>
        </header>

        {view === 'timer' && <TimerPage />}
        {view === 'stats' && (
          <div className="flex flex-1 flex-col gap-6 py-6">
            <StatsCards />
            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink">历史记录</h2>
              <HistoryList />
            </section>
          </div>
        )}
        {view === 'settings' && <SettingsPanel />}
            </div>
      <ReminderModal />
    </main>
  );
}
