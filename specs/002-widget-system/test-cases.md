# 002-widget-system 测试用例

> 模块: 002-widget-system
> 状态: 已实现
> 最后更新: 2026-07-19
> 对应规格: [spec.md](./spec.md)
> 对应方案: [plan.md](./plan.md)

## 用例索引

| 编号 | 用例名称 | 优先级 |
|------|---------|--------|
| TC-002-001 | 小部件列表按分类展示 | P0 |
| TC-002-002 | 小部件分类树排序 | P1 |
| TC-002-003 | 选择 Widget 后预览区展示标准版入口 | P0 |
| TC-002-004 | 有 presets 时仅展示变体入口 | P1 |
| TC-002-005 | 含 thumbnail 时预览显示缩略图 | P2 |
| TC-002-006 | 无 thumbnail 时预览实时渲染组件 | P1 |
| TC-002-007 | 点击预览卡片添加标准版 Widget | P0 |
| TC-002-008 | 点击预览卡片添加 preset 变体 Widget | P1 |
| TC-002-009 | 点击遮罩层关闭面板 | P2 |
| TC-002-010 | 预览面板切换 Widget 时重建网格 | P1 |
| TC-002-011 | Widget 容器外壳显示标题和操作按钮 | P0 |
| TC-002-012 | 点击编辑按钮发出 widget-edit 事件 | P0 |
| TC-002-013 | 点击删除按钮发出 widget-remove 事件 | P0 |
| TC-002-014 | hideHeader 为 true 时隐藏标题栏 | P2 |
| TC-002-015 | editMode 为 false 时隐藏操作按钮 | P2 |
| TC-002-016 | Widget 实例接收 grid-moving / grid-moving-end 事件 | P1 |
| TC-002-017 | Widget 移除时注销事件桥接 | P1 |
| TC-002-018 | 缺少 .widget.js 的孤儿组件自动生成默认元数据 | P1 |
| TC-002-019 | .widget.js 非法 default 导出时降级 | P2 |
| TC-002-020 | title 缺失时回退为 compName | P2 |
| TC-002-021 | category 为空时回退为 "其他" | P2 |
| TC-002-022 | 刷新页面后 Widget 按配置恢复 | P0 |

---

## 测试用例

### TC-002-001: 小部件列表按分类展示

| 项目 | 内容 |
|------|------|
| **优先级** | P0 |
| **关联需求** | FR-002-012, FR-002-014, FR-002-015 |
| **前置条件** | 系统已注册至少 2 个不同 category 的 Widget（如 `'3.基础组件'` 下的 BasicText 和 `'其他'` 下的 Widget） |
| **测试步骤** | 1. 打开"添加组件"面板<br>2. 观察左侧 el-tree 结构 |
| **预期结果** | 左侧分类树按 category 值显示为一级节点，每个分类下的 Widget 标题显示为二级叶子节点。一级节点可展开/折叠。 |
| **验证依据** | `desktop-widget-list.vue:36-54` — `treeData` computed 按 category 分组；`desktop-widget-list.vue:202-219` — el-tree 模板渲染 |

### TC-002-002: 小部件分类树排序

| 项目 | 内容 |
|------|------|
| **优先级** | P1 |
| **关联需求** | FR-002-015 |
| **前置条件** | 系统有多个分类和多于 1 个 Widget。部分 Widget 声明了 `sort` 字段，部分未声明。 |
| **测试步骤** | 1. 打开"添加组件"面板<br>2. 观察分类的排列顺序<br>3. 观察同一分类下 Widget 的排列顺序 |
| **预期结果** | 分类按 `localeCompare` 拼音排序。同一分类内 Widget 按 `meta.sort` 升序排列，`sort` 缺失的排到末尾（`MAX_SAFE_INTEGER`）。`sort` 相同时按 `label` 拼音排序。 |
| **验证依据** | `desktop-widget-list.vue:45` — 分类排序；`desktop-widget-list.vue:48-52` — Widget 内排序 |

### TC-002-003: 选择 Widget 后预览区展示标准版入口

