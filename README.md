# 工作台 (tpl-desktop)

**多页面可视化桌面应用** — 仿桌面环境的 Web 工作台，支持拖拽布局、多页面翻页、App 叠加运行、动态背景与深色模式。

[![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vite.dev/)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

---

## 目录

- [功能概览](#功能概览)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [架构概览](#架构概览)
- [模块地图](#模块地图)
- [规范文档](#规范文档)
- [开发命令](#开发命令)

---

## 功能概览

| 功能域 | 能力 |
|--------|------|
| **多页面桌面** | Swiper 翻页，支持页面增删，每页独立网格布局 |
| **小部件系统** | 拖拽添加/缩放/删除，属性可视化编辑，元数据自动注册 |
| **App 应用** | 全屏叠加层运行，最小化/恢复/关闭，应用市场与快捷方式 |
| **背景系统** | 12 套预设（浅色 ×4 / 深色 ×4 / 动态视频 ×4），分类轮播选择 |
| **主题切换** | 浅色/深色双主题，CSS 变量驱动，防闪烁加载，系统偏好跟随 |
| **认证** | RSA 加密登录，后端不可达时自动降级 mock，会话持久化 |
| **配置持久化** | 桌面布局、小部件数据、主题/背景偏好自动保存至 localStorage |

---

## 快速开始

```bash
# 安装依赖（推荐 pnpm）
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

> 项目为纯前端应用，无需后端服务。认证模块内置了 mock 降级机制，`pnpm dev` 即可完整体验全部功能。

---

## 项目结构

```
tpl-desktop/
├── index.html                        # HTML 入口（含反 FOUC 主题脚本）
├── vite.config.js                    # Vite 构建配置
├── package.json                      # 依赖与脚本
├── public/
│   ├── config.js                     # 运行时配置（window.SYSTEM_CONFIGS）
│   ├── DEFAULT_DESKTOP_JSON.json     # 桌面默认配置（布局/页面/快捷方式）
│   ├── USERS_MOCK.json               # 模拟用户数据
│   └── images/                       # 静态图片资源
├── src/
│   ├── desktop.js                    # Vue 应用入口（插件注册 + 全局挂载）
│   ├── style.scss                    # 全局样式（CSS 变量 + 过渡动效）
│   ├── pages/
│   │   └── Desktop.vue               # 根组件 — 桌面编排中心（604 行）
│   ├── components/
│   │   ├── index.js                  # UI 组件自动注册
│   │   ├── desktop/                  # 桌面 chrome 组件（工具栏/状态栏/面板）
│   │   ├── viewport/                 # 视口组件（GridStack/Swiper/App/Wrapper）
│   │   └── property/                 # 属性编辑器（抽屉面板 + 动态表单）
│   ├── composables/
│   │   ├── useGridStack.js           # 网格引擎（注册/销毁/序列化/事件桥接）
│   │   ├── useTheme.js               # 主题状态（模块级单例 ref）
│   │   ├── useWidgetMetas.js         # Widget 元数据目录
│   │   ├── useAppMetas.js            # App 元数据目录
│   │   └── useBackgroundMetas.js     # 背景元数据目录
│   ├── widgets/
│   │   ├── index.js                  # Widget 自动扫描注册（import.meta.glob）
│   │   └── basic/                    # 5 个内置基础小部件
│   ├── apps/
│   │   ├── index.js                  # App 自动扫描注册
│   │   └── basic/                    # 2 个内置基础应用
│   ├── backgrounds/
│   │   ├── index.js                  # 背景自动扫描注册
│   │   ├── dark/                     # 4 套暗色系图片背景
│   │   ├── light/                    # 4 套亮色系图片背景
│   │   └── video/                    # 4 套动态视频背景
│   ├── themes/
│   │   ├── dark/theme.scss           # 深色主题 CSS 变量
│   │   └── light/theme.scss          # 浅色主题 CSS 变量
│   ├── api/
│   │   └── auth-service.js           # 认证服务（RSA 加密 + mock 降级）
│   └── style/
│       └── var.scss                  # SCSS 变量定义
└── specs/                            # 规范文档（41 份 as-built 文档）
    ├── README.md                     # 文档总索引
    └── ...                           # 详见下方「规范文档」章节
```

---

## 技术栈

| 分类 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **框架** | Vue 3 (Composition API + `<script setup>`) | ^3.5.39 | 组件框架 |
| **构建** | Vite + @vitejs/plugin-vue | ^8.1.4 / ^6.0.8 | 开发服务器与打包 |
| **样式** | Sass (SCSS) | ^1.101.0 | CSS 预处理 |
| **UI 库** | Element Plus | ^2.11.7 | 对话框/抽屉/树形控件/消息提示 |
| **网格布局** | GridStack.js | ^11.5.1 | 小部件拖拽网格 |
| **轮播** | Swiper + Embla Carousel | ^14.0.1 / ^8.6.0 | 页面翻页 / 背景选择轮播 |
| **状态管理** | Vue Composition API (ref + module-level singleton) | — | 响应式共享状态（无 Pinia） |
| **Markdown** | vue3-markdown | ^1.2.17 | Markdown 小部件渲染 |
| **数值动画** | @number-flow/vue | ^0.4.8 | 数字滚动动画 |
| **日期** | dayjs | ^1.11.19 | 时钟格式化 |
| **加密** | jsencrypt | ^3.5.4 | RSA 登录加密 |
| **深拷贝** | Lodash (cloneDeep) | ^4.17.21 | 属性编辑副本隔离 |

> **废弃依赖**（已声明但未导入，不影响运行）：mitt、pinia、three、jsonpath-plus、element-resize-detector、@imengyu/vue3-context-menu。详见 [TECH.md](./specs/TECH.md)。

---

## 架构概览

```
                     ┌─────────────────────────────────┐
                     │          index.html              │
                     │   (Anti-FOUC script + config)    │
                     └─────────────┬───────────────────┘
                                   │
                     ┌─────────────▼───────────────────┐
                     │        src/desktop.js            │
                     │  (createApp + plugins + mount)   │
                     └─────────────┬───────────────────┘
                                   │
                     ┌─────────────▼───────────────────┐
                     │    pages/Desktop.vue (604 行)    │
                     │  根组件 — 状态编排中心           │
                     │  config / mode / auth / apps /   │
                     │  pages / fonts / theme / panels  │
                     └──┬──────────┬──────────┬────────┘
                        │          │          │
        ┌───────────────▼──┐ ┌─────▼──────┐ ┌─▼──────────────┐
        │   Viewport Layer │ │  Chrome     │ │  Panel Layer   │
        │  viewport-       │ │  desktop-   │ │  property-     │
        │  desktop / app   │ │  toolbar-   │ │  panel / form  │
        │  widget-wrapper  │ │  statusbar  │ │                │
        └───────┬──────────┘ └────────────┘ └────────────────┘
                │
    ┌───────────┼───────────┬──────────────┐
    │           │           │              │
┌───▼───┐ ┌────▼────┐ ┌───▼────┐  ┌──────▼──────┐
│Widget │ │  App    │ │ Theme  │  │ Background  │
│System │ │ System  │ │ System │  │  System     │
│(002)  │ │ (003)   │ │ (005)  │  │  (004)      │
└───┬───┘ └────┬────┘ └────────┘  └─────────────┘
    │          │
┌───▼───┐ ┌───▼────┐
│Basic  │ │ Basic  │
│Widgets│ │ Apps   │
│(301)  │ │ (401)  │
└───────┘ └────────┘
```

**分层说明**：

- **入口层**（index.html + desktop.js）：HTML 注入运行时配置、反 FOUC 内联脚本，Vue 应用初始化和全局注册
- **编排层**（Desktop.vue）：整个应用的唯一状态中心，管理所有子系统的生命周期、事件路由和配置持久化
- **视口层**（viewport-* 组件）：Swiper 多页面 + GridStack 网格 + App 叠加层 + Widget 外壳，纯展示驱动
- **Chrome 层**（toolbar-*, statusbar）：桌面外壳 UI，通过 emits 上行事件
- **面板层**（property-*）：el-drawer 属性编辑器，cloneDeep 副本隔离
- **注册层**（widgets/apps/backgrounds index.js）：import.meta.glob 自动扫描，零手动维护
- **Composable 层**（use*）：模块级单例 ref，跨组件共享响应式状态

**通信模式**：组件间通过 Props ↓ / Emits ↑ 单向数据流，跨层级通过 Composable 模块级单例共享，Widget<→Grid 事件通过 useGridStack 内部 Map 桥接（非 mitt）。

---

## 模块地图

| 编号 | 模块 | 源码路径 | 说明 |
|------|------|----------|------|
| **001** | 桌面框架 | `pages/Desktop.vue` `viewport/` `useGridStack.js` | 多页面桌面编排、GridStack 网格、编辑/浏览双模式、工具栏与状态栏、配置持久化 |
| **002** | 小部件系统 | `widgets/index.js` `useWidgetMetas.js` `viewport/widget-wrapper` `desktop/widget-list` | 元数据自动注册、Widget 添加面板与预览、容器外壳与事件桥接 |
| **003** | App 应用系统 | `apps/index.js` `useAppMetas.js` `viewport/app` `desktop/app-*` | App 叠加层、启动/最小化/恢复/关闭生命周期、应用市场与快捷方式 |
| **004** | 背景系统 | `backgrounds/index.js` `useBackgroundMetas.js` `desktop/background*` | 12 套图片/视频背景、分类轮播选择、选择结果持久化、背景↔主题联动 |
| **005** | 主题系统 | `useTheme.js` `themes/` `style/` | CSS 变量双主题、html.dark 切换、防闪烁、Element Plus 暗色集成、字体缩放 |
| **011** | 模拟认证 | `api/auth-service.js` `desktop/dialog-login` `public/USERS_MOCK.json` | RSA 加密、后端尝试 → mock 降级、登录门禁、会话持久化 |
| **101** | 属性编辑器 | `property/property-panel` `property/property-form` | el-drawer 动态表单、类型映射驱动的自动渲染、编辑副本隔离、双标签页 |
| **201** | 桌面入口页 | `index.html` `desktop.js` `pages/Desktop.vue` `public/config.js` | 启动全链路（HTML→JS→Vue）、运行时配置注入、全局资源加载、反 FOUC |
| **301** | 基础小部件 | `widgets/basic/Basic*` | 5 个内置 Widget：文字、数字（动画）、Markdown、图片、视频 |
| **401** | 基础应用 | `apps/basic/BasicClock` `apps/basic/BasicIframe` | 2 个内置 App：数字时钟（dayjs）、iframe 网页嵌入 |

---

## 规范文档

完整的 as-built 规范文档位于 [`specs/`](./specs/) 目录，共 **41 份文档** 覆盖 10 个功能模块：

| 文档类型 | 数量 | 说明 |
|----------|------|------|
| 项目级顶层文档 | 11 | 架构、技术选型、宪法原则、API 清单、结构、测试用例索引等 |
| 模块级文档 | 30 | 每个模块 spec.md（功能规格）+ plan.md（技术方案）+ test-cases.md（测试用例） |

**快速入口**：

| 角色 | 推荐起点 |
|------|----------|
| 新人入职 | [`specs/constitution.md`](./specs/constitution.md) → [`STRUCTURE.md`](./specs/STRUCTURE.md) → [`overall-spec.md`](./specs/overall-spec.md) |
| 架构审查 | [`specs/ARCHITECTURE.md`](./specs/ARCHITECTURE.md) → [`TECH.md`](./specs/TECH.md) → [`overall-plan.md`](./specs/overall-plan.md) |
| 前端开发 | [`specs/STRUCTURE.md`](./specs/STRUCTURE.md) → 对应模块 spec.md + plan.md |
| 测试 / QA | [`specs/overall-test-cases.md`](./specs/overall-test-cases.md) → 各模块 test-cases.md |
| 产品 / PM | [`specs/overall-spec.md`](./specs/overall-spec.md) → 对应模块 spec.md |

> 完整索引请参阅 [`specs/README.md`](./specs/README.md)。

---

## 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装依赖 |
| `pnpm dev` | 启动 Vite 开发服务器（HMR） |
| `pnpm build` | 生产构建（输出至 `dist/`） |
| `pnpm preview` | 预览生产构建 |

---

**最后更新：** 2026-07-19
