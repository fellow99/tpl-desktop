# 属性编辑器（Property Editor）规格文档

> 模块: 101-prop-editor
> 状态: 已实现
> 最后更新: 2026-07-19

## 1. 模块概述

### 1.1 目的

属性编辑器为工作台提供统一的 Widget 属性可视化编辑体验。用户点击 Widget 外壳上的编辑按钮后，右侧滑出抽屉面板，面板根据 Widget 元数据中声明的 `props` 字段自动生成动态表单，支持组件属性和外框属性两个标签页的分组编辑。

### 1.2 解决的问题

- 不同类型的 Widget 有差异化的属性配置需求（文本、数字、布尔、JSON、Markdown），需要自适应切换编辑控件
- 用户同时需要修改组件自身属性（propsValues）和外壳属性（wrapperValues：标题、标题栏显隐）
- 编辑过程需要隔离副本，取消操作不应污染节点数据
- 属性类型声明分散在各 Widget 的 `.widget.js` 元数据文件中，编辑器模块必须消费元数据驱动渲染，而非在编辑器内硬编码各 Widget 的属性列表

### 1.3 范围

**包含**：
- 属性编辑抽屉面板（`desktop-property-panel`）：双标签页布局、编辑副本隔离、确认/取消操作
- 动态属性表单（`desktop-property-form`）：根据 PropMeta Schema 自动选择编辑控件
- 外框固定属性编辑：标题文字、标题栏显隐

**不包含**：
- Widget 的添加、删除、拖拽、缩放操作（属于 002-widget-system）
- Widget 内容渲染（属于 002-widget-system）
- 属性值的持久化（由 001-desktop-framework 的 Desktop.vue 编排层负责）
- 元数据注册与默认值回退（属于 002-widget-system 注册表）
- 组件选择面板 / Widget 列表面板（已从本模块移除，归属 002-widget-system）

## 2. 用户故事

- **US-101-01**: 作为用户，我可以通过点击 Widget 标题栏的「编辑」按钮打开属性编辑面板，查看和修改该 Widget 的配置属性
- **US-101-02**: 作为用户，我可以修改文本类型的属性值（如标题文字），点击「应用」后 Widget 立即按新值重新渲染
- **US-101-03**: 作为用户，我可以修改数字类型的属性值（如数值、小数位数），输入非法字符时自动回退到默认值
- **US-101-04**: 作为用户，我可以通过开关控件切换布尔类型的属性（如隐藏标题栏）
- **US-101-05**: 作为用户，我可以修改 JSON 类型的属性值，系统会校验 JSON 格式并给出错误提示
- **US-101-06**: 作为用户，我可以在 Markdown 编辑器中编辑富文本属性值
- **US-101-07**: 作为用户，我可以在属性编辑面板的「外框属性」标签页中修改 Widget 的标题文字和标题栏显隐设置
- **US-101-08**: 作为用户，我可以在编辑过程中点击「取消」或关闭抽屉，放弃本次所有修改，Widget 保持原有属性不变
- **US-101-09**: 作为用户，我可以先后编辑多个不同的 Widget，每个 Widget 的属性编辑面板打开时都显示该 Widget 当前的属性值，互不混淆
- **US-101-10**: 作为用户，在编辑模式下切换页面或退出编辑模式时，属性编辑面板自动关闭

## 3. 功能需求

### 3.1 面板生命周期

- **FR-101-001**: 系统 MUST 通过 `visible` prop 控制属性编辑面板的显隐，面板以 `el-drawer` 抽屉形式从右侧滑入，宽度 380px
- **FR-101-002**: 系统 MUST 在面板打开（`visible` 变为 `true`）或编辑目标切换（`node` 引用变化）时，根据 `meta.props` 默认值和 `node.propsValues` / `node.wrapperValues` 当前值**深拷贝**构建编辑副本，确保取消操作不影响原始节点数据
- **FR-101-003**: 系统 MUST 在编辑副本构建时，以元数据默认值兜底、节点当前值覆盖的方式合并（`{ ...defaults, ...node.propsValues }` 经 `cloneDeep` 隔离引用）
- **FR-101-004**: 系统 MUST 在用户退出编辑模式（`desktopMode` 变为 `'normal'`）时自动关闭属性编辑面板
- **FR-101-005**: 系统 MUST 在 `node` 为 null 时显示「未选择要编辑的组件」空态提示，并禁用「应用」按钮

