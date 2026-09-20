# 201-page-index 技术方案（As-Built）

> 本文档为回溯性技术方案，记录模块 201-page-index 的实际架构、设计决策和实现策略。
> 模块: 201-page-index
> 对应规格: [spec.md](./spec.md)
> 最后更新: 2026-07-20 (R2 迭代)

## 1. 技术上下文

### 1.1 运行时环境 — 代码运行的位置

- **构建时**: Vite 8.x（`vite ^8.1.4`）通过 `@vitejs/plugin-vue` 编译 SFC，产出纯静态文件到 `dist/`
- **运行时**: 浏览器（Chrome/Edge/Firefox 现代版本），无服务端渲染
- **入口 HTML**: `index.html`（项目根目录），W3C 标准 DOCTYPE，语言 zh-CN
- **Dev Server**: `vite dev` 启动在默认端口，配置 `/authcenter` → `http://localhost:8080` 代理

### 1.2 直接依赖（本模块实际引用）

| 依赖 | 版本 | 用途 | 引用位置 |
|---|---|---|---|
| vue | ^3.5.39 | Composition API（ref/watch/onMounted/nextTick）、createApp、h/render | desktop.js:1, Desktop.vue:20 |
| element-plus | ^2.11.7 | 全局 UI 组件库 + 内置暗色 CSS 变量 | desktop.js:2-5 |
| sass | ^1.101.0 | SCSS 编译（devDependency，全局样式 + 主题文件） | package.json:31 |
| @vitejs/plugin-vue | ^6.0.8 | Vite Vue SFC 编译插件（devDependency） | vite.config.js:2 |
| vite | ^8.1.4 | 构建工具（devDependency） | vite.config.js:1 |

### 1.3 间接依赖（本模块引用的 composable/API）

| 模块 | 引用位置 | 用途 |
|---|---|---|
| `useTheme` (src/composables/useTheme.js) | desktop.js:8, Desktop.vue:21 | initTheme、isDark、toggleTheme、setTheme |
| `useWidgetMetas` (src/composables/useWidgetMetas.js) | Desktop.vue:22 | 获取 WidgetMetas 注册表（用于 preset 元数据合并） |
| `auth-service` (src/api/auth-service.js) | Desktop.vue:23 | logout、restoreSession |
| `WidgetComponents` (src/widgets/index.js) | desktop.js:9 | import.meta.glob 自动扫描注册 |
| `AppComponents` (src/apps/index.js) | desktop.js:10 | import.meta.glob 自动扫描注册 |
| `UIComponents` (src/components/index.js) | desktop.js:11 | import.meta.glob 自动扫描注册（desktop-*.vue） |

### 1.4 已安装但未使用的依赖（废弃依赖）

本模块所属项目中存在 6 个在 `package.json` 中声明但**整个代码库无任何引用**的依赖：

| # | 依赖 | 版本 | 说明 |
|---|---|---|---|
| 1 | `mitt` | ^3.0.1 | 事件总线，代码中无任何 `import mitt`（grep 零匹配），事件通信采用 composable 模块级单例 + widgetEmitters Map |
| 2 | `pinia` | ^4.0.2 | 状态管理库，代码中无 `defineStore`/`createPinia`，所有状态通过 composable 模块级 ref 管理 |
| 3 | `three` | ^0.183.2 | 3D 渲染库，代码中无任何 `import ... from 'three'`，当前无 3D 场景需求 |
| 4 | `element-resize-detector` | ^1.2.4 | 元素尺寸监听，代码中无任何引用（grep 零匹配） |
| 5 | `jsonpath-plus` | ^10.3.0 | JSONPath 查询，代码中无任何 `import jsonpath`（grep 零匹配） |
| 6 | `@imengyu/vue3-context-menu` | ^1.5.2 | 右键菜单组件，代码中无任何 `import.*@imengyu`（grep 零匹配），当前无右键菜单功能 |

> 证据: constitution.md §第五章 已记录 mitt 和 pinia 为冗余依赖；其余 4 个经全局 grep 验证（详见 Phase 0 发现步骤）。

## 2. 宪法合规检查

参照 [constitution.md](../constitution.md)，逐条检查：

