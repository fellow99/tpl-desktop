# 基础应用 — 功能规格

> 模块: 401-app-basic-apps
> 状态: 已实现
> 最后更新: 2026-07-19

## 1. 模块概述

### 1.1 目的 — 为什么存在这个模块

本模块提供工作台 App 系统中两个"开箱即用"的基础应用实现：**时钟**（BasicClock）和**网页应用**（BasicIframe）。它们作为 App 系统的首批具体实现，验证了 `.app.js + .app.vue` 文件对元数据驱动扩展的可行性，同时为用户提供最常用的桌面工作台功能——查看时间和嵌入外部网页。

### 1.2 解决的问题 — 痛点

- 用户需要在桌面工作台中快速查看当前时间，不希望在编辑小部件时仍需要切换到其他标签页看时间
- 用户需要在桌面内嵌入外部网页（如门户网站、内部看板），以单一工作台姿态访问所有工作资源
- App 系统需要一个最小可验证的具体实现来证明元数据规约和叠加层渲染的正确性
- 开发者需要一个参照模板，理解如何通过 `.app.js` 声明元数据并编写 `.app.vue` 组件

### 1.3 范围 — 包含与排除

**包含**：
- BasicClock：数字时钟渲染、日期显示、时间格式与日期显示可配置
- BasicIframe：iframe 嵌入外部网页、自适应缩放、安全沙箱隔离、窗口 resize 响应
- 两个 App 的完整元数据声明（title、category、rect、props schema）
- props 默认值与 Vue 组件 `defineProps` 的完全对应

**排除**：
- App 系统框架层（注册、生命周期、叠加层渲染）— 属于 003-app-system
- 属性编辑器 UI 组件（propsEditors）— 属于 101-prop-editor
- 快捷方式管理 — 属于 003-app-system
- 分钟级驱动的小部件时钟 — BasicClock 是独立 App，不属于 Widget 系统

## 2. 用户故事

- 作为**桌面用户**，我可以通过 App 市场添加"时钟"到我的应用列表，启动后在工作台上看到实时更新的数字时钟，以便随时查看当前时间。
- 作为**桌面用户**，我可以在时钟 App 中切换时间格式（如 24 小时制 HH:mm:ss 或 12 小时制 hh:mm:ss A），以满足不同地区或习惯的显示需求。
- 作为**桌面用户**，我可以通过 App 市场添加"网页应用"并配置目标网址，启动后在桌面内查看外部网页内容，而无需切换到浏览器标签页。
- 作为**桌面用户**，当嵌入的网页内容尺寸超过窗口时，系统应自动缩放网页使其完整显示，我可以看到全部内容。
- 作为**桌面用户**，我可以同时运行时钟和网页应用，它们互不干扰，各自拥有独立的标题栏和最小化/关闭操作。
- 作为**开发者**，我可以参照 BasicClock 和 BasicIframe 的元数据与组件结构，快速创建新的 App。

## 3. 功能需求

### 3.1 BasicClock — 数字时钟

- FR-401-001: 系统 MUST 在 App 启动后以每秒 1 次（1000ms 间隔）的频率更新显示的时间值，当前时间精确到秒。
- FR-401-002: 系统 MUST 支持通过 `format` prop 配置时间格式字符串（遵循 dayjs format 模板语法），默认值为 `'HH:mm:ss'`（24 小时制，时:分:秒）。
- FR-401-003: 系统 MUST 支持通过 `showDate` prop 控制日期行的显示/隐藏（布尔值），默认值为 `true`（显示）。
- FR-401-004: 当 `showDate` 为 `true` 时，系统 MUST 以"YYYY年MM月DD日 + 中文星期"格式渲染日期行（如"2026年07月19日 周日"）。
- FR-401-005: 系统 MUST 在 App 关闭或 unmount 时清除内部 setInterval 定时器，防止内存泄漏。
- FR-401-006: 时间文本 MUST 使用等宽数字字体渲染（`tabular-nums`），确保数字变化时文字不发生水平抖动。

