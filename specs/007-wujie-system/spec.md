# 无界微前端集成系统 功能规格

> 模块: 007-wujie-system
> 状态: 设计中
> 最后更新: 2026-07-19

## 1. 模块概述

### 1.1 用途 — 为什么存在这个模块

无界微前端集成系统为工作台提供**跨应用组件的动态加载与编排**能力。通过引入腾讯开源的 wujie（无界）微前端框架，主应用可以加载远程子应用，并将子应用中暴露的小部件（Widget）、全屏应用（App）和桌面背景（Background）无缝融合到主应用的组件目录中。用户在桌面上看到的一切 — 无论来自本地 `import.meta.glob` 还是远程子应用 — 都通过统一的添加面板、部署流程和渲染管线呈现，完全透明。

### 1.2 解决的问题

| 痛点 | 解决方案 |
|------|---------|
| 新增组件需要重新构建并部署整个主应用 | 子应用独立开发、独立部署，主应用通过 PLUGINS.json 声明式接入 |
| 主应用体积随组件数量线性膨胀 | 组件迁移到子应用，按需加载，主应用保持轻量 |
| 第三方开发者无法独立扩展工作台生态 | 子应用可独立运行和调试，暴露标准化的全局对象给主应用消费 |
| 主应用和子应用的 Vue 核心对象需要隔离以避免版本冲突 | wujie iframe Sandbox 天然隔离 JS 运行时，Shadow DOM 天然隔离 CSS |
| 子应用扩展的组件与本地组件无法统一发现和管理 | useWujie composable 桥接二次生命周期，将子应用元数据注入本地 metas 字典 |

### 1.3 范围

**包含:**
- 主应用引入 wujie-vue3 并注册为 Vue 插件
- `public/PLUGINS.json` 子应用清单文件的格式约定与管理
- `useWujie` composable：清单加载、状态追踪、完成回调、生命周期钩子
- `useWidgetMetas` / `useAppMetas` / `useBackgroundMetas` 的扩展以合并远程元数据
- `Desktop.vue` 初始化流程改造（先等待子应用加载完成，再渲染桌面）
- `vite.config.js` 反向代理配置（子应用开发服务）
- 子应用工程的脚手架规范（Vite + Vue3、双入口、wujie 生命周期）
- 子应用全局对象暴露契约（apps/widgets/backgrounds 组件对象与元数据）
- 现有 BasicClock、BasicImage、BasicVideo、BasicText、BasicNumber 从主应用迁移到子应用
- 现有 backgrounds 从本地目录复制到子应用
- 数据模型更新：PluginMeta、PluginManifest、WidgetMeta/AppMeta 来源标识

**明确排除:**
- wujie 框架本身的核心机制（iframe Sandbox、Shadow DOM、路由同步）— 这是框架层关注点
- 子应用的业务逻辑和 UI 设计 — 子应用开发者自行负责
- 生产环境的子应用 CDN 部署策略 — 运维关注点
- 多版本子应用共存（如同一个 compName 从多个子应用注入）的冲突解决策略 — 后续迭代

## 2. 用户故事

- 作为**工作台用户**，我可以在"添加组件"面板中同时看到本地小部件和远程子应用提供的小部件，并通过同样的操作将它们添加到桌面，无需关心组件来源。
- 作为**工作台用户**，我可以在 App 应用市场中浏览、预览、添加来自子应用的 App，其操作流程与本地 App 完全一致。
- 作为**工作台用户**，我可以在背景选择面板中看到来自子应用的背景，并像选择本地背景一样切换使用。
- 作为**子应用开发者**，我只需按照约定创建 Vite + Vue3 工程，在 `src/widgets/`、`src/apps/`、`src/backgrounds/` 下编写组件，通过 `window` 暴露全局对象，子应用就能被主应用发现并集成。
- 作为**子应用开发者**，我可以在自己的开发服务器上独立运行和调试子应用（`index.html`），无需启动主应用即可验证组件行为。
- 作为**主应用维护者**，我只需在 `public/PLUGINS.json` 中添加一行配置，即可接入一个新的子应用，无需修改任何主应用代码。
- 作为**主应用维护者**，子应用加载失败不会阻塞主应用的启动流程，主应用会等待子应用加载完毕（或超时失败）后再渲染桌面。

