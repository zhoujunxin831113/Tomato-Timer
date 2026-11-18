# 番茄钟计时器 · 技术设计文档（TECH_DESIN）

> V1.0 · 2026-11-17 · 对应 `PRD.MD` V1.0 · 读者：前端开发 / 测试

---

## 1. 技术栈选择

**架构一句话**：纯前端单页应用（PWA），计时逻辑与数据都在浏览器内，构建产物为静态文件；无账号、无 API、无运行时网络请求，断网可用，数据仅存本机。

### 1.1 市场主流方案与本项目选型

| 层次 | 当前市场主流 | 本项目选型 | 理由 |
| --- | --- | --- | --- |
| **前端** | React 18 / Vue 3 / Svelte + TypeScript + Vite；Tailwind 或 CSS Modules；Zustand / Pinia / Redux Toolkit | **React 18 + TypeScript(strict) + Vite 5 + Tailwind CSS 3（CSS 变量设计令牌）+ Zustand 4 `persist`** | 需求核心是「精准计时 + 有限状态流转 + 派生统计」，React 单向数据流 + 自定义 Hook 表达最直接；TS 锁死状态机与阶段枚举；`persist` 自带序列化、`version` 迁移与容错 |
| **后端** | Node.js（NestJS / Express / Fastify）、Java Spring Boot、Python FastAPI；REST + JWT | **不设应用后端**，仅静态托管（Vercel / Netlify / GitHub Pages / COS / Nginx） | V1.0 无账号、无云同步、无协作、无服务端计算；引入后端会带来鉴权与网络依赖，与「打开即用、断网可用」冲突；静态托管只下发文件，不算后端 |
| **数据库** | 关系型 PostgreSQL / MySQL / SQLite；文档型 MongoDB；本地 KV `localStorage` / IndexedDB | **不设独立数据库**，`localStorage` 单键 KV（键 `pomodoro.state.v1`）承担持久化 | 单用户、记录量小（历史 ≤ 数千条）、纯结构化数据，浏览器原生 KV 足够；Zustand `persist` 即本项目的数据层。数据量大时再迁 IndexedDB |
| 计时 / 提醒 | `setInterval` 自管理、Web Worker、Web Notification API、Web Audio API | **时间戳差值 + 可见性校准** + Notification API + Web Audio API | 见 §4 关键技术点 1、5、6；不引第三方计时库 |
| 工具与测试 | date-fns / dayjs、lucide-react、Recharts、Vitest / Playwright | `date-fns` + `lucide-react` + `recharts`（P2）、Vitest + React Testing Library + ESLint + Prettier | 纯函数与 store 可单测；图标/字体本地打包，不引 CDN |
| PWA | vite-plugin-pwa / workbox | `vite-plugin-pwa`（generateSW） | 一键生成 Service Worker，支持安装到桌面与离线刷新 |
| 部署 | 容器 / 云函数 / 静态托管 | `vite build` → `dist/` 静态托管 | 零运维、无需 Node 运行时、产物带 hash 文件名 |

依赖：`react`、`react-dom`、`zustand`、`date-fns`、`lucide-react`；P2 加 `recharts`；devDependencies：`vite`、`typescript`、`@vitejs/plugin-react`、`vite-plugin-pwa`、`tailwindcss`、`postcss`、`autoprefixer`、`vitest`、`jsdom`、`@testing-library/react`、`eslint`、`prettier`。不引入 UI 组件库（只需按钮 / 输入 / 开关 / 模态 / 进度环 / Toast 六类）。

**边界与演进**：数据仅存当前浏览器，清除浏览器数据即丢失，需在 UI 告知（PRD 2.2 规则 7）。若 V2.x 启动账号与多端同步，主流组合为 **Node.js + NestJS（REST + JWT）+ PostgreSQL**（或 Supabase 等 BaaS 的托管 PostgreSQL）：本地 `SessionRecord` 增 `userId` / `revision` 作增量同步游标，冲突默认 last-write-wins，`localStorage` 退化为离线缓存，`lib/` 纯函数与计时 Hook 原样复用，仅替换 store 的持久化适配器。若要做桌面版，走 **Tauri**（体积小）封装现有 Web 产物即可。

