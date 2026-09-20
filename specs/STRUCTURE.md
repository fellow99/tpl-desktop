# 工作台 — 项目结构与路由清单

> 项目：tpl-desktop（工作台）
> 最后更新：2026-07-19
> 本文档为 as-built 文档，所有内容均基于实际源代码文件验证，不包含推测或占位内容。

## 目录结构

```
/
├── index.html                                    # 应用入口 HTML，含 Anti-FOUC 脚本与 config.js 加载
├── package.json                                  # 项目元信息与依赖声明
├── pnpm-lock.yaml                                # pnpm 依赖锁定文件
├── pnpm-workspace.yaml                           # pnpm 工作区配置
├── vite.config.js                                # Vite 构建配置（单入口 + dev proxy /authcenter）
├── README.md                                     # 项目说明
├── public/
│   ├── config.js                                 # 运行时全局配置 window.SYSTEM_CONFIGS（authLoginUrl / rsaPublicKey）
│   ├── DEFAULT_DESKTOP_JSON.json                 # 桌面默认布局（theme / font-size / grid / pages / shortcuts / background）
│   ├── USERS_MOCK.json                           # 开发环境模拟用户数据（单用户 admin/admin123）
│   ├── vite.svg                                  # Vite 默认 favicon
│   └── images/
│       └── .gitkeep                              # 空目录占位
├── dist/                                         # Vite 构建输出（不纳入版本控制）
└── src/                                          # 源代码
    ├── desktop.js                                # 应用入口：createApp → 全局注册 UI/Widget/App 组件 → mount('#app')
    ├── style.scss                                # 全局样式（引入 light/dark 主题 SCSS，设置 html/body/#app 重置）
    ├── style/
    │   └── var.scss                              # --desktop-* CSS 变量体系文档说明（设计文档，非实际变量定义）
    ├── themes/
    │   ├── light/
    │   │   └── theme.scss                        # 浅色主题 :root 级 CSS 变量（灰白配色）
    │   └── dark/
    │       └── theme.scss                        # 深色主题 html.dark 级 CSS 变量（深灰黑配色）
    ├── pages/
    │   └── Desktop.vue                           # 桌面主页面（488行）：配置加载/登录/主题/App 生命周期/面板编排
    ├── components/
    │   ├── index.js                              # UI 组件自动扫描注册（desktop-*.vue 模式，import.meta.glob eager）
    │   ├── desktop/                              # 桌面 UI 组件（9个）
    │   │   ├── desktop-app-list.vue           # App 列表面板（含快捷方式管理 + 应用市场入口）
    │   │   ├── desktop-app-store.vue          # App 应用市场（独立挂载，不嵌套 el-dialog）
    │   │   ├── desktop-background-list.vue    # 背景选择面板（Embla Carousel 卡片轮播 + 分类筛选）
    │   │   ├── desktop-background.vue         # 背景渲染层组件（image/video 类型驱动，不拦截交互）
    │   │   ├── desktop-dialog-login.vue        # 登录对话框（username + password → RSA 加密 → auth-service）
    │   │   ├── desktop-statusbar.vue          # 顶部状态栏（时钟 + 编辑模式入口 + 用户信息/登出）
    │   │   ├── desktop-toolbar-edit.vue       # 底部编辑工具条（背景/部件/主题/页面/字号/完成）
    │   │   ├── desktop-toolbar-main.vue       # 底部主工具条（主页 + App 列表 + 快捷方式 + 运行中 App）
    │   │   └── desktop-widget-list.vue        # 部件选择列表（分类树 + GridStack 预览网格 + preset 变体）
    │   ├── viewport/                              # 视口组件（4个）
    │   │   ├── desktop-viewport-desktop.vue   # 桌面视口：Swiper 多页 + 每页独立 GridStack 实例
    │   │   ├── desktop-viewport-app.vue       # App 渲染层：已打开 App 实例浮动叠加（z-index:10）
    │   │   ├── desktop-widget-wrapper.vue     # 部件外壳：标题栏 + 编辑/删除按钮 + slot 内容 + GridStack 事件桥接
    │   │   └── desktop-app-wrapper.vue         # App 组件外壳：标题栏 + 最小化/关闭按钮 + slot 内容
    │   └── property/                              # 属性编辑（2个）
    │       ├── desktop-property-panel.vue      # 属性编辑面板（props + wrapper 双 Tab，含撤销/重置逻辑）
    │       └── desktop-property-form.vue       # 动态属性表单（根据 propMeta.type 渲染对应编辑器）
    ├── widgets/                                   # 部件库（自动扫描 .widget.vue + .widget.js）
    │   ├── index.js                               # Widget 自动扫描注册（72行）：compName 提取、元数据默认值回退、孤儿组件处理
    │   └── basic/                                 # 基础展示 Widget（5对）
    │       ├── BasicText.widget.vue + .widget.js       # 基础文字（纯 Mustache 插值渲染）
    │       ├── BasicNumber.widget.vue + .widget.js      # 滚动数字（@number-flow/vue 的 NumberFlow 组件）
    │       ├── BasicMarkdown.widget.vue + .widget.js    # Markdown 渲染（vue3-markdown 的 VMarkdownView）
    │       ├── BasicImage.widget.vue + .widget.js       # 图片展示（含 objectFit select 类型属性）
    │       └── BasicVideo.widget.vue + .widget.js       # 视频播放（HTML5 video + source 多源适配）
    ├── apps/                                      # App 应用库（自动扫描 .app.vue + .app.js）
    │   ├── index.js                               # App 自动扫描注册（71行）：compName 提取、元数据默认值回退
    │   └── basic/
    │       ├── BasicClock.app.vue + .app.js             # 时钟 App（dayjs 实时刷新，含中文星期映射）
    │       └── BasicIframe.app.vue + .app.js             # iframe 内嵌时钟 App
    ├── backgrounds/                               # 桌面背景库（自动扫描 .bg.js）
    │   ├── index.js                               # 背景自动扫描注册（40行）：name 注入、默认值回退（category/type）
    │   ├── dark/                                  # 暗色系背景（4个）：dark-001 ~ dark-004，各含 avatar/thumbnail/image
    │   ├── light/                                 # 浅色系背景（4个）：light-001 ~ light-004，各含 avatar/thumbnail/image
    │   └── video/                                 # 动态视频背景（4个）：webm-001 ~ webm-004，type: 'video'
    ├── composables/                               # 组合式函数（5个）
    │   ├── useAppMetas.js                         # App 元数据响应式封装（模块级 ref → appMetas）
    │   ├── useBackgroundMetas.js                  # 背景元数据响应式封装（模块级 ref → backgroundMetas）
    │   ├── useWidgetMetas.js                      # Widget 元数据响应式封装（模块级 ref → widgetMetas）
    │   ├── useGridStack.js                        # GridStack 多实例管理器（160行）：init/destroy/setActive + widget 事件桥接
    │   └── useTheme.js                            # 主题管理（81行）：initTheme/toggleTheme/setTheme + 系统偏好跟随
    └── api/                                       # API 层（无后端，mock + fetch 降级）
        └── auth-service.js                        # 认证服务（115行）：login/logout/restoreSession + RSA 加密 + mock 降级
```