### 3.2 标签页组织

- **FR-101-006**: 系统 MUST 在面板内提供两个标签页：「组件属性」（`name='props'`）和「外框属性」（`name='wrapper'`），默认激活「组件属性」
- **FR-101-007**: 系统 MUST 在「组件属性」标签页中渲染来自 `meta.props` 的属性元数据
- **FR-101-008**: 系统 MUST 在「外框属性」标签页中渲染固定的外框属性：标题文字（`title`，type=text）和「隐藏标题栏」（`hideHeader`，type=boolean），该 Schema 硬编码在面板组件内，不来自 Widget 元数据

### 3.3 属性元数据 Schema

- **FR-101-009**: 系统 MUST 将 `meta.props` 解析为 `Record<string, PropMeta>` 结构，其中每个 PropMeta 至少包含 `title`（属性标签）字段
- **FR-101-010**: 系统 SHOULD 支持 PropMeta 的 `type` 字段，取值包括：`'text'`、`'number'`、`'boolean'`、`'json'`、`'markdown'`、`'select'`、`'custom'`。未指定 type 或 type 为空时视为 `'text'`
- **FR-101-011**: 系统 MUST 对 type 字段进行大小写不敏感的归一化（`String(type).toLowerCase()`）
- **FR-101-012**: PropMeta MAY 包含 `default` 字段，作为属性默认值和 number 类型非法输入的回退值
- **FR-101-013**: PropMeta MAY 包含 `options` 字段（`Array<{label: string, value: any}>`），用于 `'select'` 类型（当前 select 编辑器未实现，回退为文本输入）
- **FR-101-014**: PropMeta MAY 包含 `custom` 字段（Vue 组件），用于 `'custom'` 类型时动态挂载自定义编辑组件

### 3.4 动态表单控件映射

- **FR-101-015**: 系统 MUST 根据 PropMeta.type 自动选择编辑控件，映射如下：
  - `undefined` / `'text'` → 单行文本输入（`el-input type=text`）
  - `'number'` → 数字输入（`el-input type=number`，`v-model.number`）
  - `'boolean'` → 开关控件（`el-switch`）
  - `'json'` → 等宽字体多行文本域（`<textarea>`，20 行，monospace 字体）
  - `'markdown'` → Markdown 富文本编辑器（`VMarkdownEditor`，来自 `vue3-markdown`）
  - `'custom'` → 动态组件挂载（`<component :is="propMeta.custom">`），传递 `modelValue` + `propsValue` prop，接收 `update:modelValue` 事件
  - `'select'` → 回退为单行文本输入（select 编辑器尚未实现）
  - 其他未知 type → 回退为单行文本输入
- **FR-101-016**: 系统 MUST 在属性 Schema 为空（`propEntries.length === 0`）时显示「暂无可配置属性」提示

### 3.5 Number 类型输入防护

- **FR-101-017**: 系统 MUST 在 number 类型属性的 `change` 事件中对输入值进行 `Number.isFinite()` 校验
- **FR-101-018**: 系统 MUST 在 number 类型属性输入值非法（空字符串、null、undefined、NaN、非有限数）时将值回退为 `propMeta.default ?? 0`

### 3.6 JSON 类型校验

- **FR-101-019**: 系统 MUST 在 JSON 类型属性的 `change` 事件中使用 `JSON.parse()` 校验输入值
- **FR-101-020**: 系统 MUST 在 JSON 格式校验失败时：给予输入框红色边框（`.is-error` class）+ 显示「JSON 格式错误」中文提示 + 发送 `ElMessage.error` 通知，但**不阻止用户继续输入**
- **FR-101-021**: 系统 MUST 在编辑目标切换（value 对象整体替换）时清除残留的 JSON 错误状态

### 3.7 确认与取消