| 原则 | 状态 | 说明 |
|---|---|---|
| 第1条: 元数据驱动组件扩展 | ✅ 合规 | desktop.js:9-11 通过 `import { WidgetComponents } from './widgets/index.js'` 等导入自动扫描注册表，新增组件只需添加文件对 |
| 第2条: Wrapper-Slot 分离 | ✅ 合规 | desktop.js 仅做全局注册，Widget 内容挂载在 desktop-viewport-desktop.vue 中通过 h()+render() 配合 WidgetWrapper 完成，不在 entry 层介入 |
| 第3条: 模块级单例共享状态 | ✅ 合规 | useTheme（desktop.js:8）使用模块级 isDark ref 单例，useWidgetMetas 同理 |
| 第5条: Props/Emits 单向数据流 | ✅ 合规 | Desktop.vue 模板中所有子组件均通过 props 接收数据（`:user-info`, `:desktop-config`, `:apps` 等），通过 `@xxx` 事件接收上报 |
| 第6条: 页面编排器中心化状态 | ✅ 合规 | Desktop.vue:38-64 持有所有顶层 ref，子组件不自行创建重复状态（证据: STRUCTURE.md §组件树状态） |
| 第7条: Composition API 唯一风格 | ✅ 合规 | Desktop.vue:1 使用 `<script setup>`，所有 composable 为 `export function useXxx() { return { ... } }` |
| 第8条: 命名约定 | ✅ 合规 | 全局注册的组件名来自 registries 自动提取（kebab-case: desktop-*），composable 命名 use*（useTheme, useWidgetMetas），CSS 变量 --desktop-* |
| 第9条: SCSS 主题 CSS 变量体系 | ✅ 合规 | style.scss:1-4 引入 light/dark 主题文件，index.html:8-21 反闪烁脚本在 Vue 之前设置 html.dark，desktop.js:5 引入 Element Plus 暗色 CSS vars |
| 第10条: CSS 作用域隔离 | ✅ 合规 | Desktop.vue:558 `<style scoped lang="scss">`，仅 src/style.scss 和 src/themes/ 使用全局样式 |
| 第12条: 错误处理策略 | ✅ 合规 | fetch 失败→FALLBACK_CONFIG (Desktop.vue:75-78)、localStorage 不可用→try/catch (Desktop.vue:102-106)、JSON parse 失败→静默 null (Desktop.vue:85-87) |
| 第15条: 持久化的数据安全边界 | ✅ 合规 | desktopConfig.background 仅存 {type,name,title,category}（Desktop.vue:272-277），不含实际文件路径；loginUser 不含 password |
| 第16条: 依赖引入与使用 | ⚠️ 部分 | 6 个废弃依赖（见 §1.4）留存于 package.json，属于冗余但非违规——constitution 本身已记录并接受此现状 |

## 3. 关键设计决策

