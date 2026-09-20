# 007-wujie-system 任务清单

> **需求编号**: 007-wujie-system
> **需求名称**: 无界微前端系统
> **需求概述**: 引入 wujie-vue3 微前端框架，将 tpl-desktop 改造为「主应用」，将内置 Basic Widgets/Apps/Backgrounds 迁移到独立子应用（tpl-desktop-plugin-demo），实现主应用对子应用的动态加载、生命周期管理和元数据注入。
> **最后更新**: 2026-07-19

---

## Phase 1: 基础设施（Setup）

### tasks/007-01: 安装 wujie-vue3 依赖到主应用
- **依赖**: 无
- **文件**: `package.json`
- **内容**:
  1. 执行 `pnpm add wujie-vue3` 安装 wujie-vue3 到 tpl-desktop 主应用
  2. 确认安装后 `package.json` 的 dependencies 中包含 `"wujie-vue3": "^x.y.z"`
  3. 确认 `node_modules/wujie-vue3` 目录存在且包含 `esm` 入口文件
- **验收**:
  - `pnpm list wujie-vue3` 显示已安装版本
  - `import WujieVue from 'wujie-vue3'` 无 TypeScript/ESLint 报错（运行时动态导入，构建时不要求类型声明）

### tasks/007-02: 创建子应用清单 PLUGINS.json
- **依赖**: 无
- **文件**: `public/PLUGINS.json`（新建）
- **内容**:
  1. 创建 JSON 文件定义子应用注册清单
  2. 结构：
     ```json
     [
       {
         "name": "tpl-desktop-plugin-demo",
         "title": "演示子应用",
         "url": "http://localhost:5174",
         "entry": "/plugin.html",
         "widgets": ["DemoClock", "DemoImage", "DemoVideo", "DemoText", "DemoNumber"],
         "apps": ["DemoClock"],
         "backgrounds": ["demo-dark-001", "demo-dark-002", "demo-dark-003", "demo-dark-004", "demo-light-001", "demo-light-002", "demo-light-003", "demo-light-004", "demo-webm-001", "demo-webm-002", "demo-webm-003", "demo-webm-004"]
       }
     ]
     ```
  3. `name` 为子应用唯一标识，`url` 为开发服务器地址（按子应用 vite.config.js port），`widgets/apps/backgrounds` 为该子应用提供的组件名列表
- **验收**:
  - `public/PLUGINS.json` 文件存在且为合法 JSON
  - `fetch('/PLUGINS.json')` 可正常获取（Vite public 目录自动 serving）

### tasks/007-03: 添加子应用反向代理到 vite.config.js
- **依赖**: tasks/007-02
- **文件**: `vite.config.js`
- **内容**:
  1. 在 `server.proxy` 中添加子应用代理规则：
     ```js
     '/tpl-desktop-plugin-demo': {
       target: 'http://localhost:5174',
       changeOrigin: true,
       rewrite: (path) => path.replace(/^\/tpl-desktop-plugin-demo/, ''),
     }
     ```
  2. 代理路径前缀 `/tpl-desktop-plugin-demo` 对应 PLUGINS.json 中的 `name` 字段
  3. 确保 `changeOrigin: true` 避免跨域问题
- **验收**:
  - 启动子应用开发服务器（端口 5174）后，访问 `http://localhost:<主应用端口>/tpl-desktop-plugin-demo/plugin.html` 能代理到子应用
  - 控制台无 CORS 错误

---

## Phase 2: 主应用核心改造

