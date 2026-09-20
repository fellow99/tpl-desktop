# 301-widget-basic-widgets 技术方案

> 本文档为逆向整理的技术方案，记录基础小部件模块的实际架构、设计决策和实现策略。
> 模块: 301-widget-basic-widgets
> 对应规格: [spec.md](./spec.md)
> 最后更新: 2026-07-19

## 1. 技术上下文

### 1.1 运行环境

- **运行时**: 浏览器（Vue 3 Composition API），所有 Widget 组件通过 `h()` + `render()` 由视口挂载到 GridStack DOM 节点内。
- **注册时**: 构建时由 `src/widgets/index.js` 通过 `import.meta.glob('./**/*.widget.vue', { eager: true })` + `./**/*.widget.js` 扫描发现。
- **组件隔离**: Widget 组件不访问 GridStack API、localStorage 或桌面状态，仅通过 props 接收数据。

### 1.2 直接依赖

| 依赖 | 版本 | 用途 | 消费者 |
|------|------|------|--------|
| Vue 3 | ^3.5.39 (peer) | `defineProps`, `computed`, `ref`, `onBeforeUnmount` | 所有 `.widget.vue` 组件 |
| @number-flow/vue | ^0.4.8 | `<NumberFlow>` 数值滚动动画组件 | `BasicNumber.widget.vue:10` |
| vue3-markdown | ^1.2.17 | `<VMarkdownView>` Markdown 渲染组件 + 内置 CSS | `BasicMarkdown.widget.vue:9-10` |
| avatar.svg | (本地) | Widget 分类树图标（SVG import） | 所有 `.widget.js` 文件 |
| element-resize-detector | ^1.2.4 | 容器尺寸监听（已安装于 package.json，但本模块不直接使用） [NEEDS CLARIFICATION: 为 BasicEcharts 历史依赖，已安装但本模块当前 5 个 Widget 均不引用] |

## 2. 宪法合规检查

| 宪法条款 | 状态 | 证据 / 说明 |
|---------|------|-------------|
| 第1条: 元数据驱动的组件扩展 | ✅ 合规 | 每个 Widget 含 `.widget.vue` + `.widget.js` 文件对，由 `import.meta.glob` 自动发现注册 |
| 第2条: 宿主与内容分离 | ✅ 合规 | Widget 组件不引用 GridStack / desktopConfig / localStorage，仅接收 props 渲染内容 |
| 第7条: Composition API | ✅ 合规 | 所有 `.vue` 使用 `<script setup>` — BasicText(1), BasicNumber(9), BasicMarkdown(9), BasicImage(1), BasicVideo(10) |
| 第9条: CSS 变量体系 | ✅ 合规 | 颜色全部使用 `var(--desktop-text-primary)` / `var(--desktop-text-secondary)`，无硬编码颜色值（`BasicText.widget.vue:26`, `BasicNumber.widget.vue:59,68,79`） |
| 第10条: CSS 作用域隔离 | ✅ 合规 | 所有组件使用 `<style scoped lang="scss">`；BasicMarkdown 通过 `:deep(.markdown-body)` 穿透第三方样式（`BasicMarkdown.widget.vue:44-47`） |
| 第13条: Widget 不接触桌面状态 | ✅ 合规 | 搜索 `src/widgets/basic/`，无 `GridStack`、`localStorage`、`desktopConfig`、`useGridStack` 引用 |
| 第14条: 只读元数据消费 | ✅ 合规 | Widget 组件不修改 meta 对象，仅通过 `defineProps` 接收 props 值 |

异常项: 无违反项。

## 3. 研究结论与关键决策

### 3.1 单文件双 export 约定（BasicMarkdown 特有）

**决策**: `BasicMarkdown.widget.js` 同时导出 `default`（元数据对象）和 `DEFAULT_MARKDOWN`（具名常量），`.widget.vue` 通过 import 消费同一常量。

**理由**: `.widget.js` 的 `props.value.default` 和 `.widget.vue` 的 `defineProps({ value: { default: ... } })` 需要共享同一个默认值。通过具名导出避免字符串重复声明，实现"单一数据源"（`BasicMarkdown.widget.js:11-19`, `.vue:11,15`）。

### 3.2 不定义 presets — 标准版入口

**决策**: 本模块所有 5 个 Widget 均不定义 `presets` 字段。

