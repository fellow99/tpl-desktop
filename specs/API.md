# 工作台 — API 接口清单

> 项目：tpl-desktop（工作台）
> 最后更新：2026-07-19
> 本文档为 as-built 文档，所有接口均从实际源码中提取，不含推测内容。

## 概述

工作台是一个**纯前端单页桌面应用**，无独立后端服务。数据流通过以下方式实现：

- **HTTP fetch**：仅用于加载静态 JSON 配置和模拟用户数据
- **localStorage**：桌面配置与用户会话持久化
- **Vue emits / props**：父子组件通信
- **useGridStack widget 事件桥接**：跨层级 Widget 生命周期事件（非 mitt）

**本项目没有后端 REST API**。`vite.config.js` 中配置的 `/authcenter` proxy 为预留代理，当前代码通过 `auth-service.js` 实现了完整的 mock 降级路径。

---

## HTTP 请求

### 认证服务（auth-service.js）

| 路径 | 方法 | 用途 | 入口文件 | 说明 |
|---|---|---|---|---|
| `/authcenter/login` | POST | 后端认证登录 | src/api/auth-service.js:67 | Body: `{ username, password: <RSA加密> }`。URL 取自 `window.SYSTEM_CONFIGS.authLoginUrl`，dev 环境由 Vite proxy 转发。后端不可达时降级到 mock 路径 |
| `/USERS_MOCK.json` | GET | 模拟用户数据 | src/api/auth-service.js:90 | 仅开发环境降级路径。明文密码就地比对，不传输、不落 localStorage |

### 桌面配置加载（Desktop.vue）

| 路径 | 方法 | 用途 | 入口文件 | 说明 |
|---|---|---|---|---|
| `/DEFAULT_DESKTOP_JSON.json` | GET | 加载默认桌面布局 | src/pages/Desktop.vue:72 | 启动时 fetch，失败回退到硬编码 FALLBACK_CONFIG |

`public/` 目录下的静态文件（`config.js`、`DEFAULT_DESKTOP_JSON.json`、`USERS_MOCK.json`）由 Vite 开发服务器或部署时的静态文件服务器直接提供，无需任何后端处理。

---

## localStorage 持久化接口

| 键名 | 值类型 | 写入方 | 读取方 | 用途 |
|---|---|---|---|---|
| `dashboard-desktop-data` | JSON | Desktop.vue `persistConfig()` | Desktop.vue `loadDesktopConfig()` | 桌面完整配置（theme / font-size / background / pages / shortcuts），退出编辑或卸载时持久化 |
| `dashboard-theme` | string | useTheme.js `storeTheme()` | useTheme.js `readStoredTheme()` + index.html Anti-FOUC 脚本 | 主题偏好：`"light"` 或 `"dark"` |
| `dashboard-login-user` | JSON | auth-service.js `cacheLoginUser()` | auth-service.js `restoreSession()` | 缓存登录用户信息（仅保留 userId / userName / name，已剔除 password 等敏感字段） |

---

## Vue 组件间通信：Props 向下传递

| 父组件 | 子组件 | Props | 用途 |
|---|---|---|---|
| Desktop.vue | desktop-viewport-desktop | `desktopConfig`, `desktopMode`, `currentPageIndex`, `userInfo` | 桌面配置、编辑模式、当前页码、登录用户 |
| Desktop.vue | desktop-background | `background` | 当前背景配置对象 `{ type, name, title, category }` |
| Desktop.vue | desktop-background-list | `current-background` | 当前已选背景（用于高亮） |
| Desktop.vue | desktop-viewport-app | `apps` | 已打开的 App 实例数组 `[{ instanceId, compName, state, ... }]` |
| Desktop.vue | desktop-app-list | `shortcuts` | 快捷方式列表 `[{ compName, compId?, appMeta }]` |
| Desktop.vue | desktop-toolbar-main | `apps`, `shortcuts` | 运行中 App 状态、快捷方式列表 |
| Desktop.vue | desktop-statusbar | `user-info`, `desktop-mode` | 登录用户名、当前桌面模式 |
| Desktop.vue | desktop-property-panel | `visible` (v-model), `node`, `meta` | 面板显隐、当前编辑的 GridStack 节点、Widget/App 元数据 |
| desktop-viewport-desktop | desktop-widget-wrapper | `title`, `hideHeader`, `editMode` | 外壳标题、是否隐藏标题栏、编辑模式 |
| desktop-viewport-app | desktop-app-wrapper | app 对象相关属性 | App 外壳配置 |

---

## Vue 组件间通信：Emits 向上通知

