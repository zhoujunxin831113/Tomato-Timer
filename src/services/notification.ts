export type NotifyResult = 'sent' | 'denied' | 'default' | 'unsupported' | 'error';

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** 需在用户手势中调用；返回最终权限状态 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (notificationPermission() === 'unsupported') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/** 发送系统通知；未授权/不支持/异常均返回失败信号，由调用方降级 */
export function sendPhaseNotification(title: string, body: string): NotifyResult {
  try {
    if (notificationPermission() !== 'granted') {
      const p = notificationPermission();
      return p === 'denied' ? 'denied' : p === 'unsupported' ? 'unsupported' : 'default';
    }
    new Notification(title, { body, tag: 'pomodoro-phase-complete' });
    return 'sent';
  } catch {
    return 'error';
  }
}