---

## 2. 项目结构

```
pomodoro-timer/
├── index.html
├── package.json
├── tsconfig.json                  # strict: true
├── vite.config.ts                 # React + PWA 插件
├── tailwind.config.ts             # 设计令牌（三套模式色板 / 圆角 / 阴影）
├── .eslintrc.cjs / .prettierrc
└── src/
    ├── main.tsx                   # 挂载入口 + SW 注册
    ├── App.tsx                    # 页面骨架：页签切换（计时 / 统计 / 设置）
    ├── types/index.ts             # TimerState / Phase / Settings / SessionRecord / Task / PersistedState
    ├── constants/index.ts         # 默认时长、长休间隔、范围上下限、枚举文案
    ├── store/
    │   ├── useTimerStore.ts       # 计时状态 + actions（start/pause/reset/skip/complete）
    │   ├── useSettingsStore.ts    # 设置 + 持久化
    │   └── useStatsStore.ts       # 历史记录 + 目标 + 派生统计
    ├── hooks/
    │   ├── usePomodoroTimer.ts    # 核心：时间戳计时 + 阶段流转 + 到点副作用
    │   └── usePageVisibility.ts   # 页面可见性监听，触发校准
    ├── lib/                       # 纯函数，不依赖 React / store
    │   ├── timer.ts               # 剩余时间计算、阶段推进、clamp
    │   ├── stats.ts               # 番茄数 / 专注时长 / Streak / 图表聚合
    │   ├── date.ts                # YYYY-MM-DD 格式化、跨天判定、周/月归属
    │   └── storage.ts             # localStorage 读写、容错、schema 迁移
    ├── services/                  # 浏览器副作用隔离层
    │   ├── notification.ts        # 权限申请、发送、拒绝降级
    │   ├── audio.ts               # Web Audio 提示音（解锁 + 播放）
    │   └── titleFlash.ts          # 标签标题闪烁与停止
    ├── components/
    │   ├── TimerRing.tsx          # 巨型数字 + SVG 环形进度
    │   ├── ModeTabs.tsx           # 专注 / 短休 / 长休 切换
    │   ├── ControlButtons.tsx     # 开始/暂停/继续/重置/跳过
    │   ├── SessionProgress.tsx    # ●●○● 阶段进度
    │   ├── StatsCards.tsx         # 四卡统计
    │   ├── Charts.tsx             # 柱状图 + 热力图（P2）
    │   ├── SettingsPanel.tsx      # 分组设置表单（时长/提醒/循环/目标/外观）
    │   ├── HistoryList.tsx        # 历史记录列表
    │   ├── TaskEditor.tsx         # 当前任务关联（P1）
    │   ├── Toast.tsx
    │   └── ui/                    # Button / Input / Toggle / Modal / IconButton
    ├── styles/                    # tokens.css（PRD 4.2 CSS 变量）+ index.css
    └── __tests__/                 # timer / stats / date / storage / store 单测
```

**分层与依赖方向**：`types`/`constants`（无依赖）→ `lib`（纯计算，只依赖 types）→ `services`（浏览器 API 封装）→ `store`（唯一可变状态 + 持久化）→ `hooks`（计时编排 + 派生数据）→ `components`（渲染与事件派发）。规则：`lib` 不得反向依赖 `store`/React/hooks；组件不得直接读写 `localStorage`、不得直接调 Notification/Audio API、不得在组件内重复计算计时或统计。

**数据流**：用户事件 → `store.action` → `usePomodoroTimer` 依据 `endTimestamp` 计算剩余并驱动阶段流转 → 到点触发 `services` 副作用 + `statsStore.record` 落盘 → `persist` 写入 `localStorage`（try/catch）→ `useMemo` 派生统计 → 组件重渲染（`React.memo(TimerRing)`）。统计输入恒为全部 `SessionRecord`，与当前视图无关。

---

## 3. 数据模型

### 3.1 TypeScript 定义