### tasks/007-04: 创建 useWujie.js composable
- **依赖**: tasks/007-01, tasks/007-02
- **文件**: `src/composables/useWujie.js`（新建）
- **内容**:
  1. 创建 composable 封装 wujie 子应用管理逻辑
  2. 核心职责：
     - **加载清单**：`onMounted` 时 fetch `public/PLUGINS.json`，解析为 `Ref<PluginMeta[]>` 模块级单例
     - **启动子应用**：`startApp({ name, url, el })` 调用 `window.__WUJIE?.startApp` 或 `wujie-vue3` 提供的 API
     - **预加载**：`preloadApp({ name, url })` 提前加载子应用资源
     - **生命周期回调**：`beforeLoad / afterMount / afterUnmount` 钩子注册（控制台日志 + 状态追踪）
     - **销毁**：`destroyApp(name)` 销毁不再需要的子应用实例
  3. 类型定义（JSDoc）：
     ```js
     /**
      * @typedef {Object} PluginMeta — 子应用清单项
      * @property {string} name          子应用唯一标识
      * @property {string} title         显示名称
      * @property {string} url           开发服务器基地址
      * @property {string} entry         HTML 入口路径（相对 url）
      * @property {string[]} widgets     提供的 Widget 组件名列表
      * @property {string[]} apps        提供的 App 组件名列表
      * @property {string[]} backgrounds 提供的背景名列表
      */
     ```
  4. 导出 `useWujie()` → `{ pluginMetas, startApp, preloadApp, destroyApp, isAppLoaded, getPluginForComp }`
  5. 错误处理：fetch 失败时 pluginMetas 为 `[]`（静默降级，仅 console.warn）
- **验收**:
  - `useWujie()` 可在组件中正常调用
  - `pluginMetas` 在 fetch 成功后包含 PLUGINS.json 中的数据
  - `getPluginForComp(compName, type)` 可根据组件名和类型（'widget'|'app'|'background'）查找所属子应用

### tasks/007-05: 改造 useWidgetMetas.js 支持子应用注入
- **依赖**: tasks/007-04
- **文件**: `src/composables/useWidgetMetas.js`
- **内容**:
  1. 引入 `useWujie`，获取 `pluginMetas`
  2. 在 WidgetMetas 基础上追加子应用 Widget 元数据：
     - 遍历 `pluginMetas`，对每个子应用的 `widgets` 数组，为每个组件名生成一条 WidgetMeta
     - 追加的 WidgetMeta 结构：
       ```js
       {
         title: compName, // 占位，子应用内部通过生命周期自行注入完整元数据
         category: `子应用-${plugin.title}`,
         rect: { unit: 'grid', width: 1, height: 1 },
         props: { _wujie: { title: '子应用控制', type: 'custom', default: { pluginName, compName } } },
         events: [],
         propsEditors: [],
         wrapperEditors: [],
         compName,
         _plugin: { name: plugin.name, url: plugin.url, entry: plugin.entry },
       }
       ```
  3. 使用 `watch(pluginMetas, ...)` 响应式更新 `widgetMetas`：当 PLUGINS.json 加载完成后，将子应用条目合并进 `widgetMetas.value`
  4. 保持向后兼容：本地注册的 WidgetMetas 优先级高于子应用同名组件（本地先注册，子应用后合并覆盖）
  5. 非侵入式：不修改 `src/widgets/index.js` 的自动扫描逻辑
- **验收**:
  - PLUGINS.json 加载前：`widgetMetas` 仅包含本地扫描的 5 个 BasicWidget + 1 个 BasicMarkdown
  - PLUGINS.json 加载后：`widgetMetas` 额外包含 DemoText/DemoNumber/DemoImage/DemoVideo/DemoClock 5 个条目
  - 子应用条目包含 `_plugin` 字段指向所属子应用信息
  - Widget 添加面板（desktop-widget-list）能显示子应用 Widget

### tasks/007-06: 改造 useAppMetas.js 支持子应用注入
- **依赖**: tasks/007-04
- **文件**: `src/composables/useAppMetas.js`
- **内容**:
  1. 引入 `useWujie`，获取 `pluginMetas`
  2. 在 AppMetas 基础上追加子应用 App 元数据：
     - 遍历 `pluginMetas`，对每个子应用的 `apps` 数组，为每个组件名生成一条 AppMeta
     - 追加的 AppMeta 结构：
       ```js
       {
         title: compName,
         category: `子应用-${plugin.title}`,
         rect: { unit: 'grid', width: 4, height: 3 },
         props: {},
         events: [],
         propsEditors: [],
         wrapperEditors: [],
         compName,
         _plugin: { name: plugin.name, url: plugin.url, entry: plugin.entry },
       }
       ```
  3. 使用 `watch(pluginMetas, ...)` 响应式更新 `appMetas`
  4. 保持向后兼容：本地注册的 AppMetas 优先级高于子应用同名组件