## 3. 功能需求

### 3.1 主应用微前端框架集成

- **FR-007-001**: 系统 MUST 引入 `wujie-vue3` 包，并在 `src/desktop.js` 中通过 `app.use(WujieVue)` 将无界注册为 Vue 插件（`src/desktop.js`）。
- **FR-007-002**: 系统 MUST 提供 `public/PLUGINS.json` 文件，定义子应用清单数组，每条记录包含 `name`（唯一标识）、`title`（显示名称）、`category`（分类）、`url`（子应用地址）、`alive`（保活模式）、`exec`（预执行）、`fiber`（并发渲染模式）、`disabled`（是否禁用）字段（`public/PLUGINS.json`）。
- **FR-007-003**: 系统 MUST 创建 `useWujie` composable（`src/composables/useWujie.js`），负责从 `PLUGINS.json` 加载子应用清单、通过 `preloadApp` / `startApp` 启动所有启用的子应用、追踪每个子应用的加载状态（loading / loaded / error）并提供 `onAllReady(callback)` 完成回调。
- **FR-007-004**: `useWujie` composable MUST 通过 wujie 的 `beforeLoad` 和 `afterMount` 生命周期钩子获取子应用 iframe 的 `contentWindow`，从中提取子应用通过 `window` 暴露的组件字典（`__WUJIE_EXPORTS__.apps`、`__WUJIE_EXPORTS__.widgets`、`__WUJIE_EXPORTS__.backgrounds`），包含组件对象及其元数据。
- **FR-007-005**: `useWidgetMetas` composable MUST 支持接收来自子应用注入的 Widget 元数据（通过 `useWujie` 提取的远程 Widget 字典），与本地 `import.meta.glob` 扫描的 `WidgetMetas` 结果进行合并，合并后的字典通过模块级 `ref()` 对所有消费者透明可用（`src/composables/useWidgetMetas.js`）。
- **FR-007-006**: `useAppMetas` composable MUST 支持接收来自子应用注入的 App 元数据，与本地 `import.meta.glob` 扫描的 `AppMetas` 结果合并，合并方式与 `useWidgetMetas` 一致（`src/composables/useAppMetas.js`）。
- **FR-007-007**: `useBackgroundMetas` composable MUST 支持接收来自子应用注入的 Background 元数据，与本地 `import.meta.glob` 扫描的 `BackgroundMetas` 结果合并，合并方式与 `useWidgetMetas` 一致（`src/composables/useBackgroundMetas.js`）。
- **FR-007-008**: `Desktop.vue` 初始化流程 MUST 先通过 `useWujie` 启动所有子应用并等待 `onAllReady` 回调（所有已启用子应用加载完成或失败），然后再执行现有的桌面配置加载、页面渲染和 GridStack 初始化流程（`src/pages/Desktop.vue`）。
- **FR-007-009**: `vite.config.js` MUST 在 `server.proxy` 中配置反向代理规则：路径前缀 `/tpl-desktop-plugin-demo` 的请求代理至 `http://127.0.0.1:5273`，支持 changeOrigin（`vite.config.js`）。
- **FR-007-010**: 子应用配置项 `alive` MUST 设为 `true`（保活模式，子应用实例常驻内存不销毁），`exec` MUST 设为 `false`（延迟执行，主应用手动触发 mount），`fiber` MUST 设为 `true`（启用 JS Fiber 并发渲染以避免阻塞主线程）。
- **FR-007-011**: 子应用中注册的 Widget 和 App 组件实例 MUST 共享同一份子应用的 Vue 核心对象（通过子应用 iframe 的 `contentWindow` 提取的 Vue app 实例），确保组件内部的依赖注入、插件、全局配置在子应用内保持一致。
- **FR-007-012**: 子应用 Widget 渲染时，其关联的 CSS 样式 MUST 通过 wujie 的 Shadow DOM 机制自动注入到对应 WebComponent 的 Shadow Root 中，与主应用样式天然隔离，同时保证样式正常生效。

