# 001-desktop-framework 技术方案（As-Built）

> 模块: 001-desktop-framework
> 对应规格: [spec.md](./spec.md)
> 状态: 已实现
> 最后更新: 2026-07-19

## 1. 技术上下文

### 1.1 运行时环境

- **运行位置**: 浏览器（纯前端），无 SSR
- **入口链路**: `index.html` → `src/desktop.js`（模块 201） → `createApp(Desktop)` 挂载 `src/pages/Desktop.vue`（本模块核心编排组件）
- **组件注册**: 所有 UI 组件（desktop-*.vue）、Widget 组件（*.widget.vue）、App 组件（*.app.vue）通过 Vite `import.meta.glob` 的 eager 模式在 `createApp` 前全局注册（`src/desktop.js:22-34`），因此 Desktop.vue 的模板可以直接引用

### 1.2 直接依赖

| 依赖 | 版本 | 用途 |
|---|---|---|
| vue | ^3.5.39 | Composition API（ref, watch, nextTick, h, render, getCurrentInstance, onMounted, onBeforeUnmount） |
| gridstack | ^11.5.1 | 网格布局引擎（GridStack.init, grid.addWidget, grid.load, grid.save, grid.enableMove, grid.enableResize, grid.removeWidget, grid.destroy） |
| swiper | ^14.0.1 | 多页滑动容器（Swiper, SwiperSlide, Pagination 模块） |
| element-plus | (顶层依赖) | el-dropdown（编辑工具条页面/字号菜单）、el-popover（状态栏用户详情弹窗）、el-button |
| dayjs | (顶层依赖) | 状态栏实时时钟格式化 |
| sass | (顶层依赖) | SCSS scoped 样式 |

### 1.3 间接依赖（通过 composable 消费）

| 模块/Composable | 文件 | 消费方式 |
|---|---|---|
| useTheme | `src/composables/useTheme.js` | Desktop.vue 解构 isDark/toggleTheme/setTheme，编排主题切换与持久化 |
| useWidgetMetas | `src/composables/useWidgetMetas.js` | Desktop.vue 消费 widgetMetas 做 preset 融合判断；视口 consumer widgetMetas 获取 rect/props 默认值 |
| WidgetComponents | `src/widgets/index.js` | 视口 rerenderNode 中按 compName 查找组件构造函数 |
| UIComponents | `src/components/index.js` | 视口按名称获取 'desktop-widget-wrapper' 外壳组件 |

## 2. 宪法合规检查

依据 `specs/constitution.md` 的 16 条原则逐条检查：

