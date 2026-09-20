# 工作台 — 系统级技术方案 (Overall Technical Plan)

> 项目: tpl-desktop（工作台）
> 文档类型: As-Built（基于源代码逆向整理）
> 最后更新: 2026-07-19

## 1. 技术上下文

### 1.1 运行环境

| 项目 | 详情 |
|------|------|
| 运行环境 | 浏览器（客户端 JavaScript） |
| 入口文件 | `index.html` → `<script type="module" src="/src/desktop.js">` |
| 模块系统 | ES Module (`"type": "module"`) |
| 包管理器 | pnpm（`pnpm-workspace.yaml` + `pnpm-lock.yaml`） |
| 构建工具 | Vite 8.x（`vite build` / `vite` dev server + HMR） |
| 部署形态 | 纯静态文件，`dist/` 输出 |

### 1.2 关键依赖

| 分类 | 依赖 | 版本 | 用途 |
|------|------|------|------|
| 核心框架 | Vue 3 | ^3.5.39 | Composition API + `<script setup>` |
| UI 组件库 | Element Plus | ^2.11.7 | el-dialog / el-tree / el-button / el-switch / el-input / el-drawer / el-tabs |
| 网格布局 | gridstack | ^11.5.1 | Widget 拖拽网格布局引擎 |
| 轮播 | swiper | ^14.0.1 | 桌面多页面 Swiper + SwiperSlide + Pagination 模块 |
| 卡片轮播 | embla-carousel-vue | ^8.6.0 | 背景选择面板卡片轮播 |
| Markdown | vue3-markdown | ^1.2.17 | VMarkdownView 渲染 + VMarkdownEditor 编辑器 |
| 数值动画 | @number-flow/vue | ^0.4.8 | NumberFlow 数字滚动组件 |
| 日期处理 | dayjs | ^1.11.19 | 时钟时间格式化 |
| RSA 加密 | jsencrypt | ^3.5.4 | 登录密码 RSA 公钥加密 |
| 深拷贝 | lodash | ^4.17.21 | cloneDeep（仅用于属性编辑面板撤销/重置） |
| Vue 编译 | @vitejs/plugin-vue | ^6.0.8 | devDependency |
| SCSS 编译 | sass | ^1.101.0 | devDependency |

### 1.3 已声明但未使用的依赖

以下依赖在 `package.json` 中声明但在 `src/` 目录下无任何 import：

| 包名 | 版本 |
|------|------|
| pinia | ^4.0.2 |
| mitt | ^3.0.1 |
| three | ^0.183.2 |
| jsonpath-plus | ^10.3.0 |
| element-resize-detector | ^1.2.4 |
| @imengyu/vue3-context-menu | ^1.5.2 |

---

## 2. 宪法合规检查

以下逐条对照 `constitution.md` 中的实际条款编号，检查当前代码库的合规状态。

### 2.1 架构原则（第一章）

| 条款 | 原则 | 状态 | 证据 |
|------|------|------|------|
| 第1条 | 元数据驱动的组件扩展 | ✅ 合规 | `src/widgets/index.js:24-25`, `src/apps/index.js:24-25`, `src/backgrounds/index.js:18`, `src/components/index.js:11` — 全部使用 `import.meta.glob(..., { eager: true })` 构建时自动扫描 |
| 第2条 | 看板组件宿主与内容分离 | ✅ 合规 | `desktop-widget-wrapper.vue` 提供外壳，`desktop-viewport-desktop.vue:186-196` 通过 `h(Comp, compProps)` + slot 注入内容 |
| 第3条 | 模块级单例共享状态 | ✅ 合规 | 5 个 composable 均使用模块级 `ref()` / `Map` 共享（`useGridStack.js:24-28`, `useTheme.js:20,73-77`, `useWidgetMetas.js:11`, `useAppMetas.js:11`, `useBackgroundMetas.js:12`） |
| 第4条 | VNode 渲染与 GridStack 共存 | ✅ 合规 | `desktop-viewport-desktop.vue:142-203` 中 `rerenderNode()` 使用 `h()+render()` 模式，GridStack 模板中仅空 `div.grid-stack` |
| 第5条 | 纯 Props/Emits 单向数据流 | ✅ 合规 | 所有组件通信通过 props 下行 + emits 上行；GridStack→Widget 桥接通过 `useGridStack` 内部 `widgetEmitters Map`，非 mitt |
| 第6条 | 页面编排器中心化状态 | ✅ 合规 | `Desktop.vue:38-64` 持有所有顶层 `ref()` 状态，子组件通过 props 接收 |

