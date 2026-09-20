# 小部件系统 功能规格

> 模块: 002-widget-system
> 状态: 已实现
> 最后更新: 2026-07-19

## 1. 模块概述

### 1.1 用途 — 为什么存在这个模块

小部件系统是工作台桌面的核心扩展框架。它定义了一套元数据驱动的小部件注册、发现、展示和实例化机制，使得任何符合文件约定的小部件都能在构建时自动注册到系统中，无需修改框架代码。用户在桌面上可以浏览小部件目录、预览效果、将小部件添加到任意页面，并通过容器外壳管理小部件的生命周期。

### 1.2 解决的问题

| 痛点 | 解决方案 |
|------|---------|
| 新增小部件需要手动修改注册代码 | 基于 `import.meta.glob` 的文件对自动扫描注册 |
| 不同小部件需要统一的标题栏/操作按钮 | `desktop-widget-wrapper` 统一容器外壳 |
| 小部件预览需要脱离实际桌面环境 | 独立预览面板，用 GridStack staticGrid 展示 |
| 同一小部件有不同的预设变体 | `presets` 字段声明变体，预览和添加均支持 |
| GridStack DOM 事件需要通知到 Vue 组件树内 | `useGridStack` 的 `widgetEmitters` Map 桥接 |

### 1.3 范围

**包含:**
- Widget 元数据格式约定（`.widget.js` 文件结构）
- Widget 组件/元数据自动发现与注册
- Widget 元数据目录的响应式查询（`useWidgetMetas`）
- Widget 添加面板（分类树 + 预览网格 + 添加操作）
- Widget 容器外壳（标题栏、编辑/删除按钮、slot 内容注入）
- GridStack 事件到 Widget Vue 实例的桥接注册

**明确排除:**
- 具体 Widget 的实现（基础文字/图片/数字等 → 模块 301）
- 属性编辑面板 UI 和编辑器控件（→ 模块 101）
- GridStack 网格引擎本身（→ 模块 001）
- App 系统的注册机制（→ 模块 003，共享相同模式但独立实现）

## 2. 用户故事

- 作为**桌面用户**，我可以打开"添加组件"面板，按分类浏览所有可用小部件，预览其外观，然后点击将其添加到当前桌面页面，以便快速搭建个性化工作台。
- 作为**桌面用户**，我可以看到每个小部件的标题栏，并通过标题栏上的编辑/删除按钮管理已添加的小部件。
- 作为**组件开发者**，我只需在 `src/widgets/` 目录下创建一对 `.widget.vue` + `.widget.js` 文件，小部件就会自动出现在可用列表中，无需修改任何注册代码。
- 作为**桌面用户**，当同一小部件提供多个预设变体（如不同尺寸的时钟）时，我可以在预览面板中看到所有变体，并选择需要的版本添加。
- 作为**桌面用户**，刷新页面后，之前添加的小部件能够按保存的位置和属性恢复显示。

## 3. 功能需求

### 3.1 元数据约定与自动注册

- **FR-002-001**: 系统 MUST 支持通过 `.widget.vue` 和 `.widget.js` 文件对定义小部件，其中 `.widget.vue` 为 Vue 组件实现，`.widget.js` 为元数据声明（`src/widgets/index.js:24-25`）。
- **FR-002-002**: 系统 MUST 在构建时通过 `import.meta.glob` 自动扫描 `src/widgets/` 下所有符合命名约定的文件对，无需手动维护注册列表（`src/widgets/index.js:24-25`）。
- **FR-002-003**: 系统 MUST 从文件路径自动提取 `compName`（如 `./basic/BasicText.widget.vue` → `BasicText`），开发者 SHOULD NOT 在元数据文件中手写 `compName`（`src/widgets/index.js:28-31`）。
- **FR-002-004**: 系统 MUST 检测同名 `compName` 冲突（不同目录下同名文件对），当发生覆盖时输出 `console.warn`（`src/widgets/index.js:37-38,47-48`）。
- **FR-002-005**: 当 `.widget.js` 的 `default` 导出不是合法对象（含 `undefined`/`null`）时，系统 MUST 输出 `console.warn` 并降级为空对象，不中断注册流程（`src/widgets/index.js:51-55`）。
- **FR-002-006**: 当存在 `.widget.vue` 但缺少对应 `.widget.js` 时（孤儿组件），系统 MUST 自动生成一份最小默认元数据并输出 `console.warn` 提示（`src/widgets/index.js:73-86`）。