## 页面与路由清单

本项目**不使用 vue-router**。整个应用为单一 HTML 入口的单页桌面应用，通过组件显隐和 Swiper 多页实现页面切换。

### 入口链路

```
index.html                       ← <script src="/config.js"> → window.SYSTEM_CONFIGS
  └── <script type="module" src="/src/desktop.js">
       └── createApp(Desktop)
            └── app.use(ElementPlus)
            └── 全局注册 UIComponents    (desktop-*.vue)
            └── 全局注册 WidgetComponents (.widget.vue)
            └── 全局注册 AppComponents    (.app.vue)
            └── app.mount('#app')
                 └── pages/Desktop.vue   ← 主页面组件
```

### 页面

| 入口 | 入口文件 | 页面组件 | 描述 |
|------|---------|---------|------|
| `index.html` | `src/desktop.js` | `src/pages/Desktop.vue` | 工作台桌面：登录覆盖层 / 多页 Swiper + App 叠加层 + 背景系统 + 全套面板 |

### 多页面机制

"页面"概念由 Swiper 多页实现（`desktop-viewport-desktop.vue` 中每页一个独立 GridStack 实例），页面数据存储在 `desktopConfig.pages[]` 数组中，通过 `DEFAULT_DESKTOP_JSON.json` 初始化、`localStorage['dashboard-desktop-data']` 持久化。

