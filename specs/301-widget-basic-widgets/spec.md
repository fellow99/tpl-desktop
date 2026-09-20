# 基础小部件 功能规格

> 模块: 301-widget-basic-widgets
> 状态: 已实现
> 最后更新: 2026-07-19

## 1. 模块概述

### 1.1 用途 — 为什么存在这个模块

基础小部件模块是工作台桌面内置的可视化内容展示组件集合。它提供了五种最常用的静态展示类型——纯文本、动画数字、Markdown 富文本、图片和视频——供用户在桌面上直接添加、配置和展示。这些小部件是 Widget 系统的"参考实现"（`BasicText.widget.js:4`），同时演示了最简单到中等复杂度的 Widget 开发模式。

### 1.2 解决的问题

| 痛点 | 解决方案 |
|------|---------|
| 桌面需要展示纯文本信息（标题、说明、标注） | BasicText — 1×1 最小文本容器，Mustache 插值渲染 |
| 需要展示带动画效果的动态数值（统计数据、计数器） | BasicNumber — 依赖 @number-flow/vue 实现数值滚动动画，精度可配 |
| 需要展示 Markdown 格式化的文档和公告 | BasicMarkdown — 依赖 vue3-markdown 渲染引擎，支持 light/dark 主题模式 |
| 需要展示静态图片（产品图、示意图、背景图） | BasicImage — 原生 `<img>` 标签，支持 5 种 CSS object-fit 适应方式 |
| 需要展示视频内容（宣传片、监控画面、教学视频） | BasicVideo — 原生 `<video>` 标签，自动静音循环播放，卸载时释放资源 |

### 1.3 范围

**包含:**
- BasicText（基础文字）：单属性纯文本渲染
- BasicNumber（滚动数字）：多属性数值展示，含标题、单位、精度控制，数值变化时播放滚动动画
- BasicMarkdown（Markdown文字）：Markdown 富文本渲染，含 light/dark 主题模式切换
- BasicImage（基础图片）：图片 URL 展示，含 5 种 CSS object-fit 适应方式选择
- BasicVideo（基础视频）：视频 URL 播放，自动静音循环 + 资源清理

**明确排除:**
- Widget 框架注册机制（→ 模块 002-widget-system）
- Widget 容器外壳（→ 模块 002：`desktop-widget-wrapper`）
- 属性编辑面板 UI 和编辑器控件（→ 模块 101-prop-editor）
- GridStack 网格引擎（→ 模块 001-desktop-framework）
- 不包含 BasicEcharts（已从当前代码库中移除，旧名称 305 中包含但 tpl-desktop 已移除该组件）

## 2. 用户故事

- 作为**桌面编辑者**，我可以在看板上添加"基础文字"小部件来显示标题或说明文字，初始内容为默认文本，我可以通过属性配置修改它。
- 作为**桌面编辑者**，我可以添加"滚动数字"小部件来展示带动画效果的数值，并配置小数精度、标题标签和单位后缀，数值变化时可以看到平滑的滚动动画。
- 作为**桌面编辑者**，我可以在桌面上添加"Markdown文字"小部件来展示格式化富文本内容（标题、加粗、列表、代码块等），并可切换渲染主题。
- 作为**桌面编辑者**，我可以添加"基础图片"小部件来展示图片，并选择不同的图片适应方式（覆盖、包含、填充等）。
- 作为**桌面编辑者**，我可以添加"基础视频"小部件来展示视频，视频会自动静音循环播放，删除小部件时视频资源会被正确释放。
- 作为**组件开发者**，我可以参考基础小部件的源码来理解 Widget 系统的开发模式——从最简单的 BasicText（仅 props + Mustache 插值）到中等复杂的 BasicVideo（生命周期 + DOM 资源管理）。

## 3. 功能需求

### 3.1 基础文字（BasicText）

- **FR-301-001**: 系统 MUST 提供文字小部件，接收 `value` 属性（String 类型），在组件区域内居中渲染为纯文本（`BasicText.widget.vue:15`）。
- **FR-301-002**: 系统 MUST 为文字小部件设置默认网格尺寸为 1×1（`BasicText.widget.js:14`）。
- **FR-301-003**: 系统 MUST 将文字小部件的 `value` 默认值设为 `'这是一段文字'`（`BasicText.widget.js:19`）。