### 3.2 元数据默认值回退

- **FR-002-007**: 当 `category` 字段缺失时，系统 MUST 回退为 `'其他'`（`src/widgets/index.js:57`）。
- **FR-002-008**: 当 `rect` 字段缺失时，系统 MUST 回退为 `{ unit: 'grid', width: 1, height: 1 }`（`src/widgets/index.js:58`）。
- **FR-002-009**: 当 `events`、`propsEditors`、`wrapperEditors` 字段缺失时，系统 MUST 回退为空数组 `[]`（`src/widgets/index.js:59-61`）。
- **FR-002-010**: 当 `title` 字段缺失时，系统 MUST 回退为 `compName` 字符串作为占位标题（`src/widgets/index.js:66-68`）。
- **FR-002-011**: `presets` 字段不存在时，系统 MUST NOT 自动赋予默认值，保持 `undefined`（`src/widgets/index.js:56-63` 中 `presets` 不在默认值列表中）。

### 3.3 Widget 元数据响应式查询

- **FR-002-012**: 系统 MUST 提供一个响应式的 Widget 元数据查询接口，返回 `Ref<Record<string, WidgetMeta>>`，其中 key 为 `compName`，value 为完整元数据对象（`src/composables/useWidgetMetas.js:11-14`）。
- **FR-002-013**: 所有调用 `useWidgetMetas()` 的消费者 MUST 共享同一份模块级 `ref()` 实例，即读写同一份元数据（`src/composables/useWidgetMetas.js:11` 模块级声明）。

### 3.4 Widget 添加面板

- **FR-002-014**: 系统 MUST 提供一个"添加组件"面板，展示所有已注册 Widget 的分类树和预览区域（`src/components/desktop/desktop-widget-list.vue`）。
- **FR-002-015**: 分类树 MUST 按 `meta.category` 字段对 Widget 进行一级分组，分类之间按拼音排序，分类内 Widget 按 `meta.sort` 字段升序排列，sort 缺失时排至末尾（`desktop-widget-list.vue:36-54`）。
- **FR-002-016**: 当 Widget 定义了 `presets` 字段且为非空对象时，预览区域 MUST 仅展示各 preset 变体，不展示标准版入口（`desktop-widget-list.vue:79-83`）。
- **FR-002-017**: 当 Widget 未定义 `presets` 或其值为空对象时，预览区域 MUST 展示一个标准版入口（`desktop-widget-list.vue:82`）。
- **FR-002-018**: 当 Widget 元数据包含 `thumbnail` 字段且非空时，预览 MUST 使用 `<img>` 展示缩略图（`desktop-widget-list.vue:110-116`）。
- **FR-002-019**: 当 Widget 元数据无 `thumbnail` 时，预览 MUST 通过 `h()` + `render()` 实时渲染 Widget 组件（`desktop-widget-list.vue:118-132`）。
- **FR-002-020**: 预览区域的 Widget 尺寸 MUST 被 clamp 到预览网格的 6 列 × 4 行范围内（`desktop-widget-list.vue:71-72`）。
- **FR-002-021**: 用户点击预览卡片时，系统 MUST 发出 `addWidget(compName)`（标准版）或 `addWidget(compName, mergedMeta)`（preset 变体），并关闭面板（`desktop-widget-list.vue:168-181`）。
- **FR-002-022**: 面板的遮罩层被点击时，系统 MUST 发出 `close` 事件，不执行添加操作（`desktop-widget-list.vue:195`）。