```ts
// src/types/index.ts
export type Phase = 'work' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

/** 计时器运行时状态（部分字段持久化，用于刷新恢复） */
export interface TimerState {
  status: TimerStatus;
  phase: Phase;
  remainingMs: number;        // 暂停/空闲时的剩余毫秒（运行时显示用）
  endTimestamp: number | null;// 运行时的结束时间戳(Date.now()+remainingMs)；非 running 为 null
  completedInCycle: number;   // 本轮已完成的番茄数，达到 longBreakInterval 后归零
  startedAt: number | null;   // 当前阶段开始时间戳，用于历史记录的时段
}

export interface Settings {
  workMinutes: number;        // 1–180，默认 25
  shortBreakMinutes: number;  // 1–60，默认 5
  longBreakMinutes: number;   // 1–60，默认 15
  longBreakInterval: number;  // 1–12，默认 4
  autoCycle: boolean;         // 到点自动进入下一阶段并开始，默认 false
  soundEnabled: boolean;      // 默认 true
  soundType: 'chime' | 'bell' | 'beep';
  notificationEnabled: boolean;// 默认 true
  dailyGoal: number;          // 1–50，默认 8
  theme: 'light' | 'dark' | 'system';
}

/** 一条完成的番茄记录（仅 work 阶段自然到点时生成） */
export interface SessionRecord {
  id: string;                  // crypto.randomUUID()
  date: string;                // 'YYYY-MM-DD'，本地日期，用于按天聚合
  startedAt: string;           // ISO 8601
  finishedAt: string;          // ISO 8601
  durationMinutes: number;     // 实际专注时长
  phase: Phase;                // 当前为 'work'，扩展预留
  taskId: string | null;       // 关联任务，P1
  taskTitle: string | null;    // 冗余存标题，任务删除后记录仍可读
}

export interface Task {
  id: string;
  title: string;               // trim 后 1–100 字符
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface PersistedState {
  version: number;             // 当前 1，schema 迁移用
  timer: TimerState;
  settings: Settings;
  records: SessionRecord[];
  tasks: Task[];
}
```

### 3.2 存储结构与约束

- 单键 `pomodoro.state.v1`，值为 `JSON.stringify(PersistedState)`。只存原始状态，派生数据（统计卡数值、图表序列、Streak、可见记录）一律不落盘，避免与源数据不一致。
- 默认时长等常量收敛到 `constants/index.ts`；`Settings` 各字段在 store 层与读取时双重 clamp，拒绝越界/非数字。
- 状态不变量：
  - `status === 'running'` ⟺ `endTimestamp !== null`；其余状态 `endTimestamp === null`、`remainingMs` 为当前剩余。
  - `phase === 'work'` 且自然到点 → 生成 `SessionRecord` 且 `completedInCycle + 1`；`skip`/`reset` 不生成记录、不增计数。
  - `completedInCycle % longBreakInterval === 0` 且刚完成 work → 下一次进 `longBreak`，否则 `shortBreak`。
  - `Task.completed === true` ⟺ `completedAt !== null`。
- 日期一律用本地 `YYYY-MM-DD` 字符串存储与比较（字典序即时间序），避免 `new Date('2026-11-17')` 按 UTC 解析造成的跨天错位；`startedAt`/`finishedAt` 用 ISO 8601 仅做展示与时长计算。
- 读写全链路 `try/catch`：`version` 未知或 JSON 解析失败先把原值备份到 `pomodoro.state.broken.<ts>`，再回落默认状态并提示；缺失字段回落默认值、丢弃非法 `SessionRecord`/`Task`；`QuotaExceeded`/隐私模式降级内存态 + 非阻断提示；迁移用 `migrate[fromVersion]` 链式执行。

---

## 4. 关键技术点