| # | 原则 | 合规状态 | 证据 |
|---|---|---|---|
| 1 | 元数据驱动的组件扩展 | ✅ 合规（消费者） | Desktop.vue 通过 useWidgetMetas 获取元数据；视口通过 WidgetComponents 字典索引；组件注册由 src/desktop.js（201 模块）的 import.meta.glob 完成，本模块不参与扫描逻辑 |
| 2 | 看板组件宿主与内容分离 | ✅ 合规 | 视口的 rerenderNode 使用 `h(WidgetWrapper, wrapperProps, { default: () => h(Comp, compProps) })` 模式挂载（`viewport-desktop.vue:194`），未在 GridStack 内直接渲染组件 |
| 3 | 模块级单例共享状态 | ✅ 合规 | useGridStack.js 使用模块级 `grids` Map + `activeStates` Map + `widgetEmitters` Map（`useGridStack.js:24-28`），所有调用方共享同一份注册表 |
| 4 | VNode 渲染与 GridStack 共存 | ✅ 合规 | rerenderNode 是看板组件挂载的**唯一入口**（`viewport-desktop.vue:142-203`）；GridStack 模板中仅含空的 `div.grid-stack` 占位（`viewport-desktop.vue:451`） |
| 5 | 纯 Props/Emits 单向数据流 | ✅ 合规 | 所有子组件（statusbar, toolbar-main, toolbar-edit, viewport）通过 defineProps 接收状态 + defineEmits 上报事件；Desktop.vue 为唯一状态持有者。无 mitt 使用。例外：useGridStack 的 emitToWidget/broadcastToAllWidgets 通过内部 Map 存储 widget $emit 引用实现 GridStack DOM 事件→Vue 实例桥接（`useGridStack.js:36-98`），这是必要的跨层桥接手段 |
| 6 | 页面编排器中心化状态 | ✅ 合规 | Desktop.vue 持有所有顶层 ref 状态（`Desktop.vue:39-64`）：desktopMode, currentPageIndex, desktopConfig, widgetListVisible, backgroundListVisible, widgetPropsVisible 等 15+ 个 ref |
| 7 | Composition API 唯一风格 | ✅ 合规 | 所有 .vue 文件使用 `<script setup>`（Desktop.vue, viewport-desktop.vue, toolbar-main.vue, toolbar-edit.vue, statusbar.vue） |
| 8 | 命名约定 | ✅ 合规 | UI 组件 desktop-*.vue（desktop-statusbar, desktop-toolbar-main, desktop-toolbar-edit, desktop-viewport-desktop）；composable useGridStack.js；CSS 变量 --desktop-* |
| 9 | SCSS 主题 CSS 变量体系 | ✅ 合规 | 所有组件样式引用 `var(--desktop-xxx)`：`--desktop-bg-primary`（`Desktop.vue:567`）、`--desktop-bg-header`（`statusbar.vue:108`）、`--desktop-text-primary`、`--desktop-border` 等 |
| 10 | CSS 作用域隔离 | ✅ 合规 | 所有 .vue 组件 `<style scoped lang="scss">`：`Desktop.vue:558`, `viewport-desktop.vue:457`, `toolbar-main.vue:109`, `toolbar-edit.vue:112`, `statusbar.vue:100` |
| 11 | 元数据默认值回退 | N/A | 本模块不包含 Registry，仅消费元数据 |
| 12 | 错误处理策略 | ✅ 合规 | fetch 失败→FALLBACK_CONFIG（`Desktop.vue:75-78`）；localStorage 解析失败→null 静默回退（`Desktop.vue:82-87`）；localStorage 写入失败→console.warn（`Desktop.vue:104-106`）；GridStack 初始化失败→console.error + null 返回（`useGridStack.js:103-116`） |
| 13 | Widget 组件不得接触桌面状态 | ✅ 合规（执行者） | 视口通过 props 传递模式到 wrapper，widget 内部不访问 desktopConfig；widget 删除通过 grid.removeWidget 触发 removed→onNodeRemoved→unregisterWidgetEmitter（单一路径） |
| 14 | 只读元数据消费 | ✅ 合规 | 视口读取 widgetMetas[compName].rect/props 但不修改元数据对象；Desktop.vue 读取 widgetMetas 做 preset 融合判断但不修改 |
| 15 | 持久化的数据安全边界 | ✅ 合规 | desktopConfig 仅存储展示性配置；background 仅存 { type, name, title, category }（`Desktop.vue:272-277`）；不存储密码/令牌 |
| 16 | 依赖的引入与使用 | ✅ 合规 | gridstack v11 和 swiper v14 均在代码中实际使用；pinia 和 mitt 已安装但本模块不使用 |

## 3. 关键技术决策

### 3.1 双源配置合并而非深度合并

**决策**: 桌面配置采用浅合并策略 `{ ...defaults, ...stored }`（`Desktop.vue:89-91`）。
**理由**: 桌面配置结构扁平，顶层键值（theme, font-size, grid, background, pages, shortcuts）为独立语义单元，深度合并会增加复杂性且无实际需求。
**实施**: 仅 stored 存在且为有效对象时执行合并；否则直接使用 defaults。pages 数组额外做兜底检查保证非空。

### 3.2 模块级 Map 而非 Pinia

**决策**: GridStack 多实例管理使用模块级 `new Map()`（`useGridStack.js:24-28`），不使用 Pinia store。
**理由**: GridStack 实例生命周期紧密耦合于视口组件（依赖 DOM 容器元素），不适合序列化/响应式 store；Map 的 O(1) 按键查找适合多实例场景。项目整体未使用 Pinia（已安装但无处调用），所有跨组件状态通过 composable 模块级 ref/Map 实现单例。

### 3.3 Desktop.vue 作为唯一编排器

**决策**: 所有面板显隐、事件分发、状态协调集中在 Desktop.vue 单一组件，不使用事件总线或 provide/inject。
**理由**: 单一真相源简化调试和状态追踪；组件树浅（2-3 层），不会出现深层层级传递问题。缺点：Desktop.vue 约 600 行，随功能增长可能需要拆分 composable。

### 3.4 Swiper 与 GridStack 冲突处理

