# 101-prop-editor — 技术方案（As-Built）

> 本文档为回顾性技术方案，记录属性编辑器模块的实际架构、设计决策与实现策略。
> 模块: 101-prop-editor
> 对应规格: [spec.md](./spec.md)
> 最后更新: 2026-07-19

## 1. 技术上下文

### 1.1 运行环境

| 环境 | 说明 |
|------|------|
| 运行时 | 浏览器（ES2020+） |
| UI 框架 | Vue 3.5.x（Composition API + `<script setup>`） |
| UI 组件库 | Element Plus 2.11.x（el-drawer, el-tabs, el-tab-pane, el-form, el-form-item, el-input, el-switch, el-button） |
| 构建工具 | Vite 7.x（通过 `src/components/index.js` 的 `import.meta.glob` 自动注册） |
| 样式 | SCSS（scoped + CSS 变量 `--desktop-*`） |

### 1.2 依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| Vue 3 | ^3.5.22 | 响应式系统、组件、watch、computed |
| Element Plus | ^2.11.7 | el-drawer（抽屉面板）、el-tabs（标签页）、el-form / el-form-item（表单布局）、el-input（文本/数字输入）、el-switch（布尔开关）、el-button（操作按钮）、ElMessage（JSON 错误提示） |
| vue3-markdown | ^1.2.17 | VMarkdownEditor 组件（markdown 类型属性的富文本编辑器） |
| lodash | ^4.17.21 | `cloneDeep`（深拷贝属性值构建编辑副本，隔离原始节点数据） |

## 2. 宪法合规检查

| 宪法原则 | 状态 | 说明 |
|----------|------|------|
| §1 元数据驱动的组件扩展 | ✅ 合规 | 属性表单消费 `meta.props`（来自 Widget 注册表构建的元数据），不自行硬编码任何 Widget 的属性列表 |
| §2 看板组件宿主与内容分离 | ✅ 合规 | 属性编辑器与 Widget 内容渲染完全解耦，通过 `node.id` 关联目标节点 |
| §3 模块级单例共享状态 | N/A | 面板和表单为纯 UI 组件，使用局部 `ref()` 管理编辑副本。面板的状态（`visible`/`node`/`meta`）由 Desktop.vue 传入，符合 §6 中心化编排器状态原则 |
| §5 Props/Emits 单向数据流 | ✅ 合规 | 面板：`visible`/`node`/`meta` props 传入，`update:visible`/`confirm` emits 上报。表单：`value`/`props` props 传入，通过就地修改 `value` 对象回写（无 emit） |
| §6 页面编排器中心化状态 | ✅ 合规 | 编辑状态（`widgetPropsVisible`/`widgetPropsNode`/`widgetPropsMeta`）全部在 Desktop.vue 中声明和管理 |
| §7 Composition API 唯一风格 | ✅ 合规 | 两个组件均使用 `<script setup>` + Composition API |
| §8 命名约定 | ✅ 合规 | `desktop-property-panel.vue` / `desktop-property-form.vue` 符合 `desktop-*.vue` kebab-case 规范 |
| §9 SCSS 主题 CSS 变量 | ✅ 合规 | 颜色使用 `--desktop-text-secondary`、`--desktop-border`、`--desktop-bg-secondary`、`--desktop-text-primary`、`--el-color-primary`、`--el-color-danger` |
| §10 CSS 作用域隔离 | ✅ 合规 | 两组件均使用 `<style scoped lang="scss">` |
| §12 错误处理策略 | ✅ 合规 | JSON 解析失败 → `ElMessage.error` + 内联错误态，不抛异常；number 类型非法输入 → 静默回退默认值 |
| §14 只读元数据消费 | ✅ 合规 | `meta.props` 仅读取，不修改元数据对象 |

## 3. 关键设计决策

### 3.1 Clone-Then-Mutate 编辑模式（FR-101-002）

**决策**：面板打开时使用 `lodash/cloneDeep` 对属性值进行深拷贝，构建编辑副本（`editingProps` / `editingWrapperProps`）。表单就地修改副本（`v-model` 绑定到副本的子属性）。仅在用户点击「应用」时才将副本通过 `confirm` 事件发回父组件。