| 项目 | 内容 |
|------|------|
| **优先级** | P0 |
| **关联需求** | FR-002-017 |
| **前置条件** | 存在一个未定义 `presets` 或 `presets` 为空对象 `{}` 的 Widget（如 BasicText，其 `presets` 为 undefined） |
| **测试步骤** | 1. 打开"添加组件"面板<br>2. 在左侧分类树中点击该 Widget<br>3. 观察右侧预览区域 |
| **预期结果** | 预览区域渲染一个标准版入口卡片，尺寸取自 `meta.rect` 并 clamp 到 6×4。卡片底部标注显示 Widget title + 尺寸，如"基础文字（1×1）"。 |
| **验证依据** | `desktop-widget-list.vue:82` — 无 presets 时返回 `[makePreviewItem(meta, null)]`；`desktop-widget-list.vue:108` — 标注格式 |

### TC-002-004: 有 presets 时仅展示变体入口

| 项目 | 内容 |
|------|------|
| **优先级** | P1 |
| **关联需求** | FR-002-016 |
| **前置条件** | 存在一个定义了非空 `presets` 对象（如 `{ large: { rect: { width:4, height:3 } } }`）的 Widget |
| **测试步骤** | 1. 打开"添加组件"面板<br>2. 在左侧分类树中点击该 Widget<br>3. 观察右侧预览区域 |
| **预期结果** | 预览区域仅渲染各 preset 变体的入口卡片（如 `large` 变体），不出现标准版入口。卡片底部标注显示 preset key（如 `large`）。 |
| **验证依据** | `desktop-widget-list.vue:82-83` — `presetKeys.length` 非零时 `return presetKeys.map(...)` |

### TC-002-005: 含 thumbnail 时预览显示缩略图

| 项目 | 内容 |
|------|------|
| **优先级** | P2 |
| **关联需求** | FR-002-018 |
| **前置条件** | 存在一个元数据中 `thumbnail` 字段为非空字符串的 Widget |
| **测试步骤** | 1. 打开"添加组件"面板<br>2. 选中该 Widget<br>3. 观察预览卡片内容 |
| **预期结果** | 预览卡片内显示 `<img>` 元素，`src` 为 `meta.thumbnail` 值，`object-fit: contain`。不进行 `h()` 实时渲染。 |
| **验证依据** | `desktop-widget-list.vue:110-116` — thumbnail 分支设置 `innerHTML` 中的 `<img>` |

### TC-002-006: 无 thumbnail 时预览实时渲染组件

| 项目 | 内容 |
|------|------|
| **优先级** | P1 |
| **关联需求** | FR-002-019 |
| **前置条件** | 存在一个元数据中 `thumbnail` 为 `null` 或 `undefined` 的 Widget（如 BasicText） |
| **测试步骤** | 1. 打开"添加组件"面板<br>2. 选中该 Widget<br>3. 观察预览卡片内容 |
| **预期结果** | 预览卡片内通过 `h(Comp, props)` 实时渲染 Widget 组件，组件接收 `props` 中每个属性的 `default` 值。 |
| **验证依据** | `desktop-widget-list.vue:118-132` — `h(Comp, propsValues)` 实时渲染分支 |

### TC-002-007: 点击预览卡片添加标准版 Widget

| 项目 | 内容 |
|------|------|
| **优先级** | P0 |
| **关联需求** | FR-002-021 |
| **前置条件** | 桌面当前页面处于可添加状态。存在一个标准版 Widget（无 presets）。 |
| **测试步骤** | 1. 打开"添加组件"面板<br>2. 选中该 Widget<br>3. 点击预览区域的卡片 |
| **预期结果** | 触发 `addWidget(compName)` 事件（仅一个参数），面板关闭。桌面上新增一个该 Widget 实例。 |
| **验证依据** | `desktop-widget-list.vue:177-178` — `emit('addWidget', item.compName)` |

### TC-002-008: 点击预览卡片添加 preset 变体 Widget

