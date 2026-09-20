# 007-wujie-system 技术方案

> 模块: 007-wujie-system
> 对应规格: [spec.md](./spec.md)
> 最后更新: 2026-07-19

## 1. 技术上下文

### 1.1 运行环境

- **构建时**: Vite 7，主应用通过 `import.meta.glob` 的 `{ eager: true }` 模式在模块加载时同步完成本地组件扫描。子应用通过独立 Vite 构建，产物由主应用在运行时通过 wujie 沙箱加载。
- **运行时**: 浏览器（Vue 3 Composition API）。主应用创建 Vue app 实例并挂载到 `#app`，子应用通过 wujie `startApp()` 命令式 API 在沙箱 iframe 内创建独立的 Vue app 实例，共享主应用的 `window.__WUJIE_RAW_WINDOW__` 暴露的核心对象。
- **沙箱隔离**: 每个子应用运行在独立的 wujie iframe 沙箱中。子应用 JS 运行在沙箱作用域内，不能直接访问主应用的 DOM 和 JS 对象。通过 `window.__WUJIE_RAW_WINDOW__` 暴露的共享对象（Vue app 实例、依赖库）由子应用通过该桥梁消费。
- **子应用路由**: 子应用不注入主应用路由（无 `WujieVue` 组件）。子应用为纯 JS 运行时注入，不在主应用 DOM 中挂载任何子应用组件。主应用通过 `startApp()` 启动沙箱后，子应用自行挂载到自身沙箱 DOM。

### 1.2 直接依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| wujie-vue3 | ^1.0.22 | `setupApp()` `startApp()` `bus` — 子应用沙箱生命周期管理、主子应用通信总线 |
| wujie | (wujie-vue3 依赖) | 底层沙箱引擎，提供 iframe 隔离、JS 沙箱、CSS 沙箱、生命周期钩子 |
| Vue 3 | (peer) | `createApp` `ref` `computed` `onMounted` `nextTick` — 主应用 Vue 实例创建、响应式状态、生命周期 |
| Vite | 7 | `import.meta.glob` 构建时扫描；`server.proxy` 反向代理子应用 dev server |
| Element Plus | (peer) | 主应用 UI 组件，子应用通过共享 Vue app 实例引用 |

## 2. 宪法合规检查

| 宪法条款 | 状态 | 证据 / 说明 |
|---------|------|-------------|
| 第1条: 元数据驱动的组件扩展 | ✅ 合规 | 子应用通过 `window.__WUJIE_RAW_WINDOW__` 暴露的共享 Vue app 实例注册组件，主应用通过 `useWujie` 管理子应用元数据的动态注入。`PLUGINS.json` 提供声明式子应用清单，新增子应用只需添加 JSON 条目和子应用目录。 |
| 第2条: 宿主与内容分离 | ✅ 合规 | 子应用 Widget/App 组件在子应用沙箱中定义和注册，主应用通过元数据字典使用。Widget 仍通过 `desktop-widget-wrapper` 容器外壳挂载，子应用仅提供组件定义，不感知外壳。 |
| 第3条: 模块级单例共享状态 | ✅ 合规 | `useWujie.js` 内模块级 `wujieStatus` Map（key → { status, error }），所有调用方共享同一份子应用状态。`useWidgetMetas.js` 等 composable 保持模块级 `ref()` 单例，动态注入的元数据追加到同一字典。 |
| 第4条: VNode 渲染与 GridStack 共存 | ✅ 合规 | 子应用 Widget 组件通过全局注册后在主应用 `WidgetComponents` 字典中可用。主应用视口的 `rerenderNode()` 仍使用 `h(WidgetWrapper, ...)` + `render()` 模式挂载，不因组件来源（本地/子应用）而改变渲染路径。 |
| 第5条: Props/Emits 单向数据流 | ✅ 合规 | Widget/App 组件与主应用交互仍通过 props ↓ / emits ↑。子应用组件在主应用全局注册后，与本地组件使用方式完全一致。 |
| 第6条: 页面编排器中心化状态 | ✅ 合规 | 子应用加载状态（`wujieStatus`）由 `useWujie` composable 管理，Desktop.vue 通过该 composable 获取子应用就绪信号并门控初始化流程。Desktop.vue 仍为唯一编排中心。 |
| 第7条: Composition API | ✅ 合规 | 所有 `.vue` 文件使用 `<script setup>`，`useWujie.js` 导出纯 composable 函数。 |
| 第8条: 命名约定 | ✅ 合规 | 子应用内文件延续 `*.widget.vue` / `*.widget.js` / `*.app.vue` / `*.app.js` / `*.bg.js` 命名约定；子应用入口使用 `main.js` / `plugin.js` 明确区分；Composable 使用 `use*.js` (camelCase)。 |
| 第9条: CSS 变量体系 | ✅ 合规 | 子应用组件使用 `--desktop-*` CSS 变量（主应用主题变量通过 wujie CSS 沙箱自动继承到子应用 iframe 内）。 |
| 第10条: CSS 作用域 | ✅ 合规 | 所有组件样式使用 `<style scoped lang="scss">`。wujie CSS 沙箱 (`cssLoader`) 自动隔离子应用全局样式，防止污染主应用 DOM。 |
| 第11条: 元数据默认值回退 | ✅ 合规 | 子应用提供的元数据经过与本地注册表相同的默认值回退逻辑（通过 composable 的动态注入函数统一处理）。 |
| 第12条: 错误处理策略 | ✅ 合规 | `startApp()` 失败时捕获错误并写入 `wujieStatus` 状态，不阻断主应用启动。子应用加载超时（默认 10s）后标记为 `error`，Desktop.vue 的 loadDesktopConfig 在子应用就绪门控超时后使用 fallback。PLUGINS.json fetch 失败时子应用功能不可用但不影响本地组件正常工作。 |
| 第13条: Widget 不得接触桌面状态 | ✅ 合规 | 子应用内 Widget 组件不接触 `Desktop.vue`、`useGridStack`、`desktopConfig`、`localStorage`（主应用 localStorage 对子应用隔离）。 |
| 第14条: 只读元数据消费 | ✅ 合规 | 子应用注入的元数据与本地元数据合并后，所有消费者（分类树、属性编辑器）只读不写。 |