**理由**：
- 隔离编辑态与原始数据：取消 / 关闭抽屉仅需丢弃副本，不污染节点数据
- 避免在表单中追踪「脏」状态——副本就是对原始值的快照
- 已写入测试用例验证：取消不修改数据（spec.md 场景 5.8）

**合并逻辑** (`desktop-property-panel.vue:46-53`)：
```js
// 1. 从 meta.props 提取默认值字典
const defaults = {}
for (const [key, propMeta] of Object.entries(props.meta?.props || {})) {
  defaults[key] = propMeta?.default
}
// 2. 默认值 + 节点当前值 浅合并 → cloneDeep 隔离
editingProps.value = cloneDeep({ ...defaults, ...(props.node?.propsValues || {}) })
editingWrapperProps.value = cloneDeep({
  title: props.node?.wrapperValues?.title ?? props.meta?.title ?? wrapperPropsMeta.title.default,
  hideHeader: props.node?.wrapperValues?.hideHeader ?? wrapperPropsMeta.hideHeader.default,
})
```

### 3.2 声明式 PropMeta → 动态表单生成（FR-101-015）

**决策**：`desktop-property-form` 将 `props`（`Record<string, PropMeta>`）通过 `computed` 转换为 `propEntries` 数组 `[{ name, meta, title, type }]`，在模板中通过 `v-for` + `v-if` 分支选择渲染控件。

**类型映射表** (`desktop-property-form.vue:101-145`)：

| `type` 值 | 渲染控件 | v-model / 绑定 |
|-----------|---------|---------------|
| `undefined` / `'text'` | `<el-input type="text">` | `v-model="value[entry.name]"` |
| `'number'` | `<el-input type="number">` | `v-model.number="value[entry.name]"`，`@change="sanitizeNumber(entry)"` |
| `'boolean'` | `<el-switch>` | `v-model="value[entry.name]"` |
| `'json'` | `<textarea class="json-editor" rows="20">` | `v-model="value[entry.name]"`，`@change="validateJson(entry)"` |
| `'markdown'` | `<VMarkdownEditor>` | `v-model="value[entry.name]"`，`locale="zh"` |
| `'custom'` | `<component :is="entry.meta.custom">` | `:model-value="value[entry.name]"` `:props-value="value"` `@update:model-value` |
| `'select'` | 回退 `<el-input type="text">` | 同 text（select 编辑器未实现） |

**大小写不敏感** (`desktop-property-form.vue:34-36`)：
```js
function getPropType(propMeta) {
  return String(propMeta?.type || 'text').toLowerCase()
}
```

### 3.3 Number 类型安全防护（FR-101-017 ~ FR-101-018）

**决策**：不依赖 `el-input type=number` 的浏览器原生校验。在 `@change` 事件中执行 `Number.isFinite()` 二次校验，捕获浏览器无法覆盖的边缘情况（科学计数法 `1e3`、空字符串、null、undefined）。

**实现** (`desktop-property-form.vue:54-67`)：
```js
function sanitizeNumber(entry) {
  const val = formProps.value[entry.name]
  const num = typeof val === 'number' ? val
    : val === '' || val === null || val === undefined ? NaN : Number(val)
  if (!Number.isFinite(num)) {
    formProps.value[entry.name] = entry.meta.default ?? 0
  } else if (typeof val !== 'number') {
    formProps.value[entry.name] = num
  }
}
```

### 3.4 JSON 校验不阻塞输入（FR-101-019 ~ FR-101-021）

**决策**：JSON 校验在 `@change`（焦点离开）时触发，而非 `@input`。校验失败时显示错误态（红框 + 提示文字 + ElMessage），但**不阻止**用户继续修改。编辑目标切换时清除错误态。

**理由**：部分格式错误的 JSON 在用户继续键入后可能变为合法（如先输入 `{` 再补全 `}`），实时阻止会导致编辑体验极差。

**实现** (`desktop-property-form.vue:71-95`)：
- 错误状态存储在 `reactive({})` 对象 `jsonErrors` 中，按 propName 索引
- `watch(value, ...)` 监听 value 对象整体替换时清除所有 `jsonErrors`
- 模板中通过 `:class="{ 'is-error': jsonErrors[entry.name] }"` 和 `v-if` 显示内联错误提示

### 3.5 组件注册方式