### 2.2 编码规范（第二章）

| 条款 | 原则 | 状态 | 证据 |
|------|------|------|------|
| 第7条 | Composition API 唯一风格 | ✅ 合规 | 所有 `.vue` 文件 `<script setup>` |
| 第8条 | 命名约定 | ✅ 合规 | UI 组件 `desktop-*.vue`, Widget `*.widget.vue/.widget.js`, App `*.app.vue/.app.js`, Background `*.bg.js` |
| 第9条 | SCSS 主题 CSS 变量体系 | ✅ 合规 | 浅色 `:root{}`, 深色 `html.dark{}`, `--desktop-*` 命名空间, `useTheme.js:41-45` 通过 `classList.toggle('dark')` 切换 |
| 第10条 | CSS 作用域隔离 | ✅ 合规 | 所有 `.vue` `<style scoped lang="scss">` |
| 第11条 | 元数据默认值回退 | ✅ 合规 | 三个 Registry 均有完整的默认值回退和 `console.warn` 降级处理 |
| 第12条 | 错误处理策略 | ✅ 合规 | fetch 失败 → 回退配置；localStorage 不可用 → try/catch 静默降级；GridStack 失败 → `console.error` + `null` 返回；JSON 解析失败 → 静默回退 |

### 2.3 边界与约束（第三章）

| 条款 | 原则 | 状态 | 证据 |
|------|------|------|------|
| 第13条 | Widget 组件不得接触桌面状态 | ✅ 合规 | `src/widgets/` 下 `.vue` 文件中无 `GridStack`、`localStorage`、`desktopConfig`、`useGridStack` 引用 |
| 第14条 | 只读元数据消费 | ✅ 合规 | 元数据对象由 Registry 构建时一次性生成，运行时仅读取 |
| 第15条 | 持久化的数据安全边界 | ✅ 合规 | `auth-service.js:48-55` `toLoginUser` 仅提取 `userId/userName/name`；`Desktop.vue:272-277` background 仅存 `{type,name,title,category}` |

### 2.4 依赖管理（第四章）

| 条款 | 原则 | 状态 | 证据 |
|------|------|------|------|
| 第16条 | 依赖的引入与使用 | ⚠️ 部分合规 | `mitt`、`pinia`、`three` 等 6 个包已安装但未使用，属于冗余依赖 |

### 2.5 观察到的不一致（第五章）

所有 5 条「观察到的不一致」在代码库中仍然存在，详见 `constitution.md` 第五章。

---

## 3. 实现策略总览

### 3.1 分层架构

```
入口层 (index.html)
  → 运行时配置注入 (window.SYSTEM_CONFIGS)
  → 反闪烁脚本 (html.dark 预置)
  → Vue 应用挂载 (createApp → mount)

页面编排层 (pages/Desktop.vue)
  → 配置加载与合并（fetch + localStorage）
  → 登录认证编排（RSA 加密 → 后端 → 降级 mock）
  → 桌面模式管理（normal / editing）
  → App 生命周期与 Widget 事件协调
  → 面板显隐与工具条事件分发

Composable 层 (模块级单例)
  → useGridStack: 多实例管理 + Widget 事件桥接
  → useTheme: 主题切换与持久化
  → useWidgetMetas / useAppMetas / useBackgroundMetas: 元数据响应式封装

视口层 (Viewport)
  → Swiper 多页容器 → 每页独立 GridStack 实例
  → Widget 通过 h()+render() 在 GridStack 容器中挂载
  → App 通过 <component :is=""> 在叠加层中渲染

注册表层 (Registry)
  → Vite import.meta.glob eager 构建时自动扫描
  → Widget / App / Background / UI 组件四套注册体系
```

