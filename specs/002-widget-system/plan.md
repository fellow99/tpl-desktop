# 002-widget-system 技术方案

> 本文档为逆向整理的技术方案，记录小部件系统的实际架构、设计决策和实现策略。
> 模块: 002-widget-system
> 对应规格: [spec.md](./spec.md)
> 最后更新: 2026-07-19

## 1. 技术上下文

### 1.1 运行环境

- **构建时**: Vite 7，利用 `import.meta.glob` 的 `{ eager: true }` 模式在模块加载时同步完成文件扫描和注册。
- **运行时**: 浏览器（Vue 3 Composition API），所有注册结果以 JavaScript 对象和 Map 形式驻留在内存中。
- **依赖注入**: 预览面板中通过 `getCurrentInstance()?.appContext` 获取当前应用的 `appContext`，确保 `h()` + `render()` 创建的 VNode 能访问全局注册的组件和插件（`desktop-widget-list.vue:31`）。

### 1.2 直接依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| Vue 3 | (peer) | `ref`, `computed`, `watch`, `h`, `render`, `getCurrentInstance`, `onMounted`, `onBeforeUnmount`, `nextTick` |
| GridStack.js | v11 | 预览网格的 `GridStack.init`（`staticGrid: true`） |
| gridstack CSS | v11 | `gridstack.min.css` + `gridstack-extra.min.css` |
| Element Plus | (peer) | `el-tree` 组件（小部件分类树） |
| Vite | 7 | `import.meta.glob` 构建时扫描 |

## 2. 宪法合规检查

| 宪法条款 | 状态 | 证据 / 说明 |
|---------|------|-------------|
| 第1条: 元数据驱动的组件扩展 | ✅ 合规 | `src/widgets/index.js:24-25` — 通过 `import.meta.glob` 自动扫描 `*.widget.vue` / `*.widget.js` 文件对 |
| 第2条: 宿主与内容分离 | ✅ 合规 | `desktop-widget-wrapper.vue` — 容器外壳负责标题栏和操作按钮，Widget 内容通过 `<slot>` 注入 |
| 第3条: 模块级单例共享状态 | ✅ 合规 | `useWidgetMetas.js:11` — 模块级 `ref(WidgetMetas)`，所有调用方共享同一实例 |
| 第4条: VNode 渲染与 GridStack 共存 | ✅ 合规 | `desktop-widget-list.vue:99-132` — 预览使用 `h()` + `render()` 模式，不在模板中渲染 GridStack 内容 |
| 第5条: Props/Emits 单向数据流 | ✅ 合规 | `desktop-widget-wrapper.vue:13-26` — props 接收数据，emits 上报事件。桥接层 `registerWidgetEmitter` 为 GridStack DOM → Vue 事件的必要例外 |
| 第7条: Composition API | ✅ 合规 | 所有 `.vue` 文件使用 `<script setup>` |
| 第8条: 命名约定 | ✅ 合规 | 文件命名遵循 `*.widget.vue` / `*.widget.js` 约定；`compName` 由路径自动提取 |
| 第9条: CSS 变量体系 | ✅ 合规 | `desktop-widget-wrapper.vue:57-113` 全部使用 `--desktop-*` 变量 |
| 第10条: CSS 作用域 | ✅ 合规 | 所有样式使用 `<style scoped lang="scss">` |
| 第11条: 元数据默认值回退 | ✅ 合规 | `src/widgets/index.js:56-69` — 完整默认值回退；`src/widgets/index.js:72-86` — 孤儿组件补全 |
| 第13条: Widget 不得接触桌面状态 | ✅ 合规 | Widget 组件本身不在此模块范围内，但容器外壳 `desktop-widget-wrapper` 仅通过 props/emits 交互 |
| 第14条: 只读元数据消费 | ✅ 合规 | `useWidgetMetas` 返回 `ref()` 包装的响应式引用，消费者只读不写 |

异常项: 无违反项。

## 3. 关键决策

### 3.1 元数据与组件分离（`.widget.js` + `.widget.vue` 文件对）

**决策**: 将小部件的声明信息（元数据）与渲染实现（Vue 组件）分拆为两个文件。

**理由**:
- 元数据可在不加载 Vue 组件的情况下被消费（如分类树构建、属性编辑器配置读取）。
- 组件文件可以独立使用 `<script setup>` 和 SCSS，无需嵌入静态对象导出。
- `events`、`propsEditors`、`wrapperEditors` 等预留字段为未来扩展保留空间，不影响组件代码。

