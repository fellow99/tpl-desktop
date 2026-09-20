# 主题系统 — 功能规格

> 模块: 005-theme-system
> 状态: 已实现
> 最后更新: 2026-07-19

## 1. 模块概述

### 1.1 目的 — 为什么需要这个模块

为主题系统提供基于 CSS 自定义属性的浅色/深色双主题切换能力。所有颜色通过统一的 `--desktop-*` 变量体系引用，由单一的 `html.dark` CSS 类开关驱动全界面同步切换，无需刷新页面。

### 1.2 要解决的问题 — 它解决了什么痛点

- 用户在强光和暗光环境下切换使用时需要不同的视觉风格
- 逐个组件适配暗色模式工作量巨大、容易遗漏
- 主题偏好需要在会话间保持，避免每次打开页面都重复设置
- 首次加载时需要避免未应用主题时的闪烁（FOUC — Flash of Unstyled Content）

### 1.3 范围 — 包含什么，不包含什么

**包含**:
- 浅色（灰白）和深色（深灰黑）两组 CSS 变量定义
- 通过 `html.dark` 类名切换主题的机制
- 主题偏好持久化到 localStorage
- 反闪烁（Anti-FOUC）内联脚本
- Element Plus 组件库暗色模式集成
- 系统偏好（`prefers-color-scheme`）自动跟随
- 主题切换过渡动画

**不包含**:
- 超过两种主题（如蓝色主题、高对比度主题）
- 用户自定义主题色
- 字体缩放功能（该功能属于页面编排器 `Desktop.vue`，通过内联 `font-size` 样式实现，非 CSS 变量体系）
- Widget 内部业务内容的颜色（如 Markdown 渲染样式、Number 组件字体颜色 — 这些由各 Widget 自行负责）
- ECharts 图表主题同步（当前代码库中未实现）

## 2. 用户故事

| ID | 故事 | 优先级 |
|---|---|---|
| US-001 | 作为用户，我可以在编辑模式下点击工具栏的"主题"按钮，实时切换浅色/深色主题，以便适应不同光线环境。 | P1 |
| US-002 | 作为用户，我切换主题后所有界面元素（工具栏、状态栏、Widget 外框、网格背景、对话框、下拉菜单）都同步切换为对应配色，以便获得一致的视觉体验。 | P1 |
| US-003 | 作为用户，我的主题偏好（浅色/深色）会被记住，下次打开页面时自动恢复上次的选择，以便无需重复操作。 | P1 |
| US-004 | 作为首次访问的用户，系统应根据我的操作系统偏好自动选择浅色或深色主题，以便获得符合预期的初始体验。 | P2 |
| US-005 | 作为用户，主题切换应平滑过渡（背景色与文字色有渐变过渡），以便切换过程不显得突兀。 | P2 |

## 3. 功能需求

### 3.1 CSS 变量体系

- **FR-005-001**: 系统 MUST 定义一套统一的 CSS 自定义属性（变量），覆盖背景色、文字色、边框色、阴影等核心视觉属性，使用 `--desktop-*` 命名前缀以与 Element Plus 的 `--el-*` 明确区分。
- **FR-005-002**: 浅色主题变量 MUST 定义在 `:root` 选择器级别，作为默认/降级基准。
- **FR-005-003**: 深色主题变量 MUST 定义在 `html.dark` 选择器级别，通过 CSS 层叠机制覆盖 `:root` 的浅色定义。
- **FR-005-004**: CSS 变量 MUST 覆盖以下三类场景：
  - 全局背景与文字（页面主体、卡片面板、弹出层、文字层级、边框、阴影）
  - 编辑器界面（顶部工具栏背景、GridStack 网格容器背景、网格项内容背景）
  - Widget 外框（头部背景和文字、内容区背景）

### 3.2 主题切换机制

- **FR-005-005**: 主题切换 MUST 通过向 `<html>` 根元素添加/移除 `dark` CSS 类名实现（`html.dark` 选择器），无需页面刷新。
- **FR-005-006**: 系统 MUST 在 `<html>` 根元素上设置 `color-scheme: light` 或 `color-scheme: dark`，通知浏览器原生控件（如滚动条、表单控件）适配对应配色方案。
- **FR-005-007**: Element Plus 组件库的暗色模式 MUST 通过 `html.dark` 同一开关激活，利用其内置的 `element-plus/theme-chalk/dark/css-vars.css` 覆盖 `--el-*` 变量，确保 Element Plus 弹出层、对话框、下拉菜单等组件与自定义主题视觉一致。
- **FR-005-008**: 主题切换 MUST 有平滑过渡效果：`body` 元素的 `background-color`、`color`、`border-color` 变化使用 `0.3s` 过渡动画。

### 3.3 主题状态管理与持久化

