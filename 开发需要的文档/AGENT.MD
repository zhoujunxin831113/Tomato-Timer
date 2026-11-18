# AGENT.MD · AI 开发规范（番茄钟计时器）

> **先读本文件，再动手写代码。**
> 事实来源优先级：`需求调研.md` / `PRD.MD`（产品口径）> `TECH_DESIN.MD`（技术设计）> 本文件（执行约束）。冲突时以上游为准，不得自行发挥。
> V1.0 · 2026-11-17

---

## 1. 项目概述

- **产品**：基于番茄工作法的计时工具（25 分钟专注 + 5 分钟休息循环，每 4 个番茄长休），核心闭环「设定 → 专注 → 到点提醒 → 休息 → 计数 → 复盘」，桌面与手机双端。
- **架构**：纯前端单页应用（PWA），计时逻辑与数据全在浏览器内；构建产物为静态文件；无账号、无 API、无运行时网络请求，断网可用；数据仅存本机。
- **技术栈**：React 18 + TypeScript(strict) + Vite 5 + Tailwind CSS 3（CSS 变量设计令牌）+ Zustand 4 `persist`；`date-fns`、`lucide-react`（P2 加 `recharts`）；Web Notification + Web Audio；`vite-plugin-pwa`；Vitest + React Testing Library；静态托管（`dist/`）。
- **后端 / 数据库**：**均不设**。`localStorage` 单键 `pomodoro.state.v1` 即数据层，持久化由 Zustand `persist` 承担；静态托管只下发文件，不是后端。
- **范围**：V1.0 只做 PRD 的 P0（功能 1–5、7–9、11–13、15–16、27）+ 界面规范 + 本地持久化。**不做**长休息与自动循环、图表、任务列表、专注模式、深色模式、提醒音效库扩展、任何服务端能力。P1/P2 条目未经明确指令不得提前实现。
- **依赖白名单**（新增依赖须先说明理由）：runtime `react`、`react-dom`、`zustand`、`date-fns`、`lucide-react`（P2 可加 `recharts`）；dev `vite`、`typescript`、`@vitejs/plugin-react`、`vite-plugin-pwa`、`tailwindcss`、`postcss`、`autoprefixer`、`vitest`、`jsdom`、`@testing-library/react`、`eslint`、`prettier`。**禁止引入** UI 组件库、路由、HTTP 客户端、后端框架、数据库驱动、第三方计时库、在线字体 / 图标 CDN。

---

## 2. 开发规范

### 2.1 目录与分层
- 目录按 `TECH_DESIN.MD` 第 2 章落地；新增文件放对应层，不在 `src/` 根目录堆逻辑。
- 依赖单向：`types`/`constants` → `lib` → `services` → `store` → `hooks` → `components`。
- `lib/*` 是纯函数，不得 import React、`store`、`hooks` 或 `services`；`storage.ts` 仅做存储编解码与容错，不持有状态。
- 组件**禁止**直接读写 `localStorage`、**禁止**直接调 Notification / Audio / title API、**禁止**在组件内重复计算计时剩余或统计值；一律走 store action + `usePomodoroTimer` + `lib/stats`。

### 2.2 计时核心（最高优先级，写错等于产品失败）
- **绝不用** `setInterval` 每秒递减计数（后台标签页被节流会漂移）。唯一真相是 `endTimestamp`：剩余 = `endTimestamp - Date.now()`；可见时刷新视图，不可见时不依赖定时器；`visibilitychange` 回前台立即重算。
- 阶段流转只通过显式 transition：`start`(idle/paused→running) / `pause`(running→paused) / `reset`(→idle 满时长) / `skip`(→下一阶段且**不计**) / `complete`(→finished 落盘)；非法转换直接忽略，不抛错、不静默改状态。
- 阶段推进用纯函数 `nextPhase(completedInCycle, interval)`，逻辑集中在 `lib/timer.ts`；4 次 work 后进长休、之后计数归零。
- 刷新 / 休眠恢复：读持久化 `TimerState`；若 `status==='running'` 且 `endTimestamp <= now`，按到点完成处理，work 阶段补记 `SessionRecord` 并推进下一阶段。