**实现**: `src/widgets/index.js` 分别用两个 `import.meta.glob` 扫描 `.vue` 和 `.js` 文件，通过文件名提取 `compName` 进行配对。

### 3.2 构建时 Eager 扫描 vs 运行时动态注册

**决策**: 使用 `import.meta.glob('./**/*.widget.vue', { eager: true })` 在模块加载时一次性同步完成扫描。

**理由**:
- `eager: true` 确保 `WidgetComponents` 和 `WidgetMetas` 在模块导出时已完全填充，消费者无需处理异步。
- 对于编译时已知的文件集合，eager 模式无额外运行时开销。
- 预热所有 Widget 组件的模块缓存，首次添加到桌面时无异步加载延迟。

**替代方案**: 懒加载 (`{ eager: false }`) 可减小初始 bundle，但会导致首次添加 Widget 时有异步加载延迟，且无法直接构建全量元数据字典供分类树使用。

### 3.3 预览面板使用独立 GridStack 实例（staticGrid）

**决策**: Widget 添加面板内嵌一个独立的 GridStack 预览网格（`column: 6, cellHeight: 100, staticGrid: true, disableDrag: true, disableResize: true`）。

**理由**:
- `staticGrid: true` 确保预览卡片不会被意外移动或缩放。
- 独立 GridStack 实例与桌面主网格完全隔离，生命周期由面板自身的 `onBeforeUnmount` 管理（`desktop-widget-list.vue:134-158,187-189`）。
- 尺寸 clamp 到 6×4 防止超宽/超高 Widget 的预览撑破面板布局（`desktop-widget-list.vue:71-72`）。

### 3.4 预览的缩略图 vs 实时渲染双通道

**决策**: 预览卡片优先使用 `meta.thumbnail` 的 `<img>` 展示；无缩略图时通过 `h()` + `render()` 实时挂载 Widget 组件（`desktop-widget-list.vue:110-132`）。

**理由**:
- 缩略图通道避免对复杂 Widget 的运行时渲染开销，适合资源密集或依赖外部数据的 Widget。
- 实时渲染通道确保简单 Widget（如基础文字）能得到 1:1 的真实预览效果。
- 实时渲染的 VNode 通过 `appContext` 绑定确保 Element Plus 等全局组件可用（`desktop-widget-list.vue:130`）。

### 3.5 Preset 变体机制

**决策**: Widget 元数据可通过 `presets` 字段声明多个变体，预览面板检测到非空 `presets` 时仅展示变体而不展示标准版。

**理由**:
- 同一 Widget 在不同场景下可能需要不同的默认尺寸或属性值（如"大时钟" vs "小时钟"）。
- `{ ...meta, ...presets[key] }` 浅合并允许变体覆盖 `rect`、`props` 默认值等字段（`desktop-widget-list.vue:83`）。
- 添加时携带 `presetKey` 便于桌面配置记录用户选择的具体变体。

## 4. 数据模型

### 4.1 WidgetMeta 完整结构

```js
// src/widgets/index.js:56-69 — 实际构建逻辑
{
  compName: string,           // 自动注入，从文件路径提取 (line 63)
  title: string,              // 默认回退为 compName (line 66-68)
  category: string,           // 默认 '其他' (line 57)
  avatar: string | undefined, // SVG import，用于分类树图标
  thumbnail: string | null,   // 预览缩略图 URL
  rect: {
    unit: 'grid',             // 固定 'grid'
    width: number,            // 默认 1 (line 58)
    height: number,           // 默认 1 (line 58)
  },
  props: Record<string, {     // 组件属性定义
    title: string,            // 属性显示名称
    category: string,         // 属性分组
    default: any,             // 属性默认值
    type?: string,            // 编辑器类型 (如 'select')
    options?: Array<{         // type='select' 时的选项
      label: string,
      value: string,
    }>,
  }>,
  sort: number | undefined,   // 分类内排序权重
  presets: Record<string, Partial<WidgetMeta>> | undefined,  // 预设变体
  events: Array,              // 预留扩展点，默认 [] (line 59)
  propsEditors: Array,        // 预留扩展点，默认 [] (line 60)
  wrapperEditors: Array,      // 预留扩展点，默认 [] (line 61)
}
```

### 4.2 Widget 实例数据结构（desktopConfig 中）

