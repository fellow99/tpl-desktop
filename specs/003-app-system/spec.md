# App 应用系统 规格文档

> 模块: 003-app-system
> 状态: 已实现
> 最后更新: 2026-07-19

## 1. 模块概述

### 1.1 目的 — 为什么存在这个模块

App 应用系统为工作台提供**全屏叠加运行的独立应用**能力。与嵌入桌面网格的 Widget 不同，App 以全屏覆盖层形式渲染在桌面之上，拥有独立的标题栏、最小化/关闭操作，让用户可以在桌面环境中运行独立功能（如时钟、网页浏览器等）而不离开工作台界面。

### 1.2 解决的问题 — 痛点

- 桌面网格无法承载全屏交互场景：Widget 受限于网格 Cell 尺寸，无法提供全屏体验
- 应用发现与添加：用户需要一个统一的入口浏览所有可用的 App 并将其加入个人列表
- 多任务管理：用户可能同时打开多个 App，需要在它们之间切换、最小化、恢复、关闭
- 扩展性：新增 App 只需添加文件对（.app.vue + .app.js），无需修改注册代码

### 1.3 范围 — 包含与排除

**包含**：
- App 元数据规约（\*.app.js + \*.app.vue 文件对）
- 构建时自动注册（import.meta.glob eager 扫描）
- App 元数据响应式访问（useAppMetas composable）
- App 叠加层渲染（viewport-app 图层 + app-wrapper 外壳）
- App 生命周期管理：启动、最小化、恢复、关闭
- App 列表面板（el-dialog，本地持久化的用户 App 集合）
- App 应用市场（分类浏览、实时预览、属性配置后添加）
- 快捷方式（shortcuts）：在底部工具条固定常用 App 的快速启动入口
- 运行时 App 与 Widget 的 grid-active / grid-deactive 协调

**排除**：
- 具体 App 实现（BasicClock、BasicIframe 等属于 401-app-basic-apps）
- 桌面网格布局系统（属于 001-desktop-grid）
- 属性编辑器组件（属于 101-prop-editor，被应用市场消费）
- 桌面配置双源加载与整体持久化（属于 201-page-index Desktop.vue 编排层）

## 2. 用户故事

- 作为**桌面用户**，我可以通过底部工具条的 App 按钮打开 App 列表，浏览我已添加的 App 并点击启动它们，以便在桌面环境中运行独立应用。
- 作为**桌面用户**，我可以通过应用市场浏览系统内所有可用的 App，按分类筛选，预览效果并配置属性后将其添加到我的 App 列表中。
- 作为**桌面用户**，我可以最小化正在运行的 App 来暂时隐藏它而不关闭，稍后从工具条点击恢复。
- 作为**桌面用户**，我可以关闭 App 彻底结束其运行，释放桌面空间。
- 作为**桌面用户**，我可以将常用 App 固定为快捷方式，使其出现在底部工具条上以一键启动。
- 作为**桌面用户**，我可以在编辑模式下通过桌面图标快捷方式启动 App，系统自动切换到常规模式。
- 作为**开发者**，我可以通过添加 \*.app.vue + \*.app.js 文件对接入新 App，系统自动发现并注册，无需修改任何注册代码。

## 3. 功能需求

### 3.1 元数据注册 (Metadata Registration)

- FR-003-001: 系统 MUST 在构建时通过 `import.meta.glob` 自动扫描 `src/apps/` 目录下所有 `*.app.vue` 与 `*.app.js` 文件对，构建 App 组件字典（AppComponents）和元数据字典（AppMetas）。
- FR-003-002: 系统 MUST 从文件路径自动提取 `compName`（如 `./basic/BasicClock.app.vue` → `BasicClock`），并注入到元数据对象中，元数据文件不应手写 `compName` 字段。
- FR-003-003: 系统 MUST 对缺失的元数据字段提供默认值回退：`category` → `'其他'`，`rect` → `{ unit: 'grid', width: 4, height: 3 }`，`events` / `propsEditors` / `wrapperEditors` → `[]`，`title` 缺失时回退为 `compName`。
- FR-003-004: 系统 MUST 对仅有 `.app.vue` 而无配套 `.app.js` 的孤儿组件自动生成最小默认元数据，保证其仍可被发现和使用。
- FR-003-005: 系统 MUST 对同名冲突（多个文件提取出相同 compName）给出 `console.warn` 警告并以最后加载者覆盖。
- FR-003-006: 系统 MUST 对 `.app.js` 的 default 导出非对象（null / 数组 / undefined 等）给出 `console.warn` 警告并降级为空对象，不中断注册流程。

### 3.2 元数据访问 (Metadata Access)