### 3.5 Widget 容器外壳

- **FR-002-023**: 系统 MUST 为每个桌面上的 Widget 实例提供统一的容器外壳，包含标题栏和内容区（`desktop-widget-wrapper.vue:40-52`）。
- **FR-002-024**: 标题栏 MUST 显示 `title` 属性值作为标题文本（`desktop-widget-wrapper.vue:42`）。
- **FR-002-025**: 当 `editMode` 为 `true` 时，标题栏 MUST 显示"编辑"和"删除"按钮（`desktop-widget-wrapper.vue:43-46`）。
- **FR-002-026**: 当 `hideHeader` 为 `true` 时，整个标题栏 MUST 隐藏（`desktop-widget-wrapper.vue:41`）。
- **FR-002-027**: 点击"编辑"按钮时，系统 MUST 发出 `widget-edit` 事件，携带 `{ node, meta }` 载荷（`desktop-widget-wrapper.vue:29-30`）。
- **FR-002-028**: 点击"删除"按钮时，系统 MUST 发出 `widget-remove` 事件，携带 `node` 载荷（`desktop-widget-wrapper.vue:34-35`）。

### 3.6 GridStack 事件桥接

- **FR-002-029**: 系统 MUST 在 Widget 实例被渲染到 GridStack 节点后，注册该 Widget 的 emit 函数到 `useGridStack` 的事件桥接 Map 中（`useGridStack.js:53-56`）。
- **FR-002-030**: 当 GridStack 发生节点添加/移除/拖拽开始/拖拽结束/缩放开始/缩放结束时，系统 MUST 将事件以 `{ id, x, y, w, h }` 载荷桥接到对应 Widget 实例（`useGridStack.js:36-49,66-76,84-98`）。
- **FR-002-031**: 当 Widget 实例被移除时，系统 MUST 从事件桥接 Map 中注销该 Widget 的 emit 函数（`useGridStack.js:59-61`）。

### 3.7 Widget 实例持久化

- **FR-002-032**: 系统 MUST 在桌面配置中存储 Widget 实例数据，包含 `compName`、GridStack 节点位置信息（`x/y/w/h`）、组件属性值（`props`）和容器外壳属性（`wrapper`）（此需求由 `Desktop.vue` 统筹实现，widget-system 提供元数据和外壳支持）。
- **FR-002-033**: 系统 MUST 在页面恢复时根据配置中的 `compName` 查找对应的 Widget 元数据和组件，重新渲染（此需求由视口 `rerenderNode` 实现，widget-system 提供 `WidgetComponents` 和 `WidgetMetas` 查询能力）。

## 4. 关键实体

### 4.1 Widget Meta（Widget 元数据）

描述一个小部件类型的静态声明信息，由 `.widget.js` 文件定义。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `title` | string | 否 | `compName` | 小部件显示名称 |
| `category` | string | 否 | `'其他'` | 分类名，用于分类树分组 |
| `compName` | string | 自动注入 | 从文件路径提取 | 组件唯一标识名 |
| `avatar` | string (import) | 否 | undefined | 分类树节点图标（SVG import） |
| `thumbnail` | string | 否 | undefined | 预览缩略图 URL |
| `rect` | object | 否 | `{ unit:'grid', width:1, height:1 }` | 默认网格尺寸 |
| `props` | Record<string, PropMeta> | 否 | undefined | 组件属性定义 |
| `sort` | number | 否 | undefined | 分类内排序权重 |
| `presets` | Record<string, Partial<WidgetMeta>> | 否 | undefined | 预设变体集合 |
| `events` | array | 否 | `[]` | 预留扩展点 |
| `propsEditors` | array | 否 | `[]` | 预留扩展点 |
| `wrapperEditors` | array | 否 | `[]` | 预留扩展点 |