### 3.2 子应用工程创建

- **FR-007-020**: 系统 MUST 在 `tpl-desktop-plugin-demo/` 目录下创建一个标准的 Vite + Vue 3 脚手架工程，作为演示性子应用（`tpl-desktop-plugin-demo/`）。
- **FR-007-021**: 子应用 `vite.config.js` MUST 设置 `base` 为 `'/tpl-desktop-plugin-demo/'`（确保生产环境静态资源路径正确），开发服务器端口 MUST 为 `5273`，并开启 `server.cors: true`（允许主应用跨域加载子应用资源）（`tpl-desktop-plugin-demo/vite.config.js`）。
- **FR-007-022**: 子应用 MUST 提供独立调试入口 `index.html`，挂载标准的 Vue 3 应用（`App.vue`），`App.vue` 暂不填充业务内容，仅用于子应用开发者独立开发和调试时验证框架正常运行（`tpl-desktop-plugin-demo/index.html`）。
- **FR-007-023**: 子应用 MUST 提供 `plugin.html` 文件，作为 wujie 主应用加载子应用时的专用入口 HTML。该入口负责挂载 Vue 3 应用并执行子应用与主应用的桥接逻辑（生命周期注册 + 全局对象暴露），与 `index.html` 的独立调试用途分离（`tpl-desktop-plugin-demo/plugin.html`）。
- **FR-007-024**: 子应用 MUST 在 `plugin.html` 加载的入口脚本中判断 `window.__POWERED_BY_WUJIE__` 环境标识，定义 `window.__WUJIE_MOUNT` 和 `window.__WUJIE_UNMOUNT` 生命周期函数。在 `__WUJIE_MOUNT` 中将 Vue app 实例通过 `createApp().mount()` 挂载并暴露到 `window` 上；在 `__WUJIE_UNMOUNT` 中调用 `app.unmount()` 清理实例。Vite ESM 异步加载场景下，MUST 主动调用 `window.__WUJIE.mount()` 确保无界框架能在脚本加载完毕后正确触发 mount 流程（`tpl-desktop-plugin-demo/plugin.html`）。
- **FR-007-025**: 子应用 MUST 将自身注册的 `apps`、`widgets`、`backgrounds` 组件对象和对应的元数据通过 `window.__WUJIE_EXPORTS__` 全局变量暴露给主应用。该对象结构应包含 `{ apps: Record<string, { component, meta }>, widgets: Record<string, { component, meta }>, backgrounds: Record<string, { component, meta }> }`，供主应用 `useWujie` 生命周期钩子提取后注入对应的 metas composable（`tpl-desktop-plugin-demo/plugin.html`）。

### 3.3 Widget / App / Background 迁移