| 项目 | 内容 |
|------|------|
| **优先级** | P1 |
| **关联需求** | FR-002-021 |
| **前置条件** | 存在一个 Widget 定义了非空 `presets`（如 `large` 变体） |
| **测试步骤** | 1. 打开"添加组件"面板<br>2. 选中该 Widget<br>3. 点击某个 preset 变体的预览卡片 |
| **预期结果** | 触发 `addWidget(compName, mergedMeta)` 事件（两个参数），mergedMeta 为 `{ ...meta, ...presets[key], presetKey }` 合并结果。面板关闭。 |
| **验证依据** | `desktop-widget-list.vue:175-176` — `emit('addWidget', item.compName, { ...item.meta, presetKey: item.presetKey })` |

### TC-002-009: 点击遮罩层关闭面板

| 项目 | 内容 |
|------|------|
| **优先级** | P2 |
| **关联需求** | FR-002-022 |
| **前置条件** | "添加组件"面板已打开 |
| **测试步骤** | 1. 点击面板外部半透明遮罩区域<br>2. 点击面板右上角 × 按钮 |
| **预期结果** | 两种操作均触发 `close` 事件，面板消失。不执行任何 Widget 添加。 |
| **验证依据** | `desktop-widget-list.vue:195` — 遮罩 `@click="emit('close')"`；`desktop-widget-list.vue:199` — 关闭按钮 `@click="emit('close')"` |

### TC-002-010: 预览面板切换 Widget 时重建网格

| 项目 | 内容 |
|------|------|
| **优先级** | P1 |
| **关联需求** | FR-002-014 |
| **前置条件** | 至少注册 2 个 Widget |
| **测试步骤** | 1. 打开"添加组件"面板<br>2. 在分类树中依次快速点击不同的 Widget<br>3. 观察预览区域内容变化 |
| **预期结果** | 每次切换 Widget 时，预览网格正确重建：旧 Widget 的 VNode 被 `render(null)` 卸载，新 Widget 的 VNode 被挂载。最后一次点击的 Widget 预览正确显示。无残留 VNode 或内存泄漏。 |
| **验证依据** | `desktop-widget-list.vue:134-144` — `destroyGrid` 中 `render(null, contentEl)` + `grid.destroy(false)`；`desktop-widget-list.vue:162-164` — watch 触发重建 |

### TC-002-011: Widget 容器外壳显示标题和操作按钮

| 项目 | 内容 |
|------|------|
| **优先级** | P0 |
| **关联需求** | FR-002-023, FR-002-024, FR-002-025 |
| **前置条件** | 桌面上已有一个 Widget 实例，`editMode` 为默认 `true`，`hideHeader` 为默认 `false` |
| **测试步骤** | 1. 观察 Widget 实例的外观<br>2. 检查标题栏内容 |
| **预期结果** | Widget 有完整边框和背景（`--desktop-*` CSS 变量）。标题栏显示 `title` 属性值（如"基础文字"）作为标题。标题栏右侧显示"编辑"和"删除"两个按钮。 |
| **验证依据** | `desktop-widget-wrapper.vue:41-46` — 模板结构；`desktop-widget-wrapper.vue:15-19` — props 默认值 |

### TC-002-012: 点击编辑按钮发出 widget-edit 事件

| 项目 | 内容 |
|------|------|
| **优先级** | P0 |
| **关联需求** | FR-002-027 |
| **前置条件** | 桌面上已有一个 Widget 实例，`editMode` 为 `true` |
| **测试步骤** | 1. 点击 Widget 标题栏上的"编辑"按钮 |
| **预期结果** | 触发 `widget-edit` 事件，载荷为 `{ node: GridStackNode对象, meta: WidgetMeta对象 }`。事件由上层（Desktop.vue）处理，打开属性编辑面板。 |
| **验证依据** | `desktop-widget-wrapper.vue:29-31` — `handleEdit()` 发出 `widget-edit` 事件，携带 `props.node` 和 `props.meta` |

### TC-002-013: 点击删除按钮发出 widget-remove 事件

