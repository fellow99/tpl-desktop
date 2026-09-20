# 003-app-system 技术方案 (As-Built)

> 本文档为回顾性技术方案，记录 003-app-system 模块的实际架构、设计决策与实现策略。
> 模块: 003-app-system
> 对应规格: specs/003-app-system/spec.md
> 最后更新: 2026-07-19

## 1. 技术上下文

### 1.1 运行时环境 — 代码运行位置

- **浏览器**: 纯前端，无 Node.js 后端
- **Vue 3 SFC**: `<script setup>` + Composition API（符合宪法第7条）
- **Vite 7**: `import.meta.glob({ eager: true })` 构建时代码扫描（宪法第1条元数据驱动扩展）
- **localStorage**: 持久化 App 列表（`dashboard-desktop-apps` 键）和快捷方式（内嵌于 `dashboard-desktop-data` 键的 `shortcuts` 字段）

### 1.2 关键依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| Vue 3 (vue) | ^3.5.0+ | ref/reactive/computed/watch/h/render/getCurrentInstance/nextTick/onBeforeUnmount — 响应式状态、动态 VNode 创建、生命周期管理 |
| Vite | ^7.0.0 | import.meta.glob 构建时文件扫描 |
| Element Plus | ^2.0.0 | el-dialog、el-tree、el-input、el-button — 面板 UI 组件 |
| SCSS (sass) | devDependency | 组件 scoped 样式 |

## 2. 宪法合规检查

| 宪法条目 | 状态 | 说明 |
|----------|------|------|
| 第1条: 元数据驱动扩展 | ✅ 完全合规 | `src/apps/index.js:24-25` — `import.meta.glob('./**/*.app.vue', { eager: true })` + `import.meta.glob('./**/*.app.js', { eager: true })` 自动扫描，新增文件对无需修改注册代码 |
| 第2条: 宿主与内容分离 | ✅ 完全合规 | `desktop-app-wrapper.vue` 提供外壳（标题栏 + 操作按钮），App 组件通过 `<slot>` 注入；App 组件本身不操作桌面状态 |
| 第3条: 模块级单例 | ✅ 完全合规 | `src/composables/useAppMetas.js:11` — 模块级 `const appMetas = ref(AppMetas)`，所有调用方共享同一实例 |
| 第5条: Props/Emits 单向数据流 | ✅ 完全合规 | viewport-app → minimizeApp/removeApp emits 向 Desktop.vue 上报；app-list → addApp/toggleShortcut/openStore/close emits；wrapper → minimize/close emits |
| 第6条: 中心化状态 | ✅ 完全合规 | `desktopApps` ref 仅存在于 `Desktop.vue:43`，子组件通过 props 接收，emits 上报 |
| 第7条: Composition API | ✅ 完全合规 | 所有 .vue 文件均为 `<script setup>` |
| 第9条: CSS 变量 | ✅ 完全合规 | 所有颜色通过 `var(--desktop-*)` 引用，无硬编码颜色值 |
| 第10条: scoped 样式 | ✅ 完全合规 | 所有组件 `<style scoped lang="scss">` |
| 第11条: 默认值回退 | ✅ 完全合规 | `src/apps/index.js:56-69` — category/rect/events/propsEditors/wrapperEditors 均有默认值；孤儿组件自动补元数据（:74-85）；default 导出非对象降级（:52-55） |
| 第12条: 错误处理 | ✅ 完全合规 | localStorage 操作有 try/catch（desktop-app-list.vue:43-49,53-60），元数据冲突有 console.warn 降级 |
| 第14条: 只读元数据 | ✅ 完全合规 | AppMetas 构建后无任何代码修改其条目 |

## 3. 关键设计决策

### 3.1 决策 1: App 作为独立叠加层 vs 嵌入 GridStack

**决策**: App 渲染在独立的 `desktop-viewport-app` 图层（z-index: 10），不通过 GridStack 管理。

**理由**:
- App 是全屏最大化体验，不需要 GridStack 的拖拽/缩放/网格对齐能力
- 叠加层 `pointer-events: none` 确保无 App 或全部最小化时不遮挡桌面 Widget 交互
- 避免 GridStack 的 `h() + render()` 约束（P-04），App 图层可使用 Vue 模板 `v-for` + `<component :is>`