```js
// 由 Desktop.vue 管理，本模块定义其消费者契约
{
  id: string,              // GridStack node id，唯一标识
  compName: string,        // 对应 WidgetMetas 中的 key
  x: number, y: number,    // 网格位置（列/行）
  w: number, h: number,    // 网格宽/高
  props: {                 // 组件属性值（运行时 + 可持久化）
    [key: string]: any,
  },
  wrapper: {               // 容器外壳属性
    title?: string,        // 覆盖 meta.title
    hideHeader?: boolean,   // 是否隐藏标题栏
    // 其他外壳属性可扩展
  },
  presetKey?: string,      // 若通过 preset 变体添加
}
```

### 4.3 状态转换: Widget 实例生命周期

```
[用户点击添加] → addWidget(compName) 或 addWidget(compName, mergedMeta)
  → Desktop.vue 创建实例数据 + 写入 desktopConfig + 保存
    → GridStack.addWidget() 创建 DOM 节点
      → rerenderNode() 创建 VNode(WidgetWrapper + Widget组件) + render()
        → registerWidgetEmitter(nodeId, emit)   ← 桥接注册
          → [运行时: 编辑/拖拽/缩放/移除]
            → [移除时] → GridStack.removeWidget()
              → emitToWidget(node.id, 'grid-removing')
                → unregisterWidgetEmitter(nodeId)
                  → 从 desktopConfig 移除 → 保存
```

### 4.4 验证规则

| 字段 | 规则 | 来源 |
|------|------|------|
| `compName` | 由文件路径提取，自动注入；元数据文件中手写无效 | `src/widgets/index.js:28-31,63` |
| `category` | 字符串，空值回退为 `'其他'` | `src/widgets/index.js:57`, `desktop-widget-list.vue:40` |
| `rect.width` / `rect.height` | 正整数，预览时 clamp 到 6×4 | `desktop-widget-list.vue:71-72` |
| `props` | 可选，Record 类型；属性定义至少需包含 `title` 和 `default` | `BasicText.widget.js:15-21` |
| `default` 导出 | 必须为非 null 对象；否则降级为空对象 | `src/widgets/index.js:52-55` |

## 5. 接口契约

### 5.1 提供的接口

#### `src/widgets/index.js` 导出

| 导出名 | 类型 | 说明 |
|--------|------|------|
| `WidgetComponents` | `Record<string, Component>` | compName → Vue 组件字典。视口通过此字典获取 Widget 组件用于 `h(Comp, props)` 渲染。 |
| `WidgetMetas` | `Record<string, WidgetMeta>` | compName → 完整元数据字典。分类树、属性编辑器等通过此字典获取 Widget 声明信息。 |
| `Components` | `Record<string, Component>` | `WidgetComponents` 的别名导出，供 `src/components/index.js` 全局注册（`src/widgets/index.js:89`）。 |

#### `useWidgetMetas()` composable

| 导出 | 类型 | 说明 |
|------|------|------|
| `widgetMetas` | `Ref<Record<string, WidgetMeta>>` | `WidgetMetas` 的响应式包装。消费者可通过 `.value` 或模板中自动解包访问。 |

#### `desktop-widget-wrapper` Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | String | `'面板'` | 标题栏文本（`desktop-widget-wrapper.vue:15`） |
| `hideHeader` | Boolean | `false` | 完全隐藏标题栏（line 17） |
| `editMode` | Boolean | `true` | 是否显示编辑/删除按钮（line 19） |
| `node` | Object | `null` | GridStackNode 引用，emit 载荷接线用（line 21） |
| `meta` | Object | `null` | WidgetMeta 引用，emit 载荷接线用（line 23） |

#### `desktop-widget-wrapper` Emits

| 事件名 | 载荷 | 说明 |
|--------|------|------|
| `widget-edit` | `{ node, meta }` | 点击"编辑"按钮时发出（line 30） |
| `widget-remove` | `node` | 点击"删除"按钮时发出（line 35） |

#### `desktop-widget-list` Emits

| 事件名 | 载荷 | 说明 |
|--------|------|------|
| `addWidget` | `(compName: string)` | 标准版添加（line 178） |
| `addWidget` | `(compName: string, mergedMeta: object)` | Preset 变体添加，mergedMeta 含 `presetKey`（line 176） |
| `close` | (无) | 关闭面板请求（line 27） |

