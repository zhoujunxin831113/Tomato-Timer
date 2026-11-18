import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STATE_VERSION, STORAGE_KEY } from '../constants';
import { createSliceStorage } from '../lib/storage';
import type { PersistedState, SessionRecord, Task } from '../types';

interface StatsSlice {
  records: SessionRecord[];
  tasks: Task[];
}

const readSlice = (doc: PersistedState): StatsSlice => ({
  records: doc.records,
  tasks: doc.tasks,
});
const writeSlice = (doc: PersistedState, slice: StatsSlice): void => {
  doc.records = slice.records;
  doc.tasks = slice.tasks;
};

interface StatsStore extends StatsSlice {
  record: (record: SessionRecord) => void;
}

export const useStatsStore = create<StatsStore>()(
  persist(
    (set) => ({
      records: [],
      tasks: [],
      record: (record) => set((s) => ({ records: [record, ...s.records] })),
    }),
    {
      name: STORAGE_KEY,
      version: STATE_VERSION,
      storage: createJSONStorage(() =>
        createSliceStorage<StatsSlice>(readSlice, writeSlice, () => ({
          records: [],
          tasks: [],
        })),
      ),
      partialize: (s) => ({ records: s.records, tasks: s.tasks }),
    },
  ),
);