**决策**: 编辑模式下通过 `swiper.allowTouchMove = false` 禁用 Swiper 手势（`viewport-desktop.vue:237`），确保 GridStack 拖拽不被 Swiper 滑动手势拦截。
**理由**: GridStack 节点拖拽和 Swiper 页面滑动共享 touch 事件链，两者同时启用会导致用户体验混乱。编辑期间以 GridStack 交互优先。

### 3.5 退出编辑→saveAllPages→persistConfig 的单一保存路径

**决策**: 退出编辑模式时的布局持久化由 Desktop.vue 的 watch(desktopMode) 统一调用（`Desktop.vue:149-157`），视口不在 watch(desktopMode) 中自行保存（`viewport-desktop.vue:240-241` 注释明确）。
**理由**: 保证保存时序和持久化顺序的确定性：先序列化所有页 GridStack 状态到 desktopConfig，再一次性写入 localStorage。视口仅负责序列化（saveAllPages），不负责持久化（persistConfig）。

### 3.6 页面增删前的前置序列化

**决策**: addPageBefore/addPageAfter/removePage 在执行 splice 前先调用 `viewportRef.value?.saveAllPages()`，再修改 pages 数组。
**理由**: 页面增删会触发 `watch(pages.length)` → `rebuildAllGrids()`，该流程会 `destroyAll`（销毁旧 GridStack 实例）→重建。前置序列化确保用户未保存的布局变更不会因实例重建而丢失。

## 4. 数据模型

### 4.1 桌面配置结构（本模块管理的字段）

```typescript
interface DesktopConfig {
  theme: 'light' | 'dark'           // FR-001-052/053：主题编排，持久化
  'font-size': string               // FR-001-039~043：根字体大小，如 '16px'
  grid: {                           // FR-001-023：网格参数
    cols: number                    // 列数（默认 12）
    rows: number                    // 行数（默认 8，仅初始提示用）
  }
  background: BackgroundRef | null  // FR-001-047 编排：{ type, name, title, category }
  pages: Page[]                     // FR-001-021~031：页面列表
  shortcuts: Shortcut[]             // FR-001-044 编排：快捷方式列表
}

interface Page {
  title: string
  children: GridNode[]              // FR-001-029~031：网格节点数组（序列化写入）
}

interface GridNode {
  id: string                        // Date.now() + '' 生成
  x: number; y: number
  w: number; h: number
  noResize?: boolean                // rect.fixed 时设置
  info: { compName: string; presetKey?: string }
  propsValues: Record<string, any>
  wrapperValues: Record<string, any>
}

interface Shortcut {
  compName: string
  compId?: string
  appMeta?: AppMeta | null
}

interface BackgroundRef {
  type: 'image' | 'video'
  name: string
  title: string
  category: string
}
```

### 4.2 运行时状态（不持久化）

| 状态 | 类型 | 持有者 | 说明 |
|---|---|---|---|
| desktopMode | ref<'normal'\|'editing'> | Desktop.vue:39 | 当前桌面模式 |
| currentPageIndex | ref<number> | Desktop.vue:40 | 当前激活页索引，与 viewport 双向同步 |
| desktopConfig | ref<DesktopConfig\|null> | Desktop.vue:41 | 加载完成后的完整配置对象 |
| desktopApps | ref<AppInstance[]> | Desktop.vue:43 | 运行中 App 实例列表（003 模块管理） |
| panel visibility refs | ref<boolean> | Desktop.vue:45-55 | 各面板显隐（widgetList, backgroundList, appList, appStore, widgetProps） |
| loginUser | ref<LoginUser\|null> | Desktop.vue:59 | 当前登录用户（null=未登录，桌面不渲染） |
| gridContainers | ref<HTMLElement[]> | viewport-desktop.vue:62 | 每页 .grid-stack 容器元素引用（函数 ref 收集） |
| activePageIndex | ref<number> | viewport-desktop.vue:64 | 视口内部活动页索引 |
| swiperRef | shallowRef<Swiper\|null> | viewport-desktop.vue:60 | Swiper 实例引用 |

### 4.3 配置加载流程

```
fetch('/DEFAULT_DESKTOP_JSON.json')
  ├─ 成功 → defaults = res.json()
  └─ 失败 → defaults = FALLBACK_CONFIG（硬编码）
       ↓
localStorage.getItem('dashboard-desktop-data')
  ├─ 有效对象 → merged = { ...defaults, ...stored }
  └─ 无效/不存在 → merged = { ...defaults }
       ↓
pages 兜底检查（保证非空）
       ↓
desktopConfig.value = merged
```