**理由**:
- 这些 Widget 属性简单（1-4 个 prop），每个 Widget 只有一个"标准形态"。
- 用户通过属性编辑即可得到所需的展示效果，不需要预设变体。
- 002-widget-system 的添加面板在 `presets` 为空/undefined 时展示标准版入口（`desktop-widget-list.vue:82`）。

### 3.3 objectFit 选项在两 Widget 间独立定义

**决策**: BasicImage 和 BasicVideo 各自在 `.widget.js` 中独立定义 `objectFit` 的 `options` 数组（5 个选项），不共享公共常量。

**理由**: 两个 Widget 的 `objectFit` 定义内容完全相同但语义独立——分别属于各自 Widget 的 props 声明。如果未来 BasicVideo 需要不同的适应选项集合，无需改动 BasicImage。`BasicVideo.widget.js:4` 注释也注明"与 BasicImage 共享同一组定义"说明这是刻意决策而非疏忽。

### 3.4 BasicNumber 精度处理策略

**决策**: 在 `displayValue` 计算属性中对 value 执行双重安全处理：
1. `parseFloat(value)` — 若 value 不是合法数字则结果 NaN
2. `Number.isFinite(n) ? n.toFixed(precision) : 0` — NaN/Infinity 回退为 0
3. `precision` 经 `Math.trunc()` 截断取整后再 clamp 到 [0, 20]

**理由**: 防止恶意或异常输入导致 toFixed 抛出 RangeError（precision 必须在 0~100，但 NumberFlow 内部 format 对 extreme 精度表现差，故 clamp 到 20）。`Math.trunc` 处理 "2.8" 等浮点 precision 输入（`BasicNumber.widget.vue:24-33`）。

### 3.5 Event 特性为零 — 纯展示组件

**决策**: 所有 5 个 Widget 的 `events` 数组保持 `[]`，Widget Vue 组件不调用任何 `defineEmits`。

**理由**: 基础小部件为纯展示组件——它们接收 props 渲染内容，不产生用户交互事件。与 Active Widget（如按钮、表单）不同，它们不需要 emit 任何数据。`events` 和 `propsEditors`、`wrapperEditors` 均为预留扩展点（Constitution 第14条）。

## 4. 数据模型

### 4.1 BasicText — 属性与元数据

```js
// BasicText.widget.vue defineProps
{ value: { type: String, default: '这是一段文字' } }

// BasicText.widget.js props
{
  value: {
    title: '文本内容',
    category: '看板组件配置',
    default: '这是一段文字',
  }
}
```

默认尺寸: `{ unit: 'grid', width: 1, height: 1 }`

### 4.2 BasicNumber — 属性与元数据

```js
// BasicNumber.widget.vue defineProps
{
  value: { type: Number, default: 123.456 },
  precision: { type: Number, default: 2 },
  title: { type: String, default: '' },
  unit: { type: String, default: '' },
}

// BasicNumber.widget.js props
{
  value: { title: '数值', category: '看板组件配置', type: 'number', default: 123.456 },
  precision: { title: '小数保留位数', category: '看板组件配置', type: 'number', default: 2 },
  title: { title: '标题文字', category: '看板组件配置', default: '' },
  unit: { title: '单位文字', category: '看板组件配置', default: '' },
}
```

默认尺寸: `{ unit: 'grid', width: 1, height: 1 }`

内部计算:
```
safePrecision = Math.trunc(Number(precision)) → clamp(0, 20) → fallback 0
displayValue = parseFloat(value) → toFixed(safePrecision) → fallback 0
numberFormat = { minimumFractionDigits: safePrecision, maximumFractionDigits: safePrecision, useGrouping: false }
```

### 4.3 BasicMarkdown — 属性与元数据

```js
// BasicMarkdown.widget.js 具名导出
export const DEFAULT_MARKDOWN = `# Markdown 示例\n\n这是一段 **Markdown** 富文本内容。\n\n- 支持标题、加粗、*斜体*\n- 支持列表与 \`行内代码\`\n\n> 支持引用块\n`

// BasicMarkdown.widget.vue defineProps
{
  value: { type: String, default: DEFAULT_MARKDOWN },      // import 自 .widget.js
  mode: { type: String, default: 'light' },
}

// BasicMarkdown.widget.js props
{
  value: { title: 'Markdown 内容', category: '看板组件配置', type: 'markdown', default: DEFAULT_MARKDOWN },
  mode: { title: '渲染主题', category: '看板组件配置', default: 'light' },
}
```

默认尺寸: `{ unit: 'grid', width: 3, height: 2 }`

### 4.4 BasicImage — 属性与元数据

```js
// BasicImage.widget.vue defineProps
{
  value: { type: String, default: '' },
  objectFit: { type: String, default: 'cover' },
}