### 3.2 BasicIframe — 网页嵌入

- FR-401-007: 系统 MUST 在 App 启动后以 iframe 形式加载 `url` prop 指定的外部网页 URL。
- FR-401-008: 当 `url` prop 为空（未配置）时，系统 MUST 回退加载默认演示地址 `about:blank`。
- FR-401-009: 系统 MUST 根据容器实际尺寸（clientWidth/clientHeight）与配置的目标内容尺寸（contentWidth/contentHeight）自动计算缩放比例 `scaleX = containerWidth / contentWidth` 和 `scaleY = containerHeight / contentHeight`。
- FR-401-010: 当容器尺寸为 0（未挂载或不可见）或内容尺寸配置为 0 时，系统 MUST 回退缩放比例为 1（100%），避免除零错误。
- FR-401-011: 系统 MUST 通过 CSS `transform: scaleX() scaleY()` 结合 `transform-origin: top left` 应用缩放，使网页在任何窗口尺寸下完整可见。
- FR-401-012: iframe MUST 添加 `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"` 属性和 `referrerpolicy="no-referrer"` 属性，提供安全隔离与隐私保护。
- FR-401-013: 系统 MUST 在窗口 resize 时重新计算缩放比例（通过 window `resize` 事件监听），保证缩放响应视口变化。
- FR-401-014: 系统 MUST 在 App 关闭或 unmount 时移除 window resize 事件监听器，防止内存泄漏和重复计算。

### 3.3 跨应用共性

- FR-401-015: 每个 App MUST 遵循 `.app.js` 元数据文件 + `.app.vue` 组件文件对结构，其中 `.app.js` 导出至少包含 `title`、`category`、`rect` 字段的元数据对象。
- FR-401-016: `compName` 字段 MUST 不由 `.app.js` 手写，而由 App Registry（`src/apps/index.js`）从文件路径自动提取注入。
- FR-401-017: `events`、`propsEditors`、`wrapperEditors` 字段当前 MUST 为空数组，作为预留扩展点（当前代码无消费逻辑）。
- FR-401-018: `.app.vue` 组件 MUST 使用 `<script setup>` + Composition API 风格，通过 `defineProps` 声明接收的 props，不直接引用 GridStack、desktopConfig 或 localStorage。
- FR-401-019: App 组件 SHOULD 具备 `Q-01` 自包含特性：仅接收 props 渲染内容，可独立运行，不依赖全局状态或父组件上下文。

## 4. 关键实体

| 实体 | 描述 | 关键属性 |
|------|------|----------|
| **BasicClock** | 数字时钟 App 实例，显示实时时间与日期 | `format`（时间格式字符串，默认 `'HH:mm:ss'`）、`showDate`（是否显示日期，默认 `true`） |
| **BasicIframe** | 网页嵌入 App 实例，以 iframe 加载外部页面 | `url`（目标网页地址，默认 `''` → 回退 163.com）、`contentWidth`（网页内容宽度 px，默认 `1440`）、`contentHeight`（网页内容高度 px，默认 `900`） |

### BasicClock 运行时状态

```
┌──────────────────────────────┐
│          HH:mm:ss            │  ← 时间行（format prop 控制格式）
│     YYYY年MM月DD日 周X       │  ← 日期行（showDate prop 控制显隐）
└──────────────────────────────┘
```

- 时间行和日期行均使用 CSS 变量 `--desktop-text-primary` / `--desktop-text-secondary` 着色
- 定时器 `setInterval(() => { now = dayjs() }, 1000)` 驱动 `now` ref 更新

### BasicIframe display 属性

```
┌──────────────────────────────┐
│   iframe (sandbox)           │
│   ┌────────────────────────┐ │
│   │  transform: scaleX ×   │ │ ← 自动缩放
│   │  scaleY                │ │
│   │  外部网页内容          │ │
│   └────────────────────────┘ │
└──────────────────────────────┘
```