### 2.3 状态与数据流
- 唯一可变状态分散在 3 个 store：`useTimerStore`（计时状态）、`useSettingsStore`（设置）、`useStatsStore`（历史 + 目标）。跨 store 协作由 `usePomodoroTimer` 编排，不在组件内拼装。
- 流程：用户事件 → store.action → `usePomodoroTimer` 按时间戳驱动阶段流转 → 到点触发 `services` 副作用 + `statsStore.record()` → `persist` 写 `localStorage`（try/catch）→ `useMemo` 派生统计 → 组件重渲染（`React.memo(TimerRing)`）。
- 落盘只存 `{ version, timer, settings, records, tasks }`；派生值（统计卡、图表序列、Streak、可见记录）**不落盘**；`version` 当前 `1`，结构变更走 `migrate[fromVersion]` 链。
- 状态不变量（改动计时 / 统计逻辑后必须复核）：
  1. `status === 'running'` ⟺ `endTimestamp !== null`；其余状态 `endTimestamp === null`；
  2. work 阶段**自然到点** → 生成 1 条 `SessionRecord` 且 `completedInCycle + 1`；`skip` / `reset` 不计；
  3. `completedInCycle === longBreakInterval` 且刚完成 work → 下一次进 `longBreak`，之后归零；
  4. `Task.completed === true` ⟺ `completedAt !== null`；`id` 用 `crypto.randomUUID()` 唯一。

### 2.4 业务规则（PRD 2.2，正确性底线）
- 计入口径：仅 work 阶段自然到点计入番茄数与专注时长；跳过 / 重置 / 提前切换不计。
- 到点必达：Notification 需用户手势中申请授权；被拒绝 / 屏蔽时自动降级为页面内模态 + 标题闪烁（切回页面停止）；声音与通知互不依赖，任一成功即满足。
- 提示音：首次点「开始」时初始化 `AudioContext` 并静音解锁，到点复用已解锁 context 合成提示音；监听 `suspended` 并尝试 `resume()`；零音频资源依赖。
- 统计：Streak 按本地日期连续判定，断一天归零；跨午夜不拆分进行中的番茄（按开始日归属）；分母为 0 返回 0。
- 设置即时生效，无「保存」按钮；所有数值输入在 UI 与 store 双重 clamp（工作 1–180、短休/长休 1–60、间隔 1–12、目标 1–50）。

### 2.5 存储、日期、界面
- 存储读写全链路 `try/catch`：解析失败或 `version` 未知 → 备份原值到 `pomodoro.state.broken.<ts>` → 回落默认状态并提示；缺失字段回落默认、丢弃非法 `SessionRecord`/`Task`；`QuotaExceeded` / 隐私模式 → 内存态 + 非阻断提示。
- 日期：`date` / `startedAt` 归属一律用本地 `YYYY-MM-DD` 字符串（字典序即时间序）；`startedAt`/`finishedAt` 用 ISO 8601 仅作展示与时长计算；**禁止** `new Date('2026-11-17')` 解析日期、禁止跨时区换算。
- 视觉令牌集中在 `styles/tokens.css` 与 `tailwind.config.ts`：专注 `#EF4444`、短休 `#10B981`、长休 `#3B82F6`，倒计时数字 96–128px（移动 64px）等宽数字，圆角 8/12px，断点 640/1024px，触控目标 ≥ 44×44px；组件内不硬编码色值。
- PWA：`vite-plugin-pwa` 预缓存静态资源、`registerType: 'autoUpdate'`；SW 只缓存静态文件，**禁止**把 `TimerState` 等动态状态写进缓存。
- 无障碍：倒计时区 `aria-live="off"`（避免每秒播报）、到点提示 `aria-live="assertive"`；页签 `role="tablist"`、焦点环可见；快捷键不劫持输入框；图标按钮带 `aria-label`。

### 2.6 验证命令（交付前必跑，全绿才算完成）
```bash
npm run typecheck   # tsc --noEmit, strict
npm run lint        # eslint
npm run test        # vitest run
npm run build       # vite build → dist/
```
- 若 `package.json` 尚未建立，先按依赖白名单与上述 scripts 初始化工程，再实现功能。
- 每完成一个模块立即跑 typecheck + 该模块单测，禁止堆积未验证代码。

---

## 3. 测试要求

- 框架：Vitest + jsdom + React Testing Library；以纯函数（`timer` / `stats` / `date` / `storage`）与 store 为测试主体，计时 Hook 与关键交互做覆盖。
- 测试放 `src/__tests__/`，命名 `*.test.ts(x)`，与被测模块同名。
- **必测用例（不得省略）**：
  1. 后台 5 分钟返回后剩余时间误差 ≤ 1s（模拟 `Date.now()` 跨度，验证时间戳方案）；
  2. 休眠 / 刷新恢复：running 且已过点 → 补记记录 + 推进阶段；paused 恢复保留剩余；
  3. 4 次 work 自然完成后进长休、计数归零；
  4. `skip` / `reset` 不生成 `SessionRecord`、不增计数；
  5. 非法转换（如 idle 直接 complete）被忽略，状态不变；
  6. 通知权限拒绝 → 页面内降级弹窗 + 标题闪烁启动；
  7. 非法 JSON、未知 `version` 的读取降级与备份；`Settings` 越界值 clamp；
  8. Streak 跨天判定（连续 / 断一天归零）、跨午夜归属、分母为 0 返回 0；
  9. `status` 与 `endTimestamp` 一致性、番茄计数与 `records.length` 一致。