**PropMeta 子结构（示例自 `BasicText.widget.js:15-21`）:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 属性显示名称 |
| `category` | string | 是 | 属性分组名 |
| `default` | any | 是 | 属性默认值 |
| `type` | string | 否 | 编辑器类型（如 `'select'`），缺失时回退为文本输入 |
| `options` | array | 否 | type='select' 时的选项列表 |

### 4.2 Widget 实例

描述桌面上一个已添加的小部件的运行时数据，存储在桌面配置中。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | GridStack 节点唯一 ID |
| `compName` | string | 对应的 Widget 类型标识 |
| `x, y, w, h` | number | GridStack 网格坐标和尺寸 |
| `props` | Record<string, any> | 组件属性值（key-value pairs） |
| `wrapper` | object | 容器外壳属性（如 `{ title, hideHeader }`) |
| `presetKey` | string (可选) | 通过 preset 变体添加时携带的变体 key |

## 5. 验收场景

### 场景: 添加小部件到当前页

- Given 用户已打开工作台桌面
- When 用户打开"添加组件"面板，在左侧分类树中点击某个 Widget 名称，然后在右侧预览区域点击该 Widget 的预览卡片
- Then 面板关闭，桌面当前页面新增一个该 Widget 的实例，显示在网格布局中，带有标题栏和内容

### 场景: 通过 Widget 容器外壳编辑小部件

- Given 桌面上已有 Widget 实例，`editMode` 为 `true`
- When 用户点击标题栏上的"编辑"按钮
- Then 系统触发属性编辑流程（由模块 101 具体实现），携带当前 Widget 的 node 和 meta 信息

### 场景: 通过 Widget 容器外壳删除小部件

- Given 桌面上已有 Widget 实例，`editMode` 为 `true`
- When 用户点击标题栏上的"删除"按钮
- Then 该 Widget 从桌面网格中移除，对应 GridStack 节点被删除

### 场景: Widget 实例接收 GridStack 事件

- Given 桌面上已有 Widget 实例并已通过 `registerWidgetEmitter` 注册
- When 用户拖拽该 Widget 到新位置并松手
- Then Widget 实例收到 `grid-moving` 事件（拖拽开始时）和 `grid-moving-end` 事件（拖拽结束时），载荷包含 `{ id, x, y, w, h }`

### 场景: 新增 Widget 文件对自动被发现

- Given 开发者在 `src/widgets/basic/` 下新建 `NewWidget.widget.vue` 和 `NewWidget.widget.js`
- When Vite HMR 重新加载 `src/widgets/index.js`
- Then `NewWidget` 自动出现在 `WidgetComponents` 和 `WidgetMetas` 字典中，可在"添加组件"面板中看到

### 场景: 缺少元数据文件的 Widget 降级处理

- Given 存在 `SomeWidget.widget.vue` 但没有 `SomeWidget.widget.js`
- When 系统启动并执行自动注册
- Then 控制台输出 warning 提示缺少元数据，系统为该 Widget 生成默认元数据（`title: 'SomeWidget'`, `category: '其他'`, `rect: { width:1, height:1 }`），Widget 仍可正常添加和使用

### 场景: 通过 Preset 变体添加 Widget

- Given 某 Widget 的 `.widget.js` 声明了 `presets: { large: { rect: { width:4, height:3 } } }`
- When 用户在添加面板中选中该 Widget
- Then 预览区域仅展示 `large` 变体（不展示标准版），点击后 `addWidget` 携带合并后的 meta（含 `presetKey: 'large'`）

### 场景: 刷新后 Widget 恢复

- Given 桌面配置中保存了一个 Widget 实例（含 `compName`, `x/y/w/h`, `props`, `wrapper`）
- When 用户刷新页面
- Then 系统从配置中读取该实例数据，通过 `compName` 查找 `WidgetComponents[compName]` 获取组件，用 `h(Comp, props)` + `h(WidgetWrapper, wrapperProps)` 重新渲染到 GridStack