- FR-003-007: 系统 MUST 通过 `useAppMetas()` composable 提供响应式的 App 元数据字典（`Ref<Record<string, AppMeta>>`），所有调用方共享同一份模块级单例状态。
- FR-003-008: 元数据对象在注册后 MUST 为只读，运行时组件不得修改 `AppMetas` 中的条目。

### 3.3 App 叠加层渲染 (App Overlay Rendering)

- FR-003-009: 系统 MUST 在桌面视口之上提供独立的 App 渲染图层（`desktop-viewport-app`），该图层 `pointer-events: none`，仅内部 App 实例可交互。
- FR-003-010: 每个运行的 App 实例 MUST 由 `desktop-app-wrapper` 外壳包裹，外壳提供标题栏、最小化按钮（➖）和关闭按钮（❌）。
- FR-003-011: App 实例区域 MUST 为全屏最大化（`position: absolute; inset: 0`），后打开的 App 覆盖在先打开的 App 之上（DOM 顺序天然保证 z-order）。
- FR-003-012: App 组件 MUST 通过 Vue 动态组件 `<component :is="AppComponents[app.compName]">` 渲染，初始 props 从 `appMeta.props.*.default` 提取。
- FR-003-013: 最小化状态的 App 实例 MUST 通过 CSS 隐藏（`opacity: 0; transform: translateY(60px); pointer-events: none`）但保持 DOM 存在和 Vue 实例存活。

### 3.4 App 生命周期 (App Lifecycle)

- FR-003-014: 系统 MUST 支持启动 App：将包含 `instanceId`（时间戳+随机字符串）、`compName`、`appMeta`、`wrapperValues`、`state` 的实例对象加入 `desktopApps` 数组，通过 Vue 响应式驱动 v-for 渲染。
- FR-003-015: 当用户启动的 App 已有运行实例时（compId 优先匹配，回退 compName），系统 MUST 不创建新实例，而是将已有实例的 `state` 恢复为 `null`（非最小化）并移至数组末尾（z-order 置顶）。
- FR-003-016: 系统 MUST 支持最小化 App：将实例的 `state` 设为 `'minimize'`。
- FR-003-017: 系统 MUST 支持恢复 App：将实例的 `state` 从 `'minimize'` 设为 `null`。
- FR-003-018: 系统 MUST 支持关闭 App：从 `desktopApps` 数组中移除该实例（通过 `instanceId` 精确匹配），Vue 响应式自动销毁对应的 DOM 和组件实例。
- FR-003-019: 系统 MUST 通过 300ms debounce 机制在 App 打开/关闭时向当前页面所有 Widget 广播 `grid-deactive` / `grid-active` 事件，确保 Widget 在 App 覆盖期间暂停活性交互。
- FR-003-020: 系统 MUST 在用户切换到其他桌面页面时，向新页面所有 Widget 补发 `grid-deactive` 事件（若已有 App 打开），避免页面切换后 Widget 被误激活。

### 3.5 App 列表 (App List)

- FR-003-021: 系统 MUST 提供 App 列表面板（`desktop-app-list`），以 `el-dialog` 模态框形式展示用户已添加的 App。
- FR-003-022: 系统 MUST 将 App 列表持久化到 localStorage 键 `dashboard-desktop-apps`，并在 `onMounted` 时加载，通过 `watch(deep)` 自动持久化。
- FR-003-023: 列表 MUST 按分类标签栏筛选显示，分类集合取自已添加 App 的分类 ∪ 已注册 AppMeta 的分类，包含"全部"选项。
- FR-003-024: 每个列表条目 MUST 提供：点击启动（发射 `addApp` 事件并关闭面板）、快捷方式切换按钮（📌 固定 / 🔘 取消）、移除按钮（❌ 从列表删除）。
- FR-003-025: 列表 MUST 提供"＋"按钮入口，发射 `openStore` 事件由编排层打开平级挂载的应用市场。
- FR-003-026: 列表 MUST 暴露 `addFromStore(appMeta)` 方法供应用市场 confirm 后回写：通过 djb2 hash 生成 `compId`，条目入列并自动持久化。

### 3.6 App 应用市场 (App Store)

- FR-003-027: 系统 MUST 提供 App 应用市场（`desktop-app-store`），以 `el-dialog` 模态框展示所有已注册的 App 元数据。
- FR-003-028: 应用市场 MUST 采用三栏布局：左侧 el-tree 两级分类树（category → AppMeta，default-expand-all）、中间 h()+render() 实时预览区、右侧应用配置（title/category）和属性配置（desktop-property-form 动态表单）。
- FR-003-029: 左侧树节点点击选中 App 后，中间 MUST 通过 `h(Comp, propsValues) + render(vnode, el)` 模式实时渲染预览实例，属性变更通过 deep watch 自动刷新预览。
- FR-003-030: 点击「添加」按钮 MUST 以选中 AppMeta 为基础深拷贝，注入配置 form 的 title/category 和属性默认值，封装为 enriched AppMeta 后通过 `confirm` 事件返回编排层。