### 3.2 滚动数字（BasicNumber）

- **FR-301-004**: 系统 MUST 提供数字小部件，接收 `value` 属性（Number 类型），并使用滚动动画过渡渲染数值变化（`BasicNumber.widget.vue:46`）。
- **FR-301-005**: 系统 MUST 支持配置 `precision`（小数保留位数，Number 类型，默认 2）、`title`（标题文字，String 类型，默认空串）和 `unit`（单位文字，String 类型，默认空串）（`BasicNumber.widget.js:20-35`）。
- **FR-301-006**: 系统 MUST 在渲染前对 value 执行 `parseFloat(value).toFixed(precision)` 处理，非法输入（NaN/Infinity）回退为 0（`BasicNumber.widget.vue:30-33`）。
- **FR-301-007**: 系统 MUST 将 `precision` 限制在 [0, 20] 的合法范围内，且必须为整数（`BasicNumber.widget.vue:24-27`）。
- **FR-301-008**: 系统 MUST 在 layout 中将 `title` 展示在数值左侧（带 `text-overflow: ellipsis` 省略号），`unit` 展示在数值右侧（`BasicNumber.widget.vue:45-48`）。
- **FR-301-009**: 系统 MUST 为数字小部件设置默认网格尺寸为 1×1（`BasicNumber.widget.js:12`）。
- **FR-301-010**: 系统 MUST 在 `title` 为空时隐藏标题展示（`BasicNumber.widget.vue:45` 中 `v-if="title"`）。

### 3.3 Markdown文字（BasicMarkdown）

- **FR-301-011**: 系统 MUST 提供 Markdown 小部件，接收 `value` 属性（String 类型），将其渲染为格式化 HTML 内容（`BasicMarkdown.widget.vue:23`）。
- **FR-301-012**: 系统 MUST 支持配置 `mode` 属性（渲染主题，默认 `'light'`），控制 Markdown 渲染器的主题配色（`BasicMarkdown.widget.js:34-38`）。
- **FR-301-013**: 系统 MUST 设置默认网格尺寸为 3×2，以容纳富文本内容（`BasicMarkdown.widget.js:26`）。
- **FR-301-014**: 系统 MUST 在元数据中声明 `value` 的 type 为 `'markdown'`，以便属性编辑器触发专用的 Markdown 编辑器控件（`BasicMarkdown.widget.js:31`）。
- **FR-301-015**: 系统 MUST 将 Markdown 默认内容与组件默认值共享同一变量 `DEFAULT_MARKDOWN`，实现单一数据源（`BasicMarkdown.widget.js:11-19`，`.vue:15`）。

### 3.4 基础图片（BasicImage）

- **FR-301-016**: 系统 MUST 提供图片小部件，接收 `value` 属性（String，图片 URL 路径），当 `value` 为空时不渲染 `<img>` 元素，显示空白容器（`BasicImage.widget.vue:18` 中 `v-if="value"`）。
- **FR-301-017**: 系统 MUST 支持配置 `objectFit` 属性控制图片适应方式，提供五种选项：cover（覆盖）、contain（包含）、fill（填充）、none（原始）、scale-down（缩小），默认值为 `'cover'`（`BasicImage.widget.js:21-33`）。
- **FR-301-018**: 系统 MUST 在元数据中声明 `objectFit` 的 type 为 `'select'` 并携带 `options` 数组，以便属性编辑器渲染下拉选择控件（`BasicImage.widget.js:24-33`）。
- **FR-301-019**: 系统 MUST 设置默认网格尺寸为 2×2（`BasicImage.widget.js:14`）。

### 3.5 基础视频（BasicVideo）

- **FR-301-020**: 系统 MUST 提供视频小部件，接收 `value` 属性（String，视频 URL 路径），当 `value` 为空时不渲染 `<video>` 元素（`BasicVideo.widget.vue:34` 中 `v-if="value"`）。
- **FR-301-021**: 系统 MUST 支持配置 `objectFit` 属性控制视频适应方式，选项与 BasicImage 完全一致（五种值），默认 `'cover'`（`BasicVideo.widget.js:20-33`）。
- **FR-301-022**: 系统 MUST 为 `<video>` 元素设置 `autoplay`（自动播放）、`loop`（循环播放）、`muted`（静音）、`playsinline`（内联播放）属性（`BasicVideo.widget.vue:39-42`）。
- **FR-301-023**: 系统 MUST 在组件卸载时执行 `video.pause()` → `video.src = ''` → `video.load()` 清理流程，释放视频资源防止内存泄漏（`BasicVideo.widget.vue:22-28`）。
- **FR-301-024**: 系统 MUST 设置默认网格尺寸为 2×2（`BasicVideo.widget.js:13`）。