// BasicImage.widget.js props
{
  value: { title: '图片地址', category: '看板组件配置', default: '' },
  objectFit: {
    title: '适应方式',
    category: '看板组件配置',
    type: 'select',
    default: 'cover',
    options: [
      { label: '覆盖', value: 'cover' },
      { label: '包含', value: 'contain' },
      { label: '填充', value: 'fill' },
      { label: '原始', value: 'none' },
      { label: '缩小', value: 'scale-down' },
    ],
  },
}
```

默认尺寸: `{ unit: 'grid', width: 2, height: 2 }`

### 4.5 BasicVideo — 属性与元数据

```js
// BasicVideo.widget.vue defineProps
{
  value: { type: String, default: '' },
  objectFit: { type: String, default: 'cover' },
}

// BasicVideo.widget.js props
{
  value: { title: '视频地址', category: '看板组件配置', default: '' },
  objectFit: {
    title: '适应方式',
    category: '看板组件配置',
    type: 'select',
    default: 'cover',
    options: [
      { label: '覆盖', value: 'cover' },
      { label: '包含', value: 'contain' },
      { label: '填充', value: 'fill' },
      { label: '原始', value: 'none' },
      { label: '缩小', value: 'scale-down' },
    ],
  },
}
```

默认尺寸: `{ unit: 'grid', width: 2, height: 2 }`

### 4.6 Widget 元数据汇总表

| compName | title | 默认尺寸(w×h) | 属性数 | 第三方依赖 | presets |
|----------|-------|--------------|--------|-----------|---------|
| BasicText | 基础文字 | 1×1 | 1 | 无 | 无 |
| BasicNumber | 滚动数字 | 1×1 | 4 | @number-flow/vue | 无 |
| BasicMarkdown | Markdown文字 | 3×2 | 2 | vue3-markdown | 无 |
| BasicImage | 基础图片 | 2×2 | 2 | 无 | 无 |
| BasicVideo | 基础视频 | 2×2 | 2 | 无 | 无 |

### 4.7 验证规则（由 Widget 内部逻辑保证）

| Widget | 属性 | 规则 |
|--------|------|------|
| BasicNumber | `precision` | `Math.trunc()` 取整 → clamp [0, 20]；非数字 → 0 |
| BasicNumber | `value` | `parseFloat()` → `Number.isFinite` 检查；NaN → 0 |
| BasicImage | `value` | 空字符串 → 不渲染 `<img>` 元素（`v-if="value"`） |
| BasicVideo | `value` | 空字符串 → 不渲染 `<video>` 元素（`v-if="value"`） |

## 5. 接口契约

### 5.1 提供的接口 — Widget Meta 对象

每个 `.widget.js` 的 `export default` 返回一个 WidgetMeta 对象。`compName` 由 `src/widgets/index.js` 从文件路径自动注入，无需在元数据中手写。

```js
// WidgetMeta 类型（实际构建中 compName 自动注入）
{
  compName: string,          // 自动注入，如 'BasicText'
  title: string,             // 如 '基础文字'
  category: string,          // '3.基础组件'
  avatar: string,            // SVG import 路径
  thumbnail: null,           // 预览缩略图（null = 实时渲染）
  rect: {
    unit: 'grid',            // 固定 'grid'
    width: number,           // 1-3
    height: number,          // 1-3
  },
  props: Record<string, {
    title: string,           // 属性显示名称（中文）
    category: string,        // 属性分组 — 统一 '看板组件配置'
    default: any,            // 属性默认值
    type?: string,           // 编辑器类型: 'number' | 'select' | 'markdown' | 隐式 text
    options?: Array<{ label: string, value: string }>,  // type='select' 时
  }>,
  events: [],                // 预留扩展点
  propsEditors: [],          // 预留扩展点
  wrapperEditors: [],        // 预留扩展点
}
```

### 5.2 提供的接口 — Widget Vue 组件

每个 `.widget.vue` 通过 `export default`（由 `<script setup>` 隐式提供）导出 Vue 组件。组件接收的 props 与 `.widget.js` 的 `props` 定义一一对应。

所有 Widget 组件:
- 无 `defineEmits` — 不向外部发生事件
- 无 `inject` / `provide` — 不依赖或提供跨层级状态
- 样式全部 `<style scoped lang="scss">`

### 5.3 消费的接口 — 由 Widget Wrapper 注入

| 接口 | 提供方 | 本模块消费方式 |
|------|--------|---------------|
| Props 绑定 | 视口 `rerenderNode` (001-desktop-framework) | `h(WidgetComponent, propsValues)` 构造 VNode 时传入 |
| 容器外壳 | `desktop-widget-wrapper` (002-widget-system) | Widget 内容作为默认 slot 注入 wrapper |
| 元数据注册 | `src/widgets/index.js` (002-widget-system) | 通过文件对自动发现，被动注册 |

### 5.4 与 WidgetWrapper 的数据交换

WidgetWrapper 通过以下接口包裹 Widget:
```
h(WidgetWrapper, {
  title: wrapperValues.title || meta.title,
  hideHeader: wrapperValues.hideHeader,
  editMode: desktopMode.value === 'edit',
  node: gridStackNode,
  meta: WidgetMetas[compName],
}, {
  default: () => h(WidgetComponent, propsValues),   // ← Widget 通过 slot 注入
})
```
Widget 组件接收到的 `propsValues` 来自实例配置持久化数据或 preset merge 结果。Widget 组件本身不知晓 wrapper 的存在。

## 6. 实现策略

### 6.1 架构模式

所有基础小部件遵循统一开发模式：
1. **定义**: `.widget.js` 声明元数据（title/category/props/rect）
2. **实现**: `.widget.vue` 通过 `<script setup>` + `defineProps` 接收数据，`<template>` 渲染内容
3. **样式**: 根容器 `display:flex;align-items:center;justify-content:center;width:100%;height:100%`，颜色通过 `var(--desktop-text-primary)` 引用

### 6.2 BasicText — 最简参考实现（28 行）

实现 FR-301-001, FR-301-002, FR-301-003。

```
defineProps({ value: String })
<template>
  <div class="BasicText">{{ value }}</div>