- **FR-007-030**: 系统 MUST 将 `BasicClock` 从主应用的 `src/apps/basic/BasicClock.app.vue` + `.app.js` 迁移到子应用的 `src/apps/demo/DemoClock` 目录，功能保持不变（数字时钟，dayjs 时间格式化）（`tpl-desktop-plugin-demo/src/apps/demo/`）。
- **FR-007-031**: 系统 MUST 将 `BasicImage` 从主应用的 `src/widgets/basic/BasicImage.widget.vue` + `.widget.js` 迁移到子应用的 `src/widgets/demo/DemoImage` 目录，功能保持不变（图片展示，5 种 object-fit 模式）（`tpl-desktop-plugin-demo/src/widgets/demo/`）。
- **FR-007-032**: 系统 MUST 将 `BasicVideo` 从主应用的 `src/widgets/basic/BasicVideo.widget.vue` + `.widget.js` 迁移到子应用的 `src/widgets/demo/DemoVideo` 目录，功能保持不变（视频播放，自动静音循环）（`tpl-desktop-plugin-demo/src/widgets/demo/`）。
- **FR-007-033**: 系统 MUST 将 `BasicText` 从主应用的 `src/widgets/basic/BasicText.widget.vue` + `.widget.js` 迁移到子应用的 `src/widgets/demo/DemoText` 目录，功能保持不变（基础文字展示）（`tpl-desktop-plugin-demo/src/widgets/demo/`）。
- **FR-007-034**: 系统 MUST 将 `BasicNumber` 从主应用的 `src/widgets/basic/BasicNumber.widget.vue` + `.widget.js` 迁移到子应用的 `src/widgets/demo/DemoNumber` 目录，功能保持不变（数字动画展示，@number-flow/vue）（`tpl-desktop-plugin-demo/src/widgets/demo/`）。
- **FR-007-035**: 系统 MUST 从本工程 `src/backgrounds` 目录复制所有背景资源到子应用的 `src/backgrounds` 目录，作为子应用提供的桌面背景集合（`tpl-desktop-plugin-demo/src/backgrounds/`）。

### 3.4 数据模型更新

- **FR-007-040**: `specs/overall-data-model.md` MUST 新增 `PluginMeta` 实体定义，包含字段：`name`（string，唯一标识符）、`title`（string，显示名称）、`category`（string，分类）、`url`（string，子应用地址）、`alive`（boolean，保活模式）、`exec`（boolean，预执行）、`fiber`（boolean，并发渲染）、`disabled`（boolean，是否禁用）（`specs/overall-data-model.md`）。
- **FR-007-041**: `specs/overall-data-model.md` MUST 新增 `PluginManifest` 实体定义，包含字段 `plugins`（`PluginMeta[]`，子应用清单数组），对应 `public/PLUGINS.json` 文件的完整结构（`specs/overall-data-model.md`）。
- **FR-007-042**: `WidgetMeta` 和 `AppMeta` 实体 MUST 新增 `source` 字段（string），标识元数据来源：`'local'` 表示本地 `import.meta.glob` 扫描注册；`'plugin:<pluginName>'` 表示来自指定子应用注入（`specs/overall-data-model.md`）。

## 4. 关键实体

### 4.1 PluginMeta（子应用元数据）

描述一个远程子应用的接入配置，定义在 `public/PLUGINS.json` 中。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | string | 是 | — | 子应用唯一标识，对应 wujie 的 `name` 参数 |
| `title` | string | 是 | — | 子应用显示名称（如 "演示插件"） |
| `category` | string | 否 | — | 子应用分类（如 "演示"） |
| `url` | string | 是 | — | 子应用 HTML 入口地址（开发环境为反向代理路径，生产环境为 CDN 地址） |
| `alive` | boolean | 否 | `true` | 是否保活模式 |
| `exec` | boolean | 否 | `false` | 是否预执行（加载后立即调用 mount） |
| `fiber` | boolean | 否 | `true` | 是否启用 JS Fiber 并发渲染 |
| `disabled` | boolean | 否 | `false` | 是否禁用（禁用后 `useWujie` 跳过加载） |

### 4.2 PluginManifest（子应用清单文件）

定义 `public/PLUGINS.json` 的根结构。

| 字段 | 类型 | 说明 |
|------|------|------|
| `plugins` | `PluginMeta[]` | 子应用配置数组 |

### 4.3 WujieExport（子应用全局暴露对象）

子应用通过 `window.__WUJIE_EXPORTS__` 暴露给主应用的对象结构，由主应用 `useWujie` 生命周期钩子提取。