异常项: 无违反项。

## 3. 关键决策

### 3.1 子应用加载策略: 命令式 startApp() vs WujieVue 组件

**决策**: 使用 `startApp()` 命令式 API 启动子应用，不使用 `WujieVue` 路由组件。

**理由**:
- 主应用无路由系统（无 vue-router），`WujieVue` 组件通过 `<WujieVue name="xxx" url="xxx">` 声明式注入子应用 DOM，不适配本项目的无路由架构。
- 子应用只作为"组件和元数据提供方"——主应用不需要渲染子应用的 DOM 到页面中，只需要获取其 JS 运行时以注册组件和元数据。
- `startApp({ el, url, alive, exec, fiber })` 命令式 API 允许精细控制子应用沙箱生命周期：`alive=true` 保活模式避免重复初始化开销，`exec=false` 延迟执行等待主应用信号，`fiber=true` 启用 fiber 模式优化渲染性能。
- 子应用挂载点 (`el`) 设置为 `document.createElement('div')` 的离屏 DOM 节点，不插入主应用 DOM 树，确保子应用 UI 完全隔离。

**实现**: `useWujie.js` 中：
```js
// 创建离屏挂载容器
const container = document.createElement('div')
container.id = `wujie-plugin-${name}`
const app = startApp({
  name,
  url,
  el: container,
  alive: true,
  exec: false,   // 延迟执行：先 setupApp 注册生命周期，再主动调用 startApp
  fiber: true,
  props: {
    // 传递给子应用的 props
  },
})
```

**替代方案**: 使用 `WujieVue` 组件 — 需要路由注入且会将子应用 DOM 渲染到主应用页面中，不符合"纯 JS 运行时获取"的需求。

### 3.2 元数据合并策略: 动态 push 到本地字典

**决策**: 改造 `useWidgetMetas` / `useAppMetas` / `useBackgroundMetas` 为支持动态注入。子应用加载完成后，通过 `window.__WUJIE_RAW_WINDOW__` 获取子应用暴露的元数据对象，合并到主应用模块级 `ref()` 字典中。

**理由**:
- 保持现有消费者（分类树 `desktop-widget-list.vue`、属性编辑器 `desktop-property-panel.vue`、`desktop.js` 全局注册）零改动。它们只关心 `widgetMetas.value` 字典是否有新条目。
- 子应用提供与本地完全同构的元数据对象（含 `compName` / `title` / `category` / `rect` / `props` 等），合并后无差异。
- 模块级 `ref()` 的响应式特性确保合并后所有依赖该字典的 Vue 组件自动更新。

**实现**:
```js
// useWidgetMetas.js 改造后
const widgetMetas = ref({ ...WidgetMetas })  // 浅拷贝本地元数据为响应式初始值

export function useWidgetMetas() {
  // 外部可调用此方法注入子应用元数据
  function injectWidgetMetas(pluginName, metas) {
    for (const [compName, meta] of Object.entries(metas)) {
      if (compName in widgetMetas.value) {
        console.warn(`[useWidgetMetas] 组件名冲突: "${compName}" 来自插件 "${pluginName}"，已存在，将被覆盖`)
      }
      widgetMetas.value[compName] = meta
    }
  }
  return { widgetMetas, injectWidgetMetas }
}
```

### 3.3 Vue 核心对象共享: 子应用通过 __WUJIE_RAW_WINDOW__ 消费主应用实例

**决策**: 主应用在 `setupApp()` 完成后，通过 `window.__WUJIE_RAW_WINDOW__` 向子应用暴露主应用的 Vue app 实例和关键依赖（Element Plus 等），子应用通过该桥梁直接消费主应用的全局注册能力。