- 容器 `overflow: hidden` 隐藏缩放溢出
- 缩放比例 = 容器实际尺寸 / 配置内容尺寸（任一方 ≤ 0 时回退为 1）

## 5. 验收场景

### 场景: BasicClock 启动并显示实时时间

- Given 用户已通过 App 市场将"时钟"添加到 App 列表
- When 用户从 App 列表中点击启动"时钟" App
- Then 全屏叠加层渲染，标题栏显示"时钟"，内容区显示当前时间（HH:mm:ss 格式）和日期（YYYY年MM月DD日 周X 格式）；每秒钟数字更新一次；数字字体为等宽（tablular-nums）

### 场景: BasicClock 隐藏日期行

- Given 用户通过属性编辑器将 `showDate` prop 设为 `false`
- When 属性变更后重新渲染
- Then 仅显示时间行（HH:mm:ss），日期行不可见；Vue 的 `v-if="showDate"` 控制其实质性移除 DOM

### 场景: BasicIframe 加载外部页面

- Given 用户已添加"网页应用"到 App 列表，并配置 `url` 为 `https://example.com`
- When 用户启动"网页应用"
- Then 全屏叠加层渲染，标题栏显示"网页应用"，内容区 iframe 加载 `https://example.com`；iframe 带 `sandbox` 安全属性；缩放自动适配窗口尺寸

### 场景: BasicIframe 未配置 URL 时回退默认地址

- Given 用户添加"网页应用"但未配置 `url`（`url` prop 为空字符串）
- When 用户启动"网页应用"
- Then iframe 加载默认演示地址 `about:blank`

### 场景: 两个 App 同时运行

- Given 用户分别添加了"时钟"和"网页应用"到 App 列表
- When 用户先启动"时钟"，再启动"网页应用"
- Then 两个 App 均在叠加层渲染；"网页应用" z-order 在"时钟"之上（后启动者置顶）；底部工具条运行中 App 区域同时显示两个条目；两个 App 可独立最小化/恢复/关闭

### 场景: App 最小化后恢复

- Given "时钟" App 正在运行
- When 用户点击标题栏的最小化按钮
- Then 时钟实例以动画方式隐藏（opacity: 0, translateY），但 Vue 组件实例保持存活，定时器继续运行；当用户从工具条点击恢复，App 重新显示且时间连续无中断

### 场景: App 关闭后定时器清除

- Given "时钟" App 正在运行
- When 用户点击标题栏的关闭按钮
- Then App 从 DOM 移除，`onBeforeUnmount` 钩子清除 `setInterval`（如果不清除，匿名闭包引用的 `now` ref 将阻止 GC）

### 场景: 窗口 resize 时 BasicIframe 重新缩放

- Given "网页应用" 正在运行，嵌入了一个 1440×900 的页面
- When 用户调整浏览器窗口大小
- Then iframe 缩放比例实时更新（通过 window resize 事件 → calc() 重新计算 scaleX/scaleY）

## 6. 非功能需求

### 6.1 性能

- NFR-401-001: BasicClock 的 `setInterval` 间隔 MUST 为 1000ms，不宜更小（避免无效高频渲染），不宜更大（保证秒级精度感知）。
- NFR-401-002: BasicIframe 的 resize 事件回调 MUST 为轻量同步计算（O(1) 复杂度），不应包含 DOM 遍历或复杂数据操作。

### 6.2 可靠性

- NFR-401-003: BasicClock 和 BasicIframe MUST 在 `onBeforeUnmount` 中清理各自的监听器（`clearInterval` / `removeEventListener`），确保 App 反复启动关闭不产生泄漏。
- NFR-401-004: BasicIframe 的缩放计算 MUST 对零值容器尺寸和零值内容尺寸有保护回退（scale=1），避免除零或 `NaN` 缩放值。

### 6.3 安全