| # | 难点 | 处理方案 |
| --- | --- | --- |
| 1 | **后台计时漂移（核心）** | 绝不用 `setInterval` 每秒递减（后台标签页被节流到 ≥1min 会严重漂移）。记录 `endTimestamp`，剩余 = `endTimestamp - Date.now()`；可见时用 `requestAnimationFrame`/短 interval 刷新视图，隐藏时不依赖定时器；`visibilitychange` 回到前台立即重算并校准（PRD 2.2 规则 2、8） |
| 2 | **休眠 / 锁屏 / 刷新恢复** | 时间戳天然抗休眠：唤醒后差值即真实剩余。刷新时读持久化 `TimerState`；若 `status==='running'` 且 `endTimestamp <= now`，说明离线期间已到点 → 按完成处理，若是 work 阶段补记 `SessionRecord` 并推进下一阶段（PRD 2.2 规则 6） |
| 3 | **状态机与阶段流转** | `usePomodoroTimer` 用显式 transition：`start`(idle/paused→running) / `pause`(running→paused) / `reset`(→idle, 满时长) / `skip`(→下一阶段且不计) / `complete`(→finished, 落盘)；非法转换直接忽略。阶段推进纯函数 `nextPhase()` 在 `lib/timer.ts`，单测覆盖 4 连击进长休 |
| 4 | **到点必达的提醒降级** | Notification 需用户授权：首次在用户手势中申请 `Notification.requestPermission()`；拒绝或被屏蔽时自动回退为页面内模态 + 标题闪烁（`services/titleFlash.ts`，切回页面停止）；声音与通知互不依赖，任一成功即满足（PRD 功能 15） |
| 5 | **提示音的自动播放限制** | 浏览器禁止无用户手势的音频播放。首次点击「开始」时初始化 `AudioContext` 并播放一段静音解锁；到点复用已解锁 context 用 Web Audio 振荡器合成提示音（`soundType` 决定波形/频率），零音频资源依赖；同时监听 context `suspended` 状态尝试 `resume()` |
| 6 | **统计口径与跨天归属** | 番茄计数仅来自自然完成的 work 阶段；Streak 用 `records` 的 `date` 集合按本地日期连续判定，断一天归零；跨午夜不拆分进行中的番茄（按开始日归属）；分母为 0 时完成率/统计返回 0；统计聚合写成纯函数，空数据/单条/跨月用例必测 |
| 7 | **持久化可靠性与迁移** | `storage.ts` 全链路 try/catch + 损坏备份 + 默认值回落 + `version` 链式迁移；`persist` 的 `partialize` 只写必要字段；`SessionRecord` 无上限增长时 V1.1 做按 90 天归档或迁 IndexedDB |
| 8 | **PWA 离线与安装** | `vite-plugin-pwa` 预缓存 `dist/` 静态资源；`registerType: 'autoUpdate'`；离线刷新可用。注意 SW 缓存与计时状态无关（状态在 localStorage），避免把动态状态写进缓存；iOS Safari 通知能力弱，靠标题闪烁 + 页面弹窗兜底 |
| 9 | **移动端触控与软键盘** | 计时页单列、按钮 ≥ 44×44px、SVG 环形进度用 `viewBox` 自适应；设置面板为底部抽屉，用 `visualViewport` 适配软键盘、`env(safe-area-inset-bottom)` 适配安全区；`prefers-reduced-motion` 关闭动画 |
| 10 | **多标签页并发** | 同一浏览器开多个标签时，V1.0 接受「后写覆盖先写」并注明；`storage` 事件监听用于提示「其他标签已更新，请刷新」；`TimerState` 以时间戳为准，多标签各自恢复后不会累计误差 |
| 11 | **可访问性与 XSS** | 倒计时区 `aria-live="off"`（避免每秒播报）、到点提示 `aria-live="assertive"`；页签 `role="tablist"`、焦点环可见、快捷键不劫持输入框；任务名等用户输入一律 React 文本渲染，禁用 `dangerouslySetInnerHTML`；图标按钮带 `aria-label` |

**优先级**：1–3 是正确性底线（计时不准则产品失败），4–7 是可靠性关键，8–11 属体验与工程质量，随组件开发同步落地。

**验证**：`npm run typecheck`（tsc --noEmit, strict）、`npm run lint`、`npm run test`（vitest run）、`npm run build`（vite build → dist/）。必测用例：后台 5 分钟返回误差 ≤ 1s、休眠恢复、4 连击进长休、跳过/重置不计入统计、刷新后到点补记、通知拒绝降级、非法 JSON 读取、跨天 Streak 判定、时长 clamp；人工走查 375/768/1440px 三档 + 断网刷新 + PWA 安装。
