# 005-theme-system 技术方案（As-Built）

> 本文档是基于源代码逆向整理的回顾性技术方案，记录主题系统的实际架构、设计决策和实现策略。
> 模块: 005-theme-system
> 对应规格: specs/005-theme-system/spec.md
> 最后更新: 2026-07-20

## 1. 技术上下文

### 1.1 运行时环境

| 项目 | 详情 |
|---|---|
| 框架 | Vue 3 (Composition API + `<script setup>`) |
| 构建工具 | Vite 7 |
| 样式预处理器 | Sass (SCSS) via `sass ^1.93.3` |
| UI 组件库 | Element Plus `^2.11.7` |
| 运行平台 | 浏览器（纯前端，无 SSR） |

### 1.2 直接依赖

| 依赖 | 用途 |
|---|---|
| `vue` (^3.5.22) | `ref()` 响应式状态 |
| `sass` (^1.93.3) | SCSS 编译 |
| `element-plus/theme-chalk/dark/css-vars.css` | Element Plus 暗色变量覆盖 |

> 主题系统不增加新的 npm 依赖。

## 2. 宪法合规检查

基于 `specs/constitution.md` 的逐条检查：

| 条款 | 原则 | 合规状态 | 证据 |
|---|---|---|---|
| 第3条 | 模块级单例共享状态 | ✅ 合规 | `useTheme.js:20` — `isDark` 为模块级 `ref()`，所有调用方共享同一实例；`matchMedia` 监听在模块级注册一次（第73-77行） |
| 第5条 | 纯 Props/Emits 单向数据流 | ✅ 合规 | `Desktop.vue:63` 解构 `{ isDark, toggleTheme, setTheme }`，通过 emits 向上传递主题切换事件 |
| 第7条 | Composition API 唯一风格 | ✅ 合规 | `useTheme.js` 使用 `export function useTheme()` 导出，返回解构对象 |
| 第8条 | 命名约定 | ✅ 合规 | composable 命名为 `useTheme.js`（camelCase）；CSS 变量使用 `--desktop-*` 前缀 |
| 第9条 | SCSS 主题 CSS 变量体系 | ✅ 合规 | 浅色定义于 `:root {}`、深色定义于 `html.dark {}`，统一在 `src/style/theme-var.scss`（单文件双块），由 `src/style.scss` 通过 `@use` 引入，切换通过 `classList.toggle('dark')` |
| 第10条 | CSS 作用域隔离 | ✅ 合规 | 主题变量定义在 `src/themes/` 和 `src/style.scss` 中（全局样式），`<style scoped>` 内的组件通过 `var(--desktop-*)` 引用 |
| 第12条 | 错误处理策略 | ✅ 合规 | localStorage 读写使用 try/catch 包裹（`useTheme.js:23-28, 32-38`），存储不可用时静默降级 |

## 3. 关键决策

### 3.1 为什么用 `html.dark` 类名而非 data 属性

**决策**: 在 `<html>` 根元素上添加/移除 `dark` CSS 类名。

**理由**:
- Element Plus 内置暗色模式（`element-plus/theme-chalk/dark/css-vars.css`）使用 `html.dark` 选择器，使用同一类名可零配置共享开关（`desktop.js:5`）
- CSS 变量覆盖只需 `html.dark { --desktop-xxx: ... }` 一条选择器规则，无需多层嵌套
- `classList.toggle()` 性能优于属性读写

### 3.2 SCSS 组织：单文件双块

**决策**: 浅色和深色主题变量统一定义在 `src/style/theme-var.scss` 中，`:root` 块存放浅色值，`html.dark` 块存放深色值。

**理由**:
- 单文件维护，变量增删改查只需编辑一处，避免两份文件不一致
- 浅色定义在 `:root` 级别作为降级基准，深色通过 `html.dark` 级联覆盖
- `src/style.scss` 通过 `@use './style/theme-var.scss'` 统一引入
- 完整变量清单文档化于 `docs/theme-var.md`，作为开发者参考

> **重要约束**: CSS 变量的任何变更（新增/修改/删除）必须同时更新 `src/style/theme-var.scss` 和 `docs/theme-var.md` 两个文件。详见 spec.md §7 约束 4。

### 3.3 CSS 变量注入机制

**决策**: `src/style.scss` 使用 `@use` 引入两个主题文件（`style.scss:3-4`），Vite 在构建时将 SCSS 编译为 CSS 并内联到最终样式表中。

**机制**: SCSS 文件不导出任何 mixin/function，仅定义 CSS 自定义属性。`@use` 语句确保编译顺序：先 `:root` 浅色基准，后 `html.dark` 深色覆盖。

### 3.4 为什么 `applyTheme` 和 `setTheme` 分离

**决策**: `useTheme.js` 提供两个不同粒度的主题应用函数。

- `applyTheme(theme)`: 仅操作 `html.dark` 类名 + 更新 `isDark` ref，不写 localStorage（`useTheme.js:41-45`）。**实现 FR-005-005/006**。
- `setTheme(theme)`: 调用 `applyTheme` + 写入 localStorage（`useTheme.js:48-52`）。**实现 FR-005-011**。