### 4.4 配置持久化流程

```
退出编辑模式 (desktopMode → 'normal')
  → widgetListVisible = backgroundListVisible = widgetPropsVisible = false
  → viewportRef.saveAllPages()           // 序列化所有页 GridStack → desktopConfig.pages
  → persistConfig()                       // JSON.stringify → localStorage.setItem
```

## 5. 接口契约

### 5.1 提供的接口（defineExpose + emits + props）

#### Desktop.vue — 页面编排器（整体入口）

**Props**: 无（根组件，不接收 props）
**Emits**: 无（根组件，不向上 emit）
**暴露给子组件的 ref**:
- `desktopConfig` (ref)
- `desktopMode` (ref)
- `currentPageIndex` (ref)
- `desktopApps` (ref)
- `loginUser` (ref)
- 各面板可见性 ref

#### desktop-viewport-desktop — 视口组件

**Props**（`viewport-desktop.vue:27-36`）:

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| desktopConfig | Object | null | 完整桌面配置 |
| desktopMode | String | 'normal' | 桌面模式 |
| currentPageIndex | Number | 0 | 当前页索引（外部控制） |
| userInfo | Object | null | 登录用户信息 |

**Emits**（`viewport-desktop.vue:38`）:

| Event | Payload | 说明 |
|---|---|---|
| widgetEdit | (node, meta) | 实现 FR-001-047：小部件编辑按钮点击 |
| pageChange | (newIndex: number) | 实现 FR-001-026：Swiper 滑动触发页面切换 |

**defineExpose**（`viewport-desktop.vue:425-432`）:

| 方法 | 签名 | 实现需求 |
|---|---|---|
| addWidget | (widgetName, options?) → id\|null | FR-001-035：添加部件到当前页 |
| updateWidgetProps | ({id, propsValues, wrapperValues}) → void | FR-001-047：更新部件属性并重渲染 |
| switchPage | (index) → void | FR-001-026：编程式页面跳转 |
| getCurrentPageData | () → Page\|null | FR-001-030：获取当前页序列化后的数据 |
| saveAllPages | () → DesktopConfig | FR-001-030：序列化所有页并返回配置 |
| broadcastToCurrentPageWidgets | (eventName) → void | FR-001-032：向当前页所有部件广播事件 |

#### desktop-toolbar-main — 主工具栏

**Props**（`toolbar-main.vue:16-19`）:

| Prop | 类型 | 说明 |
|---|---|---|
| shortcuts | Array | desktopConfig.shortcuts |
| apps | Array | desktopApps 运行中 App |

**Emits**: home, showAppList, addApp({compName, compId, appMeta}), toggleAppState(app), closeApp(app)

#### desktop-toolbar-edit — 编辑工具栏

**Props**（`toolbar-edit.vue:15-18`）:

| Prop | 类型 | 说明 |
|---|---|---|
| canRemovePage | Boolean | pages.length > 1 时允许移除 |

**Emits**: showBackgroundList, showWidgetList, toggleTheme, addPageBefore, addPageAfter, removePage, fontSizeIncrease, fontSizeDecrease, fontSizeReset, exitEdit

#### desktop-statusbar — 状态栏

**Props**（`statusbar.vue:17-21`）:

| Prop | 类型 | 说明 |
|---|---|---|
| userInfo | Object | 登录用户信息 |
| desktopMode | String | 当前模式 |

**Emits**: enterEdit, exitEdit, logout

### 5.2 消费的接口

| 来源 | 接口 | 消费位置 | 说明 |
|---|---|---|---|
| useTheme | { isDark, toggleTheme, setTheme } | Desktop.vue:63 | 主题切换编排 |
| useWidgetMetas | { widgetMetas } | Desktop.vue:64, viewport-desktop.vue:51 | 部件元数据读取 |
| WidgetComponents | { [compName]: Component } | viewport-desktop.vue:24 | 部件组件查找 |
| UIComponents | { 'desktop-widget-wrapper': Component } | viewport-desktop.vue:56 | 外壳组件引用 |
| auth-service | { logout, restoreSession } | Desktop.vue:23 | 登出/会话恢复 |
| WidgetComponents (全局注册) | Vue 组件名 | Desktop.vue 模板 | 模板中直接引用已全局注册的组件（desktop-*） |
| useGridStack (内部) | 全部方法 | viewport-desktop.vue:40-50 | 网格引擎核心 |