| # | 决策 | 证据 | 原因 |
|---|---|---|---|
| AD-201-01 | **单页面架构，无 vue-router** | index.html:26-27 仅 `<div id="app">` + 一个 `<script type="module">` 入口；desktop.js:19 仅 `createApp(Desktop)`，无任何路由注册 | 工作台是桌面式交互而非文档式导航，所有"页面"概念由 Swiper 多页承载（SwiperSlider），无需 URL 路由 |
| AD-201-02 | **Vue app.use + 全局组件注册，在 desktop.js 中集中完成** | desktop.js:20-35 中 app.use(ElementPlus) + 三组 for...of 注册循环 | 全局注册使得所有模板中直接使用 `<desktop-*>` 或 Widget/App 组件标签，无需在每个文件中 import |
| AD-201-03 | **主题反闪烁脚本放在 index.html 头部，内联执行** | index.html:8-21 自执行函数读取 localStorage + matchMedia，在 `<script src="/config.js">` 之前运行 | 必须在 DOM 解析前、CSS 首帧渲染前确定 html.dark，否则浅色主题会闪现一帧再切换到深色 |
| AD-201-04 | **运行时配置通过同步 `<script>` 标签注入，非 fetch** | index.html:23 `<script src="/config.js">` 同步加载，window.SYSTEM_CONFIGS 在 desktop.js 执行前已就绪 | 同步加载保证 auth-service 等模块在 import 时即可读取配置，无需 await；部署后可直接编辑 config.js 免构建 |
| AD-201-05 | **desktopConfig 双源加载策略: fetch 默认 + localStorage 用户配置浅合并** | Desktop.vue:69-97 loadDesktopConfig: fetch → localStorage.getItem → { ...defaults, ...stored } | 默认 JSON 提供基础结构（网格尺寸、空页面），localStorage 覆盖用户个性化内容；fetch 失败时有硬编码 FALLBACK_CONFIG 兜底 |
| AD-201-06 | **App 去重逻辑: 重复打开=恢复+置顶，非 push-only** | Desktop.vue:322-342 handleAddApp: findIndex → splice+push 已有实例 | 桌面 OS 惯例：点击已打开的 App 图标应聚焦而非创建新窗口。这是对旧版 spec "同一时间仅允许一个 App" 的偏离（现允许多个不同 App 同时运行，同 App 复用实例） |
| AD-201-07 | **App 实例唯一标识使用 instanceId 而非 compName** | Desktop.vue:335 instanceId = Date.now().toString(36) + Math.random().toString(36).slice(2,7) | compName 可能重复；instanceId 在 v-for key 和 handleRemoveApp 匹配中使用，确保同 App 不同次打开可区分 |
| AD-201-08 | **6 个废弃依赖未从 package.json 移除** | package.json:22-25: mitt, pinia, three, element-resize-detector, jsonpath-plus, @imengyu/vue3-context-menu | constitution §第五章已承认此现状。可能原因：历史遗留（mitt 原计划用于事件总线但被 composable 单例取代；pinia 原计划用于跨组件状态但被模块级 ref 取代）或预留未来扩展（three 为 3D 场景预留） |
| AD-201-09 | **主工具条显隐由 JS 驱动，非 CSS :hover** | desktop-toolbar-main.vue:30-47 使用 `ref(visible)` + `showToolbar()`/`scheduleHide()` + `.is-visible` class | CSS `:hover` 在 thin strip（仅露出 1.3em）时，hover 触发的 `transform` 会改变元素的命中区域，导致 hover/leave 反复触发产生抖动。JS 驱动避免了此问题，且支持 touch 事件和 5s 延迟自动隐藏 |

## 4. 数据模型

### 4.1 启动参数与配置加载流程

```
index.html 加载
  │
  ├─① 反闪烁脚本（同步、内联）
  │   localStorage['dashboard-theme'] → html.dark class
  │   （无值时 matchMedia('prefers-color-scheme: dark') 回退）
  │
  ├─② 运行时配置注入（同步 <script>）
  │   public/config.js → window.SYSTEM_CONFIGS = { authLoginUrl, rsaPublicKey }
  │
  └─③ ES module 入口（异步，type="module"）
      src/desktop.js
        ├─ import ElementPlus + 'element-plus/dist/index.css'
        ├─ import 'element-plus/theme-chalk/dark/css-vars.css'
        ├─ import './style.scss'
        │    ├─ @use './themes/light/theme.scss'  → :root { --desktop-* }
        │    └─ @use './themes/dark/theme.scss'   → html.dark { --desktop-* }
        ├─ import Desktop from './pages/Desktop.vue'
        ├─ import { useTheme } → initTheme()
        │    └─ localStorage > 系统偏好 > 默认 'dark'
        ├─ import UIComponents → app.component(name, comp)
        ├─ import WidgetComponents → app.component(name, comp)
        ├─ import AppComponents → app.component(name, comp)
        └─ app.mount('#app')
            │
            └─ Desktop.vue onMounted()
                 ├─④ loadDesktopConfig()
                 │   ├─ fetch('/DEFAULT_DESKTOP_JSON.json')
                 │   │   └─ 失败 → FALLBACK_CONFIG 硬编码
                 │   ├─ localStorage.getItem('dashboard-desktop-data')
                 │   │   └─ JSON.parse 失败 → null
                 │   ├─ 合并: { ...defaults, ...storedObjs }
                 │   └─ pages 兜底: 至少 [{ title: '', children: [] }]
                 │
                 ├─⑤ setTheme(desktopConfig.theme)
                 │
                 └─⑥ restoreSession()
                      ├─ 有效 → loginUser = stored
                      └─ 无效/无 → showLoginDialog = true
```

