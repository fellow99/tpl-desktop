# 工作台 — 项目架构宪法

> 项目: tpl-desktop（工作台）
> 文档类型: As-Built（基于源代码逆向整理，描述代码库实际遵循的原则）
> 最后更新: 2026-07-19

## 序言

本文档描述 tpl-desktop 工作台代码库实际遵循的架构原则、编码规范和边界约束。每一条原则均源自对源代码的直接观察，附有文件路径证据。本文档是**描述性**的（代码库已经这样做了），而非规定性的。

---

## 第一章: 架构原则

### 第1条: 元数据驱动的组件扩展 (Metadata-Driven Extension)

**级别**: MUST（必须遵守，已有严格遵守证据）

**正文**:
所有 Widget、App、Background 均通过 Vite `import.meta.glob` 构建时自动扫描发现并注册，无需手动修改注册入口代码:

- Widget: `./**/*.widget.vue` + `./**/*.widget.js` 文件对自动配对 (`src/widgets/index.js:24-25`)
- App: `./**/*.app.vue` + `./**/*.app.js` 文件对自动配对 (`src/apps/index.js:24-25`)
- Background: `./**/*.bg.js` 元数据文件自动扫描 (`src/backgrounds/index.js:18`)
- UI 组件: `./**/desktop-*.vue` 自动扫描 (`src/components/index.js:11`)

新增组件只需在对应目录下添加文件对（含元数据 `.js` 及可选的 Vue 组件 `.vue`），Vite HMR 后自动可见。Registries 提供默认值回退（如缺少 category 回退为 `'其他'`，缺少 title 回退为文件路径提取的 `compName`）。

**验证**: 在 `src/widgets/basic/` 下新增 `*.widget.vue + *.widget.js` 文件对，dev server 不重启即可在部件列表中看到新组件。

---

### 第2条: 看板组件宿主与内容分离 (Wrapper-Slot Separation)

**级别**: MUST

**正文**:
所有 GridStack 内渲染的 Widget 必须通过 `desktop-widget-wrapper` 容器外壳挂载。外壳负责: 标题栏渲染 (`wrapper-header`)、编辑/删除操作按钮 (`wrapper-actions`)、边框与背景样式 (`desktop-widget-wrapper.vue:39-52`)。Widget 内容通过默认 `<slot>` 注入，由视口调用 `h(Comp, compProps)` 构建 VNode (`desktop-viewport-desktop.vue:186-196`)。

Widget 组件本身只接收 props 并渲染内容，不直接操作 GridStack、desktopConfig 或编辑器状态。

**验证**: 任何 `*.widget.vue` 文件中不应出现 `GridStack` 引用、`desktopMode` 判断或直接 localStorage 操作。

---

### 第3条: 模块级单例共享状态 (Module-Level Singleton State)

**级别**: MUST

**正文**:
跨组件共享状态不使用 Pinia 或全局变量，而是通过 composable 文件内的模块级 (module-scope) `ref()` / `Map` 实现单例:

- `useGridStack.js`: 模块级 `grids` Map + `activeStates` Map + `widgetEmitters` Map (`useGridStack.js:24-28`)
- `useTheme.js`: 模块级 `isDark` ref + 单次 `window.matchMedia` 监听 (`useTheme.js:20,73-77`)
- `useWidgetMetas.js`: 模块级 `ref(WidgetMetas)` (`useWidgetMetas.js:11`)
- `useAppMetas.js`: 模块级 `ref(AppMetas)` (`useAppMetas.js:11`)
- `useBackgroundMetas.js`: 模块级 `ref(BackgroundMetas)` (`useBackgroundMetas.js:12`)

所有调用点 (`useGridStack()`, `useTheme()`, 等) 读写的是同一份模块顶层值，形成事实上的单例。

**验证**: 代码中无 `defineStore`、无 `import { createPinia }`、无 `import mitt` (已安装但未使用)。`grep "import.*mitt"` 零匹配。

---

### 第4条: VNode 渲染与 GridStack 共存 (VNode / GridStack Coexistence)

**级别**: MUST

**正文**:
看板组件在 GridStack 容器内的挂载**必须**使用 `h()` + `render()` 模式，**不得**在 `.grid-stack` 元素内使用 `<template>` 渲染组件。因为 GridStack 动态管理 DOM 节点（添加、移动、删除），Vue 模板无法感知这些 DOM 变更。