| 字段 | 类型 | 说明 |
|------|------|------|
| `apps` | `Record<string, { component: Component, meta: Partial<AppMeta> }>` | 子应用注册的 App 组件与元数据字典 |
| `widgets` | `Record<string, { component: Component, meta: Partial<WidgetMeta> }>` | 子应用注册的 Widget 组件与元数据字典 |
| `backgrounds` | `Record<string, { component: Component, meta: Partial<DesktopBackgroundMeta> }>` | 子应用注册的 Background 组件与元数据字典 |

### 4.4 WidgetMeta / AppMeta 扩展字段

在现有实体基础上新增的字段（参见 `specs/overall-data-model.md` §WidgetMeta/§AppMeta）：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `source` | string | 否 | `'local'` | 来源标识。`'local'` 为本地扫描注册；`'plugin:<pluginName>'` 为子应用注入 |

### 4.5 PluginLoadState（子应用加载状态）

`useWujie` composable 内部维护的运行时状态追踪结构。

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 子应用名称（对应 PluginMeta.name） |
| `status` | `'loading' \| 'loaded' \| 'error'` | 当前加载状态 |
| `error` | `Error \| null` | 加载失败时的错误对象 |
| `appWindow` | `Window \| null` | 子应用 iframe 的 contentWindow（加载成功后可用） |
| `exports` | `WujieExport \| null` | 子应用暴露的全局对象（mount 后可用） |

## 5. 验收场景

### 场景: 主应用通过反向代理加载子应用

- Given 主应用 `tpl-desktop` 开发服务器已启动（默认端口），子应用 `tpl-desktop-plugin-demo` 开发服务器已启动（端口 5273）
- When 用户打开主应用桌面
- Then `useWujie` 从 `public/PLUGINS.json` 读取子应用清单，通过 `startApp` 加载 `tpl-desktop-plugin-demo`，子应用在 iframe + WebComponent 中正常渲染，`useWujie` 状态变为 `loaded`

### 场景: 子应用组件出现在主应用添加面板中

- Given 子应用 `tpl-desktop-plugin-demo` 已成功加载并暴露了 `DemoText` Widget 元数据
- When 用户在主应用中打开"添加组件"面板
- Then `DemoText` 出现在可用 Widget 列表中，与本地 Widget（如 `BasicMarkdown`）在同一个分类树下展示
- And 用户点击 `DemoText` 预览卡片后，该 Widget 被添加到桌面网格中，正常渲染并显示子应用的样式

### 场景: 子应用 App 出现在应用市场中

- Given 子应用 `tpl-desktop-plugin-demo` 已成功加载并暴露了 `DemoClock` App 元数据
- When 用户打开 App 应用市场
- Then `DemoClock` 出现在可用 App 列表中，与本地 App（如 `BasicIframe`）在同一个分类树下展示
- And 用户点击添加后，`DemoClock` 以全屏覆盖层形式渲染在桌面之上，拥有独立的标题栏和关闭按钮

### 场景: 子应用加载失败不阻塞桌面启动

- Given 子应用清单中有一个 `disabled: false` 的子应用，但其开发服务器未启动（端口不可达）
- When 用户打开主应用桌面
- Then `useWujie` 等待该子应用加载超时后，将其状态标记为 `error`，然后触发 `onAllReady` 回调
- And 桌面正常启动，本地组件可正常使用，加载失败的子应用组件不在任何面板中显示
- And 控制台输出 warning 提示该子应用加载失败

### 场景: 主应用和子应用样式隔离

- Given 主应用设置了 `--desktop-primary-color: #409EFF`（浅色主题），子应用 `DemoText` 也使用了同名的 CSS 变量但值为 `#E6A23C`
- When `DemoText` Widget 在主应用桌面网格中渲染
- Then 子应用内的 `--desktop-primary-color` 值为 `#E6A23C`（子应用自身的变量值），主应用桌面其它区域的该变量值保持 `#409EFF`，两者互不影响