**决策**：不手动注册。两个属性编辑器组件由 `src/components/index.js` 通过 Vite `import.meta.glob('./**/desktop-*.vue', { eager: true })` 构建时自动扫描注册，在 `src/desktop.js` 中全局注册后可在任何模板中直接使用。

## 4. 数据模型

### 4.1 PropMeta Schema（完整字段）

> 实现 FR-101-009 ~ FR-101-014

| 字段 | 类型 | 必填 | 默认值 | 来源 | 描述 |
|------|------|------|--------|------|------|
| `title` | `string` | MUST | — | Widget `.widget.js` 的 `props.{key}.title` | 属性中文标签，渲染为 `<el-form-item label>` |
| `category` | `string` | MAY | — | Widget `.widget.js` 的 `props.{key}.category` | 分类标签（当前代码未用于渲染） |
| `type` | `string` | 否 | `'text'` | Widget `.widget.js` 的 `props.{key}.type` | 编辑器类型（大小写不敏感归一化） |
| `default` | `any` | 否 | — | Widget `.widget.js` 的 `props.{key}.default` | 默认值/兜底值 |
| `options` | `Array<{label, value}>` | 否（仅 select） | — | Widget `.widget.js` 的 `props.{key}.options` | select 选项列表（如 BasicImage 的 objectFit） |
| `custom` | `Component` | 否（仅 custom） | — | Widget `.widget.js` 的 `props.{key}.custom` | 自定义 Vue 组件引用 |

**PropMeta 示例 — BasicText** (`src/widgets/basic/BasicText.widget.js:15-21`)：
```json
{
  "value": {
    "title": "文本内容",
    "category": "看板组件配置",
    "default": "这是一段文字"
  }
}
```

**PropMeta 示例 — BasicNumber** (`src/widgets/basic/BasicNumber.widget.js:14-36`)：
```json
{
  "value": { "title": "数值", "category": "看板组件配置", "type": "number", "default": 123.456 },
  "precision": { "title": "小数保留位数", "category": "看板组件配置", "type": "number", "default": 2 },
  "title": { "title": "标题文字", "category": "看板组件配置", "default": "" },
  "unit": { "title": "单位文字", "category": "看板组件配置", "default": "" }
}
```

**PropMeta 示例 — BasicImage（含 options）** (`src/widgets/basic/BasicImage.widget.js:15-33`)：
```json
{
  "value": { "title": "图片地址", "category": "看板组件配置", "default": "" },
  "objectFit": {
    "title": "适应方式",
    "category": "看板组件配置",
    "type": "select",
    "default": "cover",
    "options": [
      { "label": "覆盖", "value": "cover" },
      { "label": "包含", "value": "contain" },
      { "label": "填充", "value": "fill" },
      { "label": "原始", "value": "none" },
      { "label": "缩小", "value": "scale-down" }
    ]
  }
}
```

**PropMeta 示例 — BasicMarkdown（含 markdown type）** (`src/widgets/basic/BasicMarkdown.widget.js:27-39`)：
```json
{
  "value": { "title": "Markdown 内容", "category": "看板组件配置", "type": "markdown", "default": "..." },
  "mode": { "title": "渲染主题", "category": "看板组件配置", "default": "light" }
}
```

> **关键发现**: `propsEditors` 和 `wrapperEditors`（Widget 元数据的两个数组字段）在所有基础 Widget 中均为 `[]`，是预留扩展点，并非属性编辑器消费的 Schema。属性编辑器实际读取的是 `meta.props` 字段。这纠正了早期规格文档中「propEditors 驱动属性编辑器」的错误描述。

### 4.2 编辑副本生命周期

```
[面板关闭] ──watch: visible→true──→
  activeTab = 'props'
  editingProps = cloneDeep({ ...extractDefaults(meta.props), ...node.propsValues })
  editingWrapperProps = cloneDeep({ ...wrapperDefaults, ...node.wrapperValues })
    │
    ├── 表单就地修改 editingProps / editingWrapperProps（v-model 双向绑定）
    │
    ├── 点击「应用」→ emit('confirm', { id, propsValues, wrapperValues })
    │   → emit('update:visible', false)
    │   → 副本数据流入 Desktop.vue → updateWidgetProps → Object.assign(node.*Values)
    │   → rerenderNode → Widget 重新渲染
    │
    └── 点击「取消」/ 关闭抽屉 → emit('update:visible', false)
        → 副本被丢弃（watch 下次 visible→true 时重建）
```