**理由**:
- 子应用不需要安装自己的 `Element Plus` 实例（避免重复 CSS 和插件冲突），直接使用主应用已全局注册的 UI 组件。
- 子应用的 Widget/App 组件通过主应用 Vue app 实例的 `app.component(name, comp)` 全局注册后，在主应用 `h(Comp)` 渲染时可直接解析。
- 节省子应用的 bundle 体积（Vue、Element Plus、lodash 等由主应用提供）。
- 子应用与主应用共享同一 Vue 运行时，确保 `getCurrentInstance()?.appContext` 和 `h()` 渲染的组件能访问全局注册的组件和插件。

**实现**:
```js
// useWujie.js — 在子应用 beforeLoad 钩子中注入
function setupPluginApp(name, appConfig) {
  setupApp({
    name,
    url: appConfig.url,
    alive: true,
    exec: false,
    fiber: true,
    beforeLoad(appWindow) {
      // 向子应用沙箱暴露主应用的核心对象
      appWindow.__WUJIE_RAW_WINDOW__.__VUE_APP__ = app        // 主应用 Vue app 实例
      appWindow.__WUJIE_RAW_WINDOW__.__ELEMENT_PLUS__ = ElementPlus
    },
    afterMount(appWindow) {
      // 子应用挂载后，通过 bus 通知子应用开始注册组件
      bus.$emit('plugin:ready', { name })
    },
  })
}
```

### 3.4 初始化时序: 子应用就绪门控

**决策**: Desktop.vue 的 `loadDesktopConfig` 在子应用全部就绪后才执行。`onMounted` 中增加"子应用就绪"门控：
1. 先启动子应用加载（`useWujie.loadPlugins()`）
2. 等待 `Promise.all`（所有子应用 `afterMount` 触发 + 元数据注入完成）
3. 再执行 `loadDesktopConfig()`

**理由**:
- 桌面配置（`desktopConfig`）中的 `children` 数组可能引用子应用提供的组件（通过 `compName`）。若子应用未就绪即加载配置，会导致引用不存在的组件而渲染占位符或报错。
- 子应用加载是异步操作（网络请求 + JS 解析 + Vue app 创建），必须等待完成才能保证组件字典完整。
- 门控超时（10s）：若子应用在超时内未就绪，不影响主应用本地组件正常工作，仅子应用功能不可用。

**实现**:
```js
// Desktop.vue onMounted 改造
onMounted(async () => {
  // Step 1: 启动所有子应用加载（并行）
  const { loadPlugins, isAllPluginsReady } = useWujie()
  loadPlugins()

  // Step 2: 等待所有子应用就绪（超时 10s）
  await Promise.race([
    isAllPluginsReady(),
    new Promise((resolve) => setTimeout(resolve, 10000)),
  ])

  // Step 3: 加载桌面配置（此时元数据字典已包含所有子应用条目）
  await loadDesktopConfig()

  // Step 4: 应用主题 + 会话恢复（不变）
  if (desktopConfig.value?.theme) setTheme(desktopConfig.value.theme)
  const stored = restoreSession()
  if (stored) {
    loginUser.value = stored
  } else {
    showLoginDialog.value = true
  }
})
```

### 3.5 反向代理: Vite dev server proxy

**决策**: `vite.config.js` 的 `server.proxy` 添加 `/tpl-desktop-plugin-demo` → `http://127.0.0.1:5273` 的反向代理映射。

**理由**:
- 开发环境下子应用运行在独立的 Vite dev server（如端口 5273），与主应用（端口 5173）不同源。同源策略阻止主应用 fetch 子应用的 `plugin.html` 入口。
- 通过 Vite proxy 将子应用的 URL 映射到主应用的同源路径下，避免跨域问题。
- 生产环境部署在同一域下时也不存在跨域问题。proxy 仅用于开发阶段的便利性。

**实现**: `vite.config.js`
```js
server: {
  proxy: {
    '/authcenter': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
    '/tpl-desktop-plugin-demo': {
      target: 'http://127.0.0.1:5273',
      changeOrigin: true,
      // rewrite: (path) => path.replace(/^\/tpl-desktop-plugin-demo/, ''),  // 如子应用不需前缀则启用
    },
  },
}
```

### 3.6 子应用生命周期参数

**决策**: 使用 `alive=true` 保活模式 + `exec=false` 延迟执行 + `fiber=true` 并发渲染。

**理由**:
- **`alive=true` 保活模式**: 子应用 iframe 创建后不销毁，避免重复初始化的网络和 JS 解析开销。适用于子应用在主应用生命周期内始终需要的场景。
- **`exec=false` 延迟执行**: 主应用先通过 `setupApp()` 注册生命周期钩子和注入共享对象，子应用需等待 `bus.$emit('plugin:ready')` 信号后才开始执行 `main.js` 中的组件注册逻辑。这确保共享对象（`__VUE_APP__`、`__ELEMENT_PLUS__`）在子应用代码执行前已就绪。
- **`fiber=true` 并发渲染**: 启用 wujie 的 fiber 调度模式，避免长任务阻塞主应用 UI 线程。适用于子应用组件注册量较大的场景。

