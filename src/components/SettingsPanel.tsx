import { useEffect, useState, type ReactNode } from 'react';
import {
  RANGE_BREAK_MINUTES,
  RANGE_DAILY_GOAL,
  RANGE_LONG_BREAK_INTERVAL,
  RANGE_WORK_MINUTES,
} from '../constants';
import { clampMinutes } from '../lib/timer';
import { useSettingsStore } from '../store/useSettingsStore';
import { Toggle } from './ui/Toggle';
import type { Settings } from '../types';

type NumericKey =
  | 'workMinutes'
  | 'shortBreakMinutes'
  | 'longBreakMinutes'
  | 'longBreakInterval'
  | 'dailyGoal';

const NUMERIC_RANGES: Record<NumericKey, { min: number; max: number; unit: string }> = {
  workMinutes: { ...RANGE_WORK_MINUTES, unit: '分钟' },
  shortBreakMinutes: { ...RANGE_BREAK_MINUTES, unit: '分钟' },
  longBreakMinutes: { ...RANGE_BREAK_MINUTES, unit: '分钟' },
  longBreakInterval: { ...RANGE_LONG_BREAK_INTERVAL, unit: '个' },
  dailyGoal: { ...RANGE_DAILY_GOAL, unit: '个' },
};

const SOUND_LABELS: Record<Settings['soundType'], string> = {
  chime: '风铃',
  bell: '钟声',
  beep: '蜂鸣',
};

const THEME_LABELS: Record<Settings['theme'], string> = {
  system: '跟随系统',
  light: '亮色',
  dark: '暗色',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-line bg-card p-4 shadow-card">
      <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm text-ink">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function NumberSetting({
  settingKey,
  label,
  hint,
}: {
  settingKey: NumericKey;
  label: string;
  hint?: string;
}) {
  const value = useSettingsStore((s) => s.settings[settingKey]);
  const update = useSettingsStore((s) => s.update);
  const range = NUMERIC_RANGES[settingKey];
  const [text, setText] = useState(String(value));

  useEffect(() => setText(String(value)), [value]);

  const commit = () => {
    const n = Number(text);
    if (!Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    const clamped = clampMinutes(n, range.min, range.max);
    setText(String(clamped));
    update({ [settingKey]: clamped });
  };

  return (
    <Row label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={range.min}
          max={range.max}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
          className="h-11 w-24 rounded-sm border border-line bg-card px-3 text-right text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          aria-label={label}
        />
        <span className="w-8 text-sm text-muted">{range.unit}</span>
      </div>
    </Row>
  );
}

function ToggleSetting({
  settingKey,
  label,
  hint,
}: {
  settingKey: 'soundEnabled' | 'notificationEnabled' | 'autoCycle';
  label: string;
  hint?: string;
}) {
  const checked = useSettingsStore((s) => s.settings[settingKey]);
  const update = useSettingsStore((s) => s.update);
  return (
    <Row label={label} hint={hint}>
      <Toggle
        checked={checked}
        onChange={(v) => update({ [settingKey]: v })}
        label={label}
      />
    </Row>
  );
}

export function SettingsPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="flex flex-col gap-4 py-4 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-40 max-sm:max-h-[85dvh] max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:border-t max-sm:border-line max-sm:bg-page max-sm:px-4 max-sm:pb-[calc(1rem+env(safe-area-inset-bottom))] max-sm:shadow-card">
      <Section title="时长设置">
        <NumberSetting settingKey="workMinutes" label="专注时长" />
        <NumberSetting settingKey="shortBreakMinutes" label="短休时长" />
        <NumberSetting settingKey="longBreakMinutes" label="长休时长" />
        <NumberSetting
          settingKey="longBreakInterval"
          label="长休间隔"
          hint="每完成几个番茄进入长休"
        />
      </Section>

      <Section title="提醒">
        <ToggleSetting settingKey="soundEnabled" label="提示音" />
        {settings.soundEnabled && (
          <Row label="音效">
            <select
              value={settings.soundType}
              onChange={(e) =>
                update({ soundType: e.target.value as Settings['soundType'] })
              }
              className="h-11 rounded-sm border border-line bg-card px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="音效"
            >
              {Object.entries(SOUND_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Row>
        )}
        <ToggleSetting
          settingKey="notificationEnabled"
          label="系统通知"
          hint="需要浏览器授权，拒绝时自动降级"
        />
      </Section>

      <Section title="循环">
        <ToggleSetting
          settingKey="autoCycle"
          label="自动循环"
          hint="阶段到点后自动进入下一阶段"
        />
      </Section>

      <Section title="目标与外观">
        <NumberSetting settingKey="dailyGoal" label="每日番茄目标" />
        <Row label="主题">
          <div className="flex gap-1 rounded-sm bg-line/60 p-1" role="radiogroup" aria-label="主题">
            {(Object.keys(THEME_LABELS) as Settings['theme'][]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={settings.theme === t}
                onClick={() => update({ theme: t })}
                className={`min-h-[44px] rounded-sm px-3 text-sm font-medium transition-colors ${
                  settings.theme === t
                    ? 'bg-card text-ink shadow-card'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {THEME_LABELS[t]}
              </button>
            ))}
          </div>
        </Row>
      </Section>
    </div>
  );
}
