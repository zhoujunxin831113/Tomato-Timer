# 番茄钟计时器 · 分模块开发提示词

> 用法：按模块顺序执行（依赖关系见下），复制对应提示词给 AI 即可开发。每完成一个模块先跑验证命令，全绿再进入下一个。
> 所有模块共同遵守 `AGENT.MD`；产品口径看 `PRD.MD`，技术细节看 `TECH_DESIN.MD`。
> 范围：V1.0 P0（功能 1–5、7–9、11–13、15–16、27），P1/P2 未授权不实现。

**模块依赖链**：0 → 1 → 2 → 3 → 4 → 5 → 6 → 7（前一块未通过验证，不要开始下一块）

---

## 模块 0：工程初始化

**前置依赖**：无

**提示词**：
```text
按 AGENT.MD 初始化番茄钟计时器工程。建立 Vite 5 + React 18 + TypeScript(strict) 工程，配置 Tailwind CSS 3（CSS 变量设计令牌）、ESLint、Prettier、Vitest+jsdom、vite-plugin-pwa。按 TECH_DESIN.MD 第 2 章建立完整目录结构（types/constants/lib/services/store/hooks/components/styles/__tests__）。按 PRD 4.2 在 styles/tokens.css 定义三套模式色（专注 #EF4444 / 短休 #10B981 / 长休 #3B82F6）、圆角、阴影、断点。package.json 配置 typecheck/lint/test/build 四个 script。仅安装依赖白名单内的包。完成后 npm run build 通过。
```

**完成标准**：`npm run build` 成功，目录结构与配置齐全。

---

## 模块 1：数据模型与存储层

**前置依赖**：模块 0

**提示词**：
```text
按 TECH_DESIN.MD 第 3 章实现数据层。在 types/index.ts 定义 Phase、TimerStatus、TimerState、Settings、SessionRecord、Task、PersistedState 全部类型，字段与注释严格对齐文档。在 constants/index.ts 收敛默认值与范围（工作25/短休5/长休15、间隔4、目标8、各字段上下限）。在 lib/storage.ts 实现 localStorage 单键 pomodoro.state.v1 的读写：全链路 try/catch、JSON 解析失败与未知 version 备份到 pomodoro.state.broken.<ts> 后回落默认、缺失字段补默认、丢弃非法记录、QuotaExceeded/隐私模式降级内存态并提示、version 链式 migrate。禁止在存储层持有状态。补齐 storage 单测（非法 JSON、未知版本、配额超限降级）。完成后 typecheck + test 通过。
```

**完成标准**：`npm run typecheck`、`npm run test` 通过，存储容错用例覆盖。

---

## 模块 2：计时核心（最高优先级）

**前置依赖**：模块 1

**提示词**：
```text
实现番茄钟计时核心，严禁 setInterval 递减（唯一真相是 endTimestamp，剩余 = endTimestamp - Date.now()）。按 TECH_DESIN.MD 第 4 章要点 1/2/3：
1) lib/timer.ts 写纯函数：剩余时间计算、nextPhase(completedInCycle, interval) 阶段推进、时长 clamp；
2) store/useTimerStore.ts 定义 status/phase/remainingMs/endTimestamp/completedInCycle/startedAt 与 actions(start/pause/reset/skip/complete)，非法状态转换直接忽略；
3) hooks/usePageVisibility.ts 监听 visibilitychange 回前台立即校准；
4) hooks/usePomodoroTimer.ts 编排：时间戳驱动流转、到点触发 complete、刷新/休眠恢复（running 且已过点则补记记录并推进）。
约束：status==='running' ⟺ endTimestamp!==null；work 自然到点才计一次，skip/reset 不计；4 次 work 进长休后归零。
单测必测：模拟 Date.now 跨度 5 分钟误差≤1s、休眠恢复、4连击进长休、skip/reset 不计、非法转换被忽略。完成后 typecheck + test 通过。
```

**完成标准**：`npm run typecheck`、`npm run test` 通过，计时核心 5 类用例全绿。

---

## 模块 3：计时界面

**前置依赖**：模块 2

**提示词**：
```text
按 PRD 4.3/4.4 实现计时页界面。组件放 components/：TimerRing（巨型倒计时数字 + SVG 环形进度，数字用 tabular-nums，React.memo）、ModeTabs（专注/短休/长休切换）、ControlButtons（开始/暂停/继续/重置/跳过，主按钮实心带光晕）、SessionProgress（●●○● 阶段进度）。App.tsx 搭计时页骨架：顶部模式标签 + 今日番茄信息条 + 中央计时环 + 控制区。当前模式切换时整体主色按 tokens.css 三套色变化；最后 10 秒数字渐变提示；到点有完成动画。组件只读 store 与 hooks，不直接碰 localStorage 或浏览器 API。按钮触控区 ≥44×44px。完成后 npm run build 通过并手动走查布局。
```