### 5.3 本模块内部接口

#### useGridStack composable（`useGridStack.js:177-193`）

```javascript
function useGridStack() {
  return {
    // 实例管理 (FR-001-022/023/024)
    initGrid(key, container, gridOptions, callbacks) → GridStack|null
    destroyGrid(key, removeDom?) → void
    destroyAll(removeDom?) → void
    getInstance(key) → GridStack|null
    getAllInstances() → GridStack[]
    // Widget 事件桥接 (FR-001-032/033/034)
    registerWidgetEmitter(nodeId, emitFn) → void
    unregisterWidgetEmitter(nodeId) → void
    emitToWidget(nodeId, eventName, payload) → void
    broadcastToAllWidgets(eventName, payload) → void
    // 活动状态 (FR-001-025/026/027)
    setActive(key, active) → void
    isActive(key) → boolean
  }
}
```

**GridStack 回调签名**（`useGridStack.js:97-99`）:

| 回调 | 签名 | 绑定 GridStack 事件 |
|---|---|---|
| onNodeAdded | (node, grid, key) | added |
| onNodeRemoved | (node, grid, key) | removed |
| onNodeChange | (node, grid, key) | change |
| onNodeDragStart | (node, grid, key) | dragstart |
| onNodeDragStop | (node, grid, key) | dragstop |
| onNodeResizeStart | (node, grid, key) | resizestart |
| onNodeResizeStop | (node, grid, key) | resizestop |

#### 内部模块级状态（`useGridStack.js:24-28`）

| 变量 | 类型 | 说明 |
|---|---|---|
| grids | Map<string, GridStack> | key→实例映射 |
| activeStates | Map<string, boolean> | key→活动状态 |
| widgetEmitters | Map<string\|number, Function> | nodeId→emit 函数映射 |

## 6. 实现策略

### 6.1 架构模式

**模式**: 中心化编排器（Orchestrator Pattern）+ 分层视口（Viewport Layer）

```
Desktop.vue（唯一编排器）
├── desktop-statusbar           ← Props: userInfo, desktopMode / Emits: enterEdit, exitEdit, logout
├── 主区域（背景 z0 < 视口 z1 < App z10）
│   ├── desktop-background      ← Props: background
│   ├── desktop-viewport-desktop ← Props: desktopConfig, desktopMode, currentPageIndex
│   │   ├── Swiper → SwiperSlide × N
│   │   │   └── .grid-stack (GridStack 实例)
│   │   │       └── desktop-widget-wrapper × M
│   │   └── useGridStack (composable)
│   └── desktop-viewport-app    ← Props: apps
├── desktop-toolbar-main          ← v-if="desktopMode === 'normal'"
├── desktop-toolbar-edit          ← v-if="desktopMode === 'editing'"
├── desktop-widget-list           ← v-if="widgetListVisible"（002）
├── desktop-background-list       ← v-if="backgroundListVisible"（004）
├── desktop-property-panel        ← v-model:visible="widgetPropsVisible"（006）
├── desktop-app-list              ← v-if="appListVisible"（003）
└── desktop-app-store             ← v-if="appStoreVisible"（003）
```

### 6.2 关键算法

#### 6.2.1 GridStack 初始化（`viewport-desktop.vue:91-109`）

实现 FR-001-022/023/024。

```
for each page (idx):
  el ← gridContainers[idx]
  if el 不存在 or 已有实例 → skip
  el.innerHTML = ''  // 清空残留 DOM
  grid ← useGridStack.initGrid(
    key = 'page_' + idx,
    container = el,
    options = { ...DEFAULT_OPTIONS, column: cols },
    callbacks = {
      onNodeAdded: (node) → rerenderNode(node, idx),        // FR-001-028
      onNodeRemoved: (node) → unregisterWidgetEmitter(id)   // FR-001-034
    }
  )
  if grid → grid.load(page.children)  // FR-001-023
```

DEFAULT_OPTIONS（`viewport-desktop.vue:69-75`）:
```
float: false       // 防止节点浮动到空白位置
margin: 5          // 节点间距 5px
animate: true      // 节点位置变化动画
cellHeight: 80     // 每格高度 80px
disableResize: true // 默认禁用 resize，编辑模式才启用
```