### 4.3 wrapperPropsMeta — 固定外框属性 Schema

硬编码在 `desktop-property-panel.vue:28-31`，不来自 Widget 元数据：

```json
{
  "title": { "title": "标题", "category": "外框配置", "default": "示例组件" },
  "hideHeader": { "title": "隐藏标题栏", "category": "外框配置", "type": "boolean", "default": false }
}
```

`title` 的默认值优先级（面板 `watch` 逻辑，`desktop-property-panel.vue:50-52`）：
1. `node.wrapperValues?.title`（节点当前值）
2. `meta?.title`（Widget 元数据的 title 字段，如 "基础文字"）
3. `wrapperPropsMeta.title.default`（硬编码兜底值 "示例组件"）

## 5. 接口契约

### 5.1 desktop-property-panel（面板组件）

**源文件**: `src/components/property/desktop-property-panel.vue` (117 行)

#### Props

| 属性 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `visible` | `Boolean` | `required: true` | — | 面板显隐（v-model:visible 双向绑定） |
| `node` | `Object` | 否 | `null` | 当前编辑的 GridStackNode（null 时显示空态） |
| `meta` | `Object` | 否 | `null` | 当前组件的 WidgetMeta（null 时显示空态） |

#### Emits

| 事件 | Payload | 触发时机 |
|------|---------|----------|
| `update:visible` | `(visible: boolean)` | v-model 双向绑定：取消/关闭抽屉/应用确认后 |
| `confirm` | `{ id: string, propsValues: Record<string, any>, wrapperValues: { title: string, hideHeader: boolean } }` | 用户点击「应用」按钮，且 `node.id` 存在 |

### 5.2 desktop-property-form（表单组件）

**源文件**: `src/components/property/desktop-property-form.vue` (205 行)

#### Props

| 属性 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `value` | `Object` | `required: true` | — | 当前属性值对象（**就地修改**，不做深拷贝。调用方已通过 cloneDeep 隔离副本） |
| `props` | `Object` | 否 | `null` | 属性元数据 Schema（`Record<string, PropMeta>`） |

#### Emits

无。通过直接修改 `value` 对象的子属性（`v-model="value[entry.name]"`）回写数据。

#### 暴露方法（defineExpose）

无。

### 5.3 数据通道：面板 → Widget 的完整链路

```
1. Widget 外壳「编辑」按钮点击
   desktop-widget-wrapper emit('widget-edit', { node, meta })
   ↓
2. Desktop.vue @widget-edit="onWidgetEdit"
   widgetPropsNode = node; widgetPropsMeta = meta; widgetPropsVisible = true
   ↓
3. desktop-property-panel watch([visible, node])
   构建 editingProps / editingWrapperProps 副本
   ↓
4. desktop-property-form 渲染表单
   用户修改副本（v-model 双向绑定就地修改 editingProps）
   ↓
5. 用户点击「应用」
   panel emit('confirm', { id, propsValues, wrapperValues })
   ↓
6. Desktop.vue @confirm="onWidgetPropsConfirm"
   viewportRef.value.updateWidgetProps(payload)
   ↓
7. desktop-viewport-desktop.updateWidgetProps
   Object.assign(node.propsValues, propsValues)  // 合并到节点
   Object.assign(node.wrapperValues, wrapperValues)
   rerenderNode(node, pageIndex)                   // 触发 Widget 重渲染
   ↓
8. Desktop.vue 立即持久化
   viewportRef.value.saveAllPages() + persistConfig()
```

**关键路径验证**（`src/components/viewport/desktop-viewport-desktop.vue:331-343`）：
```js
function updateWidgetProps({ id, propsValues, wrapperValues } = {}) {
  if (!id) return
  for (let idx = 0; idx < pages.value.length; idx++) {
    const grid = getInstance(gridKey(idx))
    const node = (grid?.engine?.nodes || []).find((n) => n.id === id)
    if (!node) continue
    node.propsValues = node.propsValues || {}
    node.wrapperValues = node.wrapperValues || {}
    if (propsValues) Object.assign(node.propsValues, propsValues)
    if (wrapperValues) Object.assign(node.wrapperValues, wrapperValues)
    rerenderNode(node, idx)
    return
  }
}
```