- **FR-101-022**: 系统 MUST 在用户点击「应用」按钮时，通过 `confirm` 事件向父组件发送 `{ id: node.id, propsValues: editingProps, wrapperValues: editingWrapperProps }` 载荷，随后关闭面板
- **FR-101-023**: 系统 MUST 在用户点击「取消」按钮、点击抽屉遮罩层、或按 Escape 键关闭抽屉时，**不**发送 `confirm` 事件，仅通过 `update:visible` 关闭面板，编辑副本被丢弃
- **FR-101-024**: 系统 MUST 在 `node.id` 为空时（空态兜底），点击「应用」仅关闭面板不发送 confirm

## 4. 关键实体

### 4.1 PropMeta — 属性元数据定义

| 字段 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `title` | `string` | MUST | — | 属性中文标签，渲染为表单字段 label |
| `category` | `string` | MAY | — | 分类标签（当前无实际渲染用途，未来可用于分组） |
| `type` | `string` | 否 | `'text'` | 编辑器类型标识（大小写不敏感） |
| `default` | `any` | 否 | — | 默认值，number 类型非法输入回退值 |
| `options` | `Array<{label, value}>` | 否（仅 select） | — | select 类型选项列表 |
| `custom` | `Component` | 否（仅 custom） | — | 自定义编辑器的 Vue 组件引用 |

### 4.2 编辑会话（Editing Session）

面板打开时构建的临时编辑上下文，包含：

| 字段 | 类型 | 来源 | 描述 |
|------|------|------|------|
| `editingProps` | `Record<string, any>` | `cloneDeep({ ...meta.props defaults, ...node.propsValues })` | 组件属性的编辑副本 |
| `editingWrapperProps` | `{ title, hideHeader }` | `cloneDeep({ ...wrapperDefaults, ...node.wrapperValues })` | 外框属性的编辑副本 |
| `activeTab` | `'props' \| 'wrapper'` | 初始为 `'props'` | 当前激活的标签页 |

### 4.3 confirm 事件载荷

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | `string` | 目标 GridStackNode 的 ID |
| `propsValues` | `Record<string, any>` | 用户确认的组件属性值 |
| `wrapperValues` | `{ title, hideHeader }` | 用户确认的外框属性值 |

## 5. 验收场景

### 场景 5.1: 打开属性编辑面板

- **Given** 用户在编辑模式下，桌面上有一个「基础文字」Widget
- **When** 用户点击该 Widget 标题栏的「编辑」按钮
- **Then** 右侧滑出 380px 宽的属性编辑抽屉，标题为「属性编辑」，默认激活「组件属性」标签页，「文本内容」字段显示当前 Widget 的文字值

### 场景 5.2: 修改文本值并保存

- **Given** 属性编辑面板已打开，「组件属性」标签页显示「文本内容」字段值为 "这是一段文字"
- **When** 用户将「文本内容」修改为 "Hello World"，点击「应用」
- **Then** 面板关闭，Widget 内容立即刷新显示 "Hello World"

### 场景 5.3: 修改数字值并保存

- **Given** 属性编辑面板已打开，编辑「滚动数字」Widget，「数值」字段当前值为 123.456
- **When** 用户将「数值」修改为 999.99，点击「应用」
- **Then** 面板关闭，Widget 显示新数值 999.99

### 场景 5.4: 数字输入非法值回退

- **Given** 属性编辑面板已打开，「滚动数字」Widget 的「数值」字段当前值为 123.456
- **When** 用户清空「数值」字段内容，焦点离开该输入框
- **Then** 字段自动回退为元数据默认值 123.456（即 `propMeta.default`）

### 场景 5.5: 修改布尔值（开关）

- **Given** 属性编辑面板已打开，「外框属性」标签页中「隐藏标题栏」开关当前为关闭状态
- **When** 用户打开「隐藏标题栏」开关，点击「应用」
- **Then** Widget 标题栏隐藏

### 场景 5.6: Markdown 内容编辑

- **Given** 属性编辑面板已打开，编辑「Markdown文字」Widget
- **When** 用户在 `VMarkdownEditor` 中修改 Markdown 内容
- **Then** Widget 重新渲染后显示更新后的富文本内容

### 场景 5.7: JSON 格式校验