**完成标准**：`npm run build` 成功，界面可操作、计时数字正常刷新。

---

## 模块 4：设置模块

**前置依赖**：模块 3

**提示词**：
```text
实现设置与持久化（PRD 功能 9/11）。store/useSettingsStore.ts 管理 Settings 并用 Zustand persist 落盘（partialize 只写必要字段）。components/SettingsPanel.tsx 分组表单：时长（工作1-180、短休/长休1-60、间隔1-12）、提醒开关与音效、自动循环开关、每日目标1-50、主题切换。即时生效无保存按钮；所有数值在 UI 与 store 双重 clamp，非法输入回落默认。时长改动后当前进行中的阶段不受影响（下一阶段生效）。设置持久化到 pomodoro.state.v1，刷新后保留。完成后 typecheck + test（覆盖 clamp 与持久化）通过。
```

**完成标准**：`npm run typecheck`、`npm run test` 通过，设置刷新后保留。

---

## 模块 5：提醒模块

**前置依赖**：模块 4

**提示词**：
```text
实现到点提醒，三条渠道互不依赖、任一成功即达标（PRD 功能 12/13/15，TECH_DESIN 要点 4/5）。services/ 下建：notification.ts（用户手势中申请 Notification 权限，发送通知，拒绝/屏蔽时返回失败信号）、audio.ts（首次点开始初始化 AudioContext 并静音解锁，到点用振荡器按 soundType 合成提示音，监听 suspended 尝试 resume，零音频资源）、titleFlash.ts（页面不可见时闪烁标签标题，切回停止）。在 usePomodoroTimer 的到点副作用里调用三者，权限被拒自动降级为页面内模态 + 标题闪烁。声音与通知各自 try/catch，一个失败不影响另一个。完成后 typecheck 通过，手动验证通知拒绝时的降级路径。
```

**完成标准**：`npm run typecheck` 通过，通知拒绝时能降级为弹窗 + 标题闪烁。

---

## 模块 6：统计模块

**前置依赖**：模块 5

**提示词**：
```text
实现统计与记录（PRD 功能 16）。lib/stats.ts 写纯函数：番茄数、专注时长、Streak（本地日期连续判定，断一天归零）、按日/周聚合；lib/date.ts 用本地 YYYY-MM-DD 字符串做日期处理，禁止 new Date('YYYY-MM-DD')。store/useStatsStore.ts 管理 records 与 dailyGoal；计时核心 complete 时写入 SessionRecord（work 自然到点才记，skip/reset 不记）。components/StatsCards.tsx（今日番茄/本周番茄/累计专注/连续天数）+ HistoryList.tsx（历史倒序）。统计输入恒为全部 records，与视图无关；分母为 0 返回 0；跨午夜按开始日归属。单测必测 Streak 连续/断天、跨午夜、分母为0、skip 不记。完成后 typecheck + test 通过。
```

**完成标准**：`npm run typecheck`、`npm run test` 通过，统计口径用例全绿。

---

## 模块 7：PWA 与整体收尾

**前置依赖**：模块 6

**提示词**：
```text
完成 PWA 与验收收尾（PRD 功能 27、TECH_DESIN 要点 8/9/11）。配置 vite-plugin-pwa：预缓存 dist 静态资源、registerType autoUpdate、生成 manifest 与图标（本地生成不用 CDN）；SW 禁止缓存 TimerState 等动态状态。补齐响应式：375/768/1440 三档走查，计时页单列、设置底部抽屉、env(safe-area-inset-bottom)、触控≥44px。无障碍：倒计时区 aria-live=off、到点提示 aria-live=assertive、页签 role=tablist、图标按钮带 aria-label、快捷键不劫持输入框。全量跑 npm run typecheck && npm run lint && npm run test && npm run build，全绿后列出人工走查清单（断网刷新、PWA 安装、通知交互、移动端标题闪烁兜底）。
```

**完成标准**：四条验证命令全绿，交付说明中列出人工走查项。

---

## 附：全局提醒（每个模块都适用）

- 事实来源优先级：`需求调研.md`/`PRD.MD` > `TECH_DESIN.MD` > `AGENT.MD`。
- 计时第一红线：**禁止 setInterval 递减**，一律 endTimestamp 差值 + 可见性校准。
- 每模块完成立即验证，禁止堆积未验证代码。
- 不引入后端、路由、UI 组件库、在线 CDN 资源。
- 变更数据模型必须同步 version 与 migrate，并更新 TECH_DESIN.MD。