### 3.2 自动注册机制

所有可扩展实体通过 Vite `import.meta.glob` 在**构建时**自动发现，无需运行时扫描：

- **UI 组件**: `src/components/**/desktop-*.vue` → `UIComponents` dict → `app.component()` 全局注册
- **Widget**: `src/widgets/**/*.widget.vue + *.widget.js` → `WidgetComponents` + `WidgetMetas`
- **App**: `src/apps/**/*.app.vue + *.app.js` → `AppComponents` + `AppMetas`
- **Background**: `src/backgrounds/**/*.bg.js` → `BackgroundMetas`

组件名从文件路径自动提取（如 `./basic/BasicText.widget.vue` → `BasicText`），元数据文件中**不应**手写 `compName` 或 `name` 字段。

### 3.3 状态管理策略

不使用任何集中式状态管理库。状态分为三层：

1. **页面编排器状态** (`Desktop.vue`): `desktopMode`, `currentPageIndex`, `desktopConfig`, `desktopApps`, 各面板可见性 — 通过 props/emits 与子组件交互
2. **Composable 模块级状态**: `useGridStack`（grids/activeStates/widgetEmitters Maps）、`useTheme`（isDark ref）、元数据 composable（widgetMetas/appMetas/backgroundMetas refs）
3. **组件内部状态**: Vue `ref()` / `reactive()` 局部变量

### 3.4 VNode 渲染模式

看板组件在 GridStack DOM 容器内的挂载使用 `h() + render()` 模式，原因：

- GridStack 动态管理 DOM 节点（添加/移动/删除），Vue 模板无法感知这些变更
- `rerenderNode()` 是看板组件挂载的**唯一入口**，流程为：卸载旧 VNode → 构建 WidgetWrapper VNode（含 slot 注入内容组件）→ 渲染新 VNode → 注册 Widget emit 桥接

### 3.5 持久化策略

| localStorage Key | 写入方 | 读取方 | 内容 |
|---|---|---|---|
| `dashboard-desktop-data` | `Desktop.vue persistConfig()` | `Desktop.vue loadDesktopConfig()` | 完整桌面配置 JSON |
| `dashboard-theme` | `useTheme.js storeTheme()` | `useTheme.js readStoredTheme()` + `index.html` 反闪烁脚本 | `'dark'` / `'light'` |
| `dashboard-login-user` | `auth-service.js cacheLoginUser()` | `auth-service.js restoreSession()` | `{userId, userName, name}` |

所有 localStorage 操作均以 `try/catch` 包裹防御。

---

## 4. 横切关注点

### 4.1 错误处理与降级策略

| 场景 | 策略 | 实现位置 |
|------|------|----------|
| 默认配置 fetch 失败 | 回退到硬编码 `FALLBACK_CONFIG` | `Desktop.vue:29-36,75-78` |
| localStorage 不可用 | try/catch 静默降级，不阻断应用 | `Desktop.vue:102-106`, `useTheme.js:31-37`, `auth-service.js:58-64,122-127` |
| JSON 解析失败（localStorage） | 回退到原始值或 `null` | `Desktop.vue:81-87`, `auth-service.js:132-138` |
| GridStack 初始化失败 | `console.error` + 返回 `null`，不抛出异常 | `useGridStack.js:102-116` |
| 后端认证不可达 | 降级到 `USERS_MOCK.json` 本地明文校验 | `auth-service.js:109-116` |
| 元数据 default 导出非法 | `console.warn` + 降级到默认值/空对象 | `widgets/index.js:52-55`, `apps/index.js:52-55` |
| Widget 组件文件缺失 | 渲染「组件未找到」占位文本 | `desktop-viewport-desktop.vue:187-192` |
| RSA 公钥缺失或加密失败 | 抛出异常，阻止登录（不以明文回退传输） | `auth-service.js:34-43` |