- **FR-005-009**: 主题状态 MUST 通过模块级单例 composable `useTheme` 管理，遵循项目第 3 条宪法原则（模块级共享状态）。
- **FR-005-010**: `useTheme` MUST 导出以下接口：`initTheme()`（初始化）、`isDark`（响应式布尔值）、`toggleTheme()`（切换）、`setTheme(theme)`（设置并持久化）、`applyTheme(theme)`（仅应用不持久化）。
- **FR-005-011**: 主题偏好 MUST 持久化到 `localStorage`，键名为 `dashboard-theme`，值为 `'dark'` 或 `'light'`。
- **FR-005-012**: `localStorage` 读写 MUST 使用 try/catch 防御性包裹，存储不可用时静默降级（仅当次会话生效），不抛出异常。
- **FR-005-013**: 系统 MUST 在首次加载时按以下优先级决定默认主题：localStorage 存储值 > 系统偏好（`prefers-color-scheme`）> 默认深色。
- **FR-005-014**: 系统 MUST 监听操作系统主题变化（`matchMedia('prefers-color-scheme: dark').change`），在用户**未手动设置过主题**（localStorage 无值）时自动跟随。监听在模块级注册一次，避免多处调用时重复挂载。

### 3.4 反闪烁（Anti-FOUC）

- **FR-005-015**: 页面 MUST 在 Vue 应用挂载前通过 `index.html` 中的内联 `<script>` 读取 localStorage 并应用已保存的主题类名，防止加载瞬间出现未应用主题时的白色或深色闪烁。

### 3.5 主题切换入口

- **FR-005-016**: 主题切换按钮 MUST 放置在编辑工具条（`desktop-toolbar-edit`）中，仅在编辑模式（`desktopMode === 'editing'`）下可见。
- **FR-005-017**: 切换主题时 MUST 同步更新 `desktopConfig.theme` 字段（`'dark'` / `'light'`）并触发配置持久化，确保主题偏好纳入整体桌面配置。
- **FR-005-018**: 选择桌面背景时，如果背景元数据包含 `theme` 字段，系统 SHOULD 自动切换至对应主题（如选择深色背景自动切深色主题）。

### 3.6 与桌面配置的协调

- **FR-005-019**: 桌面配置加载完成后，系统 MUST 调用 `setTheme(desktopConfig.theme)` 覆盖反闪烁脚本可能已应用的主题，确保 `desktopConfig` 中的配置为单一数据源。
- **FR-005-020**: 反闪烁脚本与 `useTheme.initTheme()` 均可能设置 `html.dark`，两者使用相同的 localStorage 键和优先级策略，确保行为一致。

## 4. 关键实体

### 4.1 主题（Theme）

| 属性 | 类型 | 说明 |
|---|---|---|
| 标识 | `'light'` / `'dark'` | 浅色或深色主题 |
| 持久化键 | `'dashboard-theme'` | localStorage 键名 |
| CSS 类名 | `'dark'` | 应用于 `<html>` 元素的类名（仅深色主题时添加） |
| color-scheme | `'light'` / `'dark'` | CSS `color-scheme` 属性值 |

### 4.2 CSS 变量集

完整的 CSS 变量定义（含浅色/深色双套值、命名规范、使用指南）见 **[docs/theme-var.md](../../docs/theme-var.md)**。

> 简要分类：全局背景与文字、边框、阴影、强调色、编辑器界面、Widget 外框、工具栏、卡片、交互状态、毛玻璃效果 — 共 10 类约 35 个变量，统一使用 `--desktop-*` 前缀。
>
> 注：字体缩放（font-size 调整）不是主题系统的组成部分。字体缩放通过 `Desktop.vue` 中的 `desktopConfig['font-size']` 以内联 `<div :style="{ fontSize: ... }">` 方式应用到根容器，步进 ±2px，范围 10px 以上，默认 16px。详见 201-page-index 模块。

## 5. 验收场景

### 场景 1: 切换深色主题

- Given 当前为浅色主题
- When 用户进入编辑模式，点击工具栏"主题"按钮
- Then `<html>` 元素添加 `dark` 类名，全界面切换为深色配色，`localStorage['dashboard-theme']` 值为 `'dark'`，`desktopConfig.theme` 同步为 `'dark'`

### 场景 2: 切换浅色主题

- Given 当前为深色主题
- When 用户点击工具栏"主题"按钮
- Then `<html>` 元素的 `dark` 类名被移除，全界面切换为浅色配色，`localStorage['dashboard-theme']` 值为 `'light'`，`desktopConfig.theme` 同步为 `'light'`

### 场景 3: 主题持久化 — 刷新恢复

- Given 用户已切换为深色主题并关闭页面
- When 用户重新打开页面
- Then 在 Vue 挂载前，反闪烁脚本已将 `dark` 类名添加到 `<html>`；Vue 挂载后 `initTheme()` 保持一致，页面以深色主题呈现

### 场景 4: 首次访问 — 跟随系统偏好

- Given 用户首次访问（localStorage 中无 `dashboard-theme` 键），操作系统设置为深色模式
- When 页面加载
- Then 反闪烁脚本检测到系统深色偏好，添加 `dark` 类名；页面以深色主题呈现；localStorage 不写入值（保持后续可跟随系统变化）