### 3.6 元数据约定

- **FR-301-025**: 所有基础小部件的 `.widget.js` 元数据 MUST 声明 `title`、`category`、`avatar`、`thumbnail`（null）、`rect`、`props`、`events`（[]）、`propsEditors`（[]）、`wrapperEditors`（[]）完整字段（如 `BasicText.widget.js:9-26`）。
- **FR-301-026**: 所有基础小部件 MUST 归类于 `'3.基础组件'` 分类（各 `.widget.js` 文件 line 11）。
- **FR-301-027**: 所有基础小部件的 `events`、`propsEditors`、`wrapperEditors` 字段 MUST 保持空数组 `[]`，作为预留扩展点（Constitution 第14条）。
- **FR-301-028**: 所有基础小部件的 `thumbnail` 字段 MUST 为 `null`，即预览时通过实时渲染展示（非缩略图模式）。

## 4. 关键实体

### 4.1 BasicText Widget

| 属性 | 类型 | 默认值 | 元数据类型 | 说明 |
|------|------|--------|------------|------|
| `value` | String | `'这是一段文字'` | (隐式 text) | 文本内容 |

默认尺寸：1×1 网格单元

### 4.2 BasicNumber Widget

| 属性 | 类型 | 默认值 | 元数据类型 | 说明 |
|------|------|--------|------------|------|
| `value` | Number | `123.456` | `number` | 展示数值 |
| `precision` | Number | `2` | `number` | 小数保留位数（0~20） |
| `title` | String | `''` | (隐式 text) | 标题文字 |
| `unit` | String | `''` | (隐式 text) | 单位文字 |

默认尺寸：1×1 网格单元

内部计算属性：
- `safePrecision`: 对 `precision` 执行 `Math.trunc()` 并 clamp 到 [0, 20]
- `displayValue`: `Number(parseFloat(value).toFixed(safePrecision))`，NaN 回退 0
- `numberFormat`: `{ minimumFractionDigits: safePrecision, maximumFractionDigits: safePrecision, useGrouping: false }`

### 4.3 BasicMarkdown Widget

| 属性 | 类型 | 默认值 | 元数据类型 | 说明 |
|------|------|--------|------------|------|
| `value` | String | 预定义 Markdown 示例文本 | `markdown` | Markdown 内容 |
| `mode` | String | `'light'` | (隐式 text) | 渲染主题（light / dark） |

默认尺寸：3×2 网格单元

`value` 默认值定义在 `BasicMarkdown.widget.js` 中导出的 `DEFAULT_MARKDOWN` 常量，`.vue` 文件通过 import 共享同一常量。

### 4.4 BasicImage Widget

| 属性 | 类型 | 默认值 | 元数据类型 | 说明 |
|------|------|--------|------------|------|
| `value` | String | `''` | (隐式 text) | 图片 URL 路径 |
| `objectFit` | String | `'cover'` | `select` | CSS object-fit 值 |

默认尺寸：2×2 网格单元

`objectFit` 有效选项：`cover` / `contain` / `fill` / `none` / `scale-down`（五选一）

### 4.5 BasicVideo Widget

| 属性 | 类型 | 默认值 | 元数据类型 | 说明 |
|------|------|--------|------------|------|
| `value` | String | `''` | (隐式 text) | 视频 URL 路径 |
| `objectFit` | String | `'cover'` | `select` | CSS object-fit 值 |

默认尺寸：2×2 网格单元

`objectFit` 有效选项与 BasicImage 一致（五选一）。视频行为：`autoplay` + `loop` + `muted` + `playsinline`（不可配置，硬编码）。

### 4.6 objectFit 选项枚举

本文档中 BasicImage 和 BasicVideo 共用同一组 objectFit 选项定义：