#### 6.2.2 模式切换流程（`viewport-desktop.vue:233-248`）

实现 FR-001-012/013/014。

```
watch desktopMode:
  isEditing ← newMode === 'editing'
  swiper.allowTouchMove ← !isEditing              // FR-001-012
  for each grid instance:                         // FR-001-013
    grid.enableMove(isEditing)
    grid.enableResize(isEditing)
  nextTick:
    broadcastToAllWidgets(isEditing ? 'grid-editing' : 'grid-editing-end')  // FR-001-014
    for each grid instance:
      rerenderAllForGrid(grid, idx)               // FR-001-014 (更新外壳属性)
```

退出编辑时的持久化由 Desktop.vue 统一处理（`Desktop.vue:149-157`），不在此 watch 中。

#### 6.2.3 页面增删与实例重建（`viewport-desktop.vue:120-137`）

实现 FR-001-015~020。

```
watch pages.length change:
  rebuildAllGrids():
    for each grid → unmountGridWidgets(grid)    // 卸载所有 VNode
    destroyAll(false)                            // 销毁所有 GridStack 实例
    gridContainers ← slice(0, pages.length)     // 收缩容器引用数组
    nextTick:
      swiper.update()                            // Swiper 感知 slide 数量变化
      activePageIndex ← clamp to valid range    // 防止索引越界
      initAllGridStacks()                        // 重新初始化所有页
      swiper.slideTo(activePageIndex, 0)        // 切换到当前页
      setActive(currentKey, true)                // 激活当前页
```

#### 6.2.4 VNode 渲染（`viewport-desktop.vue:142-203`）

实现 FR-001-028（GridStack 内组件动态挂载的唯一入口）。

```
rerenderNode(node, pageIdx):
  contentEl ← node.el.querySelector('.grid-stack-item-content')
  render(null, contentEl)                          // 卸载旧 VNode
  compName ← node.info.compName
  Comp ← WidgetComponents[compName]
  // 用户数据自动填充（USER_FILL_KEYS 当前为空数组，预留扩展点）
  // 外壳属性：normal=(hideHeader 默认 true, editMode=false)，editing=(hideHeader=false, editMode=true)
  wrapperProps ← { ...wrapperValues, node, meta, hideHeader, editMode, onWidgetEdit, onWidgetRemove }
  childVNode ← Comp ? h(Comp, propsValues) : h('span', fallback)   // FR-001-028
  vnode ← h(WidgetWrapper, wrapperProps, { default: () => childVNode })
  vnode.appContext ← appContext                    // 绑定依赖注入
  render(vnode, contentEl)                         // 挂载
  registerWidgetEmitter(node.id, emit)             // FR-001-032: 注册事件桥接
```

#### 6.2.5 网格数据序列化（`viewport-desktop.vue:381-408`）

实现 FR-001-029/030/031。

```
savePageData(idx):
  grid ← getInstance('page_' + idx)
  saved ← grid.save(false)                         // GridStack 内置序列化
  liveNodes ← grid.engine.nodes                    // 活跃引擎节点（含自定义字段）
  page.children ← saved.map(savedNode):
    live ← find matching node by id in liveNodes
    return { ...savedNode, info: live.info, propsValues: live.propsValues, wrapperValues: live.wrapperValues }

saveAllPages():
  for each page → savePageData(idx)
  return desktopConfig                              // FR-001-030
```

**重要**: 自定义字段（info, propsValues, wrapperValues）从活跃引擎节点显式回填（`viewport-desktop.vue:386-396`），而非依赖 GridStack 的 `save()` 内部克隆行为——因为 GridStack v11 的 `save(false)` 不保证保留这些非标准字段。

#### 6.2.6 网格事件桥接（`useGridStack.js:64-98`）

实现 FR-001-032/033/034。

```
bindGridEvents(grid, key, callbacks):
  grid.on('added', (event, items) → for each node:
    callbacks.onNodeAdded(node)                          // 渲染 VNode → 注册 emitter
    emitToWidget(node.id, 'grid-added', {id,x,y,w,h})    // FR-001-032
  )
  grid.on('removed', (event, items) → for each node:
    emitToWidget(node.id, 'grid-removing', {id})          // FR-001-032
    callbacks.onNodeRemoved(node)                         // 注销 emitter (FR-001-034)
  )
  grid.on('change', (event, items) → callbacks.onNodeChange)
  for each [dragstart→grid-moving, dragstop→grid-moving-end,
            resizestart→grid-resizing, resizestop→grid-resizing-end]:
    grid.on(event, (event, el) → {
      node ← el.gridstackNode
      callbacks[callback](node)
      emitToWidget(node.id, widgetEvent, {id,x,y,w,h})    // FR-001-033
    })
```