- **验收**:
  - PLUGINS.json 加载前：`appMetas` 仅包含本地扫描的 BasicClock + BasicIframe
  - PLUGINS.json 加载后：`appMetas` 额外包含 DemoClock
  - 子应用 App 条目包含 `_plugin` 字段
  - App 应用市场（desktop-app-store）能显示子应用 App

### tasks/007-07: 改造 useBackgroundMetas.js 支持子应用注入
- **依赖**: tasks/007-04
- **文件**: `src/composables/useBackgroundMetas.js`
- **内容**:
  1. 引入 `useWujie`，获取 `pluginMetas`
  2. 在 BackgroundMetas 基础上追加子应用背景元数据：
     - 遍历 `pluginMetas`，对每个子应用的 `backgrounds` 数组，为每个背景名生成一条 DesktopBackgroundMeta
     - 追加的 DesktopBackgroundMeta 结构：
       ```js
       {
         title: bgName,
         category: `子应用-${plugin.title}`,
         theme: bgName.startsWith('demo-dark') ? 'dark' : (bgName.startsWith('demo-light') ? 'light' : 'dark'),
         type: bgName.startsWith('demo-webm') ? 'video' : 'image',
         name: bgName,
         _plugin: { name: plugin.name, url: plugin.url, entry: plugin.entry },
       }
       ```
  3. 使用 `watch(pluginMetas, ...)` 响应式更新 `backgroundMetas`
  4. 保持向后兼容：本地注册的 BackgroundMetas 优先级高于子应用同名条目
- **验收**:
  - PLUGINS.json 加载前：`backgroundMetas` 仅包含本地扫描的 12 套背景
  - PLUGINS.json 加载后：`backgroundMetas` 额外包含 12 套 demo-* 背景
  - 子应用背景条目包含 `_plugin` 字段
  - 背景选择面板（desktop-background-list）能显示子应用背景

### tasks/007-08: 改造 desktop.js 引入 wujie-vue3
- **依赖**: tasks/007-01
- **文件**: `src/desktop.js`
- **内容**:
  1. 引入 wujie-vue3：
     ```js
     import WujieVue from 'wujie-vue3'
     ```
  2. 注册 wujie 插件：
     ```js
     app.use(WujieVue)
     ```
  3. 注册位置：在 `app.use(ElementPlus)` 之后、UI 组件注册之前
  4. 可选：配置 wujie 全局选项（preload、alive、degrade 等），默认值即可
- **验收**:
  - 应用启动无报错（控制台无 `WujieVue` 未定义相关错误）
  - `<WujieVue>` 组件在全局可用（可在模板中使用 `wujie-vue3` 提供的内置组件）

### tasks/007-09: 改造 Desktop.vue 初始化门控
- **依赖**: tasks/007-04
- **文件**: `src/pages/Desktop.vue`
- **内容**:
  1. 在 `<script setup>` 顶部引入 `useWujie`：
     ```js
     import { useWujie } from '../composables/useWujie.js'
     const { pluginMetas, preloadApp } = useWujie()
     ```
  2. 在 `onMounted` 中增加子应用预加载逻辑（在 `loadDesktopConfig()` 之后，不阻塞桌面渲染）：
     ```js
     // 子应用预加载：不阻塞桌面渲染
     watch(pluginMetas, (metas) => {
       if (metas && metas.length > 0) {
         metas.forEach((plugin) => {
           const fullUrl = `${plugin.url}${plugin.entry}`
           // 预加载：提前拉取子应用资源，减少首次打开白屏
           preloadApp({ name: plugin.name, url: fullUrl })
         })
       }
     }, { immediate: true })
     ```
  3. 确保子应用加载失败不影响主应用正常运行（try/catch 包裹）
- **验收**:
  - 桌面正常加载，无新增控制台报错
  - Network 面板可见子应用资源预加载请求（子应用开发服务器在线时）
  - 子应用开发服务器离线时，主应用不受影响（静默降级）

---

## Phase 3: 子应用创建（tpl-desktop-plugin-demo）

### tasks/007-10: 创建子应用工程脚手架
- **依赖**: 无（独立工程，不影响主应用）
- **文件**: `tpl-desktop-plugin-demo/` 目录（新建，位于项目根目录平级 `../tpl-desktop-plugin-demo/` 或 `plugins/tpl-desktop-plugin-demo/`）
  - `package.json`（新建）
  - `vite.config.js`（新建）
  - `index.html`（新建，开发预览用）
  - `plugin.html`（新建，wujie 子应用入口 HTML）
  - `src/main.js`（新建，子应用独立运行入口）
  - `src/plugin.js`（新建，wujie 子应用生命周期入口）