### 4.2 桌面配置实体 (desktopConfig)

```typescript
// 实际形态（从代码推导，非显式类型定义）
type DesktopConfig = {
  theme: 'light' | 'dark'
  'font-size': string                    // e.g. '16px', '14px'
  grid: {
    cols: number                         // 默认 12
    rows: number                         // 默认 8
  }
  background: {
    type: string                         // 'image' | 'video'
    name: string                         // e.g. 'dark-001'
    title: string                        // 显示名称
    category: string                     // e.g. '暗色系' | '浅色系' | '动态视频'
  } | null
  pages: Array<{
    title: string
    children: Array<{                    // GridStack 节点
      id: string
      x: number; y: number; w: number; h: number
      compName: string
      propsValues?: Record<string, any>
      wrapperValues?: Record<string, any>
    }>
  }>
  shortcuts: Array<{
    compName: string
    appMeta: AppMeta | null
    compId?: string
  }>
}
```

### 4.3 App 运行时实例 (desktopApps)

```typescript
type DesktopApp = {
  instanceId: string                     // 唯一运行时标识（Date.now()+随机）
  compName: string                       // 对应 .app.vue 组件名
  compId?: string                        // 可选的持久化标识
  appMeta: AppMeta | null                // 元数据引用
  wrapperValues: {
    title: string                        // App 标题栏显示
  }
  state: null | 'minimize'              // null=正常渲染，'minimize'=隐藏保活
}
```

### 4.4 登录用户 (loginUser)

```typescript
type LoginUser = {
  userId: string
  userName: string
  name: string
} | null
```

### 4.5 模式状态机

```
         enterEditMode()
  normal ───────────────► editing
    ▲                        │
    │    exitEditMode()      │
    └────────────────────────┘
         (自动 saveAllPages + persistConfig + 关闭面板)
```

## 5. 接口契约

### 5.1 提供给下游的接口 (desktop.js 导出)

desktop.js 作为入口文件无显式导出——其以副作用方式运行（createApp + mount）。实际提供给下游的是：

- **全局组件注册**: 所有 UI/Widget/App 组件通过 `app.component()` 注册后，在任意 `.vue` 模板中可直接使用其 kebab-case 标签名（如 `<desktop-statusbar>`）
- **主题初始化**: `initTheme()` 在 app 挂载前执行，确保 html.dark class 和 dashboard-theme localStorage 按优先级就绪
- **Element Plus**: 全局 app.use(ElementPlus) + 暗色 CSS vars

### 5.2 Desktop.vue 对外暴露的接口（viewRef）

通过 `ref="viewportRef"` 引用的子组件，Desktop.vue 调用以下方法：

| 方法 | 用途 | 实现 FR |
|---|---|---|
| `viewportRef.addWidget(compName, options)` | 添加 Widget 到当前页 GridStack | FR-201-043 |
| `viewportRef.updateWidgetProps(payload)` | 更新 Widget 属性并重渲染 | FR-201-044 |
| `viewportRef.saveAllPages()` | 序列化所有页 GridStack 节点到 desktopConfig.pages | FR-201-009 |
| `viewportRef.switchPage(index)` | Swiper 切换到指定页 | FR-201-037, FR-201-040 |
| `viewportRef.broadcastToCurrentPageWidgets(event)` | 向当前页所有 Widget emit 事件 | FR-201-023, FR-201-024, FR-201-045 |

### 5.3 Desktop.vue 消费的子组件事件