`desktop-viewport-desktop.vue` 中的 `rerenderNode()` 是看板组件挂载的**唯一入口** (`desktop-viewport-desktop.vue:139-203`)。该函数执行:
1. `render(null, contentEl)` — 先卸载旧的 VNode
2. `h(WidgetWrapper, wrapperProps, { default: () => h(Comp, compProps) })` — 构建新 VNode
3. `render(vnode, contentEl)` — 挂载到 GridStack 内容区
4. `registerWidgetEmitter(nodeId, emit)` — 注册 Widget 事件桥接

**验证**: 所有 GridStack 节点的子元素内容由 `rerenderNode` 生成，GridStack 模板中只有空的 `div.grid-stack` 占位元素。

---

### 第5条: 纯 Props/Emits 单向数据流 (Props/Emits Unidirectional Flow)

**级别**: MUST

**正文**:
组件间通信遵循: 父→子 通过 props 绑定，子→父 通过 `defineEmits` 事件上报。不存在 mitt 事件总线 (已安装但未使用)，不存在全局状态注入 (`provide/inject` 未使用)。

唯一的例外是 `useGridStack` 提供的 `emitToWidget` / `broadcastToAllWidgets` / `broadcastToCurrentPageWidgets` 函数，它们通过内部 Map 存储 Widget 实例的 `$emit` 函数引用，实现跨层级的 GridStack DOM 事件 → Widget Vue 实例事件桥接 (`useGridStack.js:36-50`)。这是必要的桥接手段，因 GridStack 的 DOM 事件监听发生在 Vue 组件树之外。

**验证**: 所有 `.vue` 文件中的 `defineEmits` 使用与 `emit()` 调用一致，`grep "mitt"` 在所有 `.js/.vue` 文件中零匹配。

---

### 第6条: 页面编排器中心化状态 (Centralized Orchestrator State)

**级别**: MUST

**正文**:
`Desktop.vue` 是应用唯一的页面级编排器，持有所有顶层 `ref()` 状态 (`Desktop.vue:38-64`)。子组件 (statusbar, toolbar, viewport, 各面板) 不持有独立状态源，而是通过 props 接收 + emits 上报。这形成以 Desktop.vue 为根的**单一状态树**——没有 Router、没有 Pinia store、没有全局状态对象。

**排除**: composable 层的模块级单例状态 (第3条) 不在此约束范围内，它们提供的是逻辑能力（GridStack 实例管理、主题切换、元数据读取），而非 UI 状态。

**验证**: Desktop.vue 是唯一包含 `desktopMode`、`desktopConfig`、`desktopApps`、`currentPageIndex` 等 ref 声明的地方。子组件通过 props 定义接收 (`defineProps`)，不自行创建。

---

## 第二章: 编码规范

### 第7条: Composition API 唯一风格

**级别**: MUST

**正文**:
所有 `.vue` 组件必须使用 `<script setup>` + Composition API。禁止 Options API (`export default { data, methods, ... }`)。
所有 composable 导出纯函数，调用方通过解构获取返回值。

**验证**: 所有 `.vue` 文件的 `<script>` 标签均带 `setup` 属性。Composable 均为 `export function useXxx() { return { ... } }` 形态。

---

### 第8条: 命名约定

**级别**: MUST

**正文**:

| 分类 | 命名规则 | 示例 |
|---|---|---|
| UI 组件 (src/components/) | `desktop-*.vue` (kebab-case) | `desktop-statusbar.vue`, `desktop-widget-wrapper.vue` |
| Widget 组件 | `*.widget.vue` (PascalCase 前缀) | `BasicText.widget.vue` |
| Widget 元数据 | `*.widget.js` (与 vue 配对) | `BasicText.widget.js` |
| App 组件 | `*.app.vue` | `BasicClock.app.vue` |
| App 元数据 | `*.app.js` | `BasicClock.app.js` |
| Background 元数据 | `*.bg.js` | `dark-001.bg.js` |
| Composable | `use*.js` (camelCase) | `useGridStack.js`, `useTheme.js` |
| CSS 变量 | `--desktop-*` | `--desktop-bg-primary`, `--desktop-text-primary` |

组件名 (`compName`) 由注册表从文件路径自动提取，**不应**在元数据文件中手写 `compName` 字段。

**验证**: `src/widgets/index.js:28-31`, `src/apps/index.js:28-31`, `src/backgrounds/index.js:21-24`, `src/components/index.js:14-15` 均展示自动提取逻辑。

---

### 第9条: SCSS 主题 CSS 变量体系

**级别**: MUST