- **内容**:
  1. **package.json**:
     ```json
     {
       "name": "tpl-desktop-plugin-demo",
       "private": true,
       "version": "0.1.0",
       "type": "module",
       "scripts": {
         "dev": "vite --port 5174",
         "build": "vite build",
         "preview": "vite preview"
       },
       "dependencies": {
         "vue": "^3.5.39",
         "dayjs": "^1.11.19",
         "@number-flow/vue": "^0.4.8"
       },
       "devDependencies": {
         "@vitejs/plugin-vue": "^6.0.8",
         "sass": "^1.101.0",
         "vite": "^8.1.4"
       }
     }
     ```
  2. **vite.config.js**:
     ```js
     import { defineConfig } from 'vite'
     import vue from '@vitejs/plugin-vue'

     export default defineConfig({
       plugins: [vue()],
       base: './',
       build: {
         rollupOptions: {
           input: {
             main: 'index.html',
             plugin: 'plugin.html',
           },
         },
       },
     })
     ```
  3. **plugin.html**（wujie 子应用 HTML 入口）：
     ```html
     <!DOCTYPE html>
     <html lang="zh-CN">
       <head>
         <meta charset="UTF-8" />
         <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       </head>
       <body>
         <div id="plugin-root"></div>
         <script type="module" src="/src/plugin.js"></script>
       </body>
     </html>
     ```
  4. **index.html**（独立开发调试入口）：与 plugin.html 结构一致，仅 script src 改为 `/src/main.js`
  5. 执行 `pnpm install` 安装依赖
- **验收**:
  - `pnpm dev` 成功启动子应用开发服务器（端口 5174）
  - 访问 `http://localhost:5174/plugin.html` 无白屏/404
  - `vite build` 无报错（确保 rollupOptions 多入口配置正确）

### tasks/007-11: 实现子应用 wujie 生命周期
- **依赖**: tasks/007-10
- **文件**:
  - `tpl-desktop-plugin-demo/src/plugin.js`（新建/完善）
  - `tpl-desktop-plugin-demo/src/main.js`（新建/完善）
- **内容**:
  1. **`src/plugin.js`** — wujie 子应用生命周期入口：
     ```js
     // wujie 子应用生命周期入口
     // 在主应用 wujie-vue3 沙箱中运行，window.__WUJIE 提供挂载/卸载钩子

     import { createApp } from 'vue'
     import DemoWidgetHost from './components/DemoWidgetHost.vue'
     import DemoAppHost from './components/DemoAppHost.vue'
     import DemoBackgroundHost from './components/DemoBackgroundHost.vue'

     // 声明 wujie 生命周期（由主应用调用）
     // window.__WUJIE_MOUNT、__WUJIE_UNMOUNT 由 wujie 框架注入

     let app = null

     /**
      * wujie 挂载生命周期 — 渲染子应用 Vue 实例
      * @param {Object} props — 主应用传入的 props，含 { compName, type, meta }
      */
     async function mount(props = {}) {
       const { compName, type, meta } = props

       // 根据 type 选择宿主组件
       let hostComponent
       if (type === 'app') {
         hostComponent = DemoAppHost
       } else if (type === 'background') {
         hostComponent = DemoBackgroundHost
       } else {
         hostComponent = DemoWidgetHost
       }

       app = createApp(hostComponent, { compName, meta })
       app.mount('#plugin-root')
     }

     /**
      * wujie 卸载生命周期 — 销毁 Vue 实例
      */
     function unmount() {
       if (app) {
         app.unmount()
         app = null
       }
     }

     // 注册 wujie 生命周期钩子
     if (window.__POWERED_BY_WUJIE__) {
       // 在 wujie 沙箱中运行
       window.__WUJIE_MOUNT = mount
       window.__WUJIE_UNMOUNT = unmount
     } else {
       // 独立运行（开发调试模式）
       mount({ compName: 'DemoClock', type: 'widget', meta: {} })
     }
     ```
  2. **`src/main.js`** — 独立运行入口（不含 wujie 生命周期，直接挂载）：
     ```js
     import { createApp } from 'vue'
     import DemoStandalone from './DemoStandalone.vue'
     createApp(DemoStandalone).mount('#plugin-root')
     ```
  3. 创建占位宿主组件（后续任务填充）：
     - `src/components/DemoWidgetHost.vue` — Widget 渲染宿主（根据 compName 动态渲染对应 Widget）
     - `src/components/DemoAppHost.vue` — App 渲染宿主
     - `src/components/DemoBackgroundHost.vue` — 背景渲染宿主
     - `src/DemoStandalone.vue` — 独立开发预览页面（列出所有组件）
  4. `window.__POWERED_BY_WUJIE__` 检测确保独立运行和沙箱运行双模式兼容