### 场景: 子应用独立调试

- Given 子应用开发服务器已启动（端口 5273）
- When 开发者访问 `http://localhost:5273/index.html`
- Then 子应用 `App.vue` 正常渲染，不依赖主应用环境
- And `window.__POWERED_BY_WUJIE__` 为 `false`（未在无界沙箱中运行）

### 场景: 桌面配置持久化后恢复时组件来源正确

- Given 桌面配置中保存了一个子应用 Widget 实例（`compName: "DemoText"`, `source: "plugin:tpl-desktop-plugin-demo"`）
- When 用户刷新页面
- Then 主应用启动流程中先等待子应用加载完成，然后从 `useWidgetMetas` 字典中查找到 `DemoText` 的组件和元数据，正常恢复渲染

### 场景: 已迁移的主应用组件从本地目录移除

- Given `BasicText` 已从主应用迁移到子应用
- When 主应用启动
- Then 主应用 `src/widgets/basic/` 目录中不再包含 `BasicText.widget.vue` 和 `BasicText.widget.js` 文件
- And `BasicText` 不再出现在本地 `import.meta.glob` 扫描结果和 `WidgetMetas` 字典中

## 6. 非功能需求

### 6.1 性能

- 子应用通过 `alive: true` 保活模式常驻内存，切换时不重复创建和销毁 Vue 实例，避免白屏和性能抖动。
- 子应用通过 `exec: false` 延迟执行，主应用在 `onAllReady` 回调前不阻塞主线程渲染。
- 子应用通过 `fiber: true` 启用 JS Fiber 模式，将同步阻塞任务拆分为多个宏任务，避免卡顿主应用 UI。
- 子应用静态资源（JS/CSS）通过 iframe 加载，不占用主应用的网络请求队列，天然并行加载。

### 6.2 可扩展性

- `public/PLUGINS.json` 的数组结构天然支持多个子应用并存，只需新增数组元素即可接入，无需修改代码。
- `useWidgetMetas` / `useAppMetas` / `useBackgroundMetas` 的合并机制支持任意数量的子应用同时注入元数据，合并策略（浅合并覆盖 + 同名冲突 warning）为后续冲突解决预留扩展点。
- `WujieExport` 对象结构可扩展更多导出类型，无需修改通信协议。
- `PluginMeta.disabled` 字段允许在不删除配置的情况下临时禁用某个子应用。

### 6.3 健壮性

- 子应用加载失败时，`useWujie` 将其标记为 `error` 状态，不阻塞 `onAllReady` 回调，不影响其他子应用的正常加载和主应用的启动。
- 子应用暴露的全局对象格式不合法（如缺失 `apps` / `widgets` 字段）时，`useWujie` 生命周期钩子 MUST 以空对象 `{}` 回退，并输出 `console.warn` 提示，不抛出异常。
- 子应用清单 `public/PLUGINS.json` 不存在或 JSON 解析失败时，`useWujie` MUST 以空插件列表回退，不阻塞主应用启动。
- 子应用 `__WUJIE_UNMOUNT` 中 `app.unmount()` 调用失败时，错误 MUST 被 try-catch 捕获并 `console.warn`，不泄漏到主应用全局错误处理。

### 6.4 安全

- 子应用的 JS 运行在独立 iframe 中，与主应用 window 隔离（仅 `__WUJIE_EXPORTS__` 和 `$wujie` 为契约式暴露），子应用无法直接访问主应用的组件状态、localStorage 和 DOM。
- 子应用的 CSS 运行在 WebComponent Shadow Root 中，天然隔离，不会意外覆盖主应用的全局样式。

## 7. 假设与约束