**实现**:
```js
// setupPluginApp 配置
const lifecycle = setupApp({
  name: pluginName,
  url: pluginUrl,
  alive: true,
  exec: false,
  fiber: true,
  // ... 生命周期钩子
})
```

## 4. 文件结构变更

### 4.1 主应用新增/修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `public/PLUGINS.json` | **新增** | 子应用清单配置文件，声明每个子应用的 name / url / entry / description |
| `src/composables/useWujie.js` | **新增** | wujie 子应用管理 composable：`setupPluginApp()` 注册生命周期，`loadPlugins()` 并行启动，`isAllPluginsReady()` 就绪门控，`bus` 主子通信。模块级 `wujieStatus` Map 记录各子应用状态。 |
| `src/composables/useWidgetMetas.js` | **修改** | 新增 `injectWidgetMetas(pluginName, metas)` 方法，允许外部将子应用 Widget 元数据动态 push 到模块级 `ref()` 字典中。导出从 `widgetMetas` 扩展为 `{ widgetMetas, injectWidgetMetas }`。 |
| `src/composables/useAppMetas.js` | **修改** | 新增 `injectAppMetas(pluginName, metas)` 方法，允许外部将子应用 App 元数据动态 push 到模块级 `ref()` 字典中。导出从 `appMetas` 扩展为 `{ appMetas, injectAppMetas }`。 |
| `src/composables/useBackgroundMetas.js` | **修改** | 新增 `injectBackgroundMetas(pluginName, metas)` 方法，允许外部将子应用 Background 元数据动态 push 到模块级 `ref()` 字典中。导出从 `backgroundMetas` 扩展为 `{ backgroundMetas, injectBackgroundMetas }`。 |
| `src/desktop.js` | **修改** | 引入 `wujie-vue3`（`import WujieVue from 'wujie-vue3'`），`app.use(WujieVue)` 注册插件。移除已迁移到子应用的组件全局注册（BasicImage、BasicVideo、BasicText、BasicNumber、BasicClock）。 |
| `src/pages/Desktop.vue` | **修改** | `onMounted` 增加子应用就绪门控（Step 1: `loadPlugins()` → Step 2: 等待 `isAllPluginsReady()` → Step 3: `loadDesktopConfig()`）。导入 `useWujie` composable。 |
| `vite.config.js` | **修改** | `server.proxy` 添加子应用 dev server 反向代理（`/tpl-desktop-plugin-demo` → `http://127.0.0.1:5273`）。 |
| `src/widgets/basic/BasicImage.widget.vue` | **删除** | 已迁移到子应用 `tpl-desktop-plugin-demo` |
| `src/widgets/basic/BasicImage.widget.js` | **删除** | 已迁移到子应用 `tpl-desktop-plugin-demo` |
| `src/widgets/basic/BasicVideo.widget.vue` | **删除** | 已迁移到子应用 `tpl-desktop-plugin-demo` |
| `src/widgets/basic/BasicVideo.widget.js` | **删除** | 已迁移到子应用 `tpl-desktop-plugin-demo` |
| `src/widgets/basic/BasicText.widget.vue` | **删除** | 已迁移到子应用 `tpl-desktop-plugin-demo` |
| `src/widgets/basic/BasicText.widget.js` | **删除** | 已迁移到子应用 `tpl-desktop-plugin-demo` |
| `src/widgets/basic/BasicNumber.widget.vue` | **删除** | 已迁移到子应用 `tpl-desktop-plugin-demo` |
| `src/widgets/basic/BasicNumber.widget.js` | **删除** | 已迁移到子应用 `tpl-desktop-plugin-demo` |
| `src/apps/basic/BasicClock.app.vue` | **删除** | 已迁移到子应用 `tpl-desktop-plugin-demo` |
| `src/apps/basic/BasicClock.app.js` | **删除** | 已迁移到子应用 `tpl-desktop-plugin-demo` |
| `src/backgrounds/dark/*.bg.js` | **删除** | 被覆盖：子应用提供同名背景替换（`DesktopConfig.background.name` 引用不变） |
| `src/backgrounds/light/*.bg.js` | **删除** | 被覆盖 |
| `src/backgrounds/video/*.bg.js` | **删除** | 被覆盖 |
| `package.json` | **修改** | 新增依赖 `wujie-vue3` |

### 4.2 子应用文件结构 (tpl-desktop-plugin-demo)