### 5.2 消费的接口

#### `useGridStack` — Widget 事件桥接

| 函数 | 签名 | 消费位置 |
|------|------|---------|
| `registerWidgetEmitter` | `(nodeId: string, emit: Function) => void` | 视口 `rerenderNode` 中，渲染完成后注册 Widget 的 `$emit`（`useGridStack.js:53-56`） |
| `unregisterWidgetEmitter` | `(nodeId: string) => void` | Widget 移除时注销（`useGridStack.js:59-61`） |
| `emitToWidget` | `(nodeId: string, eventName: string, payload: object) => void` | GridStack 事件发生时单向通知（`useGridStack.js:36-41`） |
| `broadcastToAllWidgets` | `(eventName: string, payload: object) => void` | 全局广播（如 theme 变化）（`useGridStack.js:44-50`） |

#### Widget 实例接收到的事件（通过 `emitToWidget` 推送）

| 事件名 | 载荷 | 触发时机 |
|--------|------|---------|
| `grid-added` | `{ id, x, y, w, h }` | 节点被添加到网格后（`useGridStack.js:69`） |
| `grid-removing` | `{ id }` | 节点即将被移除前（`useGridStack.js:75`） |
| `grid-moving` | `{ id, x, y, w, h }` | 拖拽开始时（`useGridStack.js:92`） |
| `grid-moving-end` | `{ id, x, y, w, h }` | 拖拽结束时（`useGridStack.js:92`） |
| `grid-resizing` | `{ id, x, y, w, h }` | 缩放开始时（`useGridStack.js:93`） |
| `grid-resizing-end` | `{ id, x, y, w, h }` | 缩放结束时（`useGridStack.js:93`） |
| `grid-active` | `{ id }` | 页面被激活时（`useGridStack.js:161`） |
| `grid-deactive` | `{ id }` | 页面被停用时（`useGridStack.js:161`） |

### 5.3 内部模块边界

```
src/widgets/index.js          ← 注册入口（构建时执行一次）
       ↓ (导入)
src/composables/useWidgetMetas.js  ← 响应式包装层
       ↓ (导入)
src/components/desktop/desktop-widget-list.vue  ← 添加面板
       ↓ (emit addWidget)
Desktop.vue  ← 编排器（模块 001）
       ↓ (添加实例 + rerenderNode)
src/components/viewport/desktop-widget-wrapper.vue  ← 容器外壳
       ↑ (h() + render())
WidgetComponents[compName]  ← 具体 Widget 组件（模块 301）
```

## 6. 实现策略

### 6.1 架构模式

**元数据驱动 + 自动注册**: 每个 Widget 是自我描述的——`.widget.js` 声明元数据，`.widget.vue` 提供渲染实现。注册中心 `/src/widgets/index.js` 在构建时通过 glob 一次性收集所有 Widget 的类型信息，消费者通过字典查询而非 import 具体文件。

### 6.2 compName 提取算法

```
输入: './basic/BasicText.widget.vue'
步骤:
  1. 正则替换去除前缀 './' 和后缀 '.widget.vue' 或 '.widget.js'
     → 'basic/BasicText'
  2. 取最后一个 '/' 之后的部分
     → 'BasicText'
输出: 'BasicText'
```
实现: `src/widgets/index.js:28-31`

### 6.3 元数据默认值回退策略

```js
// src/widgets/index.js:56-69 — 实际构建逻辑
const meta = {
  category: '其他',                       // 硬默认
  rect: { unit: 'grid', width: 1, height: 1 },  // 硬默认
  events: [],                             // 硬默认
  propsEditors: [],                       // 硬默认
  wrapperEditors: [],                     // 硬默认
  ...(isValidMeta ? raw : {}),           // 合法导出覆盖
  compName,                               // 强制注入
}
if (!meta.title) meta.title = compName    // title 缺失时回退
```
注意: `presets` 不在硬默认列表中，未定义时保持 `undefined`（这确保 `Object.keys(presets).length === 0` 判断成立，触发标准版入口）。

### 6.4 预览 Panel 布局: aside-main 模式

面板使用固定定位的 `aside-main` 布局（非 `el-dialog`）:
- 左侧 `aside`: 220px 固定宽度，`el-tree` 分类树（`desktop-widget-list.vue:298-309`）
- 右侧 `main`: 自适应宽度，GridStack 预览网格（`desktop-widget-list.vue:331-337`）
- 面板尺寸: `60vw × 70vh`，`max 90vw / 80vh`（`desktop-widget-list.vue:251-253`）
- 遮罩层: `position: fixed; inset: 0; background: rgba(0,0,0,0.4)`，点击关闭（`desktop-widget-list.vue:237-241`）