| 项目 | 内容 |
|------|------|
| **优先级** | P0 |
| **关联需求** | FR-002-028 |
| **前置条件** | 桌面上已有一个 Widget 实例，`editMode` 为 `true` |
| **测试步骤** | 1. 点击 Widget 标题栏上的"删除"按钮 |
| **预期结果** | 触发 `widget-remove` 事件，载荷为 `props.node`（GridStackNode 对象）。事件由上层处理，该 Widget 从桌面移除。 |
| **验证依据** | `desktop-widget-wrapper.vue:34-35` — `handleRemove()` 发出 `widget-remove` 事件，携带 `props.node` |

### TC-002-014: hideHeader 为 true 时隐藏标题栏

| 项目 | 内容 |
|------|------|
| **优先级** | P2 |
| **关联需求** | FR-002-026 |
| **前置条件** | Widget 实例的 `wrapper.hideHeader` 属性设置为 `true` |
| **测试步骤** | 1. 观察该 Widget 实例的外观 |
| **预期结果** | Widget 标题栏完全不显示（`v-if="!hideHeader"` 为 false）。编辑/删除按钮均不可见。Widget 内容区占据整个容器。 |
| **验证依据** | `desktop-widget-wrapper.vue:41` — `v-if="!hideHeader"` |

### TC-002-015: editMode 为 false 时隐藏操作按钮

| 项目 | 内容 |
|------|------|
| **优先级** | P2 |
| **关联需求** | FR-002-025 |
| **前置条件** | Widget 实例的 `editMode` 属性设置为 `false` |
| **测试步骤** | 1. 观察该 Widget 实例的标题栏 |
| **预期结果** | 标题栏正常显示标题文字，但"编辑"和"删除"按钮区域不渲染（`v-if="editMode"` 为 false）。 |
| **验证依据** | `desktop-widget-wrapper.vue:43` — `v-if="editMode"` |

### TC-002-016: Widget 实例接收 grid-moving / grid-moving-end 事件

| 项目 | 内容 |
|------|------|
| **优先级** | P1 |
| **关联需求** | FR-002-029, FR-002-030 |
| **前置条件** | Widget 实例已通过 `rerenderNode` 渲染并完成 `registerWidgetEmitter(nodeId, emit)` 注册 |
| **测试步骤** | 1. 拖拽该 Widget 到新位置<br>2. 松手完成放置 |
| **预期结果** | 拖拽开始时 Widget 实例的 emit 被调用，收到 `grid-moving` 事件，载荷 `{ id, x, y, w, h }`。松手后收到 `grid-moving-end` 事件，载荷包含最终坐标。 |
| **验证依据** | `useGridStack.js:91-92` — `emitToWidget(node.id, 'grid-moving', ...)` 和 `emitToWidget(node.id, 'grid-moving-end', ...)` |

### TC-002-017: Widget 移除时注销事件桥接

| 项目 | 内容 |
|------|------|
| **优先级** | P1 |
| **关联需求** | FR-002-031 |
| **前置条件** | Widget 实例已注册到 `widgetEmitters` Map |
| **测试步骤** | 1. 删除该 Widget（触发 `grid-removing` 事件和 `unregisterWidgetEmitter`）<br>2. 尝试向该 nodeId 发送事件 |
| **预期结果** | 步骤1中 `widgetEmitters` Map 中该 nodeId 的条目已被删除。步骤2中 `emitToWidget(nodeId, ...)` 因找不到 emit 函数而静默跳过，不抛异常。 |
| **验证依据** | `useGridStack.js:59-61` — `unregisterWidgetEmitter` 执行 `widgetEmitters.delete(nodeId)`；`useGridStack.js:37-39` — `emitToWidget` 在无注册时静默跳过 |

### TC-002-018: 缺少 .widget.js 的孤儿组件自动生成默认元数据