## 6. 实现策略

### 6.1 架构模式

**Presentational Component 模式**：两个组件均为纯展示型组件（不包含业务逻辑），通过 props 接收数据、通过 emits 上报事件。状态管理完全由父组件 Desktop.vue 负责。

### 6.2 表单生成算法

```
props: Record<string, PropMeta>
  ↓ Object.entries() + computed
propEntries: [{ name, meta, title, type }]
  ↓ v-for + v-if 分支渲染
每个 entry 根据 entry.type 选择控件
```

`type` 判定顺序（`v-if`/`v-else-if` 链，`desktop-property-form.vue:101-145`）：
1. `'boolean'` → el-switch
2. `'number'` → el-input type=number（含 sanitizeNumber）
3. `'json'` → textarea（含 validateJson + 内联错误态）
4. `'markdown'` → VMarkdownEditor
5. `'custom' && entry.meta.custom` → `<component :is="">`
6. 其他（text、select、未定义）→ el-input type=text

### 6.3 值提取与保存流程

> 实现 FR-101-022

**提取**：表单通过 `v-model="value[entry.name]"` 直接将用户输入写回 `value` 对象的对应 key。无需手动提取——`value` 对象始终是表单的实时镜像。

**保存**：面板的 `editingProps` / `editingWrapperProps` ref 本身就是编辑副本。用户点击「应用」时，直接将这两个 ref 的值放入 `confirm` 载荷发出。

### 6.4 撤销 / 确认机制

| 操作 | 行为 | 代码位置 |
|------|------|----------|
| 打开面板 | `cloneDeep` 构建编辑副本 | `desktop-property-panel.vue:40-56` |
| 修改表单 | 就地修改副本（`v-model`），原始 `node.propsValues` 未受影响 | `desktop-property-form.vue:101-145` |
| 「应用」 | `emit('confirm', { id, propsValues, wrapperValues })` → 关闭面板 → Desktop.vue 执行 `updateWidgetProps` | `desktop-property-panel.vue:59-70` |
| 「取消」/ 关闭抽屉 | `emit('update:visible', false)`，副本被丢弃。下次打开时重新 cloneDeep | `desktop-property-panel.vue:73-75` |
| 退出编辑模式 | `widgetPropsVisible = false`（Desktop.vue watch desktopMode） | `Desktop.vue:149-157` |

> **无撤销栈**：本模块不维护操作历史。取消/关闭 = 丢弃编辑副本，刷新页面 = 丢失未持久化的修改（仅「应用」操作会触发即时持久化：`Desktop.vue:296-301` 中 `onWidgetPropsConfirm` 在 `updateWidgetProps` 后立即调用 `persistConfig()`）。

### 6.5 Number 安全防护详情

> 实现 FR-101-017 ~ FR-101-018

```
用户输入数值
  ↓ @change 触发 sanitizeNumber(entry)
检查 typeof val === 'number'?
  ├── YES → 跳过（已是 number，来自 v-model.number）
  └── NO  → val === '' / null / undefined → NaN
           → 其他 → Number(val) 转换
  ↓ Number.isFinite(num)?
  ├── YES → if (typeof val !== 'number') value[entry.name] = num;  // 字符串转数字
  └── NO  → value[entry.name] = entry.meta.default ?? 0;           // 回退默认
```

### 6.6 JSON 校验详情

> 实现 FR-101-019 ~ FR-101-021

```
用户输入 JSON 文本
  ↓ @change 触发 validateJson(entry)
检查 raw === '' / null / undefined?
  ├── YES → 清除 error 状态，返回
  └── NO  → try { JSON.parse(raw) }
              ├── 成功 → 清除 error 状态
              └── 失败 → jsonErrors[entry.name] = true
                        → ElMessage.error('属性「{title}」JSON 格式错误')
```

- 错误状态存储在 `reactive({})` → 模板 `:class="{ 'is-error': jsonErrors[entry.name] }"` 红框
- `watch(value)` 监听 value 整体替换（编辑目标切换）→ 清除所有错误态
- 不修改 value 内容（用户输入保留）

### 6.7 custom 类型级联编辑契约