**理由**: 反闪烁脚本已在 `index.html` 中根据 localStorage 设置了类名，`initTheme()` 只需确保 `html.dark` 与存储一致就调用 `applyTheme`；用户手动切换时才需要 `setTheme`（持久化）。分离避免重复写 localStorage。

### 3.5 初始化优先级实现

**决策**: `initTheme()` 中先检查 localStorage，无值时才检查 `prefers-color-scheme`（`useTheme.js:61-69`）。**实现 FR-005-013**。

**理由**: 反闪烁脚本（`index.html:17-18`）使用相同优先级逻辑——先 localStorage，后系统偏好，最后默认深色——保证 Vue 挂载前后的状态一致（**实现 FR-005-020**）。

### 3.6 系统主题跟随实现

**决策**: 模块级注册 `matchMedia('(prefers-color-scheme: dark)').change` 监听器（`useTheme.js:73-77`）。

**关键**: 监听器放在模块顶层执行**一次**，不在 `useTheme()` 函数内部。这避免了多处调用时注册多个监听器。监听器回调先检查 `readStoredTheme()` ——如果 localStorage 有值（用户手动设置过），则不自动跟随。**实现 FR-005-014**。

## 4. 数据模型

### 4.1 主题状态

```
Theme = 'dark' | 'light'
```

### 4.2 响应式状态

| 变量 | 类型 | 来源 | 说明 |
|---|---|---|---|
| `isDark` | `Ref<boolean>` | `useTheme.js:20` — `document.documentElement.classList.contains('dark')` | 模块级单例，初始值与反闪烁脚本已设置的 `html.dark` 同步 |

### 4.3 持久化

| 键 | 存储位置 | 值 | 读写函数 |
|---|---|---|---|
| `dashboard-theme` | `localStorage` | `'dark'` / `'light'` | `readStoredTheme()` / `storeTheme(theme)` |

**防御策略**: 读写均用 try/catch 包裹。读取失败返回 `null`（等同于未设置），写入失败静默忽略。

### 4.4 桌面配置镜像

`desktopConfig.theme` 在 `Desktop.vue` 中作为主题的持久化镜像，与 `dashboard-theme` localStorage 键保持同步：
- `handleToggleTheme()`: `toggleTheme()` → 同步 `desktopConfig.theme` → `persistConfig()`（保存到 `dashboard-desktop-data`）
- `onMounted()`: 加载桌面配置后调用 `setTheme(desktopConfig.value.theme)`
- `onSelectBackground()`: 背景带 `meta.theme` 时调用 `setTheme(meta.theme)` 并同步

## 5. 接口契约

### 5.1 useTheme 导出签名

```javascript
// src/composables/useTheme.js
export function useTheme()
```

返回值:

| 成员 | 类型 | 说明 |
|---|---|---|
| `initTheme` | `() => void` | 初始化主题：localStorage > 系统偏好 > 默认深色。应用 `html.dark` 但不写入 localStorage（因为反闪烁脚本已保证类名与存储一致） |
| `isDark` | `Ref<boolean>` | 当前是否为深色模式（响应式，模块级单例） |
| `toggleTheme` | `() => void` | 切换浅色/深色主题（调用 `setTheme`） |
| `setTheme` | `(theme: string) => void` | 设置指定主题并持久化。非 `'dark'` 入参均归一化为 `'light'` |
| `applyTheme` | `(theme: string) => void` | 仅应用主题到 `html.dark`（不持久化）。供 `initTheme` 和系统偏好监听器使用 |

### 5.2 调用点

| 调用方 | 文件 | 行号 | 使用方式 |
|---|---|---|---|
| 应用入口 | `src/desktop.js:14-15` | 调用 `initTheme()` 初始化 |
| 桌面编排器 | `src/pages/Desktop.vue:63` | 解构 `{ isDark, toggleTheme, setTheme }` |
| 主题切换按钮 | `Desktop.vue:141-146` | `handleToggleTheme()` → `toggleTheme()` |
| 配置加载 | `Desktop.vue:420` | `setTheme(desktopConfig.value.theme)` |
| 背景选择 | `Desktop.vue:280` | `setTheme(meta.theme)` |

### 5.3 模块向外发送的事件

无。`useTheme` 不 emit 任何事件。所有接口通过返回值暴露。

## 6. 实现策略

### 6.1 切换传播机制

```
用户点击 🎨 按钮
  → desktop-toolbar-edit.vue:64 emit('toggleTheme')
    → Desktop.vue:141 handleToggleTheme()
      → useTheme.toggleTheme()
        → setTheme('dark'|'light')
          → applyTheme(theme)
            → document.documentElement.classList.toggle('dark', ...)  ← 切换 html.dark
          → storeTheme(theme)                                         ← 持久化
      → desktopConfig.value.theme = 'dark'|'light'                    ← 镜像同步
      → persistConfig()                                               ← 整体配置持久化

CSS 引擎自动重算：
  html.dark { --desktop-xxx: ... } 覆盖 :root { --desktop-xxx: ... }
  → 所有引用 var(--desktop-*) 的元素同步变色（浏览器原生，0ms 计算）
  → Element Plus dark/css-vars.css 同步覆盖 --el-* 变量
  → body transition: 0.3s 产生平滑过渡
```