| 子组件 | 事件 | 处理函数 | 实现 FR |
|---|---|---|---|
| desktop-dialog-login | `@success` | handleLoginSuccess | FR-201-014 |
| desktop-statusbar | `@enter-edit` | enterEditMode | FR-201-016 |
| desktop-statusbar | `@exit-edit` | exitEditMode | FR-201-016, FR-201-017 |
| desktop-statusbar | `@logout` | handleLogout | FR-201-015 |
| desktop-viewport-desktop | `@widget-edit` | onWidgetEdit | FR-201-042 |
| desktop-viewport-desktop | `@page-change` | onPageChange | FR-201-045 |
| desktop-viewport-app | `@minimize-app` | handleMinimizeApp | FR-201-020 |
| desktop-viewport-app | `@remove-app` | handleRemoveApp | FR-201-021 |
| desktop-widget-list | `@add-widget` | onWidgetListAdd | FR-201-043 |
| desktop-background-list | `@select-background` | onSelectBackground | FR-201-034 |
| desktop-property-panel | `@confirm` | onWidgetPropsConfirm | FR-201-044 |
| desktop-toolbar-main | `@home` | handleHome | FR-201-040 |
| desktop-toolbar-main | `@show-app-list` | appListVisible = true | FR-201-041 |
| desktop-toolbar-main | `@add-app` | handleAddApp | FR-201-018, FR-201-019 |
| desktop-toolbar-main | `@toggle-app-state` | handleToggleAppState | FR-201-020 |
| desktop-toolbar-main | `@close-app` | handleRemoveApp | FR-201-021 |
| desktop-toolbar-edit | `@show-background-list` | backgroundListVisible = true | FR-201-041 |
| desktop-toolbar-edit | `@show-widget-list` | widgetListVisible = true | FR-201-041 |
| desktop-toolbar-edit | `@toggle-theme` | handleToggleTheme | FR-201-033 |
| desktop-toolbar-edit | `@add-page-before` | handleAddPageBefore | FR-201-036 |
| desktop-toolbar-edit | `@add-page-after` | handleAddPageAfter | FR-201-036 |
| desktop-toolbar-edit | `@remove-page` | handleRemovePage | FR-201-038, FR-201-039 |
| desktop-toolbar-edit | `@font-size-increase` | handleFontSizeIncrease | FR-201-029 |
| desktop-toolbar-edit | `@font-size-decrease` | handleFontSizeDecrease | FR-201-029 |
| desktop-toolbar-edit | `@font-size-reset` | handleFontSizeReset | FR-201-030 |
| desktop-toolbar-edit | `@exit-edit` | exitEditMode | FR-201-016, FR-201-017 |
| desktop-app-list | `@add-app` | handleAddApp | FR-201-018 |
| desktop-app-list | `@toggle-shortcut` | handleToggleShortcut | FR-201-027, FR-201-028 |
| desktop-app-list | `@open-store` | appStoreVisible = true | FR-201-041 |
| desktop-app-store | `@confirm` | onStoreConfirm | — |

### 5.4 生命周期钩子

| 钩子 | 时机 | 行为 |
|---|---|---|
| `onMounted` | Desktop.vue DOM 挂载后 | loadDesktopConfig → setTheme → restoreSession |
| `onBeforeUnmount` | Desktop.vue 销毁前 | 清除 appEventTimer，若已登录则 saveAllPages + persistConfig |
| `watch(desktopMode)` | desktopMode ref 变化 | normal 时关闭面板 + saveAllPages + persistConfig |
| `watch(desktopApps.length)` | App 数量变化 | 300ms debounce → broadcastToCurrentPageWidgets('grid-deactive'|'grid-active') |

## 6. 实现策略

### 6.1 架构模式

- **模式**: Vue 3 Composition API 单文件组件 + 页面级编排器（Page Orchestrator）
- **入口链**: HTML → `<script src="/config.js">`（同步配置注入） → `<script type="module" src="/src/desktop.js">`（Vue 启动）
- **状态管理**: Desktop.vue 内 ref() 作为唯一状态源，通过 props 下行 + emits 上行实现单向数据流
- **组件通信**: 无 mitt/EventBus，全靠 Vue 原生 props/emits + composable 模块级单例 + widgetEmitters Map 桥接

### 6.2 关键算法

**配置合并算法** (Desktop.vue:89-96):
```
merged = (stored is valid object and not array)
  ? { ...defaults, ...stored }
  : { ...defaults }
if (!Array.isArray(merged.pages) || merged.pages.length === 0)
  merged.pages = [{ title: '', children: [] }]
```

**App 去重算法** (Desktop.vue:322-342):
```
existingIdx = desktopApps.findIndex(app =>
  compId && app.compId ? app.compId === compId : app.compName === compName)
if (existingIdx >= 0)
  // 复用已有实例: 从原位置移出，重置 state，push 到末尾（置顶）
  [existing] = desktopApps.splice(existingIdx, 1)
  existing.state = null
  desktopApps.push(existing)
else
  // 创建新实例，带随机 instanceId
  desktopApps.push({ instanceId: genRandomId(), compName, ... })
```

