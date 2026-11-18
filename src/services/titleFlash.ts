const BASE_TITLE = '番茄钟';
const FLASH_TITLE = '【时间到】番茄钟';

let timerId: number | null = null;
let visibilityHandler: (() => void) | null = null;

/** 页面不可见时闪烁标签标题提醒；切回前台自动停止并还原标题 */
export function startTitleFlash(): void {
  if (timerId !== null) return;
  if (typeof document === 'undefined') return;

  const tick = () => {
    if (!document.hidden) {
      stopTitleFlash();
      return;
    }
    document.title = document.title === BASE_TITLE ? FLASH_TITLE : BASE_TITLE;
  };

  visibilityHandler = () => {
    if (!document.hidden) stopTitleFlash();
  };
  document.addEventListener('visibilitychange', visibilityHandler);
  timerId = window.setInterval(tick, 1000);
}

export function stopTitleFlash(): void {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
  if (visibilityHandler !== null && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  if (typeof document !== 'undefined' && document.title !== BASE_TITLE) {
    document.title = BASE_TITLE;
  }
}