| 子组件 | 事件名 | Payload | 描述 |
|---|---|---|---|
| desktop-dialog-login | `success` | `user: LoginUser` | 登录成功，传递用户信息 |
| desktop-statusbar | `enter-edit` | — | 进入编辑模式 |
| desktop-statusbar | `exit-edit` | — | 退出编辑模式 |
| desktop-statusbar | `logout` | — | 退出登录 |
| desktop-toolbar-main | `home` | — | 回到首页 |
| desktop-toolbar-main | `show-app-list` | — | 打开 App 列表面板 |
| desktop-toolbar-main | `add-app` | `{ compName, compId?, appMeta? }` | 打开/恢复 App |
| desktop-toolbar-main | `toggle-app-state` | `app: AppInstance` | 切换 App 最小化/恢复 |
| desktop-toolbar-main | `close-app` | `app: AppInstance` | 关闭 App |
| desktop-toolbar-edit | `show-background-list` | — | 打开背景选择面板 |
| desktop-toolbar-edit | `show-widget-list` | — | 打开部件选择面板 |
| desktop-toolbar-edit | `toggle-theme` | — | 切换浅色/深色主题 |
| desktop-toolbar-edit | `add-page-before` | — | 当前页之前插入新页 |
| desktop-toolbar-edit | `add-page-after` | — | 当前页之后插入新页 |
| desktop-toolbar-edit | `remove-page` | — | 移除当前页 |
| desktop-toolbar-edit | `font-size-increase` | — | 字号 +2px |
| desktop-toolbar-edit | `font-size-decrease` | — | 字号 -2px |
| desktop-toolbar-edit | `font-size-reset` | — | 字号还原 16px |
| desktop-toolbar-edit | `exit-edit` | — | 完成编辑 |
| desktop-widget-list | `add-widget` | `(compName: string, mergedMeta: MetaWithPreset?)` | 选择部件 → 添加到当前页 |
| desktop-widget-list | `close` | — | 关闭部件列表面板 |
| desktop-background-list | `select-background` | `meta: DesktopBackgroundMeta` | 选择背景 |
| desktop-background-list | `close` | — | 关闭背景选择面板 |
| desktop-viewport-desktop | `widget-edit` | `(node: GridStackNode, meta: WidgetMeta)` | 转发部件的编辑按钮事件 |
| desktop-viewport-desktop | `page-change` | `(newIndex: number)` | Swiper 滑动切换页面 |
| desktop-viewport-app | `minimize-app` | `app: AppInstance` | App 最小化 |
| desktop-viewport-app | `remove-app` | `app: AppInstance` | App 关闭 |
| desktop-app-list | `add-app` | `{ compName, compId?, appMeta? }` | 打开/恢复 App |
| desktop-app-list | `toggle-shortcut` | `{ compName, compId?, appMeta? }` | 添加快捷方式到工具条 / 移除快捷方式 |
| desktop-app-list | `open-store` | — | 打开 App 应用市场 |
| desktop-app-list | `close` | — | 关闭 App 列表面板 |
| desktop-app-store | `confirm` | `appMeta: AppMeta` | 应用市场确认选择 → App 列表回写 |
| desktop-app-store | `close` | — | 关闭应用市场 |
| desktop-property-panel | `confirm` | `{ id, propsValues, wrapperValues }` | 属性编辑确认 → 视口更新节点并持久化 |

---

## useGridStack Widget 事件桥接

`useGridStack.js` 内部维护一个 `widgetEmitters` Map（nodeId → emit 函数），用于向具体 Widget 实例发送事件。这不是 mitt，不是任何第三方事件总线——它是 useGridStack 内部的纯 JavaScript Map + 回调机制。

### registerWidgetEmitter(nodeId, emit)

由 `desktop-widget-wrapper` 在 Widget VNode 渲染完成后调用，注册该 Widget 的 emit 回调。

### emitToWidget(nodeId, eventName, payload)

向指定 nodeId 的 Widget 发送事件。

### broadcastToAllWidgets(eventName, payload)

向所有已注册 Widget 广播事件（仅用于 grid-active/grid-deactive 广播）。

### Widget 事件表

| 事件名 | 触发时机 | Payload | 发射方 | 接收方（Widget） |
|---|---|---|---|---|
| `grid-added` | GridStack added 回调 | `{ id, x, y, w, h }` | useGridStack bindGridEvents | Widget emit 回调 |
| `grid-removing` | GridStack removed 回调（移除前） | `{ id }` | useGridStack bindGridEvents | Widget emit 回调 |
| `grid-moving` | GridStack dragstart | `{ id, x, y, w, h }` | useGridStack bindGridEvents | Widget emit 回调 |
| `grid-moving-end` | GridStack dragstop | `{ id, x, y, w, h }` | useGridStack bindGridEvents | Widget emit 回调 |
| `grid-resizing` | GridStack resizestart | `{ id, x, y, w, h }` | useGridStack bindGridEvents | Widget emit 回调 |
| `grid-resizing-end` | GridStack resizestop | `{ id, x, y, w, h }` | useGridStack bindGridEvents | Widget emit 回调 |
| `grid-active` | setActive(key, true) 或页面切换 | `{ id }` | useGridStack setActive / Desktop.vue 页面切换 | Widget emit 回调 |
| `grid-deactive` | setActive(key, false) 或 App 打开时 | `{ id }` | useGridStack setActive / Desktop.vue App 打开 | Widget emit 回调 |