### 场景 5: 系统偏好变化自动跟随

- Given 用户未手动设置过主题（localStorage 无值），操作系统主题从深色切换为浅色
- When 系统主题变化事件触发
- Then `useTheme` 的 `matchMedia` 监听器自动移除 `dark` 类名，页面切换为浅色主题

### 场景 6: 手动设置后不再跟随系统

- Given 用户已手动点击主题按钮设置浅色主题（localStorage 有值 `'light'`）
- When 操作系统主题从浅色切换为深色
- Then `useTheme` 检测到 localStorage 有值，不执行自动跟随，页面保持浅色

### 场景 7: 选择背景自动切换主题

- Given 当前为浅色主题
- When 用户在背景列表中选择一个标记了 `theme: 'dark'` 的深色背景
- Then 系统自动调用 `setTheme('dark')`，桌面配置同步更新

### 场景 8: 主题切换过渡效果

- Given 任意主题
- When 主题切换发生
- Then `body` 的 `background-color`、`color`、`border-color` 在 0.3s 内平滑过渡

## 6. 非功能需求

### 6.1 性能

- **NFR-005-001**: 主题切换 MUST 在 100ms 内完成视觉变化（纯 CSS 变量覆盖，无 JS 计算开销）。
- **NFR-005-002**: 主题 CSS 文件（两个 theme.scss）MUST 总大小不超过 5KB（gzip 前），当前实际合计约 2KB。

### 6.2 安全性

- **NFR-005-003**: localStorage 读写 MUST 防御式 try/catch 包裹，存储不可用时静默降级。
- **NFR-005-004**: `localStorage.getItem` 返回的字符串 MUST 与 `THEME_DARK` / `THEME_LIGHT` 常量精确匹配后才应用，防止注入异常值。

### 6.3 可维护性

- **NFR-005-005**: CSS 变量命名 MUST 语义化（如 `--desktop-bg-primary` 而非 `--desktop-color-1`）。
- **NFR-005-006**: 新增组件 SHOULD 优先使用 CSS 变量引用颜色，禁止硬编码颜色值。
- **NFR-005-007**: 主题系统 MUST 不增加新的 npm 依赖。

### 6.4 兼容性

- **NFR-005-008**: 系统 MUST 在不支持 CSS 变量的浏览器上优雅降级（:root 级别定义的值作为回退）。
- **NFR-005-009**: 主题切换 MUST 不影响 GridStack 的拖拽、缩放等核心交互。

## 7. 假设与约束

- **假设 1**: 用户浏览器支持 CSS 自定义属性（CSS Variables），覆盖 97%+ 的现代浏览器。
- **假设 2**: Element Plus `dark/css-vars.css` 中定义的 `--el-*` 变量与 `--desktop-*` 变量无命名冲突。
- **假设 3**: `html.dark` 类名仅由主题系统管理，不被其他模块修改。
- **约束 1**: 不使用第三方主题库（如 VueUse），状态管理仅依赖 Vue 3 Composition API 模块级单例。
- **约束 2**: 主题系统纯 CSS 驱动，JavaScript 仅负责切换 `html.dark` 类名和读写 localStorage。
- **约束 3**: 所有新文件遵循项目命名惯例（camelCase composable, kebab-case 目录）。
- **约束 4（双文件同步）**: 任何 CSS 变量的新增、修改、删除，必须同时更新以下两个文件，保持二者一致性：
  - `src/style/theme-var.scss` — 运行时生效的 CSS 变量定义（`:root` 浅色块 + `html.dark` 深色块）
  - `docs/theme-var.md` — 面向开发者的变量参考文档（含完整变量表、命名规范、使用指南）

## 8. 依赖关系

### 8.1 上游依赖

| 依赖模块 | 交互方式 | 说明 |
|---|---|---|
| 201-page-index (Desktop.vue) | 调用 `useTheme()` 的 `isDark`/`toggleTheme`/`setTheme` | 桌面编排器持有主题切换按钮和 `desktopConfig.theme` 的同步 |
| index.html (Anti-FOUC) | 同一 localStorage 键 + 同一优先级策略 | 反闪烁脚本在 Vue 前执行，与 `initTheme()` 行为一致 |

### 8.2 下游依赖

| 被依赖方 | 交互方式 | 说明 |
|---|---|---|
| 所有组件样式 | 通过 `var(--desktop-*)` 引用 CSS 变量 | `html.dark` 切换时 CSS 引擎自动重新计算变量，组件无需感知 |
| Element Plus 组件 | 通过 `html.dark` 激活 `dark/css-vars.css` | Element Plus 根据同一类名覆盖 `--el-*` 变量 |
| 004-background-system | 背景选择时可附带 `meta.theme` 触发 `setTheme()` | `Desktop.vue:278-281` 中 `onSelectBackground` 调用 `setTheme(meta.theme)` |