**App ↔ Widget 事件防抖** (Desktop.vue:400-413):
```
watch desktopApps.length → len:
  1. 清除上次 timer
  2. 设定新 timer 300ms 后执行:
     - 有 App && widgetsDeactivated===false → broadcast 'grid-deactive' + 标记
     - 无 App && widgetsDeactivated===true  → broadcast 'grid-active' + 标记
```

### 6.3 错误处理

| 场景 | 策略 | 代码位置 |
|---|---|---|
| fetch 默认 JSON 失败 | 硬编码 FALLBACK_CONFIG 回退 + console.error | Desktop.vue:75-78 |
| localStorage 读取/写入失败 | try/catch 包裹，静默降级 + console.warn | Desktop.vue:102-106, 81-87 |
| localStorage JSON.parse 失败 | catch → stored = null，使用默认配置 | Desktop.vue:85-87 |
| App eventTimer 残留 | onBeforeUnmount 中 clearTimeout | Desktop.vue:431 |

### 6.4 性能考量

- **反闪烁**: 内联脚本在 HTML 解析阶段执行，零延迟应用主题 class
- **全局组件注册**: 使用 import.meta.glob eager 在构建时完成扫描，运行时仅做 Object.entries 遍历注册
- **配置加载**: fetch + localStorage 并行概念上串行但实际两次 I/O 均极快（~1ms + ~0.5ms）
- **桌面渲染**: Desktop.vue 使用 `v-if` 而非 `v-show` 控制组件显隐，未激活面板不参与 DOM
- **App 事件防抖**: 300ms debounce 防止快速操作导致反复广播

## 7. 测试考量

### 7.1 可测试性

- Desktop.vue 的配置加载逻辑可独立于 DOM 测试（纯函数逻辑：fetch 可 mock，localStorage 可 mock）
- 登录状态流转可进行单元测试（restoreSession mock → loginUser 状态验证）
- 配置合并逻辑可测试（给定 defaults/stored → 预期 merged）
- 主题初始化链可测试（mock localStorage + matchMedia → 预期 html.dark class）

### 7.2 建议测试类型

| 类型 | 覆盖范围 | 工具建议 |
|---|---|---|
| 单元测试 | loadDesktopConfig 合并逻辑、FALLBACK_CONFIG 回退、App 去重算法、字体步进、页面增删边界条件 | Vitest |
| 集成测试 | Index.html → desktop.js → Desktop.vue 完整启动链、配置持久化往返 | Playwright |
| 端到端测试 | 登录→编辑→添加 Widget→设置背景→切换主题→退出编辑→刷新验证恢复 | Playwright |
| 构建验证 | `vite build` 产物完整性（index.html, JS/CSS 文件存在且引用正确） | bash script |

### 7.3 边界情况

- localStorage 完全不可用（隐私模式、配额满）→ 应使用默认配置 + 控制台警告
- fetch 默认 JSON 404 → FALLBACK_CONFIG 回退，不中断启动
- desktopConfig 为 null 时所有事件处理函数均需守卫（代码已通过 `if (!desktopConfig.value) return` 实现）
- pages 数组稀疏/损坏 → 合并后兜底校验
- 已登录用户桌面数据损坏 → loadDesktopConfig 内部降级，桌面至少显示一个空页面

## 8. 文件清单

| 文件 | 用途 | 实际行数 |
|---|---|---|
| `index.html` | HTML 入口：反闪烁脚本 + config.js 同步加载 + #app 挂载点 + desktop.js 入口 | 29 |
| `src/desktop.js` | Vue 应用初始化：createApp + Element Plus + 全局注册 UI/Widget/App + initTheme + mount | 37 |
| `src/pages/Desktop.vue` | 页面编排器：配置加载、登录认证、模式切换、App 生命周期、快捷方式、字体/主题、页面管理、事件接线、面板协调 | 604 |
| `public/config.js` | 运行时全局配置 window.SYSTEM_CONFIGS（authLoginUrl、rsaPublicKey） | 13 |
| `public/DEFAULT_DESKTOP_JSON.json` | 默认桌面配置（fetch 源）：theme、font-size、grid、background、pages、shortcuts | 16 |
| `src/style.scss` | 全局样式：引入 light/dark 主题 SCSS + html/body/#app 重置 + 全局过渡 | 18 |
| `vite.config.js` | Vite 构建配置：@vitejs/plugin-vue 插件 + /authcenter dev proxy | 16 |