### 3.7 快捷方式 (Shortcuts)

- FR-003-031: 系统 MUST 支持将 App 固定为快捷方式：`desktopConfig.shortcuts` 数组存储 `{ compName, appMeta, compId? }` 条目，随桌面配置一同持久化。
- FR-003-032: 系统 MUST 在底部主工具条渲染所有快捷方式，点击后发射 `addApp` 事件启动对应 App。
- FR-003-033: 系统 MUST 支持取消快捷方式：从 `desktopConfig.shortcuts` 数组中移除对应条目并持久化。
- FR-003-034: App 列表面板的每个条目 MUST 通过 `📌`（已固定）/ `🔘`（未固定）图标标识其快捷方式状态。

## 4. 关键实体

### 4.1 AppMeta（App 元数据）

| 属性 | 类型 | 说明 | 来源 |
|------|------|------|------|
| `title` | string | App 显示名称 | .app.js 显式声明或 compName 回退 |
| `category` | string | App 分类 | .app.js 声明或 `'其他'` 回退 |
| `avatar` | string\|null | 头像图标 URL | .app.js |
| `thumbnail` | string\|null | 缩略图 URL | .app.js |
| `rect` | object | 默认网格尺寸 `{ unit, width, height }` | .app.js 或 `{ unit:'grid', width:4, height:3 }` |
| `props` | Record\<string, PropMeta\> | App 属性定义（title/category/type/default） | .app.js |
| `events` | array | 预留事件扩展点（当前始终为空） | .app.js 或 `[]` 回退 |
| `propsEditors` | array | 预留属性编辑器扩展点（当前始终为空） | .app.js 或 `[]` 回退 |
| `wrapperEditors` | array | 预留外壳编辑器扩展点（当前始终为空） | .app.js 或 `[]` 回退 |
| `compName` | string | 组件名（文件路径提取） | apps/index.js 自动注入 |

### 4.2 App 运行实例

| 属性 | 类型 | 说明 |
|------|------|------|
| `instanceId` | string | 稳定实例标识（`Date.now().toString(36) + random`），用于 v-for key 和精确匹配 |
| `compName` | string | 组件名，关联 AppComponents 字典 |
| `compId` | string? | 应用市场生成的 hash ID（djb2），用于应用市场条目去重和快捷方式匹配 |
| `appMeta` | AppMeta\|null | 启动时传入的元数据（浅拷贝） |
| `wrapperValues` | object | 外壳值 `{ title }`，优先使用 appMeta.title，回退 compName |
| `state` | null\|'minimize' | `null` = 运行中可见，`'minimize'` = 最小化隐藏 |

### 4.3 App 实例状态机

```
                    ┌─────────────┐
                    │   (不存在)   │  ← 初始 / 关闭后
                    └──────┬──────┘
                           │ addApp (启动)
                           ▼
                    ┌─────────────┐
           ┌───────│   运行中     │───────┐
           │       │ state: null  │       │
           │       └──────┬──────┘       │
           │              │              │
           │ minimizeApp  │  toggleApp   │ removeApp
           │ (最小化)     │  State       │ (关闭)
           │              │              │
           ▼              ▼              ▼
    ┌─────────────┐               ┌─────────────┐
    │   最小化    │──restore─────▶│   (不存在)   │
    │  minimize   │  toggleApp   │  splice 移除  │
    └─────────────┘  State       └─────────────┘

    重复启动：若 compId/compName 已存在 → 恢复 state=null 并移至数组末尾
```

## 5. 验收场景

### 场景 1: 通过 App 列表启动 App

- Given 用户已登录桌面，App 列表中已有"时钟"条目
- When 用户点击底部工具条「App」→ 打开 App 列表 → 点击"时钟"
- Then 时钟 App 以全屏叠加层运行，标题栏显示"时钟"，可操作最小化/关闭按钮；底部工具条运行中 App 区域出现"时钟"条目

### 场景 2: 从应用市场浏览并添加 App

- Given 用户已登录桌面
- When 用户打开 App 列表 → 点击「＋」→ 应用市场打开 → 左侧树展开"基础应用" → 点击"时钟" → 中间预览区显示时钟 → 点击「添加」
- Then "时钟"出现在 App 列表中，且持久化到 localStorage

### 场景 3: 最小化与恢复 App

