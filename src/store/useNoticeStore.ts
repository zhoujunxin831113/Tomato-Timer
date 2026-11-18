import { create } from 'zustand';

export interface PhaseNotice {
  title: string;
  body: string;
}

interface NoticeStore {
  notice: PhaseNotice | null;
  show: (notice: PhaseNotice) => void;
  dismiss: () => void;
}

// 页面内提醒（通知权限被拒时的降级通道），不持久化
export const useNoticeStore = create<NoticeStore>()((set) => ({
  notice: null,
  show: (notice) => set({ notice }),
  dismiss: () => set({ notice: null }),
}));