- NFR-401-005: BasicIframe 的 iframe MUST 使用 `sandbox` 属性限制 iframe 内部脚本能力（allow-scripts allow-same-origin allow-forms allow-popups），并 MUST 使用 `referrerpolicy="no-referrer"` 防止 Referer 头泄漏。
- NFR-401-006: BasicIframe 的 `url` prop 通过属性编辑器配置，不经过 URL 编码或转义处理，直接作为 iframe src 绑定。此项为设计选择，非安全漏洞（iframe sandbox 提供了必要隔离）。`[NEEDS CLARIFICATION: 是否需要在属性编辑器层对 url 输入做格式校验（如必须以 http/https 开头）？]`

### 6.4 可访问性

- NFR-401-007: BasicClock 时间文本 SHOULD 使用 `font-variant-numeric: tabular-nums` 确保等宽数字渲染，减少视觉抖动对用户注意力的干扰。

### 6.5 国际化

- NFR-401-008: BasicClock 日期显示 MUST 使用内置 `WEEK_CN` 数组提供中文星期映射（周日~周六），不依赖 dayjs locale 插件以控制包体积。

## 7. 假设与约束

### 假设

1. **App 运行环境**：App 实例由 003-app-system 框架管理，通过 `<component :is="AppComponents[app.compName]">` 渲染。本模块假设该框架已正确提供 props 注入和生命周期管理。
2. **属性编辑器存在**：props 的值由 101-prop-editor 在用户配置后持久化到 localStorage，启动 App 时从持久化数据中读取并作为 props 传递。本模块不做任何持久化逻辑。
3. **CSS 变量可用性**：`--desktop-text-primary`、`--desktop-text-secondary`、`--desktop-bg-secondary` 等 CSS 变量由 005-theme-system 在 `:root` 或 `html.dark` 下定义。
4. **dayjs 已安装**：`dayjs` 作为项目 dependency 存在于 `package.json`，版本 ≥ 1.11.0。
5. **网络可用性**：BasicIframe 加载外部 URL 需要用户浏览器有网络连接。网络不可用时 iframe 显示浏览器默认错误页。

### 约束

1. **无控制按钮**：BasicClock 和 BasicIframe 均不额外提供任何内部 UI 控件（如设置按钮），所有配置通过 App 系统的属性编辑器和外壳操作完成。
2. **无全局状态访问**：App 组件不引用 `useGridStack`、`desktopConfig`、`currentPageIndex` 或 `localStorage`，仅通过 props 与外部通信。
3. **rect 不可 resize**：与 Widget 不同，App 的 `rect` 字段仅定义初始叠加层尺寸（目前两个 App 均未使用该值做尺寸约束——外层 wrapper 固定为 inset:0 全屏）。App 自身不提供 resize 拖拽功能。
4. **component 只读**：App 组件读取 props 渲染内容，不通过 emit 向父组件上报任何事件（`events` 数组为空），无从外部修改 props 的能力。

## 8. 依赖关系

### 上游依赖（本模块依赖的模块）

| 模块 | 依赖性质 | 说明 |
|------|----------|------|
| 003-app-system | 强依赖 | App Registry 自动注册 `.app.js/.app.vue`；AppWrapper 提供外壳渲染；App 实例生命周期由该模块管理 |
| 005-theme-system | 弱依赖 | CSS 变量 `--desktop-*` 提供颜色，但 App 可在无主题系统时使用浏览器默认色 |
| 101-prop-editor | 弱依赖 | 属性编辑器消费 `.app.js` 中的 `props` 定义生成配置 UI；不影响 App 自身渲染 |
| dayjs (npm) | 强依赖 | BasicClock 需要 dayjs 提供时间解析和格式化，版本 `^1.11.19` |

### 下游依赖（依赖本模块的模块）

| 模块 | 依赖性质 | 说明 |
|------|----------|------|
| 003-app-system | 被消费 | App Registry 扫描并注册 BasicClock 和 BasicIframe；App 市场展示这两个 App 供用户添加 |
| 101-prop-editor | 被消费 | 属性编辑器读取 App meta 中的 `props` 字段生成配置表单 |
| 201-page-index | 被消费 | Desktop.vue 通过 `desktopApps` 数组启动并渲染 App 实例 |
