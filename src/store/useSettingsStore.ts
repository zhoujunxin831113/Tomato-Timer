import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_SETTINGS, STATE_VERSION, STORAGE_KEY } from '../constants';
import { createSliceStorage, sanitizeSettings } from '../lib/storage';
import type { PersistedState, Settings } from '../types';

interface SettingsSlice {
  settings: Settings;
}

const readSlice = (doc: PersistedState): SettingsSlice => ({ settings: doc.settings });
const writeSlice = (doc: PersistedState, slice: SettingsSlice): void => {
  doc.settings = slice.settings;
};

interface SettingsStore extends SettingsSlice {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: { ...DEFAULT_SETTINGS },
      update: (patch) =>
        set((s) => ({ settings: sanitizeSettings({ ...s.settings, ...patch }) })),
      reset: () => set({ settings: { ...DEFAULT_SETTINGS } }),
    }),
    {
      name: STORAGE_KEY,
      version: STATE_VERSION,
      storage: createJSONStorage(() =>
        createSliceStorage<SettingsSlice>(readSlice, writeSlice, () => ({
          settings: { ...DEFAULT_SETTINGS },
        })),
      ),
      partialize: (s) => ({ settings: s.settings }),
    },
  ),
);
