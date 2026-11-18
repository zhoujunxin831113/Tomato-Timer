import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STATE_VERSION, STORAGE_KEY } from '../constants';
import {
  createDefaultPersistedState,
  isStoragePersistent,
  loadPersistedState,
  parsePersistedState,
  savePersistedState,
} from '../lib/storage';
import type { SessionRecord } from '../types';

const validRecord: SessionRecord = {
  id: 'r1',
  date: '2026-11-17',
  startedAt: '2026-11-17T01:00:00.000Z',
  finishedAt: '2026-11-17T01:25:00.000Z',
  durationMinutes: 25,
  phase: 'work',
  taskId: null,
  taskTitle: null,
};

beforeEach(() => {
  localStorage.clear();
});

describe('parsePersistedState', () => {
  it('非法 JSON → corrupt + 默认状态', () => {
    const r = parsePersistedState('{oops');
    expect(r.status).toBe('corrupt');
    expect(r.state.records).toEqual([]);
  });

  it('未知 version → corrupt', () => {
    const r = parsePersistedState(JSON.stringify({ version: 999, timer: {} }));
    expect(r.status).toBe('corrupt');
  });

  it('version 缺失 → corrupt', () => {
    expect(parsePersistedState('{}').status).toBe('corrupt');
  });

  it('缺失字段回落默认', () => {
    const r = parsePersistedState(JSON.stringify({ version: STATE_VERSION }));
    expect(r.status).toBe('ok');
    expect(r.state.settings.workMinutes).toBe(25);
    expect(r.state.timer.status).toBe('idle');
  });

  it('非法 SessionRecord 被丢弃，合法保留', () => {
    const raw = JSON.stringify({
      version: STATE_VERSION,
      records: [{ id: 'bad' }, validRecord, null, 'x'],
    });
    const r = parsePersistedState(raw);
    expect(r.status).toBe('ok');
    expect(r.state.records).toHaveLength(1);
    expect(r.state.records[0].id).toBe('r1');
  });

  it('settings 越界值被 clamp', () => {
    const raw = JSON.stringify({
      version: STATE_VERSION,
      settings: { workMinutes: 999, shortBreakMinutes: -3, dailyGoal: 'x' },
    });
    const r = parsePersistedState(raw);
    expect(r.state.settings.workMinutes).toBe(180);
    expect(r.state.settings.shortBreakMinutes).toBe(1);
    expect(r.state.settings.dailyGoal).toBe(8);
  });

  it('running 但 endTimestamp 非法 → 降级 paused', () => {
    const raw = JSON.stringify({
      version: STATE_VERSION,
      timer: { status: 'running', phase: 'work', endTimestamp: 'bad' },
    });
    const r = parsePersistedState(raw);
    expect(r.state.timer.status).toBe('paused');
    expect(r.state.timer.endTimestamp).toBeNull();
  });
});

describe('loadPersistedState / savePersistedState', () => {
  it('空存储 → 默认状态', () => {
    expect(loadPersistedState().settings.workMinutes).toBe(25);
  });

  it('损坏数据备份到 broken.<ts> 后回落默认', () => {
    localStorage.setItem(STORAGE_KEY, '{broken json');
    const state = loadPersistedState();
    expect(state.timer.status).toBe('idle');
    const backupKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith('pomodoro.state.broken.'),
    );
    expect(backupKeys.length).toBeGreaterThan(0);
    expect(localStorage.getItem(backupKeys[0])).toBe('{broken json');
  });

  it('未知 version 同样备份回落', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2 }));
    loadPersistedState();
    const backupKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith('pomodoro.state.broken.'),
    );
    expect(backupKeys).toHaveLength(1);
  });

  it('写读往返一致', () => {
    const doc = createDefaultPersistedState();
    doc.records = [validRecord];
    expect(savePersistedState(doc)).toBe(true);
    const loaded = loadPersistedState();
    expect(loaded.records).toHaveLength(1);
    expect(loaded.records[0].id).toBe('r1');
  });

  it('QuotaExceeded → 返回 false 且标记非持久化', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });
    expect(savePersistedState(createDefaultPersistedState())).toBe(false);
    expect(isStoragePersistent()).toBe(false);
    spy.mockRestore();
    // 恢复后可再次持久化
    expect(savePersistedState(createDefaultPersistedState())).toBe(true);
  });
});
