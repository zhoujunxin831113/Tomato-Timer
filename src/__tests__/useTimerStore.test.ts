import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, STATE_VERSION, STORAGE_KEY } from '../constants';
import { createDefaultTimerState } from '../lib/storage';
import { phaseDurationMs } from '../lib/timer';
import { useSettingsStore } from '../store/useSettingsStore';
import { useStatsStore } from '../store/useStatsStore';
import { useTimerStore } from '../store/useTimerStore';

const NOW = 10_000_000;

function resetStores(): void {
  localStorage.clear();
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS } });
  useStatsStore.setState({ records: [], tasks: [] });
  useTimerStore.setState({ ...createDefaultTimerState(), status: 'idle' });
}

function forceRunning(endTimestamp: number): void {
  useTimerStore.setState({
    status: 'running',
    phase: 'work',
    remainingMs: 0,
    endTimestamp,
    completedInCycle: 0,
    startedAt: NOW - 1_500_000,
  });
}

beforeEach(resetStores);

describe('state machine transitions', () => {
  it('start: idle to running, endTimestamp = now + remaining', () => {
    useTimerStore.getState().start(NOW);
    const t = useTimerStore.getState();
    expect(t.status).toBe('running');
    expect(t.endTimestamp).toBe(NOW + t.remainingMs);
    expect(t.startedAt).toBe(NOW);
  });

  it('pause: running to paused, keeps remaining and clears endTimestamp', () => {
    forceRunning(NOW + 60_000);
    useTimerStore.getState().pause(NOW + 10_000);
    const t = useTimerStore.getState();
    expect(t.status).toBe('paused');
    expect(t.remainingMs).toBe(50_000);
    expect(t.endTimestamp).toBeNull();
  });

  it('start after pause resumes with same remaining', () => {
    forceRunning(NOW + 60_000);
    useTimerStore.getState().pause(NOW + 10_000);
    useTimerStore.getState().start(NOW + 20_000);
    const t = useTimerStore.getState();
    expect(t.status).toBe('running');
    expect(t.endTimestamp).toBe(NOW + 20_000 + 50_000);
    expect(t.startedAt).toBe(NOW - 1_500_000);
  });

  it('illegal transitions are ignored', () => {
    useTimerStore.getState().complete(NOW);
    useTimerStore.getState().pause(NOW);
    expect(useTimerStore.getState().status).toBe('idle');

    forceRunning(NOW + 60_000);
    const endTs = useTimerStore.getState().endTimestamp;
    useTimerStore.getState().start(NOW);
    expect(useTimerStore.getState().endTimestamp).toBe(endTs);
  });

  it('complete before endTimestamp is ignored', () => {
    forceRunning(NOW + 60_000);
    useTimerStore.getState().complete(NOW);
    expect(useTimerStore.getState().status).toBe('running');
  });
});

describe('skip / reset do not count', () => {
  it('skip advances phase without counting or recording', () => {
    forceRunning(NOW + 60_000);
    useTimerStore.getState().skip();
    const t = useTimerStore.getState();
    expect(t.status).toBe('idle');
    expect(t.phase).toBe('shortBreak');
    expect(t.completedInCycle).toBe(0);
    expect(useStatsStore.getState().records).toHaveLength(0);
  });

  it('reset returns to idle with full duration, no record', () => {
    forceRunning(NOW + 60_000);
    useTimerStore.getState().reset();
    const t = useTimerStore.getState();
    expect(t.status).toBe('idle');
    expect(t.phase).toBe('work');
    expect(t.remainingMs).toBe(phaseDurationMs('work', DEFAULT_SETTINGS));
    expect(t.startedAt).toBeNull();
    expect(useStatsStore.getState().records).toHaveLength(0);
  });
});

describe('natural completion and long break cycle', () => {
  it('work completes to finished + shortBreak + count 1', () => {
    forceRunning(NOW + 60_000);
    useTimerStore.getState().complete(NOW + 60_000);
    const t = useTimerStore.getState();
    expect(t.status).toBe('finished');
    expect(t.phase).toBe('shortBreak');
    expect(t.completedInCycle).toBe(1);
    expect(t.remainingMs).toBe(phaseDurationMs('shortBreak', DEFAULT_SETTINGS));
  });

  it('4 work completions lead to longBreak, then back to work with count reset', () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, longBreakInterval: 4 },
    });
    for (let i = 0; i < 4; i++) {
      forceRunning(NOW + 1);
      useTimerStore.setState({ completedInCycle: i });
      useTimerStore.getState().complete(NOW + 1);
    }
    expect(useTimerStore.getState().phase).toBe('longBreak');
    expect(useTimerStore.getState().completedInCycle).toBe(4);

    useTimerStore.setState({ phase: 'longBreak', status: 'running', endTimestamp: NOW + 1 });
    useTimerStore.getState().complete(NOW + 1);
    const t = useTimerStore.getState();
    expect(t.phase).toBe('work');
    expect(t.completedInCycle).toBe(0);
    expect(t.status).toBe('finished');
  });
});

describe('persistence invariants', () => {
  it('running always has endTimestamp, others do not', () => {
    useTimerStore.getState().start(NOW);
    expect(useTimerStore.getState().status).toBe('running');
    expect(useTimerStore.getState().endTimestamp).not.toBeNull();
    useTimerStore.getState().pause(NOW);
    expect(useTimerStore.getState().endTimestamp).toBeNull();
  });

  it('selectPhase switches phase when not running, ignored while running', () => {
    useTimerStore.getState().selectPhase('longBreak');
    let t = useTimerStore.getState();
    expect(t.status).toBe('idle');
    expect(t.phase).toBe('longBreak');
    expect(t.remainingMs).toBe(phaseDurationMs('longBreak', DEFAULT_SETTINGS));

    forceRunning(NOW + 60_000);
    useTimerStore.getState().selectPhase('shortBreak');
    t = useTimerStore.getState();
    expect(t.status).toBe('running');
    expect(t.phase).toBe('work');
  });

  it('state is written to single localStorage key', () => {
    useTimerStore.getState().start(NOW);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const doc = JSON.parse(raw as string) as { version: number; timer: { status: string } };
    expect(doc.version).toBe(STATE_VERSION);
    expect(doc.timer.status).toBe('running');
  });
});