**正文**:
所有颜色必须通过 CSS 变量 `--desktop-*` 引用，禁止硬编码颜色值:

- 浅色主题变量定义在 `:root {}` (`src/themes/light/theme.scss:6-29`)
- 深色主题变量定义在 `html.dark {}` (`src/themes/dark/theme.scss:6-29`)
- 全局样式引入在 `src/style.scss:3-4`
- 主题切换通过 `document.documentElement.classList.toggle('dark')` 实现 (`useTheme.js:41-45`)
- 反闪烁脚本在 `index.html:8-21` 中先于 Vue 挂载执行

**验证**: 所有 `.vue` 组件样式引用 `var(--desktop-xxx)`，硬编码颜色出现在仅 `themes/` 目录和 `style.scss` 中。

---

### 第10条: CSS 作用域隔离

**级别**: MUST

**正文**:
所有 `.vue` 组件的样式必须使用 `<style scoped lang="scss">` (`desktop-widget-wrapper.vue:54`, `Desktop.vue:558`)。全局样式**仅限** `src/style.scss` 和 `src/themes/` 目录。

**验证**: 所有 `.vue` 文件的 `<style>` 标签带 `scoped` 属性 (Desktop.vue 基础布局样式同样 `scoped`)。

---

### 第11条: 元数据默认值回退

**级别**: MUST

**正文**:
所有 Registry (widgets/apps/backgrounds) 在注册时必须提供完整的默认值回退逻辑:

- Widget 元数据: `category` → `'其他'`, `rect` → `{ unit:'grid', width:1, height:1 }`, `events/propsEditors/wrapperEditors` → `[]`, `title` → `compName` (`src/widgets/index.js:56-69`)
- App 元数据: 同 Widget 结构，`rect` 默认值 `{ width:4, height:3 }` (`src/apps/index.js:56-69`)
- Background 元数据: `category` → `'其他'`, `type` → `'image'`, `title` → `name` (`src/backgrounds/index.js:39-49`)
- 孤儿组件 (有 .vue 无 .js): 自动补一份最小默认元数据 (`src/widgets/index.js:72-86`, `src/apps/index.js:72-85`)
- default 导出非对象: 降级为空对象，不中断注册流程

**验证**: 所有 Registry 文件包含完整的默认值回退和 console.warn 降级处理。

---

### 第12条: 图标使用规范

**级别**: MUST

**正文**:
源代码中使用的 UI 图标一律使用 iconfont（`<span class="ss-icon ss-icon-xxx"></span>`），禁止直接使用 Unicode emoji 字符。iconfont 在 CSS 变量体系下可统一着色和缩放，确保跨平台视觉一致性。

对应功能的 markdown 文档描述中可使用 emoji，以增强文档可读性和直观表达需求。

**iconfont 资源**:
- 图标库: `public/ss-icon/`
- HTML 引入: `<link rel="stylesheet" href="./ss-icon/iconfont.css">`
- 图标对照表: `docs/iconfont-emoji.md`

**验证**: 所有 `.vue` 模板中不应出现 Unicode emoji（注释除外）。使用 `grep` 扫描 `src/` 下的模板文本中的 emoji 字符。

---

### 第13条: 错误处理策略

**级别**: SHOULD

**正文**:
- fetch 失败: 回退到内置默认配置或 mock 数据，不阻断应用启动 (`Desktop.vue:75-78`, `auth-service.js:109-116`)
- localStorage 不可用: try/catch 包裹，静默降级（隐私模式/存储已满）(`Desktop.vue:102-106`, `useTheme.js:31-37`, `auth-service.js:58-64`)
- GridStack 初始化失败: `console.error` + 返回 `null`，不抛出异常 (`useGridStack.js:102-116`)
- JSON 解析失败: 静默回退到原始值或 `null` (`Desktop.vue:81-87`, `auth-service.js:132-138`)
- 元数据默认导出非法: `console.warn` + 降级到空对象/默认值 (`src/widgets/index.js:51-55`, `src/apps/index.js:51-55`)

**验证**: 无全局异常处理 (如 Vue errorHandler), 每处都有本地防御式 try/catch 或条件守卫。

---

## 第三章: 边界与约束

### 第14条: Widget 组件不得接触桌面状态

**级别**: MUST NOT