- **验收**:
  - 子应用独立运行（`http://localhost:5174`）：正常渲染 DemoStandalone 页面
  - `console.log(window.__POWERED_BY_WUJIE__)` 在独立运行时为 `undefined`
  - `plugin.js` 导出 `mount`/`unmount` 函数签名符合 wujie 规范

### tasks/007-12: 迁移 BasicClock → DemoClock
- **依赖**: tasks/007-11
- **文件**: `tpl-desktop-plugin-demo/src/components/DemoClock.vue`（新建）
- **内容**:
  1. 将 `src/apps/basic/BasicClock.app.vue` 的内容复制到 `tpl-desktop-plugin-demo/src/components/DemoClock.vue`
  2. 修改：
     - 将 `class="BasicClock"` 改为 `class="DemoClock"`
     - 将 `scoped` 样式中的 `.BasicClock` 改为 `.DemoClock`
  3. 在 `DemoWidgetHost.vue` 中注册 `DemoClock` 组件：
     ```vue
     <script setup>
     import { computed } from 'vue'
     import DemoClock from './DemoClock.vue'
     import DemoImage from './DemoImage.vue'
     import DemoVideo from './DemoVideo.vue'
     import DemoText from './DemoText.vue'
     import DemoNumber from './DemoNumber.vue'

     const props = defineProps({ compName: String, meta: Object })
     const compMap = { DemoClock, DemoImage, DemoVideo, DemoText, DemoNumber }
     const Comp = computed(() => compMap[props.compName])
     </script>
     <template>
       <component v-if="Comp" :is="Comp" v-bind="meta?.propsValues || {}" />
       <div v-else class="plugin-unknown">未知组件: {{ compName }}</div>
     </template>
     ```
  4. 在 `DemoAppHost.vue` 中同样注册 `DemoClock`（App 类型也复用同一组件）：
     ```vue
     <script setup>
     import { computed } from 'vue'
     import DemoClock from './DemoClock.vue'
     const props = defineProps({ compName: String, meta: Object })
     const compMap = { DemoClock }
     const Comp = computed(() => compMap[props.compName])
     </script>
     <template>
       <component v-if="Comp" :is="Comp" v-bind="meta?.propsValues || {}" />
       <div v-else class="plugin-unknown">未知应用: {{ compName }}</div>
     </template>
     ```
  5. DemoClock 同时作为 widget 和 app 提供服务（PLUGINS.json 中在两个数组都列出）
- **验收**:
  - 子应用独立运行：DemoStandalone 页面可切换查看 DemoClock
  - DemoClock 在独立模式下时间正常更新（dayjs 依赖正常）
  - `dayjs` 在子应用 package.json 中已声明

### tasks/007-13: 迁移 BasicImage → DemoImage
- **依赖**: tasks/007-11
- **文件**: `tpl-desktop-plugin-demo/src/components/DemoImage.vue`（新建）
- **内容**:
  1. 将 `src/widgets/basic/BasicImage.widget.vue` 的内容复制到 `tpl-desktop-plugin-demo/src/components/DemoImage.vue`
  2. 将类名 `BasicImage` / `image-content` 改为 `DemoImage` / `demo-image-content`
  3. 在 `DemoWidgetHost.vue` 的 `compMap` 中注册 `DemoImage`
- **验收**:
  - DemoImage 在独立模式下可渲染图片，`objectFit` 属性生效
  - 无 `@number-flow/vue` 或 `dayjs` 等非必要依赖引入

