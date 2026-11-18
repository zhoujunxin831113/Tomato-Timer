import { useEffect } from 'react';

/** 仅在页面从隐藏回到可见时触发回调，用于计时校准 */
export function usePageVisibility(onReturn: () => void): void {
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') onReturn();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [onReturn]);
}