**实现**: `desktop-viewport-app.vue` 为独立绝对定位图层，通过 `v-for` 遍历 `desktopApps` 渲染每个 App 实例。

### 3.2 决策 2: App 实例生命周期完全由响应式数组驱动

**决策**: `desktopApps` 是一个 Vue `ref([])`，App 的创建/销毁/状态变更全部通过操作该数组实现，无需手动管理 DOM。

**理由**:
- Vue 响应式系统自动处理 v-for 的增删和组件生命周期
- 避免手动调用 `h() + render()` 的复杂生命周期管理
- 与 P-05（纯 Props/Emits 单向数据流）一致

**App 实例创建** (`Desktop.vue:333-342`):
```js
desktopApps.value.push({
  instanceId: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
  compName,
  compId: compId || undefined,  // 仅当存在时才加入属性
  appMeta: appMeta || null,
  wrapperValues: { title: appMeta?.title || compName },
  state: null,
})
```

**重复启动处理 (Desktop.vue:322-332)**: 同一 App（compId 优先匹配，compName 回退）已存在时，不创建新实例，而是恢复并移至数组末尾实现 z-order 置顶。这是对 spec 原始 push-only 语义的有意偏离——遵循桌面 OS 惯例：重复打开即聚焦/恢复已有实例。

### 3.3 决策 3: 最小化 = CSS 隐藏 + 保活

**决策**: 最小化通过 CSS `opacity: 0; transform: translateY(60px); pointer-events: none` 实现，Vue 组件实例和 DOM 节点保持存活。

**理由**:
- App 状态保存在组件实例中，销毁则丢失用户上下文
- 恢复 = 零重新渲染延迟（CSS transition 0.3s）
- 避免频繁销毁/重建的性能开销

**实现**: `desktop-viewport-app.vue:56,93-97` — `.app-instance.is-minimized` 样式。

### 3.4 决策 4: App 列表持久化策略

**决策**: App 列表（用户已添加哪些 App）持久化到独立的 localStorage 键 `dashboard-desktop-apps`，而桌面整体配置持久化到 `dashboard-desktop-data`。快捷方式嵌入在 `desktopConfig.shortcuts` 中。

**理由**:
- App 列表与桌面布局配置解耦，各自独立加载/保存
- 使用独立的 STORAGE_KEY 避免与 desktopConfig 的大对象序列化竞争
- watch(deep) 自动持久化 (`desktop-app-list.vue:64`)，无需手动保存触发点

### 3.5 决策 5: 应用市场 h()+render() 预览模式

**决策**: 应用市场中 App 预览使用 `h(Comp, propsValues) + render(vnode, previewEl)` 模式，而非 Vue 模板 `<component :is>`。

**理由**:
- 预览挂载点 `previewEl` 是模板中的 `<div ref>`，非 Vue 虚拟节点树的一部分
- 属性配置变更后通过 `render(null, el)` 先卸载旧 VNode，再 `render(newVnode, el)` 挂载新实例
- `vnode.appContext = appContext` 绑定确保依赖注入（如全局组件、插件）在预览中正常工作
- 组件卸载时通过 `onBeforeUnmount` 清理 `render(null, previewEl.value)` 防止内存泄漏

### 3.6 决策 6: App ↔ Widget 事件协调

**决策**: App 打开时向当前页面所有 Widget 广播 `grid-deactive`，全部关闭后广播 `grid-active`，通过 300ms debounce 防抖。

**理由**:
- Widget 在 App 覆盖期间应暂停定时器、动画等资源消耗
- 300ms debounce 防止快速打开/关闭操作导致事件抖动（`Desktop.vue:396-413`）
- 页面切换时补发 grid-deactive 确保新页面 Widget 状态正确 (`Desktop.vue:303-313`)

## 4. 数据模型

### 4.1 AppMeta 实体（TypeScript 形态）