### tasks/007-14: 迁移 BasicVideo → DemoVideo
- **依赖**: tasks/007-11
- **文件**: `tpl-desktop-plugin-demo/src/components/DemoVideo.vue`（新建）
- **内容**:
  1. 将 `src/widgets/basic/BasicVideo.widget.vue` 的内容复制到 `tpl-desktop-plugin-demo/src/components/DemoVideo.vue`
  2. 将类名 `BasicVideo` / `video-content` 改为 `DemoVideo` / `demo-video-content`
  3. 在 `DemoWidgetHost.vue` 的 `compMap` 中注册 `DemoVideo`
  4. 保留 `onBeforeUnmount` 中 `pause() + src='' + load()` 的资源清理逻辑
- **验收**:
  - DemoVideo 在独立模式下可播放视频，自动静音循环
  - 组件卸载后无视频继续播放（资源清理正确）

### tasks/007-15: 迁移 BasicText → DemoText
- **依赖**: tasks/007-11
- **文件**: `tpl-desktop-plugin-demo/src/components/DemoText.vue`（新建）
- **内容**:
  1. 将 `src/widgets/basic/BasicText.widget.vue` 的内容复制到 `tpl-desktop-plugin-demo/src/components/DemoText.vue`
  2. 将类名 `BasicText` 改为 `DemoText`
  3. 在 `DemoWidgetHost.vue` 的 `compMap` 中注册 `DemoText`
- **验收**:
  - DemoText 在独立模式下可渲染文本内容
  - `value` 默认值为 '这是一段文字'

### tasks/007-16: 迁移 BasicNumber → DemoNumber
- **依赖**: tasks/007-11
- **文件**: `tpl-desktop-plugin-demo/src/components/DemoNumber.vue`（新建）
- **内容**:
  1. 将 `src/widgets/basic/BasicNumber.widget.vue` 的内容复制到 `tpl-desktop-plugin-demo/src/components/DemoNumber.vue`
  2. 将类名 `BasicNumber` / `number-title` / `number-value` / `number-unit` 改为对应的 `Demo*` 前缀
  3. 在 `DemoWidgetHost.vue` 的 `compMap` 中注册 `DemoNumber`
  4. 确认子应用 `package.json` 中已声明 `@number-flow/vue` 依赖
- **验收**:
  - DemoNumber 在独立模式下可渲染数字（含 NumberFlow 动画效果）
  - `value/precision/title/unit` 属性均生效

### tasks/007-17: 迁移 backgrounds 到子应用
- **依赖**: tasks/007-11
- **文件**: `tpl-desktop-plugin-demo/src/components/DemoBackgroundHost.vue`（新建/完善）
- **内容**:
  1. 创建子应用背景渲染宿主组件：
     ```vue
     <script setup>
     import { computed } from 'vue'
     const props = defineProps({ compName: String, meta: Object })
     // 根据背景名（如 demo-dark-001）渲染对应背景资源
     // 背景资源路径：由主应用通过 meta 传入或子应用内置映射
     const bgSrc = computed(() => {
       // 简单映射：使用子应用 public/images/ 下的背景资源
       return `/images/${props.compName}.svg`
     })
     </script>
     <template>
       <div v-if="meta?.type === 'video'" class="demo-bg-video">
         <video :src="bgSrc" autoplay loop muted playsinline />
       </div>
       <div v-else class="demo-bg-image">
         <img :src="bgSrc" alt="" />
       </div>
     </template>
     ```
  2. 将 `src/backgrounds/` 下的 12 套背景资源（SVG/WebM）复制到 `tpl-desktop-plugin-demo/public/images/`，重命名为 `demo-*` 前缀
  3. 背景元数据（`.bg.js`）在子应用内通过 `src/backgrounds/` 目录组织，结构与主应用一致但使用 `demo-*` 命名
- **验收**:
  - `DemoBackgroundHost.vue` 可根据 `meta.type` 切换渲染图片/视频背景
  - 子应用 `src/backgrounds/` 下 12 个 `.bg.js` 文件（对应 `demo-dark-001` ~ `demo-webm-004`）

---

## Phase 4: 主应用清理