### 6.5 预览网格生命周期

```
watch(selectedCompName) 变化
  → nextTick()
    → destroyGrid()          // 先销毁旧 GridStack 实例，render(null) 清理所有 VNode
    → buildGrid()
      → GridStack.init(...)  // 新建 staticGrid 实例
      → grid.on('added')     // 绑定 rerenderPreviewNode 回调
      → grid.addWidget(...)  // 为每个 previewItems 创建节点（触发 added）
```

实现: `desktop-widget-list.vue:134-164`

### 6.6 预览内容渲染

```js
// desktop-widget-list.vue:99-132
function rerenderPreviewNode(node) {
  // 1. 先卸载旧内容 render(null, contentEl)
  // 2. 按优先级: 有 thumbnail → <img>; 无 thumbnail → h(Comp, props) + render()
  // 3. 底部标注: "{presetKey 或 title}（{w}×{h}）"
  // 4. VNode 绑定 appContext 确保全局组件可用
}
```

### 6.7 错误处理

| 场景 | 策略 | 位置 |
|------|------|------|
| 同名 compName 冲突 | `console.warn` + 后扫描覆盖先扫描 | `src/widgets/index.js:37-38,47-48` |
| 孤儿 .widget.vue (无 .js) | `console.warn` + 自动生成最小默认元数据 | `src/widgets/index.js:73-86` |
| `.widget.js` 非法 default 导出 | `console.warn` + 降级为空对象 | `src/widgets/index.js:52-55` |
| 预览时 compName 对应的组件不存在 | 显示"未找到"占位文本 | `desktop-widget-list.vue:124-125` |
| GridStack.init 失败 | 在初始化端（`useGridStack.js:102-116`）由 `try-catch` 处理，预览面板中的调用不额外包裹 |

## 7. 测试考量

### 7.1 可测试性

- `src/widgets/index.js` 为纯逻辑模块（无 DOM 依赖），单元测试可 mock `import.meta.glob` 返回值验证注册逻辑。
- `desktop-widget-wrapper.vue` 为纯展示组件，仅依赖 props/emits，适合组件测试。
- `desktop-widget-list.vue` 依赖 GridStack.js DOM 操作和 `h()` + `render()`，适合集成测试或 E2E 测试。

### 7.2 建议测试类别

| 类别 | 覆盖范围 |
|------|---------|
| 单元测试 | Widget 元数据默认值回退、compName 提取、孤儿处理、非法导出降级 |
| 组件测试 | WidgetWrapper 的 props 渲染、emits 触发、editMode/hideHeader 切换 |
| 集成测试 | WidgetList 的分类树构建、preset 变体预览、addWidget emit |
| E2E 测试 | 从打开面板到添加 Widget 到桌面的完整流程 |

### 7.3 边界与异常场景

- 零 Widget 注册时的面板行为（空分类树）
- 单分类、单 Widget 的极限展示
- `presets` 为空对象 `{}` 时的处理
- 超长 title 在标题栏中的省略号截断
- 预览面板快速切换 Widget 时的 GridStack 重建竞态

## 8. 文件清单

| 文件 | 用途 | 行数 |
|------|------|------|
| `src/widgets/index.js` | Widget 自动扫描注册入口，构建 WidgetComponents + WidgetMetas 字典 | 89 |
| `src/composables/useWidgetMetas.js` | Widget 元数据响应式查询 composable（模块级单例） | 15 |
| `src/components/viewport/desktop-widget-wrapper.vue` | Widget 容器外壳（标题栏 + 操作按钮 + slot 内容） | 114 |
| `src/components/desktop/desktop-widget-list.vue` | Widget 添加面板（分类树 + 预览网格 + 添加操作） | 350 |
| `src/composables/useGridStack.js` (widget 桥接部分) | `registerWidgetEmitter` / `unregisterWidgetEmitter` / `emitToWidget` / `broadcastToAllWidgets`（共 194 行，本模块消费约 26 行） | 194 |

> 注: `useGridStack.js` 属于模块 001-desktop-framework，此处仅列出其被本模块消费的接口部分。