### 4.2 性能优化点

| 优化项 | 策略 | 实现位置 |
|--------|------|----------|
| 页面切换 | setActive 仅更新活动索引 + 广播，不重建 GridStack 实例 | `useGridStack.js:155-165` |
| App 事件防抖 | `desktopApps.length` watch 带 300ms debounce | `Desktop.vue:400-413` |
| Widget 非活动状态 | 通过 `grid-active` / `grid-deactive` 事件广播，Widget 自行暂停动画/定时器 | `useGridStack.js:155-164` |
| 元数据构建时扫描 | `import.meta.glob` eager 构建时完成，无运行时开销 | 各 Registry 文件 |
| VNode 重用 | `rerenderNode` 先卸载旧 VNode 再创建新的，避免内存泄漏 | `desktop-viewport-desktop.vue:149` |
| 属性编辑不触发全局重渲染 | `updateWidgetProps` 仅重渲染单个节点 | `desktop-viewport-desktop.vue:331-344` |
| HMR 清理 | `import.meta.hot.dispose` 销毁所有 GridStack 实例 | `useGridStack.js:173-175` |

### 4.3 安全边界

- 密码 MUST 经 RSA 公钥加密后传输，公钥不可达时拒绝登录，不以明文回退
- localStorage 不存储密码或认证令牌，仅存 `{userId, userName, name}`
- 桌面配置不包含文件系统路径或敏感信息
- 运行时配置通过 `window.SYSTEM_CONFIGS` 外部注入，部署后可修改无需重新构建

---

## 5. 测试策略

### 5.1 当前状态

项目**当前不包含任何自动化测试**。无 Jest、Vitest、Cypress、Playwright 等测试框架的配置或测试文件。

### 5.2 建议测试分层

| 层级 | 建议工具 | 覆盖范围 |
|------|----------|----------|
| 单元测试 | Vitest | composable 纯逻辑函数（useTheme、useGridStack 事件桥接）、auth-service 登录流程 |
| 组件测试 | Vitest + @vue/test-utils | Widget 组件渲染、属性编辑器类型映射、WidgetWrapper / AppWrapper 外壳交互 |
| 集成测试 | Vitest + jsdom | 视口 GridStack 初始化/销毁、desktopConfig 加载合并、persistConfig 序列化 |
| E2E 测试 | Playwright / Cypress | 完整登录流程、拖拽添加 Widget、编辑/浏览模式切换、主题切换、App 打开/关闭 |

---

## 6. 部署形态

### 6.1 构建

```bash
pnpm run build    # vite build → dist/
pnpm run preview  # vite preview（预览构建产物）
```

构建产物为纯静态文件（`dist/`），可部署到任何静态文件服务器（Nginx、CDN、对象存储等）。

### 6.2 运行时配置

部署后可直接编辑 `dist/config.js`（或 `public/config.js` 映射到相同路径），修改以下字段无需重新构建：

- `authLoginUrl`: 认证中心登录接口地址
- `rsaPublicKey`: RSA 公钥

### 6.3 回退机制

应用在无后端环境下可完全运行：

- 认证：RSA 加密尝试后端 → 失败 → 降级 `USERS_MOCK.json` 本地校验
- 配置：fetch `DEFAULT_DESKTOP_JSON.json` → 失败 → 硬编码 `FALLBACK_CONFIG`
- 持久化：localStorage → 不可用 → 静默降级（仅本次会话生效）

---

## 7. 版本历史

| 日期 | 变更 |
|------|------|
| 2026-07-19 | 初始 As-Built 版本 |
