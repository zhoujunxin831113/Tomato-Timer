import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../constants';
import { createDefaultTimerState } from '../lib/storage';
import { completeExpiredPhase } from '../hooks/usePomodoroTimer';
import { useSettingsStore } from '../store/useSettingsStore';
import { useStatsStore } from '../store/useStatsStore';
import { useTimerStore } from '../store/useTimerStore';

const NOW = 10_000_000;

function resetStores(): void {
  localStorage.clear();
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, autoCycle: false } });
  useStatsStore.setState({ records: [], tasks: [] });
  useTimerStore.setState({ ...createDefaultTimerState(), status: 'idle' });
}

beforeEach(resetStores);

describe('completeExpiredPhase', () => {
  it('running past endTimestamp: work records once and advances', () => {
    useTimerStore.setState({
      status: 'running',
      phase: 'work',
      remainingMs: 0,
      endTimestamp: NOW - 1_000,
      completedInCycle: 0,
      startedAt: NOW - 1_500_000,
    });
    expect(completeExpiredPhase(NOW)).toBe(true);

    const records = useStatsStore.getState().records;
    expect(records).toHaveLength(1);
    expect(records[0].phase).toBe('work');
    expect(records[0].durationMinutes).toBe(25);
    expect(records[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const t = useTimerStore.getState();
    expect(t.status).toBe('finished');
    expect(t.phase).toBe('shortBreak');
    expect(t.completedInCycle).toBe(1);
  });

  it('sleep/refresh recovery: overdue running state is completed and recorded', () => {
    useTimerStore.setState({
      status: 'running',
      phase: 'work',
      remainingMs: 0,
      endTimestamp: NOW - 3_600_000,
      completedInCycle: 2,
      startedAt: NOW - 5_100_000,
    });
    expect(completeExpiredPhase(NOW)).toBe(true);
    expect(useStatsStore.getState().records).toHaveLength(1);
    expect(useTimerStore.getState().completedInCycle).toBe(3);
  });

  it('paused recovery does not record or advance', () => {
    useTimerStore.setState({
      status: 'paused',
      phase: 'work',
      remainingMs: 600_000,
      endTimestamp: null,
      completedInCycle: 0,
      startedAt: NOW - 900_000,
    });
    expect(completeExpiredPhase(NOW)).toBe(false);
    expect(useStatsStore.getState().records).toHaveLength(0);
    expect(useTimerStore.getState().remainingMs).toBe(600_000);
  });

  it('break phase completion produces no record', () => {
    useTimerStore.setState({
      status: 'running',
      phase: 'shortBreak',
      remainingMs: 0,
      endTimestamp: NOW - 1,
      completedInCycle: 1,
      startedAt: NOW - 300_000,
    });
    expect(completeExpiredPhase(NOW)).toBe(true);
    expect(useStatsStore.getState().records).toHaveLength(0);
    expect(useTimerStore.getState().phase).toBe('work');
  });

  it('autoCycle starts next phase automatically', () => {
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, autoCycle: true } });
    useTimerStore.setState({
      status: 'running',
      phase: 'work',
      remainingMs: 0,
      endTimestamp: NOW - 1,
      completedInCycle: 0,
      startedAt: NOW - 1_500_000,
    });
    completeExpiredPhase(NOW);
    const t = useTimerStore.getState();
    expect(t.status).toBe('running');
    expect(t.phase).toBe('shortBreak');
    expect(t.endTimestamp).not.toBeNull();
  });

  it('not expired does nothing', () => {
    useTimerStore.setState({
      status: 'running',
      phase: 'work',
      remainingMs: 0,
      endTimestamp: NOW + 60_000,
      completedInCycle: 0,
      startedAt: NOW,
    });
    expect(completeExpiredPhase(NOW)).toBe(false);
    expect(useStatsStore.getState().records).toHaveLength(0);
  });
});