### Vue 组件清单

#### 桌面组件（components/desktop/）

| 组件名（kebab-case） | 文件 | 职责 |
|---|---|---|
| `desktop-app-list` | desktop-app-list.vue | App 列表面板：快捷方式管理 + 应用市场入口 + addApp/toggleShortcut |
| `desktop-app-store` | desktop-app-store.vue | App 应用市场：展示注册的 App 元数据列表，confirm → app-list 回写 |
| `desktop-background-list` | desktop-background-list.vue | 背景选择面板：分类筛选 + Embla 卡片轮播 + 选中当前背景 |
| `desktop-background` | desktop-background.vue | 背景渲染层：按 background.name 从 backgroundMetas 解析资源并渲染 |
| `desktop-dialog-login` | desktop-dialog-login.vue | 登录对话框：username/password 输入 → auth-service.login() |
| `desktop-statusbar` | desktop-statusbar.vue | 顶部状态栏：实时时钟 / 编辑模式入口 / 用户名显示 / 登出按钮 |
| `desktop-toolbar-edit` | desktop-toolbar-edit.vue | 编辑工具条：背景/部件/主题/页面增删/字号调整/完成编辑 |
| `desktop-toolbar-main` | desktop-toolbar-main.vue | 主工具条：主页按钮 / App 快捷方式 / 运行中 App 状态管理 |
| `desktop-widget-list` | desktop-widget-list.vue | 部件选择列表：分类树 + GridStack 预览 + preset 变体选择 |

#### 视口组件（components/viewport/）

| 组件名 | 文件 | 职责 |
|---|---|---|
| `desktop-viewport-desktop` | desktop-viewport-desktop.vue | 桌面视口：Swiper 多页容器，每页初始化独立 GridStack 实例，widget 增删改查、序列化/反序列化 |
| `desktop-viewport-app` | desktop-viewport-app.vue | App 叠加渲染层：遍历 desktopApps 数组，为每个实例挂载对应 .app.vue 组件 |
| `desktop-widget-wrapper` | desktop-widget-wrapper.vue | Widget 外壳：编辑模式下显示标题栏含编辑/删除按钮，通过 useGridStack 注册 widget emit 桥接 |
| `desktop-app-wrapper` | desktop-app-wrapper.vue | App 外壳：标题栏含最小化/关闭按钮，通过 appWrapperValues 传递 title/props |

#### 属性编辑组件（components/property/）

| 组件名 | 文件 | 职责 |
|---|---|---|
| `desktop-property-panel` | desktop-property-panel.vue | 属性编辑面板：组件属性 + 外框属性双 Tab，confirm → 视口 updateWidgetProps |
| `desktop-property-form` | desktop-property-form.vue | 动态属性表单：根据 propMeta.type（text/boolean/select/markdown 等）渲染对应编辑器 |

### Composable 清单

| Composable | 文件 | 导出接口 |
|---|---|---|
| `useTheme` | useTheme.js | `{ initTheme, isDark, toggleTheme, setTheme, applyTheme }` |
| `useGridStack` | useGridStack.js | `{ initGrid, destroyGrid, destroyAll, getInstance, getAllInstances, registerWidgetEmitter, unregisterWidgetEmitter, emitToWidget, broadcastToAllWidgets, setActive, isActive }` |
| `useWidgetMetas` | useWidgetMetas.js | `{ widgetMetas }` — Ref\<Record\<string, WidgetMeta\>\> |
| `useAppMetas` | useAppMetas.js | `{ appMetas }` — Ref\<Record\<string, AppMeta\>\> |
| `useBackgroundMetas` | useBackgroundMetas.js | `{ backgroundMetas }` — Ref\<Record\<string, DesktopBackgroundMeta\>\> |

### Widget 注册清单

| compName | 分类 | 默认尺寸 | 描述 |
|---|---|---|---|
| BasicText | 3.基础组件 | 1×1 | 纯文本渲染 |
| BasicNumber | 3.基础组件 | 2×1 | 数值滚动动画（@number-flow/vue） |
| BasicMarkdown | 3.基础组件 | 2×2 | Markdown 内容渲染（vue3-markdown） |
| BasicImage | 3.基础组件 | 2×2 | 图片展示（支持 objectFit 选择） |
| BasicVideo | 3.基础组件 | 3×2 | 视频播放（HTML5 video） |