## 6. 非功能需求

### 6.1 性能

- Widget 元数据注册在构建时通过 `eager: true` 的 `import.meta.glob` 一次性完成，运行时无异步扫描开销（`src/widgets/index.js:24-25`）。
- Widget 列表面板的分类树和预览数据通过 `computed` 响应式计算，仅在 `widgetMetas` 或 `selectedCompName` 变化时重新计算（`desktop-widget-list.vue:36-54,76-84`）。

### 6.2 可扩展性

- `events`、`propsEditors`、`wrapperEditors` 字段预留在元数据结构中，为未来的事件系统、自定义属性编辑器、容器外壳编辑器提供扩展点（`src/widgets/basic/BasicText.widget.js:23-25`）。
- `presets` 字段支持任意 key 命名的变体，变体可覆盖元数据的任意字段（通过 `{ ...meta, ...presets[key] }` 浅合并，`desktop-widget-list.vue:83`）。

### 6.3 健壮性

- 元数据注册过程中遇到同名冲突、孤儿组件、非法导出均采用 `console.warn` + 降级策略，不抛出异常中断启动（`src/widgets/index.js:36-86`）。
- 预览渲染时若 `WidgetComponents[item.compName]` 不存在，显示"未找到"提示文本而非崩溃（`desktop-widget-list.vue:124-125`）。

## 7. 假设与约束

1. **假设**: `import.meta.glob` 在 Vite 构建环境下可用。若项目迁移到非 Vite 构建工具，需重新实现文件扫描逻辑。
2. **假设**: Widget 组件的 Vue 组件导出方式为 `export default`（而非具名导出）。注册代码取 `module.default`（`src/widgets/index.js:40`）。
3. **假设**: Widget 元数据的 `default` 导出为单层对象结构，不支持嵌套元数据或函数式元数据。
4. **约束**: Widget 组件本身不得直接操作 GridStack API、localStorage 或桌面配置状态（Constitution 第13条）。
5. **约束**: 元数据对象在注册完成后为只读，运行时消费者不得修改 `WidgetMetas` 字典中的对象（Constitution 第14条）。
6. **约束**: `compName` 由文件路径提取，不同目录下同名文件会发生冲突。实际使用中需确保同一 `compName` 只出现在一处。

## 8. 依赖关系

### 上游依赖（本模块 `import` 或引用的模块）

| 模块 | 依赖内容 | 引用位置 |
|------|---------|---------|
| 001-desktop-framework (useGridStack) | `registerWidgetEmitter` / `unregisterWidgetEmitter` / `emitToWidget` — Widget 事件桥接 | 视口 `rerenderNode` 调用（非本模块代码，但本模块设计依赖此接口） |
| Vue 3 | `ref`, `computed`, `watch`, `h`, `render`, `getCurrentInstance` | `useWidgetMetas.js`, `desktop-widget-list.vue` |
| GridStack.js v11 | `GridStack.init` 用于预览网格 | `desktop-widget-list.vue:149` |
| Vite | `import.meta.glob` 构建时文件扫描 | `src/widgets/index.js:24-25` |

### 下游依赖（依赖本模块的模块）

| 模块 | 消费内容 | 说明 |
|------|---------|------|
| 001-desktop-framework (Desktop.vue) | `WidgetComponents` + `useWidgetMetas()` | 桌面编排器消费 Widget 组件字典和元数据，用于渲染和添加 |
| 001-desktop-framework (视口) | `desktop-widget-wrapper` | 视口使用该容器外壳包裹每个 Widget 实例 |
| 101-prop-editor | `WidgetMetas[compName].props` | 属性编辑器读取 meta.props 获取属性定义，生成编辑表单 |
| 301-widget-basic-widgets | 本模块定义的文件对约定 | 具体 Widget 实现遵循本模块的 `.widget.vue` + `.widget.js` 约定 |