| 选项值 | 中文标签 | 行为 |
|--------|---------|------|
| `cover` | 覆盖 | 保持比例裁剪，填满容器 |
| `contain` | 包含 | 保持比例完整展示，留白 |
| `fill` | 填充 | 拉伸变形以填满容器 |
| `none` | 原始 | 保持原始尺寸，可能溢出 |
| `scale-down` | 缩小 | none 和 contain 中取更小者 |

## 5. 验收场景

### 场景：添加基础文字小部件

- Given 用户打开"添加组件"面板，在分类树中选择"3.基础组件"
- When 用户选择"基础文字"并添加到桌面
- Then 系统 MUST 在 1×1 网格中显示文字"这是一段文字"，居中展示，颜色跟随主题 CSS 变量 `--desktop-text-primary`

### 场景：编辑文字小部件的内容

- Given 桌面上有一个 BasicText 实例（显示默认文本）
- When 用户通过属性编辑器将 `value` 修改为"Hello World"
- Then 小部件内容 MUST 立即更新为"Hello World"

### 场景：添加滚动数字小部件

- Given 用户打开"添加组件"面板并选择"滚动数字"
- When 用户将其添加到桌面
- Then 系统 MUST 显示一个 1×1 的小部件，展示数值 `123.46`（经 toFixed(2) 处理），无标题、无单位

### 场景：配置滚动数字的完整属性

- Given 桌面上有一个 BasicNumber 实例
- When 用户通过属性编辑器设置 `value = 1000`, `precision = 1`, `title = "温度"`, `unit = "°C"`
- Then 系统 MUST 显示"温度 1000.0 °C"，左侧为标题、中间为数值、右侧为单位，数值变化时播放滚动动画

### 场景：滚动数字精度边界测试

- Given 一个 BasicNumber 实例，`value = 3.14159`, `precision = 3`
- When 小部件渲染
- Then 系统 MUST 显示 `3.142`（四舍五入到 3 位小数）
- Given 设置 `precision = 25`
- When 小部件重新渲染
- Then 系统 MUST 将 precision clamp 到 20，显示 20 位小数

### 场景：添加并渲染 Markdown 小部件

- Given 用户选择"Markdown文字"添加到桌面
- When 小部件渲染
- Then 系统 MUST 在 3×2 网格中显示预定义的 Markdown 示例文本，包含标题、加粗、斜体、列表、引用块内容

### 场景：编辑 Markdown 内容

- Given 桌面上有一个 BasicMarkdown 实例
- When 用户通过 Markdown 编辑器修改 `value` 为新的 Markdown 文本
- Then 小部件内容 MUST 即时重新渲染为对应的 HTML

### 场景：Markdown 主题切换

- Given 桌面上有一个 BasicMarkdown 实例，`mode = 'light'`
- When 用户将 `mode` 修改为 `'dark'`
- Then Markdown 渲染结果 MUST 切换为深色主题配色

### 场景：添加图片小部件

- Given 用户选择"基础图片"添加到桌面
- When 初始 `value` 为空字符串
- Then 系统 MUST 显示空白 2×2 容器，不渲染 `<img>` 元素（无破损图片图标）

### 场景：设置图片 URL 和适应方式

- Given 一个 BasicImage 实例
- When 用户设置 `value = "https://example.com/photo.jpg"`, `objectFit = "contain"`
- Then 系统 MUST 在 2×2 容器中显示图片，以 contain 方式完整展示

### 场景：图片适应方式切换

- Given 一个 BasicImage 实例，当前显示图片，`objectFit = "cover"`
- When 用户通过下拉选择将 `objectFit` 改为 `"fill"`
- Then 图片 MUST 拉伸变形填满容器

### 场景：添加视频小部件

- Given 用户选择"基础视频"添加到桌面
- When 初始 `value` 为空字符串
- Then 系统 MUST 显示空白 2×2 容器，不渲染 `<video>` 元素

### 场景：视频自动播放和资源清理

- Given 一个 BasicVideo 实例，`value = "https://example.com/video.mp4"`
- When 小部件渲染
- Then 系统 MUST 以静音模式自动循环播放视频
- When 用户从桌面删除该小部件
- Then 系统 MUST 停止视频播放并释放资源（pause + 清空 src + load）

### 场景：视频适应方式