---

## 9. R2 迭代：主工具条 App 显示重构

### 9.1 R2 设计决策

| # | 决策 | 原因 |
|---|---|---|
| AD-201-R2-01 | **shortcutsRef / appsRef 使用 Vue computed，非 watch + ref 赋值** | computed 自动追踪 props.shortcuts 和 props.apps 的响应式依赖，无需手动 watch 同步。Vue 3 Composition API 的 computed 是惰性求值 + 缓存，性能最优。 |
| AD-201-R2-02 | **appsRef = apps 减去 shortcuts 中已有的实例** | R1 中快捷方式和运行中 App 分两个独立区域渲染，同一 App 可能出现两次。R2 通过"交叉去重"使每个 App 只在工具条中出现一次：已在 shortcutsRef 中显示的实例（由其 state 和绿点表示运行状态）不再重复出现在 appsRef。 |
| AD-201-R2-03 | **绿点使用 CSS `background: #22c55e`（Tailwind green-500），直径 6px** | 绿点在 R1 的 `.running-dot` 已存在（当前为 `var(--desktop-widget-header-bg)` 色），R2 将其颜色改为明确的绿色以区分"已实例化"和"未实例化"。使用明确颜色值而非 CSS 变量，确保在所有主题下都清晰可见。 |
| AD-201-R2-04 | **Desktop.vue 无需改动** | R1 中 Desktop.vue 已正确注入 `:shortcuts` 和 `:apps` props，R2 所有变更仅在 desktop-toolbar-main.vue 内部完成，不改变父组件契约。 |
| AD-201-R2-05 | **shortcutsRef 条目点击统一判断 apps 中存在性** | 不依赖 shortcutsRef 中的 state 字段判断是否已实例化（state 可能因 computed 时序问题不准确），而是直接查找原始 `props.apps` 数组。保证判断逻辑与 Desktop.vue 的 handleAddApp 去重逻辑一致（compId 优先，compName 回退）。 |

### 9.2 R2 组件契约变更

**desktop-toolbar-main.vue**（仅组件内部变更，Props/Emits 不变）：

| Props | 变更 |
|---|---|
| `shortcuts` | 不变 — Desktop.vue 已注入 `desktopConfig.shortcuts` |
| `apps` | 不变 — Desktop.vue 已注入 `desktopApps` |

| Emits | 变更 |
|---|---|
| `addApp` | 不变 — 常驻 App 点击未实例化时触发 |
| `toggleAppState` | 不变 — 常驻 App 已实例化 / 当前活动 App 点击时触发 |
| 其他 emits | 不变 |

**新增内部状态**：

```typescript
// computed: shortcuts 交叉 apps → 附加 state 属性
const shortcutsRef = computed(() => {
  return props.shortcuts.map(shortcut => {
    const app = props.apps.find(a =>
      shortcut.compId && a.compId ? a.compId === shortcut.compId : a.compName === shortcut.compName
    )
    return app ? { ...shortcut, state: app.state } : { ...shortcut }
  })
})

// computed: apps 中不在 shortcuts 里的实例
const appsRef = computed(() => {
  return props.apps.filter(app => {
    return !props.shortcuts.some(s =>
      app.compId && s.compId ? s.compId === app.compId : s.compName === app.compName
    )
  })
})
```

### 9.3 R2 模板结构调整

```
R1 布局:
  [Home] [App列表] | [快捷方式...] | [运行中App...] | [编辑]

R2 布局:
  [Home] [App列表] | [常驻App (shortcutsRef)...] | [当前活动App (appsRef)...] | [编辑]
                    ↑ 点击: 查apps→存在toggle/不存在addApp     ↑ 点击: toggleAppState
                    ↑ 绿点: state !== undefined               ↑ 绿点: 始终有(因是运行中实例)
```