custom 类型的自定义编辑组件接收以下 props 并应 emit 以下事件：

| Props | 类型 | 描述 |
|-------|------|------|
| `modelValue` | `any` | 当前属性的值（v-model 语法糖） |
| `propsValue` | `Record<string, any>` | 当前 Widget 的完整 propsValues 对象（用于跨属性联动编辑场景） |

| Emits | Payload | 描述 |
|-------|---------|------|
| `update:modelValue` | `(newVal: any)` | 属性值变更通知 |

当前代码库中无实际使用 custom 类型的 Widget，该特性为预留扩展能力。

## 7. 测试考量

### 7.1 建议测试范围

- **单元测试**：`sanitizeNumber` 函数（各种非法输入 → 回退默认值）、`getPropType` 类型归一化、`validateJson` JSON 校验状态机
- **组件测试**：面板打开/关闭、标签页切换、表单控件按类型渲染、空态显示
- **集成测试**：完整编辑流程（Widget 外壳「编辑」→ 修改属性 → 「应用」→ Widget 重渲染 → localStorage 持久化）
- **回归测试**：取消不修改数据、切换编辑目标不混淆、退出编辑模式自动关闭面板

### 7.2 关键边界情况

| 边界 | 行为 |
|------|------|
| `node` 为 null | 显示空态提示，禁用「应用」按钮 |
| `meta` 为 null | `meta?.props` 为 undefined → `propEntries` 为空数组 → 显示「暂无可配置属性」 |
| `meta.props` 为 undefined/空对象 | 同上 |
| `node.propsValues` 为 undefined | `...undefined` 扩展为无属性 → 仅使用默认值 |
| `propMeta.type` 为未定义值 | `getPropType` 返回 `'text'` → 渲染 el-input |
| JSON 输入为空字符串 | 清除错误态（空值通过校验） |
| number 输入为负数 / 小数 / 0 | 均通过 `Number.isFinite()` 校验，正常存储 |
| 快速连续切换编辑目标 | 每次 `visible→true` 重新 cloneDeep，不保留上次编辑残留 |

## 8. 文件清单

| 文件 | 行数 | 用途 |
|------|------|------|
| `src/components/property/desktop-property-panel.vue` | 117 | 属性编辑抽屉面板：双标签页布局、编辑副本管理、确认/取消逻辑 |
| `src/components/property/desktop-property-form.vue` | 205 | 动态属性表单：PropMeta → 编辑控件映射、number 安全防护、JSON 校验 |
| `src/components/index.js` | 18 | UI 组件自动扫描注册入口（Vite glob 扫描 `desktop-*.vue`） |

### 相关文件（非本模块，但对理解完整流程必要）

| 文件 | 行数 | 用途 |
|------|------|------|
| `src/pages/Desktop.vue` | 604 | 编排层：持有编辑状态 ref、接线 widget-edit → 打开面板、接线 confirm → updateWidgetProps + persistConfig |
| `src/components/viewport/desktop-viewport-desktop.vue` | 479 | 视口：`updateWidgetProps` 方法——Object.assign 更新节点属性 + rerenderNode 触发重渲染 |
| `src/components/viewport/desktop-widget-wrapper.vue` | 114 | Widget 外壳：渲染编辑按钮 → emit('widget-edit') |
| `src/widgets/index.js` | 89 | Widget 注册表：构建 WidgetMetas 字典（含 props 字段默认值回退） |
| `src/composables/useGridStack.js` | 194 | GridStack 实例管理：emitToWidget / registerWidgetEmitter（Widget 事件桥接） |
| `src/widgets/basic/BasicText.widget.js` | 26 | BasicText 元数据：props 声明示例（text 类型） |
| `src/widgets/basic/BasicNumber.widget.js` | 41 | BasicNumber 元数据：props 声明示例（number 类型 ×2 + text ×2） |
| `src/widgets/basic/BasicMarkdown.widget.js` | 44 | BasicMarkdown 元数据：props 声明示例（markdown 类型） |
| `src/widgets/basic/BasicImage.widget.js` | 39 | BasicImage 元数据：props 声明示例（select 类型 + options） |
| `src/widgets/basic/BasicVideo.widget.js` | 38 | BasicVideo 元数据：props 声明示例（select 类型 + options） |