- Given 一个 BasicVideo 实例，正在播放视频
- When 用户通过下拉选择将 `objectFit` 从 `"cover"` 改为 `"none"`
- Then 视频 MUST 以原始尺寸显示（可能溢出容器）

## 6. 非功能需求

### 6.1 性能

- **NFR-301-001**: BasicNumber 数值滚动动画 MUST 保持流畅，帧率不低于 30fps（依赖 @number-flow/vue 内部实现）。
- **NFR-301-002**: BasicVideo 在组件卸载时 MUST 立即停止播放并释放视频资源（`pause()` + `src = ''` + `load()`），防止内存泄漏（`BasicVideo.widget.vue:23-27`）。

### 6.2 Markdown 兼容性

- **NFR-301-003**: BasicMarkdown MUST 支持标准 Markdown 语法，包括：标题（`# ~ ######`）、加粗（`**text**`）、斜体（`*text*`）、列表（`- item` / `1. item`）、行内代码（`` `code` ``）、引用块（`> quote`），由 vue3-markdown 库提供保证。

### 6.3 Video 媒体约束

- **NFR-301-004**: BasicVideo MUST 保持 `muted`（静音）属性，不得自动有声播放（避免浏览器自动播放策略阻止）。
- **NFR-301-005**: BasicVideo 的 `<video>` 元素 MUST 设置 `playsinline`，确保在移动端内联播放而非强制全屏。

## 7. 假设与约束

1. **假设**: @number-flow/vue (^0.4.8) 库的 `<NumberFlow>` 组件持续可用且与 Vue 3 兼容。若该依赖不可用，BasicNumber 的滚动动画需重新实现。
2. **假设**: vue3-markdown (^1.2.17) 库的 `<VMarkdownView>` 组件持续可用。该组件接受 `:content`（Markdown 文本）和 `:mode`（'light' | 'dark'）Props。
3. **假设**: BasicImage 和 BasicVideo 的 `objectFit` 对应的 CSS 属性在目标浏览器中均受支持（现代浏览器均已支持）。
4. **约束**: 所有基础小部件组件不得引用 GridStack、localStorage、desktopConfig 或 useGridStack（Constitution 第13条 — Widget 组件不得接触桌面状态）。只接收 props，不做任何 emit 事件上报（P2P单向数据流）。
5. **约束**: BasicImage 和 BasicVideo 的 `objectFit` 元数据中 type 声明为 `'select'`，但属性编辑器 101 模块的实现进度决定了该下拉选择器是否已可用。当前若 selector 编辑器未实现，将回退为默认文本输入（`BasicImage.widget.js:5` 注释）。
6. **约束**: BasicMarkdown 的 `mode` 属性虽未声明 `type: 'select'`（当前为隐式 text），但语义上应为 light/dark 二选一。
7. **约束**: 本模块包含的 5 个 Widget 均不定义 `presets` 字段——它们在 Widget 列表面板中均展示"标准版"预览入口（符合 002-widget-system FR-002-017）。

## 8. 依赖关系

### 上游依赖（本模块 import 或引用的模块）

| 模块 | 依赖内容 | 引用位置 |
|------|---------|---------|
| @number-flow/vue (^0.4.8) | `<NumberFlow>` 组件 — 数值滚动动画渲染 | `BasicNumber.widget.vue:10,46` |
| vue3-markdown (^1.2.17) | `<VMarkdownView>` 组件 + CSS — Markdown 渲染 | `BasicMarkdown.widget.vue:9-10,23` |
| avatar.svg | 所有 Widget 共享的默认图标（SVG import） | 各 `.widget.js` line 6-7 |

### 下游依赖（依赖本模块的模块）

| 模块 | 消费内容 | 说明 |
|------|---------|------|
| 002-widget-system | Widget 组件字典 (`WidgetComponents`) + 元数据字典 (`WidgetMetas`) | 通过 `import.meta.glob` 自动扫描注册本模块的所有 `.widget.vue` / `.widget.js` 文件对 |
| 001-desktop-framework (视口) | Widget Vue 组件 | 通过 `h(Component, props)` 渲染到 GridStack 容器 |
| 101-prop-editor | `WidgetMetas[compName].props` 属性定义 | 读取每个 Widget 的 props 元数据生成属性编辑表单 |