### App 注册清单

| compName | 分类 | 默认尺寸 | 描述 |
|---|---|---|---|
| BasicClock | 基础应用 | 3×3 | 实时时钟（dayjs 每秒刷新，中文星期） |
| BasicIframe | 基础应用 | 3×3 | iframe 内嵌时钟 |

### 背景注册清单

| 分类 | 数量 | name 范围 | 类型 |
|---|---|---|---|
| 暗色系 | 4 | dark-001 ~ dark-004 | image（SVG） |
| 浅色系 | 4 | light-001 ~ light-004 | image（SVG） |
| 动态视频 | 4 | webm-001 ~ webm-004 | video（WebM） |

## 关键配置文件位置

| 文件 | 路径 | 作用 |
|---|---|---|
| Vite 构建配置 | `vite.config.js` | 单页面入口，`@vitejs/plugin-vue` 插件，`/authcenter` dev proxy |
| 运行时配置 | `public/config.js` | `window.SYSTEM_CONFIGS`：authLoginUrl、rsaPublicKey（部署后可直接修改） |
| 默认桌面配置 | `public/DEFAULT_DESKTOP_JSON.json` | 桌面首次加载的默认布局（fetch + localStorage 合并） |
| 模拟用户数据 | `public/USERS_MOCK.json` | 开发环境降级登录数据源（1用户 admin/admin123） |
| 包清单 | `package.json` | 依赖声明、脚本（dev / build / preview） |

## 功能模块划分

| 模块编号 | 模块名称 | 源码文件 | 描述 |
|---|---|---|---|
| 001 | desktop-framework | `src/pages/Desktop.vue` + `src/composables/useGridStack.js` + `src/components/viewport/desktop-viewport-desktop.vue` + `src/components/viewport/desktop-widget-wrapper.vue` | 桌面核心编排：多页 Swiper + GridStack 网格 + widget 事件桥接 + 配置持久化 |
| 002 | widget-system | `src/widgets/index.js` + `src/composables/useWidgetMetas.js` + `src/components/desktop/desktop-widget-list.vue` | 部件框架：import.meta.glob 自动扫描注册、元数据管理、部件列表选择 |
| 003 | app-system | `src/apps/index.js` + `src/composables/useAppMetas.js` + `src/components/viewport/desktop-viewport-app.vue` + `src/components/viewport/desktop-app-wrapper.vue` | App 应用系统：自动注册、桌面叠加层渲染、最小化/恢复/关闭、快捷方式 |
| 004 | background-system | `src/backgrounds/index.js` + `src/composables/useBackgroundMetas.js` + `src/components/desktop/desktop-background.vue` + `src/components/desktop/desktop-background-list.vue` | 桌面背景系统：12 个背景自动扫描、背景选择面板（Embla 轮播）、背景渲染 |
| 005 | theme-system | `src/composables/useTheme.js` + `src/themes/light/theme.scss` + `src/themes/dark/theme.scss` + `src/style.scss` + `public/config.js` | 主题系统：--desktop-* CSS 变量体系、浅色/深色切换、localStorage 持久化、系统偏好跟随 |
| 011 | auth-mock | `src/api/auth-service.js` + `public/USERS_MOCK.json` + `src/components/desktop/desktop-dialog-login.vue` | 认证模拟：RSA 加密登录、后端不可达降级 mock、会话缓存与恢复 |
| 101 | prop-editor | `src/components/property/desktop-property-panel.vue` + `src/components/property/desktop-property-form.vue` | 属性编辑器：动态表单渲染（text/boolean/select/markdown）、组件属性 + 外框属性编辑 |
| 201 | page-index | `index.html` + `src/desktop.js` + `src/pages/Desktop.vue` + `src/components/desktop/desktop-statusbar.vue` + `src/components/desktop/desktop-toolbar-main.vue` + `src/components/desktop/desktop-toolbar-edit.vue` | 桌面入口页：应用初始化、登录认证编排、模式切换、面板显隐协调 |
| 301 | widget-basic-widgets | `src/widgets/basic/`（5组件） | 基础展示部件：BasicText / BasicNumber / BasicMarkdown / BasicImage / BasicVideo |
| 401 | app-basic-apps | `src/apps/basic/`（2组件） | 基础应用：BasicClock / BasicIframe |