1. **假设**: 子应用与主应用部署在同域（或跨域但配置了 CORS 响应头）。若子应用部署在不同域，需要子应用服务端配置 `Access-Control-Allow-Origin` 响应头。
2. **假设**: 开发环境下主应用通过 Vite 反向代理访问子应用开发服务器，子应用开发服务器必须先行启动。生产环境下子应用的静态资源部署在 CDN 或同域子路径下。
3. **假设**: 子应用使用的 Vue 版本（3.x）与主应用兼容。wujie 通过 iframe 天然隔离了 JS 运行时，因此子应用和主应用可以使用不同的 Vue 小版本号。
4. **约束**: 子应用必须提供 `plugin.html` 入口文件，并实现 `__WUJIE_MOUNT` / `__WUJIE_UNMOUNT` 生命周期（Constitution 第11条 — 组件必须遵循统一的生命周期契约）。
5. **约束**: 子应用暴露的元数据对象结构必须与主应用本地的 WidgetMeta / AppMeta / DesktopBackgroundMeta 结构兼容。字段缺失时由对应的 use*Metas composable 提供默认值回退。
6. **约束**: 主应用 `Desktop.vue` 初始化流程必须在所有子应用加载完成后（或失败后）才开始渲染桌面。这意味着首次加载的 Time-to-Interactive 会增加子应用的最长加载时间。
7. **约束**: 同一 `compName` 的组件如果在主应用本地和子应用同时存在，本地优先（浅合并策略），子应用版本被覆盖并输出 `console.warn`。若两个不同子应用暴露了相同 `compName`，后加载的子应用覆盖前者。

## 8. 依赖关系

### 上游依赖（本模块依赖的模块 / 外部包）

| 模块 / 依赖 | 依赖内容 | 说明 |
|------|---------|------|
| wujie-vue3 (npm) | `<WujieVue>` 组件、`startApp`、`preloadApp`、`setupApp`、`bus` | 微前端框架核心，提供子应用加载、生命周期、通信机制 |
| 002-widget-system (useWidgetMetas) | `useWidgetMetas()` 模块级 ref 共享 | 远程 Widget 元数据需注入到此 composable |
| 003-app-system (useAppMetas) | `useAppMetas()` 模块级 ref 共享 | 远程 App 元数据需注入到此 composable |
| 004-background-system (useBackgroundMetas) | `useBackgroundMetas()` 模块级 ref 共享 | 远程 Background 元数据需注入到此 composable |
| 001-desktop-framework (Desktop.vue) | 桌面初始化流程 | 需要改造为等待子应用加载完毕后再渲染 |
| Vite (vite.config.js) | `server.proxy` 反向代理 | 开发环境下将 `/tpl-desktop-plugin-demo` 请求代理到子应用开发服务器 |
| public/PLUGINS.json | 静态 JSON 文件 | 子应用清单的运行时配置来源 |

### 下游依赖（依赖本模块的模块）

| 模块 | 消费内容 | 说明 |
|------|---------|------|
| 001-desktop-framework (Desktop.vue) | `useWujie().onAllReady(callback)` | 桌面编排器等待子应用就绪后再初始化 |
| 002-widget-system (useWidgetMetas) | 合并后的 `widgetMetas` ref（含远程组件） | 添加面板和渲染管线透明消费 |
| 003-app-system (useAppMetas) | 合并后的 `appMetas` ref（含远程 App） | 应用市场和叠加层渲染透明消费 |
| 004-background-system (useBackgroundMetas) | 合并后的 `backgroundMetas` ref（含远程背景） | 背景选择面板透明消费 |
| 301-widget-basic-widgets | 迁移后的子应用组件（DemoText 等） | 原主应用组件迁移为子应用组件后，主应用通过 wujie 加载 |
| 401-app-basic-apps | 迁移后的子应用 App（DemoClock） | 原主应用 App 迁移为子应用 App 后，主应用通过 wujie 加载 |
| tpl-desktop-plugin-demo（子应用工程） | wujie 生命周期契约、`__WUJIE_EXPORTS__` 暴露格式 | 子应用开发须遵循本模块定义的接口规范 |
