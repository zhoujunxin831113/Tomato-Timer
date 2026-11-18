import type { Settings } from '../types';

let ctx: AudioContext | null = null;

/** 首次用户手势中调用：创建 AudioContext 并尝试解锁/恢复 */
export function initAudio(): void {
  try {
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return;
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    // 音频不可用时静默降级
  }
}

function getContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface Tone {
  freq: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
}

// 按音效类型合成提示音：零音频资源，纯振荡器
const PATTERNS: Record<Settings['soundType'], Tone[]> = {
  chime: [
    { freq: 880, at: 0, dur: 0.5, type: 'sine', gain: 0.25 },
    { freq: 1320, at: 0.18, dur: 0.6, type: 'sine', gain: 0.22 },
  ],
  bell: [
    { freq: 660, at: 0, dur: 1.2, type: 'triangle', gain: 0.3 },
    { freq: 990, at: 0.05, dur: 1.0, type: 'sine', gain: 0.12 },
  ],
  beep: [
    { freq: 1000, at: 0, dur: 0.18, type: 'square', gain: 0.15 },
    { freq: 1000, at: 0.25, dur: 0.18, type: 'square', gain: 0.15 },
  ],
};

/** 到点播放提示音；任何异常静默忽略，不影响其他提醒通道 */
export function playPhaseComplete(soundType: Settings['soundType']): void {
  try {
    const c = getContext();
    if (!c) return;
    const tones = PATTERNS[soundType] ?? PATTERNS.chime;
    for (const t of tones) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = t.type ?? 'sine';
      osc.frequency.value = t.freq;
      const start = c.currentTime + t.at;
      const level = t.gain ?? 0.2;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + t.dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(start);
      osc.stop(start + t.dur + 0.05);
    }
  } catch {
    // 忽略播放失败
  }
}