```
tpl-desktop-plugin-demo/
├── package.json                 # 子应用独立 package: name=tpl-desktop-plugin-demo, deps=vue(peer)
├── vite.config.js               # Vite dev server: port=5273, 构建 lib 模式输出 UMD
├── index.html                   # 子应用开发入口（开发时独立运行调试用）
├── plugin.html                  # 子应用 wujie 沙箱入口 HTML（生产环境，被主应用 iframe 加载）
├── src/
│   ├── main.js                  # 子应用 wujie 生命周期入口：
│   │                            #   - 监听 bus.$on('plugin:ready') 信号
│   │                            #   - 创建 Vue app 实例（复用 __VUE_APP__ 或新建）
│   │                            #   - 注册所有本地 Widget/App 组件到主应用 Vue app
│   │                            #   - 通过 bus.$emit 回传元数据对象
│   ├── plugin.js                # plugin.html 入口，负责挂载 DOM 和暴露全局接口：
│   │                            #   - 挂载子应用自身 UI（如有配置面板需求）
│   │                            #   - 暴露全局函数供主应用直接调用
│   │                            #   - **本阶段**: plugin.html 为占位空白页，不渲染可见 UI
│   ├── apps/
│   │   └── demo/
│   │       ├── DemoClock.app.vue    # 迁移自 BasicClock（重命名体现子应用标识）
│   │       └── DemoClock.app.js     # 元数据：title=时钟, category=基础应用, rect=3×3
│   ├── widgets/
│   │   └── demo/
│   │       ├── DemoImage.widget.vue # 迁移自 BasicImage
│   │       ├── DemoImage.widget.js
│   │       ├── DemoVideo.widget.vue # 迁移自 BasicVideo
│   │       ├── DemoVideo.widget.js
│   │       ├── DemoText.widget.vue  # 迁移自 BasicText
│   │       ├── DemoText.widget.js
│   │       ├── DemoNumber.widget.vue # 迁移自 BasicNumber
│   │       └── DemoNumber.widget.js
│   └── backgrounds/
│       ├── dark/
│       │   ├── dark-000.bg.js       # 复制自主应用（包括 avatar、thumbnail、image import）
│       │   ├── dark-001.bg.js
│       │   ├── dark-002.bg.js
│       │   └── dark-003.bg.js
│       ├── light/
│       │   ├── light-000.bg.js
│       │   ├── light-001.bg.js
│       │   ├── light-002.bg.js
│       │   └── light-003.bg.js
│       └── video/
│           ├── video-000.bg.js
│           ├── video-001.bg.js
│           ├── video-002.bg.js
│           └── video-003.bg.js
```

> 注：子应用 `src/` 目录遵循与主应用相同的命名约定（PascalCase 前缀 + `.widget.vue` / `.widget.js` / `.app.vue` / `.app.js` / `.bg.js`），确保与宪法第8条一致。

## 5. 数据流

### 5.1 子应用加载流程

```
[Desktop.vue onMounted]
  → useWujie.loadPlugins()
    → fetch('/PLUGINS.json') 获取子应用清单
      → 遍历清单，每个子应用并行：
        1. setupApp({ name, url, alive, exec, fiber, ... })
           → 注册生命周期钩子（beforeLoad / afterMount / afterUnmount / loadError）
        2. beforeLoad 钩子触发：
           → 向 appWindow.__WUJIE_RAW_WINDOW__ 注入：
             { __VUE_APP__, __ELEMENT_PLUS__ }
        3. startApp({ name }) 启动沙箱
           → wujie 创建 iframe + 加载 plugin.html
           → plugin.html 中 <script src="main.js"> 开始执行
        4. 子应用 main.js：
           → 监听 bus.$on('plugin:ready')
           → bus.$emit('plugin:ready') 由主应用 afterMount 触发
        5. afterMount 钩子触发：
           → bus.$emit('plugin:ready', { name })
        6. 子应用 main.js 响应 plugin:ready：
           → 创建/复用 Vue app 实例
           → 遍历本地 Widget/App 组件，app.component(name, comp) 全局注册
           → 构建 WidgetMetas / AppMetas / BackgroundMetas 对象
           → bus.$emit('plugin:register', { name, metas })
        7. 主应用 useWujie 监听 bus.$on('plugin:register')：
           → 调用 injectWidgetMetas(name, metas.widgetMetas)
           → 调用 injectAppMetas(name, metas.appMetas)
           → 调用 injectBackgroundMetas(name, metas.backgroundMetas)
           → 更新 wujieStatus.set(name, { status: 'ready' })
    → isAllPluginsReady() resolve
  → loadDesktopConfig() 执行（此时元数据字典完整）
```

### 5.2 元数据注入流程

```
子应用 main.js                          主应用 useWujie.js
    │                                       │
    ├─ 构建元数据对象 ───────────────────→  bus.$on('plugin:register')
    │  {                                     │
    │    widgetMetas: {                   ├─ injectWidgetMetas(pluginName, metas)
    │      DemoText: { ... },             │    → widgetMetas.value[compName] = meta
    │      DemoImage: { ... },            │    (模块级 ref 响应式更新)
    │    },                               │
    │    appMetas: {                      ├─ injectAppMetas(pluginName, metas)
    │      DemoClock: { ... },            │    → appMetas.value[compName] = meta
    │    },                               │
    │    backgroundMetas: {               ├─ injectBackgroundMetas(pluginName, metas)
    │      'dark-000': { ... },           │    → backgroundMetas.value[name] = meta
    │    },                               │
    │  }                                  │
    │                                     ├─ 标记 wujieStatus[name] = ready
    └─ bus.$emit('plugin:register', ...)  │
                                          └─ 检查 isAllPluginsReady()
                                              → 若所有子应用 ready，resolve 门控 Promise

结果: widgetMetas.value / appMetas.value / backgroundMetas.value
      新增子应用的元数据条目，现有消费者（分类树、属性编辑器、视口）
      通过响应式系统自动感知变化并重新渲染。
```