### 6.2 Element Plus 集成

`el-plus/theme-chalk/dark/css-vars.css` 使用 `html.dark` 选择器定义暗色版本的 `--el-*` CSS 变量。由于主题系统同样使用 `html.dark` 类名，Element Plus 组件的暗色模式与自定义主题**零耦合自动同步**（`desktop.js:4-5`）。

不需要传递 `dark` prop 给每个 Element Plus 组件，也不需要调用 `ElConfigProvider`。

### 6.3 反闪烁实现

`index.html:8-21` 中的内联 `<script>` 为**阻塞式同步脚本**（无 `defer`/`async`），位于 `<head>` 尾部、`<body>` 之前。浏览器在解析到该脚本时暂停 DOM 构建，执行主题判断后立即修改 `<html>` 的 class。

**时序**:
```
HTML 解析 → 执行反闪烁脚本（添加/不添加 dark 类）→ 加载 <body> →
加载 /config.js → 加载 src/desktop.js (type="module", defer) →
Vue 应用初始化 → initTheme() → mount Desktop.vue
```

反闪烁脚本与 `initTheme()` 使用相同优先级逻辑，确保挂载前后状态一致。

### 6.4 过渡动画

`src/style.scss:17` 在 `body` 元素上设置：
```css
transition: background-color 0.3s, color 0.3s, border-color 0.3s;
```

这使 `body` 及其继承 `color` 的子元素在主题切换时有 0.3s 的渐变过渡。注意这只作用在 `body` 上，孙元素的 `background-color` 变更不受此过渡影响（除非显式设置 `transition: inherit`）。

### 6.5 错误处理

| 场景 | 处理方式 | 代码位置 |
|---|---|---|
| localStorage 不可用（隐私模式） | try/catch 包裹，`readStoredTheme()` 返回 `null`，`storeTheme()` 静默忽略 | `useTheme.js:23-28, 32-38` |
| localStorage 有异常值 | `setTheme()` 将非 `'dark'` 入参归一化为 `'light'`（白名单策略） | `useTheme.js:49` |
| 多个 useTheme 调用点 | 模块级 `isDark` ref 单例 + 模块级 matchMedia 监听注册一次 | `useTheme.js:20, 73-77` |

## 7. 测试考量

### 7.1 可测试场景

| 场景 | 测试方法 |
|---|---|
| 主题切换 | 单元测试：调用 `toggleTheme()` 后检查 `isDark.value` 和 `document.documentElement.classList.contains('dark')` |
| 持久化 | 单元测试：调用 `setTheme('dark')` 后检查 `localStorage.getItem('dashboard-theme')` |
| 初始化优先级 | 单元测试：预设 localStorage 值 / 清除 localStorage 后调用 `initTheme()` |
| 系统偏好跟随 | 集成测试：mock `window.matchMedia` 后触发 change 事件 |
| 反闪烁 | E2E：检查页面加载瞬间的 `<html>` class 状态 |
| 过渡效果 | 视觉回归测试：截图对比切换前后的视觉效果 |

### 7.2 边界情况

| 场景 | 预期行为 |
|---|---|
| localStorage 不可用 | `readStoredTheme()` 返回 `null`，退回到系统偏好/默认深色 |
| 异常 theme 值存入 localStorage | `initTheme()` 中 `stored !== THEME_DARK && stored !== THEME_LIGHT` 不匹配，走系统偏好降级 |
| 快速连续切换主题 | debounce 不必要（纯 CSS 变量切换，无副作用） |
| `html` 元素被其他脚本修改了 class | `isDark` 初始值从 `classList.contains('dark')` 读取，与 DOM 同步 |

## 8. 文件清单

| 文件 | 用途 | 行数 |
|---|---|---|
| `src/composables/useTheme.js` | 主题状态管理 composable（状态+持久化+初始化+系统监听） | 81 |
| `src/style/theme-var.scss` | CSS 变量定义（`:root` 浅色 + `html.dark` 深色，单文件双块） | 147 |
| `docs/theme-var.md` | 变量参考文档（完整变量表、命名规范、使用指南） | — |
| `src/style.scss` | 全局样式入口：`@use './style/theme-var.scss'` + body 过渡 | 18 |
| `src/desktop.js` | 应用入口：`initTheme()` + 引入 Element Plus dark CSS | 37 |
| `index.html` | 反闪烁内联脚本（第8-21行） | 29 |
| `src/pages/Desktop.vue` | 调用 `useTheme()` 并在工具栏分发主题切换 | 604 |

**总计**: 7 个文件（不含 Desktop.vue 主要代码），主题核心代码约 230 行。