- 用 `getByRole` / 可见文本断言，顺带校验 a11y 角色；不测实现细节、不做大段 DOM 快照；计时测试用 fake timers / 注入时间，禁止真实 sleep 5 分钟。
- 人工走查（AI 无法自动验证的，须在交付说明中列明）：375 / 768 / 1440px 三档、断网刷新、PWA 安装与离线打开、通知交互、移动端通知缺失时标题闪烁兜底。
- 不允许用 `.skip`、删除断言、放宽阈值让测试「通过」。

---

## 4. 代码风格

- TypeScript `strict: true`；禁止 `any`、`@ts-ignore`、非空断言滥用；阶段 / 状态 / 音效一律用 `Phase` / `TimerStatus` / `soundType` 联合类型，不写魔法字符串。
- 命名：组件 / 类型 PascalCase，hooks `useXxx`，变量与函数 camelCase，常量 UPPER_SNAKE_CASE；文件名与导出一致；布尔值用 `is` / `has` / `should` 前缀。
- 组件：函数组件 + 显式 Props 类型；`TimerRing` 用 `React.memo`；回调引用稳定（尤其传给进度环与按钮的 handler）；单文件超过约 150 行考虑拆分。
- 样式：Tailwind 工具类为主，设计值走 `tokens.css` 的 CSS 变量；动效 150–250ms 且仅用于状态反馈，遵循 `prefers-reduced-motion`；数字用 `tabular-nums` 防跳动。
- 格式化：ESLint + Prettier，无 warning；不改与任务无关的文件；不留 `console.log`、TODO 占位实现、死代码。
- 注释精简：只在非直觉逻辑（时间戳补偿、状态机流转、统计口径、时区处理）写一行「为什么」，不做逐行解释。
- 安全：任务名等用户输入一律经 React 文本节点渲染；**禁止** `dangerouslySetInnerHTML`、`innerHTML`、`eval`；超长文本用 CSS 截断。

---

## 5. 注意事项

- ❗ **计时不用 `setInterval` 递减**：这是本项目第一红线。任何"每秒减 1"的实现在后台标签页必然漂移，一律以 `endTimestamp` 差值 + 可见性校准为准。
- ❗ **不要引入任何后端 / API / 数据库 / 账号 / 云同步代码**，也不要顺手加 SSR、路由、状态库替换或 UI 组件库。
- ❗ **不要破坏离线能力**：不加载在线字体、图标、统计脚本、音频文件；依赖全部本地打包；提示音用 Web Audio 合成；`dist/` 为纯静态、无前端路由（无需 rewrite 规则）。
- ❗ **数据仅存当前浏览器**，清除浏览器数据即丢失：首次使用须在 UI 告知「数据仅存本机」；存储不可用时降级并提示，不得静默失败或白屏。
- ❗ **到点必须有提醒**：声音、通知、标题闪烁三条路互不依赖；任一渠道可用即算达标；iOS Safari / 通知被拒场景靠标题闪烁 + 页面弹窗兜底。
- ❗ **多标签页并发写入**：V1.0 接受「后写覆盖先写」并注明；`TimerState` 以时间戳为准，多标签各自恢复不累计误差；`storage` 事件提示属后续迭代，不提前实现。
- ❗ **优先级**：时间戳计时 → 状态机流转 → 恢复与补记 → 统计计入口径，是正确性底线；通知降级、AudioContext 解锁、存储容错、PWA、a11y、触控随组件开发同步落地，不得以后补为由省略。
- ❗ 修改 `TimerState` / `Settings` / `SessionRecord` / `PersistedState` 结构必须同步 `version` 与 `migrate`，并更新 `TECH_DESIN.MD` 第 3 章；禁止擅自改字段默认值、时长范围与统计口径。
- ❗ 功能或结构变更后同步更新 `TECH_DESIN.MD`；`需求调研.md`、`PRD.MD` 属产品输入，未经要求不得改动。
- ❗ 目录中可能存在同名的历史残留文档（如待办应用旧版）。以本文件顶部「事实来源优先级」列出的三个文件为准，发现口径冲突先向用户确认，不基于残留内容推断需求。