```ts
interface AppMeta {
  title: string                    // 显示名称
  category: string                 // 分类（默认 "其他"）
  avatar: string | null            // 头像图标 URL
  thumbnail: string | null         // 缩略图 URL
  rect: { unit: 'grid', width: number, height: number }  // 默认网格尺寸
  props: Record<string, PropMeta>  // 属性定义
  events: string[]                 // 预留扩展点
  propsEditors: string[]           // 预留扩展点
  wrapperEditors: string[]         // 预留扩展点
  compName: string                 // 自动注入的组件名
}
```

### 4.2 运行实例实体

```ts
interface DesktopApp {
  instanceId: string               // 稳定实例标识（Date.now().toString(36) + random）
  compName: string                 // 组件名 → AppComponents 字典
  compId?: string                  // 应用市场 hash ID（djb2("...")）
  appMeta: AppMeta | null          // 启动时传入的元数据
  wrapperValues: { title: string } // 外壳标题
  state: null | 'minimize'         // 运行状态
}
```

### 4.3 状态机

```
state: null (运行中/可见)　⟷　state: 'minimize' (最小化/隐藏)
  └─── handleToggleAppState / handleMinimizeApp

任何 state → 移除:
  └─── handleRemoveApp → splice from desktopApps[]

重复启动 (同一 compId/compName 已存在):
  └─── 已有实例恢复 state=null + 移至数组末尾
```

***验证于代码***:
- `Desktop.vue:322-332` — `handleAddApp` 去重逻辑（已有实例恢复置顶）
- `Desktop.vue:345-347` — `handleMinimizeApp` 设置 `state = 'minimize'`
- `Desktop.vue:360-362` — `handleToggleAppState` toggle null ↔ minimize
- `Desktop.vue:351-357` — `handleRemoveApp` splice 移除（instanceId 精确匹配）
- `Desktop.vue:230-236` — `handleHome` 批量最小化所有 App（不改 state 前未保存原有状态）

### 4.4 持久化数据

**localStorage 键 `dashboard-desktop-apps`** (desktop-app-list.vue:36):
```ts
type DesktopAppEntries = Array<AppMeta & { compId: string }>
// compId = hashId(JSON.stringify(appMeta))  // djb2 算法，36进制输出
```

**localStorage 键 `dashboard-desktop-data` → `shortcuts`** (Desktop.vue:377-391):
```ts
type Shortcuts = Array<{ compName: string, appMeta: AppMeta, compId?: string }>
```

### 4.5 hashId 算法 (djb2 变体)

`desktop-app-list.vue:67-73`:
```js
function hashId(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}
```

## 5. 接口契约

### 5.1 提供的接口 — 本模块导出

#### 5.1.1 `src/apps/index.js`

| 导出 | 类型 | 说明 |
|------|------|------|
| `AppComponents` | `Record<string, Component>` | compName → Vue 组件的字典 |
| `AppMetas` | `Record<string, AppMeta>` | compName → AppMeta 元数据字典 |

#### 5.1.2 `src/composables/useAppMetas.js`

| 导出 | 签名 | 说明 |
|------|------|------|
| `useAppMetas()` | `() => { appMetas: Ref<Record<string, AppMeta>> }` | 响应式元数据字典，模块级单例 |

#### 5.1.3 `desktop-viewport-app`

| Props | 类型 | 说明 |
|-------|------|------|
| `apps` | `Array<DesktopApp>` | 当前运行的 App 实例列表 |

| Emits | Payload | 说明 |
|-------|---------|------|
| `minimizeApp` | `app: DesktopApp` | wrapper 最小化按钮点击 → Desktop 设置 state='minimize' |
| `removeApp` | `app: DesktopApp` | wrapper 关闭按钮点击 → Desktop 从数组移除 |

#### 5.1.4 `desktop-app-wrapper`

| Props | 类型 | 说明 |
|-------|------|------|
| `title` | `string` | 标题栏文字 |

| Emits | Payload | 说明 |
|-------|---------|------|
| `minimize` | (无) | 点击 ➖ |
| `close` | (无) | 点击 ❌ |

| Slot | 说明 |
|------|------|
| `default` | App 组件内容，由 viewport-app 通过 `<component :is>` 注入 |

#### 5.1.5 `desktop-app-list`