### 5.3 Desktop 初始化时序

```
原有流程 (Desktop.vue onMounted):
  loadDesktopConfig() → setTheme() → restoreSession()

改造后流程:
  ┌─────────────────────────────────────────┐
  │ 1. loadPlugins()                        │
  │    - fetch PLUGINS.json                 │
  │    - 并行 startApp 所有子应用          │
  │    - 等待 afterMount + 元数据注入完成   │
  ├─────────────────────────────────────────┤
  │ 2. 门控: await isAllPluginsReady()      │
  │    超时 10s 后仍继续（子应用不可用）    │
  ├─────────────────────────────────────────┤
  │ 3. loadDesktopConfig()                  │
  │    - fetch DEFAULT_DESKTOP_JSON.json   │
  │    - 合并 localStorage                  │
  │    - 此时 widgetMetas.value 已包含      │
  │      子应用提供的组件元数据             │
  ├─────────────────────────────────────────┤
  │ 4. setTheme(desktopConfig.value.theme)  │
  │ 5. restoreSession()                     │
  │ 6. 登录用户就绪 → 桌面渲染             │
  └─────────────────────────────────────────┘

后备路径（超时或子应用失败）:
  - 子应用不可用时，仅本地元数据可用
  - desktopConfig 中引用子应用组件的 children 条目
    在视口 rerenderNode 时渲染"组件未找到"占位符
  - 不影响本地组件的正常工作
```

## 6. 接口设计

### 6.1 useWujie Composable API

```js
// src/composables/useWujie.js

import { ref, computed, readonly } from 'vue'
import { setupApp, startApp, bus, destroyApp } from 'wujie'

// ============================================================
// 007-wujie-system: 子应用加载与管理
//
// 模块级状态:
//   wujieStatus: Map<pluginName, { status, error? }>
//     status: 'loading' | 'ready' | 'error'
//   pluginsConfig: 子应用清单（PLUGINS.json 内容）
//
// 导出 composable:
//   useWujie()
//     → { wujieStatus, loadPlugins, isAllPluginsReady, destroyAllPlugins }
// ============================================================

// 模块级状态（第3条：所有调用方共享同一实例）
const wujieStatus = ref(new Map())
const pluginsConfig = ref([])

export function useWujie() {
  /**
   * 加载 PLUGINS.json 并并行启动所有子应用
   * 应在 Desktop.vue onMounted 中调用
   */
  async function loadPlugins() { /* ... */ }

  /**
   * 返回 Promise，在所有子应用就绪后 resolve
   * 用于 Desktop.vue 初始化门控
   */
  function isAllPluginsReady() { /* ... */ }

  /**
   * 销毁所有子应用沙箱（用于 HMR 重新加载场景）
   */
  function destroyAllPlugins() { /* ... */ }

  return {
    wujieStatus: readonly(wujieStatus),
    loadPlugins,
    isAllPluginsReady,
    destroyAllPlugins,
  }
}
```

### 6.2 PLUGINS.json Schema

```json
// public/PLUGINS.json
[
  {
    "name": "tpl-desktop-plugin-demo",          // 子应用唯一标识，对应 wujie name
    "title": "演示插件",                // 人类可读标题
    "version": "1.0.0",                // 语义化版本
    "url": "/tpl-desktop-plugin-demo/",         // 子应用资源根路径
    "entry": "plugin.html",            // wujie 沙箱入口 HTML（相对于 url）
    "description": "演示子应用，包含基础 Widget（文字/数字/图片/视频）、时钟 App 和内置背景",
    "author": "tpl-desktop team",
    "enabled": true                    // 是否启用（可通过 UI 或配置开关）
  }
]
```

**字段说明**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 子应用唯一标识，用于 `startApp({ name })` 和 `wujieStatus` Map key |
| `title` | string | ✅ | 人类可读标题，可用于插件管理 UI |
| `version` | string | — | 语义化版本，预留扩展点 |
| `url` | string | ✅ | 子应用资源根路径（开发环境为 proxy 路径，生产环境为部署路径） |
| `entry` | string | — | wujie 沙箱入口 HTML 文件名，默认 `"index.html"`，本项目使用 `"plugin.html"` 以区分子应用自身 HTML 与沙箱入口 |
| `description` | string | — | 描述文本 |
| `author` | string | — | 作者标识 |
| `enabled` | boolean | — | 是否启用，默认 `true`，预留插件开关功能 |

### 6.3 子应用暴露的全局接口