</template>
```

无 script 逻辑，无计算属性，无第三方依赖。仅通过 Mustache 插值渲染。是最简 Widget 开发参考。

### 6.3 BasicNumber — NumberFlow 动画集成（82 行）

实现 FR-301-004 ~ FR-301-010。

渲染管线:
```
defineProps → safePrecision(computed) → displayValue(computed) → numberFormat(computed)
  ↓
<template>
  <div class="BasicNumber">
    <span v-if="title">{{ title }}</span>
    <NumberFlow :value="displayValue" :format="numberFormat" />
    <span v-if="unit">{{ unit }}</span>
  </div>
</template>
```

样式布局: flex row，title 左偏移 `-0.25em` + 40% max-width + ellipsis；number 1.5em font-weight 600；unit 右偏移 `+0.25em`。

### 6.4 BasicMarkdown — vue3-markdown 集成（48 行）

实现 FR-301-011 ~ FR-301-015。

```
import { VMarkdownView } from 'vue3-markdown'
import 'vue3-markdown/dist/vue3-markdown.css'
import { DEFAULT_MARKDOWN } from './BasicMarkdown.widget.js'

<template>
  <div class="BasicMarkdown">
    <VMarkdownView class="markdown-view" :content="value" :mode="mode" />
  </div>
</template>
```

关键: 通过 `:deep(.markdown-body)` 穿透 scoped 样式将第三方组件背景设为 transparent，颜色跟随 `var(--desktop-text-primary)`，以适配 app 级深色主题切换。

### 6.5 BasicImage — 条件渲染（36 行）

实现 FR-301-016 ~ FR-301-019。

```
<template>
  <div class="BasicImage">
    <img v-if="value" class="image-content" :src="value" :style="{ objectFit }" alt="" />
  </div>
</template>
```

空值保护: `v-if="value"` 确保空 URL 时不渲染 `<img>`，避免浏览器显示破损图片图标。

### 6.6 BasicVideo — 生命周期资源管理（61 行）

实现 FR-301-020 ~ FR-301-024。

```
const videoRef = ref(null)

onBeforeUnmount(() => {
  const video = videoRef.value
  if (!video) return
  video.pause()
  video.src = ''
  video.load()
})

<template>
  <div class="BasicVideo">
    <video v-if="value" ref="videoRef"
      :src="value" :style="{ objectFit }"
      autoplay loop muted playsinline
    />
  </div>