| Props | 类型 | 说明 |
|-------|------|------|
| `shortcuts` | `Array<{ compName, appMeta, compId? }>` | 用于判断条目的 📌/🔘 快捷方式状态 |

| Emits | Payload | 说明 |
|-------|---------|------|
| `addApp` | `{ compName, compId, appMeta }` | 点击 App 图标启动 |
| `toggleShortcut` | `{ compName, compId, appMeta }` | 点击 📌/🔘 切换快捷方式 |
| `openStore` | (无) | 「＋」按钮 → 打开应用市场 |
| `close` | (无) | 关闭面板 |

| Expose | 签名 | 说明 |
|--------|------|------|
| `addFromStore` | `(appMeta: AppMeta) => void` | 应用市场 confirm 回写：hash → compId → 入列 + 持久化 |

#### 5.1.6 `desktop-app-store`

| Emits | Payload | 说明 |
|-------|---------|------|
| `confirm` | `enrichedAppMeta: AppMeta` | 深拷贝 + 注入 title/category/props.default |
| `close` | (无) | 取消或关闭 |

### 5.2 消费的接口 — 本模块引入

| 来源 | 接口 | 用途 |
|------|------|------|
| `../apps/index.js` | `AppComponents` | viewport-app 和 app-store 获取 Vue 组件 |
| `../composables/useAppMetas.js` | `useAppMetas()` | app-list 和 app-store 获取元数据字典 |
| `vue` | `ref, reactive, computed, watch, nextTick, h, render, getCurrentInstance, onBeforeUnmount` | 状态管理、动态渲染、生命周期 |
| `element-plus` | `ElDialog, ElTree, ElInput, ElButton` | 面板 UI |
| `101-prop-editor` | `DesktopPropertyForm` | app-store rightside 属性配置表单 |

### 5.3 内部事件协议

**App 打开/关闭 → Widget 事件广播** (Desktop.vue:400-413):
```
desktopApps.length > 0 且 widgetsDeactivated === false
  → 300ms debounce
  → broadcastToCurrentPageWidgets('grid-deactive')
  → widgetsDeactivated = true

desktopApps.length === 0 且 widgetsDeactivated === true
  → 300ms debounce
  → broadcastToCurrentPageWidgets('grid-active')
  → widgetsDeactivated = false
```

**页面切换 → Widget 事件补发** (Desktop.vue:303-313):
```
page-change (currentPageIndex 变更)
  → nextTick
  → 若 desktopApps.length > 0:
    → broadcastToCurrentPageWidgets('grid-deactive')
    → widgetsDeactivated = true
```

## 6. 实现策略

### 6.1 架构模式

```
┌─────────────────────────────────────────────────┐
│  Desktop.vue (编排层，201-page-index)            │
│  ┌───────────────────────────────────────────┐  │
│  │ desktopApps: ref([])                      │  │
│  │ handleAddApp / handleMinimizeApp / ...    │  │
│  │ handleToggleAppState / handleRemoveApp    │  │
│  │ handleToggleShortcut / onStoreConfirm     │  │
│  └──────┬──────────┬──────────┬──────────────┘  │
│         │          │          │                  │
│    ┌────▼───┐ ┌───▼────┐ ┌──▼──────────────┐   │
│    │viewport│ │app-list│ │app-store         │   │
│    │  -app  │ │(dialog)│ │ (dialog)         │   │
│    └────────┘ └────────┘ └──────────────────┘   │
│         │                                    │   │
│    ┌────▼──────┐                              │   │
│    │app-wrapper│ (per instance)               │   │
│    │  ┌──────┐ │                              │   │
│    │  │<slot>│ │ ← App 组件                   │   │
│    │  └──────┘ │                              │   │
│    └───────────┘                              │   │
└─────────────────────────────────────────────────┘
```

### 6.2 关键算法

**App 去重逻辑** (`Desktop.vue:322-332`, 实现 FR-003-015):
1. `findIndex` 在 `desktopApps` 中查找：compId 优先精确匹配（两个都有值时），否则 compName 回退匹配
2. 找到: `splice` 移除 + 恢复 state=null + `push` 到末尾（z-order 置顶）
3. 未找到: `push` 新实例（含唯一 instanceId）