- **Given** 属性编辑面板已打开（假设某 Widget 声明了 type='json' 的属性）
- **When** 用户输入非法 JSON 字符串（如 `{key: value}`），焦点离开输入框
- **Then** 输入框显示红色边框，下方显示「JSON 格式错误」提示，同时弹出 ElMessage.error 通知，但用户的输入内容保留在输入框中

### 场景 5.8: 取消编辑

- **Given** 属性编辑面板已打开，用户将「文本内容」从 "Hello" 修改为 "Modified"
- **When** 用户点击「取消」按钮（或点击遮罩层关闭抽屉）
- **Then** 面板关闭，Widget 内容仍显示 "Hello"，修改被丢弃

### 场景 5.9: 切换编辑目标

- **Given** 面板正在编辑 Widget A（文本内容 = "AAA"）
- **When** 用户不关闭面板，直接点击 Widget B 的「编辑」按钮
- **Then** 面板内容刷新为 Widget B 的属性值（文本内容 = "BBB"），不显示 Widget A 的编辑残留

### 场景 5.10: 修改外框标题

- **Given** 属性编辑面板已打开，切换到「外框属性」标签页
- **When** 用户将「标题」字段从 "示例组件" 修改为 "我的面板"，点击「应用」
- **Then** Widget 标题栏文字更新为 "我的面板"

### 场景 5.11: 未选择组件的空态

- **Given** 系统处于异常状态导致属性面板 `node` 为 null
- **When** 面板渲染
- **Then** 显示「未选择要编辑的组件」空态提示，「应用」按钮禁用

## 6. 非功能需求

- **NFR-101-001**: 属性编辑面板打开/关闭动画 MUST 流畅，使用 Element Plus `el-drawer` 内置过渡效果
- **NFR-101-002**: 属性表单 MUST 响应式更新——修改表单控件值时编辑副本立即同步，无需额外提交步骤
- **NFR-101-003**: JSON 校验 MUST 在用户焦点离开输入框（change 事件）时触发，不阻止用户输入
- **NFR-101-004**: 主题兼容：所有颜色 MUST 通过 `--desktop-*` CSS 变量引用，支持浅色/深色主题切换

## 7. 假设与约束

- **A-101-001**: 所有 Widget 的 `meta.props` 采用 `Record<string, PropMeta>` 结构，key 为属性名，value 为属性元数据对象
- **A-101-002**: `propsEditors` 和 `wrapperEditors` 字段（Widget 元数据中的数组类型字段）为预留扩展点，当前代码中无消费逻辑，属性编辑器实际读取的是 `meta.props` 字段
- **A-101-003**: 外框属性集是固定的（title + hideHeader），不由 Widget 元数据声明，未来如需扩展可改为从 `meta.wrapperEditors` 或 `meta.wrapperProps` 读取
- **A-101-004**: 属性面板的父组件（Desktop.vue）负责将 `confirm` 载荷传递给视口的 `updateWidgetProps` 方法，并负责后续的持久化——面板本身不持有持久化逻辑
- **A-101-005**: `'select'` 类型虽有元数据中的 `options` 字段支持，但编辑器尚未实现下拉选择控件，当前回退为文本输入。这是已知的功能缺口

## 8. 依赖关系

### 8.1 上游依赖（本模块依赖）

| 模块 | 依赖内容 |
|------|----------|
| 001-desktop-framework | Desktop.vue 提供 `node`（GridStackNode）、`meta`（WidgetMeta）、`visible` 控制，接收 `confirm` 事件 |
| 002-widget-system | Widget 元数据中的 `props` 字段 Schema 定义；Widget 组件属性从 `node.propsValues` 读取 |

### 8.2 下游依赖（依赖本模块）

| 模块 | 消费方式 |
|------|----------|
| 001-desktop-framework | 在模板中挂载 `<desktop-property-panel>`，通过 `@confirm="onWidgetPropsConfirm"` 接收编辑结果 |
| 301-widget-basic-widgets | 各 Widget 的 `meta.props` 声明被本模块消费以生成表单 |

### 8.3 不依赖

- 不依赖 `jsonpath-plus`（代码中无该包引用，属性路径解析使用直接的 `value[propName]` 键访问）
- 不依赖 `mitt` 事件总线（数据流通过 Vue props/emits）
- 不依赖 `useGridStack` composable（面板不直接操作 GridStack 实例）