**事件映射表**:

| GridStack 事件 | Widget emit | Payload |
|---|---|---|
| added | grid-added | { id, x, y, w, h } |
| removed | grid-removing | { id } |
| dragstart | grid-moving | { id, x, y, w, h } |
| dragstop | grid-moving-end | { id, x, y, w, h } |
| resizestart | grid-resizing | { id, x, y, w, h } |
| resizestop | grid-resizing-end | { id, x, y, w, h } |

#### 6.2.7 活动状态管理（`useGridStack.js:155-170`）

实现 FR-001-025/026/027。

```
setActive(key, active):
  next ← !!active
  if activeStates.get(key) === next AND has(key) → return  // FR-001-027: 状态未变跳过
  activeStates.set(key, next)
  grid ← grids.get(key)
  eventName ← next ? 'grid-active' : 'grid-deactive'
  for each node in grid.engine.nodes:
    emitToWidget(node.id, eventName, { id: node.id })     // FR-001-026
```

调用点:
- Swiper 初始化首页激活（`viewport-desktop.vue:258`）：`setActive('page_0', true)`
- 页面切换（`viewport-desktop.vue:266-268`）：旧页 `setActive(false)` → 新页 `setActive(true)`

#### 6.2.8 HTML5 拖放放置（`viewport-desktop.vue:348-373`）

实现 FR-001-035/036/037。

```
onDrop(event):
  if desktopMode !== 'editing' → return              // FR-001-036
  data ← JSON.parse(event.dataTransfer.getData('application/json'))
  compName ← data.compName
  grid ← getInstance(current page key)
  rect ← gridEl.getBoundingClientRect()
  x ← floor((clientX - rect.left) / grid.cellWidth())   // FR-001-037
  y ← floor((clientY - rect.top) / (cellHeight || 80))
  addWidget(compName, { x, y, ...extra })
```

### 6.3 错误处理

| 场景 | 策略 | 位置 |
|---|---|---|
| fetch 默认配置失败（网络/404） | 回退 FALLBACK_CONFIG，无用户可见错误 | `Desktop.vue:70-78` |
| localStorage 解析失败 | catch→stored=null，静默回退 defaults | `Desktop.vue:82-87` |
| localStorage 写入失败（隐私模式/满） | try/catch→console.warn，不阻断 | `Desktop.vue:102-106` |
| GridStack 容器不存在 | console.error + return null，不抛异常 | `useGridStack.js:103-105` |
| GridStack.init 抛异常（DOM 异常） | try/catch→console.error + return null | `useGridStack.js:112-116` |
| 重复 initGrid 同一 key | console.warn + 返回现有实例 | `useGridStack.js:107-110` |
| addWidget 组件未注册 | console.warn + return null | `viewport-desktop.vue:288-290` |
| addWidget GridStack 不存在 | console.warn + return null | `viewport-desktop.vue:292-294` |
| 拖放 JSON 解析失败 | catch→return（静默忽略） | `viewport-desktop.vue:360-362` |
| emitToWidget 未注册 | 静默跳过（typeof emit !== 'function'） | `useGridStack.js:37-41` |
| 移除最后一页 | pages.length <= 1→return（函数早退） | `Desktop.vue:190-191` |

### 6.4 性能考量

| 措施 | 说明 | 位置 |
|---|---|---|
| O(1) 页面切换 | 仅更新 activeStates Map + 广播事件，不重建 DOM | `viewport-desktop.vue:262-269` |
| 单节点重渲染 | updateWidgetProps 只 rerenderNode 单个节点，不遍历全页 | `viewport-desktop.vue:331-343` |
| 模式切换广播延迟 | watch 回调中用 nextTick 确保 GridStack enableMove/enableResize 先于重渲染 | `viewport-desktop.vue:242-247` |
| setActive 去重 | 状态未变时跳过 broadcast 循环 | `useGridStack.js:157` |
| App 事件 300ms 防抖 | desktopApps.length watch 使用 setTimeout 300ms 防抖，避免快速开/关 App 导致 grid-active/deactive 频繁切换 | `Desktop.vue:400-413` |
| Swiper speed: 300 | 翻页动画 300ms，平衡体验与性能 | `viewport-desktop.vue:442` |
| 页面增删时 destroyAll(false) | 不删除 DOM 容器元素（供重建使用） | `viewport-desktop.vue:122` |