</template>
```

资源清理流程: `pause()` → `src = ''` → `load()`。`load()` 调用确保浏览器解除对视频资源的引用，防止组件卸载后资源仍被占用。

### 6.7 错误处理

| 场景 | 策略 | 位置 |
|------|------|------|
| BasicNumber value 为 NaN | `Number.isFinite(n)` 检查 → 回退 0 | `BasicNumber.widget.vue:32` |
| BasicNumber precision 为非法值 | `Math.trunc(Number(p))` → `Number.isFinite` 检查 → clamp [0,20] → 回退 0 | `BasicNumber.widget.vue:25-27` |
| BasicImage/BasicVideo value 为空 | `v-if="value"` → 不渲染元素 | `BasicImage.widget.vue:18`, `BasicVideo.widget.vue:34` |
| BasicVideo 卸载时 videoRef 为 null | null 检查 → 跳过清理 | `BasicVideo.widget.vue:24-25` |

## 7. 测试考量

### 7.1 可测试性

- BasicText、BasicImage 为纯展示组件（无 script 逻辑，仅 defineProps），适合快照测试。
- BasicNumber 的计算属性（`safePrecision`、`displayValue`、`numberFormat`）为纯函数逻辑，可通过组件测试验证。
- BasicMarkdown 和 BasicVideo 依赖第三方库和 DOM，适合集成测试或 E2E 测试。
- BasicVideo 的 `onBeforeUnmount` 资源清理需通过组件挂载/卸载测试验证。

### 7.2 建议测试类别

| 类别 | 覆盖范围 |
|------|---------|
| 单元测试 | BasicNumber 精度计算逻辑（safePrecision / displayValue），边界值测试 |
| 组件测试 | 各 Widget 的 props 渲染（value 变化后 DOM 更新）、v-if 条件渲染 |
| 集成测试 | BasicMarkdown + vue3-markdown 渲染正确性；BasicNumber + @number-flow/vue 动画 |
| E2E 测试 | 从 Widget 列表添加到桌面 → 属性编辑 → 内容变更 → 删除 → 配置持久化恢复 |

### 7.3 边界与异常场景

- BasicNumber precision = 0 时末位小数处理（toFixed(0) 返回整数）
- BasicNumber precision = 20 时极长小数展示（displayValue 长度）
- BasicNumber value = -0, Infinity, "abc" 等非法输入
- BasicImage/BasicVideo value 为空字符串 → 不渲染确认
- BasicImage value 为无效 URL → 浏览器原生破损图处理（非 Widget 代码控制）
- BasicVideo 快速添加/删除循环 → 资源清理正确性
- BasicMarkdown mode 为非法值（非 'light'/'dark'）时 vue3-markdown 的降级行为
- 各 Widget 在 theme 切换时（html.dark class toggle）CSS 变量颜色跟随

## 8. 文件清单

| # | 文件 | 用途 | 行数 |
|---|------|------|------|
| 1 | `src/widgets/basic/BasicText.widget.js` | 基础文字元数据（title/category/rect/props/events） | 26 |
| 2 | `src/widgets/basic/BasicText.widget.vue` | 基础文字组件（defineProps + Mustache 插值） | 28 |
| 3 | `src/widgets/basic/BasicNumber.widget.js` | 滚动数字元数据（value/precision/title/unit 4 属性） | 41 |
| 4 | `src/widgets/basic/BasicNumber.widget.vue` | 滚动数字组件（safePrecision/displayValue/numberFormat + NumberFlow） | 82 |
| 5 | `src/widgets/basic/BasicMarkdown.widget.js` | Markdown 元数据（value type:markdown / mode + DEFAULT_MARKDOWN 导出） | 44 |
| 6 | `src/widgets/basic/BasicMarkdown.widget.vue` | Markdown 组件（VMarkdownView + :deep 样式穿透） | 48 |
| 7 | `src/widgets/basic/BasicImage.widget.js` | 基础图片元数据（value + objectFit select/options） | 39 |
| 8 | `src/widgets/basic/BasicImage.widget.vue` | 基础图片组件（v-if value + img） | 36 |
| 9 | `src/widgets/basic/BasicVideo.widget.js` | 基础视频元数据（value + objectFit） | 38 |
| 10 | `src/widgets/basic/BasicVideo.widget.vue` | 基础视频组件（autoplay/loop/muted/playsinline + onBeforeUnmount 清理） | 61 |
| 11 | `src/widgets/basic/avatar.svg` | 组件默认图标（所有 Widget 共享 SVG） | 1 |

**合计: 11 个文件，~444 行代码**（不含 avatar.svg 的 SVG 内部行数）。