**djb2 hashId 生成** (`desktop-app-list.vue:67-73`, 实现 FR-003-026):
1. 初始化 hash = 5381
2. 对于 JSON.stringify(appMeta) 的每个字符 c: `hash = ((hash << 5) + hash + c.charCodeAt(0)) >>> 0`
3. 输出 `hash.toString(36)`（36进制短字符串）

### 6.3 错误处理

| 场景 | 策略 | 位置 |
|------|------|------|
| localStorage 读取/写入异常 | try/catch + 静默回退 | desktop-app-list.vue:43-49,53-60 |
| JSON.parse 失败 | 回退空数组 `[]` | desktop-app-list.vue:46 |
| 元数据 default 导出非法 | console.warn + 降级空对象 | apps/index.js:52-55 |
| 同名 AppMeta 冲突 | console.warn + 覆盖 | apps/index.js:47-49 |
| 孤儿 .app.vue（无 .app.js） | console.warn + 自动生成默认元数据 | apps/index.js:73-85 |

### 6.4 性能考量

| 优化点 | 策略 |
|--------|------|
| 最小化恢复延迟 | CSS transition 0.3s，组件不销毁，O(1) 恢复 |
| grid-active/deactive 广播 | 300ms debounce 避免事件抖动 |
| App 列表 watch(deep) 持久化 | 直接监听引用的 desktopApps ref，deep 模式确保嵌套属性变更触发 |
| 应用市场预览刷新 | deep watch `[selectedCompName, propsValues]` → nextTick 防止 DOM 操作竞争 |
| 元数据构建 | 仅在模块加载时执行一次（静态 import），运行时零开销 |
| import.meta.glob eager | 构建时静态分析，产物为编译后的字典，无运行时 glob 开销 |

## 7. 测试考量

### 7.1 可测试区域

- **单元测试**: hashId 算法（纯函数，输入 → 输出确定性）
- **组件测试**: desktop-app-wrapper（props/emits 行为简单）
- **集成测试**: App 生命周期完整流程（启动 → 最小化 → 恢复 → 关闭）
- **E2E 测试**: App 列表 ↔ 应用市场往返流程（Store confirm → addFromStore → 列表更新 → 启动 App）
- **边界测试**: 同名冲突降级、孤儿组件默认元数据、localStorage 不可用时的静默回退

### 7.2 边缘场景

- 快速连续点击打开/关闭同一 App（debounce 保护）
- 应用市场添加已存在列表中的同款 App（compId hash 可能不同）
- 全部 App 最小化后切换页面再切回（grid-active 是否正确恢复）
- localStorage 满或隐私模式写保护（try/catch 静默回退）
- URL 中无法访问的 avatar/thumbnail 图片（应显示首字回退图标）

## 8. 文件清单

| 文件 | 用途 | 行数 |
|------|------|------|
| `src/apps/index.js` | App 自动注册入口：import.meta.glob 扫描 → AppComponents + AppMetas 字典构建 | 86 |
| `src/composables/useAppMetas.js` | App 元数据响应式封装：模块级 ref 单例 | 15 |
| `src/components/viewport/desktop-viewport-app.vue` | App 叠加渲染图层：v-for 遍历 + component :is 动态渲染 + minimize CSS 动画 | 107 |
| `src/components/viewport/desktop-app-wrapper.vue` | App 组件外壳：标题栏 + 最小化/关闭按钮 + 内容 slot | 95 |
| `src/components/desktop/desktop-app-list.vue` | App 列表面板：localStorage 持久化 + 分类筛选 + 快捷方式切换 + 应用市场入口 | 346 |
| `src/components/desktop/desktop-app-store.vue` | App 应用市场：el-tree 分类树 + h()/render() 预览 + 属性配置 + 确认添加 | 262 |
| **总计** | | **911** |

> 注：行数为实际文件行数（含注释和空行）。核心模块生命周期函数（handleAddApp、handleMinimizeApp、handleRemoveApp、handleToggleAppState、handleToggleShortcut、onStoreConfirm、App↔Widget 事件协调）位于 `src/pages/Desktop.vue`（604行，属于 201-page-index 模块，此处不计入）。
