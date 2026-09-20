# 工作台 — 整体架构文档

> 项目: tpl-desktop（工作台）
> 文档类型: As-Built（基于源代码逆向整理）
> 最后更新: 2026-07-19

## 1. 分层架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                       浏览器运行环境 (Browser Runtime)                │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  入口层 (Entry Layer)                                          │  │
│  │  index.html → /config.js → /src/desktop.js                     │  │
│  │  - index.html: 反闪烁脚本(html.dark) + 运行时配置挂载           │  │
│  │  - public/config.js: window.SYSTEM_CONFIGS (authLoginUrl,      │  │
│  │    rsaPublicKey) 部署后免构建可配置                              │  │
│  │  - src/desktop.js: createApp + 全局注册所有组件 + mount('#app') │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │  页面编排层 (Page Orchestration)                               │  │
│  │  src/pages/Desktop.vue — 唯一页面，无 Vue Router                │  │
│  │  职责: 配置双源加载 / 登录认证 / 模式切换 / App 生命周期        │  │
│  │        / 快捷方式 / 字体缩放 / 主题切换 / 面板显隐 / 页面增删   │  │
│  └───────────┬───────────────┬───────────────┬───────────────────┘  │
│              │ props/emits   │               │                      │
│  ┌───────────▼─────┐ ┌──────▼───────┐ ┌─────▼──────────────┐      │
│  │ Desktop Chrome  │ │  Viewport    │ │ Property Panel     │      │
│  │ 层              │ │  层          │ │ 层                 │      │
│  │                 │ │              │ │                    │      │
│  │ statusbar       │ │ viewport-    │ │ property-panel     │      │
│  │ toolbar-main    │ │ desktop      │ │ property-form      │      │
│  │ toolbar-edit    │ │ (Swiper +    │ │                    │      │
│  │ dialog-login    │ │  GridStack)  │ │                    │      │
│  │ widget-list     │ │              │ │                    │      │
│  │ background-list │ │ viewport-app │ │                    │      │
│  │ background      │ │ (App 叠加层) │ │                    │      │
│  │ app-list        │ │              │ │                    │      │
│  │ app-store       │ │ widget-      │ │                    │      │
│  │                 │ │ wrapper      │ │                    │      │
│  │                 │ │ app-wrapper  │ │                    │      │
│  └─────────────────┘ └──────────────┘ └────────────────────┘      │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Composable 层 (src/composables/) — 模块级单例共享状态          │  │
│  │  useGridStack     useTheme          useWidgetMetas              │  │
│  │  (多实例管理 +     (主题切换/持久化)  (WidgetMetas 响应式封装)    │  │
│  │   Widget 事件桥接)                                               │  │
│  │  useAppMetas                     useBackgroundMetas             │  │
│  │  (AppMetas 响应式封装)            (BackgroundMetas 响应式封装)    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  注册表层 (Registry Layer) — Vite import.meta.glob eager 自动扫描 │
│  │  src/widgets/index.js    → WidgetComponents + WidgetMetas       │
│  │  src/apps/index.js       → AppComponents + AppMetas             │
│  │  src/backgrounds/index.js → BackgroundMetas                      │
│  │  src/components/index.js  → UIComponents (desktop-*.vue)             │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────┐ ┌──────────────────────────────────┐ │
│  │ 持久化层                   │ │ 外部服务 (Vite Proxy)             │ │
│  │ localStorage:              │ │ /authcenter → localhost:8080      │ │
│  │ dashboard-desktop-data    │ │ (运行时可替换，部署含 RSA 加密)    │ │
│  │ dashboard-theme           │ └──────────────────────────────────┘ │
│  │ dashboard-login-user      │                                       │
│  └───────────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────────┘
```

> 证据: `index.html:1-29`, `public/config.js:1-13`, `src/desktop.js:1-37`, `src/pages/Desktop.vue:1-604`, `src/composables/*`, `src/widgets/index.js`, `src/apps/index.js`, `src/backgrounds/index.js`, `src/components/index.js`, `vite.config.js:1-16`

## 2. Desktop.vue 组件树与状态

```
Desktop.vue (唯一页面，无 Router)
│
├── [v-if !loginUser] desktop-dialog-login     ← 登录覆盖层
│
├── [v-if desktopConfig && loginUser]
│   ├── desktop-statusbar                       ← 顶部状态栏 (时钟 + 编辑入口 + 用户/登出)
│   ├── div.desktop-main (flex:1, 三层 z-index)
│   │   ├── desktop-background (z-index:0)      ← 背景渲染层 (图片/视频)
│   │   ├── desktop-viewport-desktop (z-index:1) ← Swiper 多页 GridStack 视口
│   │   │   ├── Swiper > SwiperSlide x N
│   │   │   │   └── .grid-stack (每页独立 GridStack 实例)
│   │   │   │       └── [VNode] desktop-widget-wrapper ← h()+render() 挂载
│   │   │   │           └── slot default → Widget 组件
│   │   │   └── Swiper pagination (可点击翻页点)
│   │   └── desktop-viewport-app (z-index:10)   ← App 叠加渲染层
│   │       └── desktop-app-wrapper x N
│   │           └── slot default → App 组件
│   │
│   ├── [v-if mode==='normal'] desktop-toolbar-main  ← 底部主工具条
│   ├── [v-if mode==='editing'] desktop-toolbar-edit  ← 底部编辑工具条
│   │
│   ├── [v-if] desktop-widget-list               ← 部件选择列表 (条件渲染)
│   ├── [v-if] desktop-background-list           ← 背景选择列表 (条件渲染)
│   ├── [v-if] desktop-property-panel            ← 属性编辑面板 (条件渲染)
│   ├── [v-if] desktop-app-list                  ← App 列表 (条件渲染)
│   └── [v-if] desktop-app-store                 ← App 应用市场 (条件渲染)

Desktop.vue 本地状态 (均 ref):
  desktopMode: 'normal' | 'editing'
  currentPageIndex: Number
  desktopConfig:        { theme, font-size, grid, background, pages[], shortcuts[] } | null
  desktopApps:          Array<{ instanceId, compName, compId?, appMeta, wrapperValues, state }>
  loginUser:            { userId, userName, name } | null
  showLoginDialog:      Boolean
  appListVisible / appStoreVisible: Boolean
  widgetListVisible / backgroundListVisible: Boolean
  widgetPropsVisible / widgetPropsNode / widgetPropsMeta
```

> 证据: `src/pages/Desktop.vue:38-64` (状态声明), `Desktop.vue:440-556` (模板结构)

## 3. 数据流

### 3.1 桌面配置加载与合并 (双源策略)

```
index.html 加载
  → 反闪烁脚本: localStorage['dashboard-theme'] → html.dark
  → <script src="/config.js"> → window.SYSTEM_CONFIGS

Desktop.vue onMounted()
  → loadDesktopConfig()
    ① fetch('/DEFAULT_DESKTOP_JSON.json')        ← 默认配置 (静态文件)
       ↓ 失败 → FALLBACK_CONFIG 硬编码回退
    ② localStorage.getItem('dashboard-desktop-data') ← 用户配置
       → JSON.parse → stored
    ③ 合并: { ...defaults, ...stored }           ← 用户配置覆盖默认
       pages 兜底: 至少保证 [{ title: '', children: [] }]
    ④ desktopConfig.value = merged

  → setTheme(desktopConfig.theme)                 ← 应用持久化主题
  → restoreSession() → loginUser | showLoginDialog
```

> 证据: `Desktop.vue:69-97`, `index.html:8-21`, `public/DEFAULT_DESKTOP_JSON.json:1-16`

### 3.2 部件添加 / 编辑 / 持久化

```
// 添加流程
desktop-widget-list @add-widget
  → Desktop.vue onWidgetListAdd(compName, mergedMeta)
    → viewportRef.addWidget(compName, options)
      → desktop-viewport-desktop.addWidget()
        → 计算坐标: x=0, y=(max-y + h)
        → grid.addWidget(nodeData)                   ← GridStack API
          → GridStack 'added' 事件
            → onNodeAdded callback → rerenderNode(node, pageIdx)
              → render(null, contentEl)              ← 先卸载旧 VNode
              → h(WidgetWrapper, wrapperProps, {
                  default: () => h(Comp, compProps)
                })
              → render(vnode, contentEl)              ← h()+render() 挂载
              → registerWidgetEmitter(nodeId, emit)  ← 注册事件桥接

// 编辑属性
desktop-property-panel @confirm
  → Desktop.vue onWidgetPropsConfirm(payload)
    → viewportRef.updateWidgetProps(payload)          ← 更新 node.propsValues/wrapperValues
    → viewportRef.saveAllPages()                       ← 序列化所有页布局
    → persistConfig()                                  ← localStorage 持久化

// 退出编辑模式
Desktop.vue watch desktopMode → 'normal'
  → viewportRef.saveAllPages()                         ← 序列化
  → persistConfig()                                    ← 持久化
```

> 证据: `Desktop.vue:242-301`, `desktop-viewport-desktop.vue:139-203,285-344,381-402`

### 3.3 编辑/常规模式切换

```
desktopMode 变化 (watch with { immediate: true })
  → Swiper.allowTouchMove = !isEditing      ← 编辑模式禁用手势翻页
  → applyModeToGrids(isEditing)
    → 所有 GridStack 实例 grid.enableMove(isEditing)
    → 所有 GridStack 实例 grid.enableResize(isEditing)
  → broadcastToAllWidgets('grid-editing' | 'grid-editing-end')
    ← useGridStack.broadcastToAllWidgets: 遍历 widgetEmitters Map
  → 所有页 rerenderAllForGrid                ← 重渲染更新外壳属性 (hideHeader/editMode)
```

> 证据: `desktop-viewport-desktop.vue:233-248`

### 3.4 App 生命周期 → Widget 事件协调

```
desktopApps.length watch (300ms debounce)
  有 App 打开 && widgetsDeactivated===false
    → broadcastToCurrentPageWidgets('grid-deactive')  ← 通知 Widget 暂停
    → widgetsDeactivated = true
  所有 App 关闭 && widgetsDeactivated===true
    → broadcastToCurrentPageWidgets('grid-active')    ← 通知 Widget 恢复
    → widgetsDeactivated = false

// App 实例管理
handleAddApp:   desktopApps.push({ instanceId, compName, ... })
                → 已存在同 compName/compId 则恢复+置顶 (不重复创建)
handleMinimizeApp: app.state = 'minimize'  (CSS 隐藏, 保活)
handleRemoveApp:   desktopApps.splice(idx, 1) (Vue v-for 响应式销毁)
handleToggleAppState: app.state = toggle 'minimize' ↔ null
```

> 证据: `Desktop.vue:317-413`, `desktop-viewport-app.vue:1-72`

### 3.5 页面切换 → 活动状态

```
Swiper onSlideChange
  → setActive(gridKey(oldPage), false)
    → 遍历旧页所有 node → emitToWidget(id, 'grid-deactive')
  → activePageIndex = newIndex
  → setActive(gridKey(newPage), true)
    → 遍历新页所有 node → emitToWidget(id, 'grid-active')
  → emit('pageChange', newIndex)
    → Desktop.vue onPageChange
      → nextTick: 若有 App 打开 → broadcastToCurrentPageWidgets('grid-deactive')
```

> 证据: `desktop-viewport-desktop.vue:262-281`, `useGridStack.js:155-165`

### 3.6 主题/背景切换

```
// 主题切换
desktop-toolbar-edit @toggle-theme
  → handleToggleTheme()
    → useTheme.toggleTheme()                       ← html.dark toggle
    → desktopConfig.theme = 同步值
    → persistConfig()

// 背景选择 (含自动主题切换)
desktop-background-list @select-background
  → onSelectBackground(meta)
    → desktopConfig.background = { type, name, title, category }
    → if meta.theme: setTheme(meta.theme)          ← 自动跟随背景主题
    → persistConfig()
```

> 证据: `Desktop.vue:141-146,270-284`, `useTheme.js:41-52`

### 3.7 Widget 事件桥接 (GridStack DOM → Widget Vue 实例)

```
GridStack DOM 事件            useGridStack 桥接               Widget 收到的 Emit
─────────────────────────     ─────────────────────          ────────────────────
grid.on('added')          →   emitToWidget('grid-added')       → $emit('grid-added')
grid.on('removed')        →   emitToWidget('grid-removing')    → $emit('grid-removing')
grid.on('change')         →   onNodeChange (无 Widget 桥接)
grid.on('dragstart')      →   emitToWidget('grid-moving')      → $emit('grid-moving')
grid.on('dragstop')       →   emitToWidget('grid-moving-end')  → $emit('grid-moving-end')
grid.on('resizestart')    →   emitToWidget('grid-resizing')    → $emit('grid-resizing')
grid.on('resizestop')     →   emitToWidget('grid-resizing-end')→ $emit('grid-resizing-end')
```

> 证据: `useGridStack.js:64-99` (bindGridEvents), `desktop-viewport-desktop.vue:197-202` (registerWidgetEmitter)

## 4. 持久化策略

| localStorage Key | 写入方 | 读取方 | 内容 |
|---|---|---|---|
| `dashboard-desktop-data` | Desktop.vue | Desktop.vue | 完整桌面配置 JSON (theme, font-size, grid, background, pages, shortcuts) |
| `dashboard-theme` | useTheme.js | useTheme.js + index.html 反闪烁脚本 | 'dark' / 'light' |
| `dashboard-login-user` | auth-service.js | auth-service.js | { userId, userName, name } (不含密码) |

> 证据: `Desktop.vue:26,103-107`, `useTheme.js:14`, `auth-service.js:21,58-64`, `index.html:13`

## 5. 部署形态

- **构建**: Vite 静态构建 (`vite build`)，输出纯静态文件
- **入口**: `index.html` 单页，唯一 `<script type="module" src="/src/desktop.js">`
- **运行时配置**: 通过 `public/config.js` → `window.SYSTEM_CONFIGS` 注入，部署后可直接编辑无需重新构建
- **Dev 代理**: `vite.config.js` 配置 `/authcenter` → `http://localhost:8080`，仅开发环境生效
- **认证降级**: 后端不可达时自动降级到 `public/USERS_MOCK.json` 本地模拟登录（`auth-service.js:89-116`）

> 证据: `vite.config.js:1-16`, `index.html:22-23`, `public/config.js:1-13`, `auth-service.js:102-119`

## 6. 关键架构决策 (观察自源代码)

| # | 决策 | 证据文件 |
|---|---|---|
| AD-01 | **无 Vue Router，单页面架构**。整个应用只有一个页面 Desktop.vue，通过 v-if 条件渲染实现视图切换，无路由。 | `src/desktop.js:19` (仅 `createApp(Desktop)`), `Desktop.vue:440-556` (模板全为条件渲染) |
| AD-02 | **Composable 模块级单例模式**。useGridStack 使用模块级 Map 共享 GridStack 实例注册表；useTheme 使用模块级 `ref(isDark)` 和 `window.matchMedia` 单例监听；useWidgetMetas/useAppMetas/useBackgroundMetas 使用模块级 `ref()` 包裹注册表导入。所有调用 useXxx() 的组件读取同一份共享状态。 | `useGridStack.js:24-28`, `useTheme.js:20,73-77`, `useWidgetMetas.js:11`, `useAppMetas.js:11`, `useBackgroundMetas.js:12` |
| AD-03 | **元数据驱动的自动注册**。通过 Vite `import.meta.glob('./**/*.widget.{vue,js}', { eager: true })` 在构建时扫描文件系统自动发现新组件/App/背景，添加 .widget.vue/.widget.js 文件对后无需手动修改注册入口 (`src/widgets/index.js:24-25`, `src/apps/index.js:24-25`, `src/backgrounds/index.js:18`, `src/components/index.js:11`)。 |
| AD-04 | **VNode 渲染与 GridStack 共存**。看板组件挂载必须使用 `h() + render()` 模式 (`desktop-viewport-desktop.vue:139-203`)，不得在 GridStack DOM 内使用 `<template>`。因为 GridStack 动态管理 DOM 节点，Vue 模板无法感知其生命周期。`rerenderNode()` 是整个应用中小部件挂载的唯一入口。 |
| AD-05 | **Widget 宿主与内容分离**。所有 Widget 通过 `desktop-widget-wrapper` 容器挂载，容器负责标题栏、编辑/删除按钮。Widget 本体只接收 props 渲染内容，不接触 GridStack 或编辑器状态。 | `desktop-widget-wrapper.vue:1-52`, `desktop-viewport-desktop.vue:174-196` |
| AD-06 | **纯 Props/Emits 通信，无 Event Bus**。`mitt` 已安装 (`package.json:23`) 但代码中没有任何 `import mitt`。组件间通信完全通过 props 下行 + emits 上行 + composable 共享状态。Widget 事件通过 useGridStack 内部 `widgetEmitters Map` 桥接 (存储 Widget 实例的 `$emit` 函数引用)，而非 mitt。 | `grep "import.*mitt"` 零结果, `useGridStack.js:27-28,36-50` |
| AD-07 | **无 Pinia**。`pinia` 已安装 (`package.json:24`) 但代码中没有任何 `import ... from 'pinia'` 或 `defineStore`。状态管理完全依赖 composable 模块级单例 + Vue `ref()`。 | `grep "import.*pinia"` 零结果 |
| AD-08 | **桌面配置双源加载**。默认配置从 `public/DEFAULT_DESKTOP_JSON.json` fetch，用户配置从 localStorage 读取；合并策略为用户覆盖默认 (`{ ...defaults, ...stored }`)。fetch 失败时有硬编码 `FALLBACK_CONFIG` 回退。 | `Desktop.vue:69-97` |
| AD-09 | **命名约定**。UI 组件统一 `desktop-*.vue` (kebab-case)，Widget 文件 `*.widget.vue + *.widget.js`，App 文件 `*.app.vue + *.app.js`，背景文件 `*.bg.js`。组件名由 registries 从文件路径自动提取。 | `src/widgets/index.js:28-31`, `src/apps/index.js:28-31`, `src/backgrounds/index.js:21-24`, `src/components/index.js:14-15` |
| AD-10 | **主题通过 html.dark + CSS 变量实现**。浅色主题定义在 `:root` (`src/themes/light/theme.scss`)，深色主题定义在 `html.dark` (`src/themes/dark/theme.scss`)，通过 `document.documentElement.classList.toggle('dark')` 切换。CSS 变量命名空间 `--desktop-*`。Element Plus 深色模式复用同一 `html.dark` 开关。 | `useTheme.js:41-45`, `src/style.scss:1-4`, `src/themes/light/theme.scss:6-29`, `src/themes/dark/theme.scss:6-29`, `src/desktop.js:5` |
| AD-11 | **页面编排器集中管理所有子组件状态**。Desktop.vue 持有所有 `ref()` 状态（desktopMode, currentPageIndex, desktopConfig, desktopApps, 各面板可见性），子组件通过 props 接收、emits 上报，形成单向数据流。Desktop.vue 是唯一的状态编排中心。 | `Desktop.vue:38-64,440-556` |
| AD-12 | **认证双路径降级**。`auth-service.js` 的 `login()` 先将密码 RSA 加密后 POST 后端，后端不可达时自动降级到 `public/USERS_MOCK.json` 本地明文比对（仅开发环境）。敏感字段（password）不进 localStorage。 | `auth-service.js:30-119` |