| 项目 | 内容 |
|------|------|
| **优先级** | P1 |
| **关联需求** | FR-002-006 |
| **前置条件** | `src/widgets/` 下存在一个 `.widget.vue` 文件但没有对应的 `.widget.js` 文件 |
| **测试步骤** | 1. 启动应用或触发 HMR 重载 `src/widgets/index.js`<br>2. 检查浏览器控制台<br>3. 打开"添加组件"面板查看分类树 |
| **预期结果** | 控制台输出 `console.warn` 提示"缺少 .widget.js 元数据"。该 Widget 出现在分类树中，显示默认元数据（`title = compName`, `category = '其他'`, `rect = { width:1, height:1 }`）。Widget 可正常添加和使用。 |
| **验证依据** | `src/widgets/index.js:74-85` — 孤儿组件补全逻辑 |

### TC-002-019: .widget.js 非法 default 导出时降级

| 项目 | 内容 |
|------|------|
| **优先级** | P2 |
| **关联需求** | FR-002-005 |
| **前置条件** | 某个 `.widget.js` 文件的 `export default` 值为非对象（如 `null`、字符串、`undefined`） |
| **测试步骤** | 1. 启动应用或触发 HMR 重载<br>2. 检查浏览器控制台 |
| **预期结果** | 控制台输出 `console.warn` 提示"default 导出不是对象"。系统使用全量默认值（`title=compName`, `category='其他'`, `rect={width:1,height:1}` 等），不中断注册。 |
| **验证依据** | `src/widgets/index.js:52-55` — 非法导出降级逻辑；`src/widgets/index.js:62` — `...(isValidMeta ? raw : {})` 不合并非法值 |

### TC-002-020: title 缺失时回退为 compName

| 项目 | 内容 |
|------|------|
| **优先级** | P2 |
| **关联需求** | FR-002-010 |
| **前置条件** | 某个 `.widget.js` 元数据中未声明 `title` 字段 |
| **测试步骤** | 1. 启动应用<br>2. 打开"添加组件"面板<br>3. 查看该 Widget 在分类树中的显示名称 |
| **预期结果** | 分类树中该 Widget 显示为 `compName` 值（如 `BasicText`），而非空字符串。添加到桌面后标题栏也显示 `compName`。 |
| **验证依据** | `src/widgets/index.js:66-68` — `if (!meta.title) meta.title = compName` |

### TC-002-021: category 为空时回退为 "其他"

| 项目 | 内容 |
|------|------|
| **优先级** | P2 |
| **关联需求** | FR-002-007 |
| **前置条件** | 某个 Widget 的元数据中 `category` 为空字符串 `''` 或未定义 |
| **测试步骤** | 1. 启动应用<br>2. 打开"添加组件"面板<br>3. 查看分类树 |
| **预期结果** | 该 Widget 出现在"其他"分类下。不会因空字符串导致空白分类或无分类。 |
| **验证依据** | `desktop-widget-list.vue:40` — `const category = meta.category || '其他'`（分类树构建时的二次回退，与注册时的默认值形成双重保障） |

### TC-002-022: 刷新页面后 Widget 按配置恢复

| 项目 | 内容 |
|------|------|
| **优先级** | P0 |
| **关联需求** | FR-002-032, FR-002-033 |
| **前置条件** | 桌面配置中已保存 Widget 实例数据（含 `compName`, `id`, `x/y/w/h`, `props`, `wrapper`）。配置已持久化到 localStorage。 |
| **测试步骤** | 1. 刷新页面<br>2. 等待桌面加载完成<br>3. 检查 Widget 实例的位置、内容和属性 |
| **预期结果** | Widget 按保存的位置重新出现在桌面网格中（x/y/w/h 一致）。标题栏显示保存的 title。组件内容按保存的 props 值渲染（如 BasicText 显示保存的文本内容）。 |
| **验证依据** | 此用例为端到端验证：`Desktop.vue` 读取配置 → 调用 `rerenderNode` → 查询 `WidgetComponents[compName]` → `h(Comp, props)` 渲染。本模块提供 `WidgetComponents` 字典和 `desktop-widget-wrapper` 外壳支持。 |