## 7. 测试考量

### 7.1 可测试性分析

| 组件 | 可测试性 | 建议测试策略 |
|---|---|---|
| useGridStack | **高**（纯逻辑，无 DOM 依赖） | 单元测试：initGrid/destroyAll/getInstance 生命周期、setActive 去重、emitToWidget 桥接 |
| Desktop.vue | **中**（依赖 fetch + localStorage + viewportRef） | 集成测试：mock fetch + localStorage，验证 config 加载/合并/持久化、模式切换、页面增删 |
| viewport-desktop.vue | **低**（强依赖 Swiper + GridStack DOM） | 需 mount 后访问 Swiper/GridStack API，建议 E2E 测试 |
| toolbar-main/toolbar-edit | **高**（纯展示 + emit） | 组件测试：验证 props→渲染正确、emit 事件正确触发 |
| statusbar | **高**（除时钟逻辑外） | 组件测试：mode 切换 emit、user popover、mock dayjs 验证时钟格式 |

### 7.2 关键测试场景

1. **配置加载流程**: 正常、fetch 失败→fallback、localStorage 损坏→回退、pages 为空→兜底
2. **配置持久化流程**: 退出编辑时调用 saveAllPages + persistConfig
3. **模式切换**: normal↔editing、Swiper touch enable/disable、GridStack enableMove/enableResize
4. **页面管理**: 前加/后加/移除、至少保留一页、实例重建
5. **GridStack 事件桥接**: added→grid-added, dragstop→grid-moving-end 等 6 种映射
6. **活动状态**: 首页激活、页面切换 deactive/active、状态不变跳过
7. **字体缩放**: 加大→减小→还原，边界情况 min 10px
8. **数据序列化往返**: addWidget→savePageData→grid.load 数据完整性

### 7.3 边缘情况

- 同时添加多个页面后立即切换（Swiper slideTo 时序）
- 编辑模式下快速拖拽后立即退出编辑（序列化与持久化顺序）
- localStorage 不可用时桌面仍能运行
- 删除包含部件的页面（所有部件随 GridStack 实例销毁）
- 快速切换页面时 Swiper activeIndex 与 internal activePageIndex 同步

## 8. 文件清单

| 文件 | 用途 | 行数 |
|---|---|---|
| `src/pages/Desktop.vue` | 页面编排器：配置加载/持久化、模式管理、页面增删、字体缩放、面板显隐协调、所有事件接线 | 488 |
| `src/components/viewport/desktop-viewport-desktop.vue` | 桌面视口：Swiper 多页管理、每页 GridStack 初始化/销毁、VNode 渲染/卸载、模式感知行为、数据序列化、HTML5 拖放、defineExpose API | 393 |
| `src/composables/useGridStack.js` | GridStack 多实例管理 + Widget 事件桥接 + 活动状态管理（模块级 Map 单例） | 160 |
| `src/components/desktop/desktop-toolbar-main.vue` | 浏览模式底部主工具栏：主页、App 列表、快捷方式、运行中 App（fixed 底部、hover 滑出） | 212 |
| `src/components/desktop/desktop-toolbar-edit.vue` | 编辑模式底部编辑工具栏：背景、部件、主题、页面管理下拉、字号调整下拉、完成（fixed 底部完全可见） | 152 |
| `src/components/desktop/desktop-statusbar.vue` | 顶部状态栏：实时时钟（每秒刷新）、桌面模式切换入口、用户信息与登出 | 155 |
| `public/DEFAULT_DESKTOP_JSON.json` | 默认桌面配置模板（fetch 加载的初始配置） | 16 |
| `src/components/index.js` | UI 组件自动扫描注册（import.meta.glob，供其他模块消费） | 18 |
| **合计** | | **~1,594** |

## 版本历史

| 日期 | 变更 |
|---|---|
| 2026-07-19 | 初始 As-Built 版本，从源代码逆向整理。基于 tpl-desktop 实际代码状态。 |