```
子应用通过 bus.$emit('plugin:register', { name, metas }) 向主应用传递元数据:

metas = {
  widgetMetas: Record<string, WidgetMeta>,   // 与主应用 WidgetMetas 结构完全一致
  appMetas: Record<string, AppMeta>,         // 与主应用 AppMetas 结构完全一致
  backgroundMetas: Record<string, DesktopBackgroundMeta>,  // 与主应用 BackgroundMetas 结构完全一致
}
```

**子应用 main.js 约定（伪代码）**:

```js
// tpl-desktop-plugin-demo/src/main.js
import { createApp } from 'vue'
import { bus } from 'wujie'

// 从主应用注入的共享窗口获取核心对象
const rawWindow = window.__WUJIE_RAW_WINDOW__
const hostVueApp = rawWindow?.__VUE_APP__      // 主应用 Vue app 实例
const ElementPlus = rawWindow?.__ELEMENT_PLUS__ // 主应用 ElementPlus 实例

// 子应用本地组件注册清单
import DemoTextWidget from './widgets/demo/DemoText.widget.vue'
import DemoTextMeta from './widgets/demo/DemoText.widget.js'
// ... 其他组件导入

// 等待主应用 ready 信号
bus.$on('plugin:ready', ({ name }) => {
  // 将本地组件注册到主应用 Vue app（零开销：不创建新 app 实例时）
  const app = hostVueApp || createApp({})
  if (ElementPlus) app.use(ElementPlus)

  // 注册所有 Widget 组件
  app.component('DemoText', DemoTextWidget.default || DemoTextWidget)
  // ...

  // 向主应用上报元数据
  bus.$emit('plugin:register', {
    name,
    metas: {
      widgetMetas: {
        DemoText: { ...DemoTextMeta.default, compName: 'DemoText' },
        // ...
      },
      appMetas: { /* ... */ },
      backgroundMetas: { /* ... */ },
    },
  })
})
```

## 7. 实现策略

### 7.1 主应用改造步骤

按依赖关系和风险从低到高排序：

**Step 1: 环境准备**
1. 安装 `wujie-vue3` 依赖: `pnpm add wujie-vue3`
2. 在 `vite.config.js` 添加 `/tpl-desktop-plugin-demo` proxy
3. 创建 `public/PLUGINS.json` 声明子应用清单

**Step 2: 创建 useWujie composable**
4. 创建 `src/composables/useWujie.js`，实现:
   - `loadPlugins()`: fetch PLUGINS.json → 并行 setupApp + startApp
   - `isAllPluginsReady()`: Promise + poll 检查所有子应用 status
   - `bus.$on('plugin:register')`: 监听并调用 inject* 方法
   - `destroyAllPlugins()`: 销毁所有沙箱
5. 单元验证: composable 模块级状态正确初始化

**Step 3: 改造 composable 层（useWidgetMetas / useAppMetas / useBackgroundMetas）**
6. 修改 `src/composables/useWidgetMetas.js`: 新增 `injectWidgetMetas(name, metas)` 导出
7. 修改 `src/composables/useAppMetas.js`: 新增 `injectAppMetas(name, metas)` 导出
8. 修改 `src/composables/useBackgroundMetas.js`: 新增 `injectBackgroundMetas(name, metas)` 导出
9. 注意: 注入时需处理同名冲突（console.warn + 后注入覆盖前注入）

**Step 4: 改造 desktop.js 入口**
10. `import WujieVue from 'wujie-vue3'`
11. `app.use(WujieVue)` 注册 wujie 插件
12. 移除已迁移组件的全局注册代码（BasicImage/Video/Text/Number/Clock）
13. 注释说明这些组件由子应用 tpl-desktop-plugin-demo 提供

**Step 5: 改造 Desktop.vue 初始化**
14. 导入 `useWujie` composable
15. 改造 `onMounted`:
    - 调用 `loadPlugins()` 启动子应用加载
    - `await isAllPluginsReady()` 或超时 10s
    - 执行原有 `loadDesktopConfig()` + `setTheme()` + `restoreSession()`
16. 在 `onBeforeUnmount` 中调用 `destroyAllPlugins()` 清理沙箱

**Step 6: 验证**
17. 主应用独立启动（不启动子应用 dev server）: 本地组件正常工作，子应用状态标记 error
18. 主应用 + 子应用同时启动: 子应用组件出现在 Widget/App 列表中，桌面配置中的子应用组件正常渲染

### 7.2 子应用创建步骤

**Step 1: 项目初始化**
1. 在 monorepo 根或独立目录创建 `tpl-desktop-plugin-demo/`
2. 创建 `package.json`: `name: "tpl-desktop-plugin-demo"`, `private: true`, `type: "module"`
   - `dependencies`: `vue` (peer, 使用主应用提供的实例)
   - `devDependencies`: `vite`, `@vitejs/plugin-vue`, `sass`