操作流程：
1. GridStack DOM 事件触发 → `useGridStack.bindGridEvents` 拦截
2. 通过 `emitToWidget(node.id, widgetEventName, payload)` 发送到已注册的 Widget emit 回调
3. Widget 组件（如 BasicClock、BasicNumber）可在 `onWidgetEvent` 回调中响应，暂停/恢复动画或交互

---

## Composable 公共接口

以下 composable 提供模块级共享状态或工具函数，是模块间的主要通信边界：

### useTheme (src/composables/useTheme.js)

| 导出 | 类型 | 描述 |
|---|---|---|
| `initTheme()` | function | 初始化主题：localStorage > 系统偏好 > 默认深色 |
| `isDark` | Ref\<boolean\> | 当前是否为深色模式 |
| `toggleTheme()` | function | 切换浅色/深色并持久化 |
| `setTheme(theme)` | function | 设置指定主题（`"light"` / `"dark"`）并持久化 |
| `applyTheme(theme)` | function | 仅应用到 html.dark class（不持久化，用于系统偏好跟随） |

### useGridStack (src/composables/useGridStack.js)

| 导出 | 类型 | 描述 |
|---|---|---|
| `initGrid(key, container, options, callbacks)` | function | 初始化 GridStack 实例，绑定 DOM 事件 → widget 桥接 |
| `destroyGrid(key, removeDom)` | function | 销毁指定实例并清理 widgetEmitters |
| `destroyAll(removeDom)` | function | 销毁所有实例 |
| `getInstance(key)` | function | 获取指定 GridStack 实例 |
| `getAllInstances()` | function | 获取所有 GridStack 实例数组 |
| `registerWidgetEmitter(nodeId, emit)` | function | 注册 widget emit 桥接 |
| `unregisterWidgetEmitter(nodeId)` | function | 注销 widget emit 桥接 |
| `emitToWidget(nodeId, event, payload)` | function | 向指定 widget 发送事件 |
| `broadcastToAllWidgets(event, payload)` | function | 向所有 widget 广播事件 |
| `setActive(key, active)` | function | 设置 GridStack 实例活动状态并广播 grid-active/grid-deactive |
| `isActive(key)` | function | 查询实例是否活动 |

### useWidgetMetas (src/composables/useWidgetMetas.js)

| 导出 | 类型 | 描述 |
|---|---|---|
| `widgetMetas` | Ref\<Record\<string, WidgetMeta\>\> | 响应式 Widget 元数据字典（compName → { title, category, rect, props, events, propsEditors, wrapperEditors, compName }） |

### useAppMetas (src/composables/useAppMetas.js)

| 导出 | 类型 | 描述 |
|---|---|---|
| `appMetas` | Ref\<Record\<string, AppMeta\>\> | 响应式 App 元数据字典（结构与 WidgetMeta 一致） |

### useBackgroundMetas (src/composables/useBackgroundMetas.js)

| 导出 | 类型 | 描述 |
|---|---|---|
| `backgroundMetas` | Ref\<Record\<string, DesktopBackgroundMeta\>\> | 响应式背景元数据字典（name → { title, category, theme, type, avatar, thumbnail, image/video, name }） |

---

## auth-service 导出接口

| 导出 | 类型 | 描述 |
|---|---|---|
| `login(username, password)` | async function | 登录入口：RSA 加密 → POST /authcenter/login → 失败降级 mock → 缓存 session |
| `logout()` | function | 清除 localStorage['dashboard-login-user'] |
| `restoreSession()` | function | 读取并验证缓存的登录信息，无效返回 null |

---

## 不存在的通信机制

以下内容在旧版文档中被提及，但**当前源码中不存在**：

- **mitt 事件总线**：`mitt` 包未在任何源文件中 import。所有的 `grid-active` / `grid-deactive` 等事件通过 `useGridStack.js` 内部的 `widgetEmitters` Map 桥接，而非 mitt。
- **pinia store**：`pinia` 包未在任何源文件中 import / use / createPinia。状态管理完全通过 Vue `ref()` + composable 模块级共享实现。
- **vue-router**：未安装也从未使用。整个应用只有一个 HTML 入口。