- Given 时钟 App 正在全屏运行
- When 用户点击标题栏最小化按钮（➖）
- Then App 内容以 opacity 0 + translateY 60px 动画隐藏；底部工具条该 App 条目变半透明（opacity 0.55）；桌面上 GridStack Widget 收到 grid-active 事件恢复活性
- When 用户再次点击工具条该 App 条目
- Then App 恢复全屏显示，Widget 收到 grid-deactive 事件暂停活性

### 场景 4: 关闭 App

- Given 时钟 App 正在运行
- When 用户点击标题栏关闭按钮（❌）或工具条 × 按钮
- Then App 实例从 DOM 中完全移除；底部工具条运行中 App 条目消失；若已无其他运行 App，Widget 收到 grid-active 事件

### 场景 5: 重复启动同一 App

- Given 时钟 App 正在运行中
- When 用户再次从 App 列表或快捷方式启动"时钟"
- Then 系统不创建第二个实例，而是将已有时钟实例恢复为 `state: null`（若非最小化状态），并将其 z-order 置顶

### 场景 6: 快捷方式固定/取消

- Given App 列表中有"时钟"
- When 用户 hover "时钟"条目 → 点击 🔘（固定为快捷调用）
- Then 底部工具条出现"时钟"快捷方式图标；App 列表该条目图标变为 📌（已固定）
- When 用户再次 hover 并点击 📌
- Then 快捷方式从工具条移除；App 列表该条目图标变回 🔘

### 场景 7: 主页按钮最小化所有 App

- Given 时钟和网页应用均在全屏运行
- When 用户点击工具条「🏠 主页」
- Then 所有运行 App 变为最小化状态（state: 'minimize'）；桌面回到第一页；Widget 恢复活性

### 场景 8: 页面刷新后的行为

- Given 用户已在 App 列表中添加了"时钟"和"网页应用"，并固定了"时钟"为快捷方式
- When 用户刷新页面（F5）
- Then App 列表重新从 localStorage 加载，保留之前的"时钟"和"网页应用"条目；快捷方式从 desktopConfig.shortcuts 恢复；但所有运行中的 App 实例不复存在（desktopApps 不持久化）

## 6. 非功能需求

- **性能**: App 实例的最小化必须仅通过 CSS 隐藏，不销毁 Vue 组件实例，以确保恢复时零延迟。
- **性能**: App 打开/关闭时 grid-active/grid-deactive 广播必须通过 300ms debounce 防止快速操作导致的事件抖动。
- **可访问性**: 外壳按钮（最小化/关闭）必须有明确的 `title` 属性提供屏幕阅读器语义。
- **健壮性**: 注册流程中的任何异常（文件缺失、JSON 解析失败、命名冲突）不得中断整个注册流程，必须以 `console.warn` 降级处理。
- **持久化安全**: `desktopApps`（运行实例）不得持久化，仅 `desktopApps` 列表（用户添加的 App 集合）和 `shortcuts` 可通过 localStorage/desktopConfig 持久化。
- **i18n**: 分类排序使用 `localeCompare('zh-Hans-CN')`，支持中文排序。

## 7. 假设与约束

- App 安装路径固定在 `src/apps/` 目录下（不能通过配置更改扫描路径）。
- App 组件的初始 props 仅从 `appMeta.props.*.default` 读取，当前不支持运行时动态传参。
- 应用市场的属性配置依赖 `desktop-property-form`（101-prop-editor 模块），假定其已正确实现。
- App 运行实例的 z-order 由数组尾部位置决定（最后添加的在最上层），不提供用户手动排序。
- 桌面切换页面时所有 Widget 被标记为 grid-deactive（若有 App 运行），不区分散点 Widget 的独立激活状态。
- `desktopApps`（运行实例数组）仅在内存中维护，页面刷新后所有运行实例丢失——这是设计决定，不是缺陷。

## 8. 依赖关系

### 上游依赖（本模块依赖）

| 模块 | 依赖内容 |
|------|----------|
| 201-page-index (Desktop.vue) | 持有 desktopApps ref、编排 App 生命周期函数、协调快捷方式持久化 |
| 101-prop-editor | desktop-property-form 动态表单组件（被应用市场 rightside 消费） |
| Element Plus | el-dialog、el-tree、el-input、el-button 等 UI 组件 |
| Vue 3 | ref、reactive、computed、watch、h、render、nextTick 等核心 API |

### 下游依赖（依赖本模块）

| 模块 | 依赖内容 |
|------|----------|
| 201-page-index (Desktop.vue) | 消费 AppComponents、AppMetas、useAppMetas、desktop-viewport-app、desktop-app-wrapper、desktop-app-list、desktop-app-store |
| 201-page-index (toolbar-main) | 消费 desktop-app-list 的 shortcuts props 进行快捷方式渲染 |
| 401-app-basic-apps | 实现 AppMeta 规约的 .app.js，其 App 组件通过 AppComponents 字典被动态渲染 |