### tasks/007-18: 从主应用删除已迁移的 widgets/apps/backgrounds 源文件
- **依赖**: tasks/007-12 ~ tasks/007-17（所有迁移任务完成）
- **文件**（删除）:
  - `src/widgets/basic/BasicText.widget.vue`
  - `src/widgets/basic/BasicText.widget.js`
  - `src/widgets/basic/BasicNumber.widget.vue`
  - `src/widgets/basic/BasicNumber.widget.js`
  - `src/widgets/basic/BasicImage.widget.vue`
  - `src/widgets/basic/BasicImage.widget.js`
  - `src/widgets/basic/BasicVideo.widget.vue`
  - `src/widgets/basic/BasicVideo.widget.js`
  - `src/apps/basic/BasicClock.app.vue`
  - `src/apps/basic/BasicClock.app.js`
  - `src/backgrounds/dark/dark-000.bg.js` ~ `dark-003.bg.js`
  - `src/backgrounds/light/light-000.bg.js` ~ `light-003.bg.js`
  - `src/backgrounds/video/webm-000.bg.js` ~ `webm-003.bg.js`
  - 对应的 avatar.svg / thumbnail.png / 背景 SVG/WebM 资源文件
- **内容**:
  1. 删除后确认 `src/widgets/index.js` 的 `import.meta.glob` 不再匹配到这些文件（自动行为，glob 扫描目录下实际文件）
  2. 删除后确认 `src/apps/index.js` 同理
  3. 删除后确认 `src/backgrounds/index.js` 同理
  4. 保留 `src/widgets/basic/BasicMarkdown.widget.vue` 和 `BasicMarkdown.widget.js`（未迁移，留作主应用本地 Widget 示例）
  5. 保留 `src/apps/basic/BasicIframe.app.vue` 和 `BasicIframe.app.js`（未迁移）
- **验收**:
  - `vite build` 构建成功，无找不到模块报错
  - `pnpm dev` 启动后，WidgetMetas 中不再有 BasicText/BasicNumber/BasicImage/BasicVideo
  - AppMetas 中不再有 BasicClock
  - BackgroundMetas 中不再有 dark-*/light-*/webm-* 条目
  - 上述组件/背景现在由子应用通过 PLUGINS.json → useWujie 注入提供

### tasks/007-19: 更新 overall-data-model.md 添加 PluginMeta 实体定义
- **依赖**: tasks/007-04
- **文件**: `specs/overall-data-model.md`
- **内容**:
  1. 在 §1 核心实体中新增 §1.10 PluginMeta 实体定义：
     ```markdown
     ### 1.10 PluginMeta — 子应用清单项

     | 字段 | 类型 | 必填 | 描述 |
     |------|------|------|------|
     | `name` | `string` | MUST | 子应用唯一标识（如 `'tpl-desktop-plugin-demo'`） |
     | `title` | `string` | MUST | 子应用显示名称 |
     | `url` | `string` | MUST | 开发服务器基地址（含端口） |
     | `entry` | `string` | MUST | HTML 入口路径（相对 url，如 `'/plugin.html'`） |
     | `widgets` | `string[]` | MUST | 该子应用提供的 Widget 组件名列表 |
     | `apps` | `string[]` | MUST | 该子应用提供的 App 组件名列表 |
     | `backgrounds` | `string[]` | MUST | 该子应用提供的背景名列表 |
     ```
  2. 在 WidgetMeta（§1.1）和 AppMeta（§1.2）中补充 `_plugin` 扩展字段说明：
     ```markdown
     | `_plugin` | `{name, url, entry} \| undefined` | —（运行时注入） | 子应用来源标识，本地注册组件为 undefined |
     ```
  3. 在 §4 localStorage 持久化清单中不新增条目（子应用清单由 fetch 运行时获取，不持久化）
  4. 更新 §5 版本历史，追加：
     ```markdown
     | 2026-07-19 | 新增 §1.10 PluginMeta；WidgetMeta/AppMeta 新增 _plugin 扩展字段 |
     ```
- **验收**:
  - `specs/overall-data-model.md` §1.10 包含完整的 PluginMeta 字段表
  - WidgetMeta §1.1 和 AppMeta §1.2 表格包含 `_plugin` 行
  - 版本历史已更新

---

## Phase 5: 集成验证