**正文**:
Widget 组件 (`*.widget.vue`) 不得:
- 直接读写 `localStorage`
- 引用 `Desktop.vue` 或 `useGridStack` composable
- 访问 `desktopConfig`、`desktopMode`、`currentPageIndex`
- 操作 GridStack API (drag/resize/add/remove)
- 修改自身所在 GridStack 节点的 `x/y/w/h`

Widget 只能: 接收 props，渲染内容，通过 emit 上报自身事件。

**验证**: 搜索 `src/widgets/` 下所有 `.vue` 文件，不应出现 `GridStack`、`localStorage`、`desktopConfig`、`useGridStack` 引用。

---

### 第15条: 只读元数据消费

**级别**: MUST NOT

**正文**:
元数据对象 (`WidgetMetas`, `AppMetas`, `BackgroundMetas`) 由 Registry 在模块加载时一次性构建，运行时各组件只能**读取**，不得修改。元数据的 `events`、`propsEditors`、`wrapperEditors` 字段目前均为空数组预留扩展点 (`src/widgets/basic/BasicText.widget.js:23-25`)，当前代码中无消费这些字段的逻辑。

**验证**: codebase 中无对 `meta.events` 数组的遍历，无任何地方修改 `WidgetMetas[compName]` 或 `AppMetas[compName]` 对象。

---

### 第16条: 持久化的数据安全边界

**级别**: MUST NOT

**正文**:
localStorage 不得存储:
- 明文密码（`auth-service.js:48-55` `toLoginUser` 显式剔除 `password` 字段）
- 认证令牌 (`auth-service.js` 缓存仅含 `userId/userName/name`)
- 敏感配置键值

桌面配置 (`dashboard-desktop-data`) 仅存储展示性配置: 主题、字号、网格参数、背景引用 (name/type/title, 不含实际文件路径)、页面布局 (节点坐标 + 组件名 + prop 值 + 外框值)、快捷方式列表。

**验证**: `auth-service.js:48-55` 中 `toLoginUser` 只提取 `userId/userName/name`。`Desktop.vue:272-277` 中 `background` 只存储 `{ type, name, title, category }`。

---

## 第四章: 依赖管理

### 第17条: 依赖的引入与使用

**级别**: SHOULD

**正文**:
- 已安装但未使用的依赖保持在 `package.json` 中（如 `mitt ^3.0.1`, `pinia ^4.0.2`），不强制移除或强制使用
- 运行时环境依赖通过 `window.SYSTEM_CONFIGS` 注入 (`public/config.js`)，避免硬编码后端 URL
- Vite proxy 仅用于 dev server 的 `/authcenter` 转发 (`vite.config.js:6-14`)
- Composable 不直接依赖 Vue 组件或 DOM；Viewport 组件不直接操作 localStorage

**验证**: `package.json:22-25` 确认 `mitt` 和 `pinia` 为已安装依赖；代码中 `grep "import.*mitt"` 和 `grep "import.*pinia"` 均为零结果。

---

## 第五章: 观察到的不一致

以下列出代码库中存在的与所述原则不完全一致或需要注意的地方:

1. **`mitt` 依赖冗余**: `package.json` 声明 `mitt ^3.0.1` 为 dependency，但整个代码库无任何 `import mitt`。可能是历史遗留或预留给未来使用，但目前是冗余依赖。

2. **`pinia` 依赖冗余**: `package.json` 声明 `pinia ^4.0.2` 为 dependency，但代码中无 `defineStore` 或 `createPinia` 调用。所有状态管理通过 composable 模块级单例实现。

3. **`useEventActions` 不存在**: 旧版 specs (specs-old) 引用了 `useEventActions.js` composable，但当前代码库中实际不存在该文件 (`glob "useEventActions*"` 零结果)。

4. **Desktop.vue 文件较大**: `Desktop.vue` 约 604 行，承担了编排、认证、配置加载、App 生命周期、快捷方式、字体缩放、事件接线、页面管理全部职责。随着功能增长可能需要拆分为多个 composable。

5. **CSS 颜色过渡未使用 CSS 变量**: `src/style.scss:17` 中 `transition` 硬编码了 `background-color 0.3s, color 0.3s`，并非引用 CSS 变量，但各主题文件确实通过切换 `html.dark` 触发过渡，功能上是正确的。

---

## 版本历史

| 日期 | 变更 |
|---|---|
| 2026-07-20 | 新增第12条「图标使用规范」（模块 006-iconfont-emoji）；后续条目重新编号（12→17） |
| 2026-07-19 | 初始 As-Built 版本，从源代码逆向整理。基于 tpl-desktop commit 的实际代码状态。 |