3. 创建 `vite.config.js`:
   ```js
   import { defineConfig } from 'vite'
   import vue from '@vitejs/plugin-vue'
   export default defineConfig({
     plugins: [vue()],
     server: { port: 5273 },
     build: {
       lib: {
         entry: 'src/main.js',
         formats: ['umd'],
         name: 'TplDesktopPluginDemo',
         fileName: () => 'plugin.js',
       },
     },
   })
   ```

**Step 2: 创建入口文件**
4. 创建 `plugin.html` — wujie 沙箱入口:
   ```html
   <!DOCTYPE html>
   <html>
   <head><meta charset="utf-8"></head>
   <body>
     <div id="plugin-root"></div>
     <script type="module" src="/src/main.js"></script>
   </body>
   </html>
   ```
5. 创建 `src/main.js` — 子应用生命周期入口（见 §6.3 接口设计）
6. 创建 `src/plugin.js` — 子应用自身 UI 入口（本阶段占位）

**Step 3: 迁移组件**
7. 从主应用复制 `BasicText.widget.vue` → `src/widgets/demo/DemoText.widget.vue`，重命名组件名
8. 从主应用复制 `BasicText.widget.js` → `src/widgets/demo/DemoText.widget.js`，修改 `compName` 相关引用（注意: `compName` 在构建时不自动注入，需在子应用 main.js 中手动设置）
9. 同样的方式迁移 BasicImage、BasicVideo、BasicNumber → DemoImage、DemoVideo、DemoNumber
10. 迁移 BasicClock → DemoClock

**Step 4: 迁移背景**
11. 复制主应用 `src/backgrounds/dark/*.bg.js` → 子应用 `src/backgrounds/dark/`（含图片资源）
12. 同上步骤复制 `light/` 和 `video/`

**Step 5: 自测**
13. 子应用独立启动（`pnpm dev`），确保 plugin.html 可访问
14. 在子应用 main.js 中添加 console.log 验证 bus 通信正常
15. 主应用 proxy 后，浏览器访问 `http://localhost:5173/tpl-desktop-plugin-demo/plugin.html` 确认代理转发

### 7.3 Widget/App/Background 迁移步骤

迁移策略遵循"逐组件迁移、渐进验证"原则，确保每一步迁移后主应用仍可正常使用：

**Phase 1: Widget 迁移**
1. 在子应用中创建 `DemoText.widget.vue` + `DemoText.widget.js`（内容与 BasicText 一致，仅 compName 不同）
2. 验证子应用独立 dev: 组件可正常渲染
3. 连接主应用: 启动主应用 + 子应用，验证 DemoText 出现在 Widget 列表并可添加到桌面
4. 确认 DemoText 与 BasicText 行为一致后，从主应用中删除 `src/widgets/basic/BasicText.*`
5. 同样步骤迁移 BasicImage、BasicVideo、BasicNumber

**Phase 2: App 迁移**
6. 在子应用中创建 `DemoClock.app.vue` + `DemoClock.app.js`
7. 验证子应用独立 dev + 连接主应用，确保时钟 App 可正常打开/最小化/关闭
8. 从主应用中删除 `src/apps/basic/BasicClock.*`

**Phase 3: Background 迁移**
9. 将全部 12 套背景 `*.bg.js` + 资源文件复制到子应用
10. 验证背景列表在子应用加载后仍包含所有 12 套背景
11. 确认选择背景功能正常后，从主应用中删除 `src/backgrounds/dark/`、`src/backgrounds/light/`、`src/backgrounds/video/`

**Phase 4: 清理**
12. 更新 `DEFAULT_DESKTOP_JSON.json` 中的 `children` 条目，将 `compName: "BasicText"` 替换为 `compName: "DemoText"`（如有引用）
13. 更新 `desktop.js` 移除已迁移组件的全局注册
14. 运行完整 smoke test: Widget 添加/编辑/删除、App 打开/关闭、背景切换、主题切换

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 子应用 dev server 未启动 | 子应用功能不可用，Widget/App 列表中缺少子应用组件 | 门控超时 10s 后自动跳过，不影响本地组件。console.warn 提示开发者检查子应用状态 |
| 子应用组件 compName 与主应用冲突 | 后注入覆盖先注入，可能不是预期行为 | `injectWidgetMetas` 在冲突时 console.warn 并记录来源。建议子应用使用前缀（如 `Demo*`）避免冲突 |
| wujie 沙箱 JS 执行异常 | 子应用部分功能不可用 | bus.$on('plugin:error') 捕获 + wujieStatus 标记 error，主应用跳过该子应用 |
| 子应用 bundle 过大导致加载慢 | 首次加载耗时增加 | `alive=true` 保活模式避免重复加载；`fiber=true` 避免阻塞主线程 |
| wujie-vue3 版本兼容性 | 运行时异常 | 锁定版本 `^1.0.22`，通过 live debugging 验证主子通信正常 |
| 主应用 HMR 触发子应用重新加载 | 开发体验下降 | `destroyAllPlugins()` + `loadPlugins()` 在必要时重新初始化 |