### tasks/007-20: 端到端验证 — 主应用加载子应用 Widget/App/Background
- **依赖**: Phase 1 ~ Phase 4 全部完成
- **验证步骤**:
  1. **启动子应用**: `cd tpl-desktop-plugin-demo && pnpm dev`（端口 5174）
  2. **启动主应用**: `cd tpl-desktop && pnpm dev`（默认端口）
  3. **验证 Widget 加载**:
     - 登录进入桌面 → 进入编辑模式 → 点击「部件」→ 确认列表中包含子应用 Widget（DemoText/DemoNumber/DemoImage/DemoVideo/DemoClock）
     - 点击子应用 Widget 添加到桌面 → 确认 GridStack 网格中正确渲染子应用组件
     - 编辑 DemoText Widget 属性（value）→ 确认属性面板正常打开并修改生效
  4. **验证 App 加载**:
     - 打开 App 列表 → 应用市场 → 确认子应用 App（DemoClock）可见
     - 启动 DemoClock App → 确认全屏覆盖层正常渲染，时间实时更新
     - 最小化/恢复/关闭 DemoClock → 确认生命周期正常
  5. **验证 Background 加载**:
     - 进入编辑模式 → 点击「背景」→ 确认分类中显示「子应用-演示子应用」
     - 选择一个子应用背景 → 确认背景正常渲染
  6. **验证子应用离线降级**:
     - 停止子应用开发服务器（Ctrl+C）
     - 刷新主应用 → 确认主应用正常加载（降级：子应用条目不在列表中，无崩溃）
     - 再次启动子应用 → 刷新主应用 → 确认子应用条目恢复
  7. **验证主应用本地组件仍正常**:
     - BasicMarkdown Widget 仍可用（未被删除的原生 Widget）
     - BasicIframe App 仍可用
     - 主题切换、字体缩放、页面增删等功能不受影响
- **验收**:
  - 所有 7 项验证通过
  - 主应用控制台无未捕获错误
  - 子应用控制台无 wujie 生命周期报错

---

## 依赖关系图

```
Phase 1 (基础设施)
  tasks/007-01 (安装 wujie-vue3)
  tasks/007-02 (创建 PLUGINS.json) ──┐
  tasks/007-03 (vite 代理配置) ──────┘
    │
    ▼
Phase 2 (主应用核心改造)
  tasks/007-04 (useWujie.js) ───────────────┐
    │                                        │
    ├── tasks/007-05 (useWidgetMetas 改造) ──┤
    ├── tasks/007-06 (useAppMetas 改造) ─────┤
    ├── tasks/007-07 (useBackgroundMetas) ───┤
    ├── tasks/007-08 (desktop.js 改造) ──────┤ (独立于 007-04，仅依赖 007-01)
    └── tasks/007-09 (Desktop.vue 门控) ─────┘
    │
    ▼
Phase 3 (子应用创建)
  tasks/007-10 (脚手架) ──┐
    │                     │
    └── tasks/007-11 (生命周期)
          │
          ├── tasks/007-12 (DemoClock)
          ├── tasks/007-13 (DemoImage)
          ├── tasks/007-14 (DemoVideo)
          ├── tasks/007-15 (DemoText)
          ├── tasks/007-16 (DemoNumber)
          └── tasks/007-17 (DemoBackgrounds)
    │
    ▼
Phase 4 (主应用清理)
  tasks/007-18 (删除已迁移文件) ── 依赖 Phase 3 全部完成
  tasks/007-19 (更新 data-model.md) ── 依赖 tasks/007-04
    │
    ▼
Phase 5 (集成验证)
  tasks/007-20 (端到端验证) ── 依赖 Phase 1~4 全部完成
```

---

## 执行顺序建议

1. **先并行 Phase 1**：007-01（安装依赖）和 007-02（创建清单）可同时进行，007-03 在 007-02 之后
2. **Phase 2 串行**：007-04 必须先完成（所有 composable 改造依赖它），然后 007-05/06/07 可并行改造，007-08 独立，007-09 在 007-04 之后
3. **Phase 3 串行**：007-10 → 007-11 → 007-12~17 可并行迁移
4. **Phase 4 串行**：007-18 必须在 Phase 3 全部完成后执行，007-19 可提前与 007-04 并行
5. **Phase 5 最后**：全部完成后端到端验证
