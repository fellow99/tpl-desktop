# 工作台 — 技术选型清单

> 项目：tpl-desktop（工作台）
> 最后更新：2026-07-19
> 本文档为 as-built 文档，版本号取 package.json 中声明的 `^` 范围，实际使用情况通过 grep 逐项验证。

## 核心框架

| 分类 | 技术 | 版本 | 用途 |
|---|---|---|---|
| 前端框架 | Vue 3 | ^3.5.39 | 核心 UI 框架（Composition API + `<script setup>`） |
| UI 组件库 | Element Plus | ^2.11.7 | el-dialog / el-tree / el-button / el-switch / el-input 等通用 UI 组件 |
| 构建工具 | Vite | ^8.1.4 | 开发服务器与生产构建（单页面入口 index.html） |
| Vue 编译插件 | @vitejs/plugin-vue | ^6.0.8 | Vue SFC 编译（仅 devDependencies） |
| CSS 预处理 | sass | ^1.101.0 | SCSS 样式编译（仅 devDependencies） |

## 布局与交互

| 分类 | 技术 | 版本 | 用途 |
|---|---|---|---|
| 网格布局 | gridstack | ^11.5.1 | Widget 拖拽网格布局引擎（gridstack/dist/gridstack.min.css + gridstack-extra.min.css） |
| 轮播 | swiper | ^14.0.1 | 桌面多页面滑动切换（Swiper + SwiperSlide + Pagination 模块） |
| 卡片轮播 | embla-carousel-vue | ^8.6.0 | 背景选择面板的卡片轮播（useEmblaCarousel，touch/mouse 拖拽） |

## 内容渲染

| 分类 | 技术 | 版本 | 用途 |
|---|---|---|---|
| Markdown 渲染 | vue3-markdown | ^1.2.17 | Markdown 内容渲染（VMarkdownView 组件）与编辑器（VMarkdownEditor 组件） |
| 数值动画 | @number-flow/vue | ^0.4.8 | 数字滚动动画（NumberFlow 组件，BasicNumber.widget.vue） |
| 日期处理 | dayjs | ^1.11.19 | 时钟时间格式化（BasicClock.app.vue 每秒刷新） |

## 安全

| 分类 | 技术 | 版本 | 用途 |
|---|---|---|---|
| RSA 加密 | jsencrypt | ^3.5.4 | 登录密码 RSA 公钥加密传输（auth-service.js，公钥来自 window.SYSTEM_CONFIGS.rsaPublicKey） |

## 工具库

| 分类 | 技术 | 版本 | 用途 |
|---|---|---|---|
| 深拷贝 | lodash | ^4.17.21 | cloneDeep（desktop-property-panel.vue 属性编辑撤销/重置，仅导入 `lodash/cloneDeep`） |

## 状态管理

本项目**不使用** pinia 或任何集中式状态管理库。状态管理策略如下：

- **组件内部状态**：Vue `ref()` / `reactive()`（模块级 ref 共享于 composable）
- **跨组件通信**：Vue props 向下传递 + emits 向上通知，不存在 mitt 或其他事件总线库
- **GridStack Widget 事件**：通过 `useGridStack.js` 的内部 `widgetEmitters` Map 桥接（registerWidgetEmitter / emitToWidget / broadcastToAllWidgets），非 mitt
- **持久化状态**：localStorage 三键 —— `dashboard-desktop-data`（桌面配置）、`dashboard-theme`（主题偏好）、`dashboard-login-user`（登录会话）

## 自动扫描注册

| 目标 | 目录 | 扫描模式 | 注册入口 | 输出 |
|---|---|---|---|---|
| UI 组件 | src/components/ | `desktop-*.vue` | components/index.js | `UIComponents` dict → 全局注册 |
| Widget 组件 | src/widgets/ | `*.widget.vue` + `*.widget.js` | widgets/index.js | `WidgetComponents` + `WidgetMetas` → 全局注册 |
| App 组件 | src/apps/ | `*.app.vue` + `*.app.js` | apps/index.js | `AppComponents` + `AppMetas` → 全局注册 |
| 桌面背景 | src/backgrounds/ | `*.bg.js` | backgrounds/index.js | `BackgroundMetas` → composable 消费 |

全部使用 Vite `import.meta.glob(..., { eager: true })` 构建时扫描，新增组件仅需添加文件对，无需修改入口代码。

## 已声明但未使用的依赖

以下依赖在 `package.json` 中声明，但在 `src/` 目录下**没有任何 import 引用**：

| 包名 | 声明版本 | 说明 |
|---|---|---|
| pinia | ^4.0.2 | 未使用。状态管理完全通过 Vue ref + composable 模块级共享实现 |
| mitt | ^3.0.1 | 未使用。事件通信通过 Vue emits + useGridStack 内部 widgetEmitters 桥接实现 |
| three | ^0.183.2 | 未使用。源码中无 three.js 相关代码 |
| jsonpath-plus | ^10.3.0 | 未使用。源码中无 jsonpath 相关代码 |
| element-resize-detector | ^1.2.4 | 未使用。源码中无此库的 import |
| @imengyu/vue3-context-menu | ^1.5.2 | 未使用。源码中无右键菜单相关代码 |

## 路由

本项目**不使用** vue-router。单页面工作台桌面通过 Swiper 多页、面板显隐和对话框完成所有交互。

## TypeScript

本项目**不使用** TypeScript。全部源代码为纯 JavaScript（.js 文件 + .vue `<script setup>`）。

## 测试

本项目当前**无自动化测试**配置（无 Jest、Vitest、Cypress 等测试框架）。

## 构建与部署

| 项目 | 说明 |
|---|---|
| 构建命令 | `vite build` |
| 构建输出 | `dist/` |
| 开发命令 | `vite`（dev server + HMR） |
| 预览命令 | `vite preview` |
| 包管理器 | pnpm（pnpm-workspace.yaml + pnpm-lock.yaml） |
| ES 模块 | `"type": "module"`（package.json） |

## 开发代理

Vite 开发服务器通过 `vite.config.js` 配置代理：

| 路径前缀 | 目标 | 用途 |
|---|---|---|
| `/authcenter` | `http://localhost:8080` | 认证中心 API 转发（login 等，`changeOrigin: true`） |

部署时需配置对应的反向代理或直接设置 `window.SYSTEM_CONFIGS.authLoginUrl` 指向真实后端地址。
