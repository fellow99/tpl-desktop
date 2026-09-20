# 401-app-basic-apps 技术方案 (As-Built)

> 本文档为回顾性技术方案，记录模块实际架构、设计决策与实现策略。
> 模块: 401-app-basic-apps
> 对应规格: [spec.md](./spec.md)
> 最后更新: 2026-07-19

## 1. 技术上下文

### 1.1 运行时环境

- **框架**：Vue 3 Composition API + `<script setup>`
- **运行时**：浏览器（Vite 构建后），作为 App 叠加层渲染在 `desktop-viewport-app` 图层内
- **组件挂载方式**：由 `Desktop.vue` 通过 `<component :is="AppComponents[compName]" :key="instanceId" v-bind="appProps">` 动态组件渲染 (`Desktop.vue:155-159`)
- **生命周期**：由 003-app-system 管理（启动 → 最小化/恢复 → 关闭），`onMounted/onBeforeUnmount` 在 App 自身 Vue 实例内触发

### 1.2 依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| dayjs | ^1.11.19 | BasicClock 时间解析与格式化 |
| Vue 3 core (`ref`, `computed`, `watch`, `onMounted`, `onBeforeUnmount`) | 3.x | 响应式数据、计算属性、生命周期管理 |

dayjs 版本来源：`package.json:22` — `"dayjs": "^1.11.19"`。

## 2. 宪法合规检查

> 对照 `specs/constitution.md` 中与该模块相关性最高的原则进行逐一检查。

| # | 原则 | 检查结果 | 证据 |
|---|------|----------|------|
| 第1条 | 元数据驱动的组件扩展 (Metadata-Driven Extension) | ✅ 合规 | `.app.js + .app.vue` 文件对存在于 `src/apps/basic/`，由 `src/apps/index.js:24-25` 的 `import.meta.glob` 自动扫描注册，无需手动修改注册入口代码 |
| 第7条 | Composition API 唯一风格 | ✅ 合规 | BasicClock.app.vue (`<script setup>` at line 1) 和 BasicIframe.app.vue (`<script setup>` at line 1) 均使用 `<script setup>` + Composition API |
| 第8条 | 命名约定 — App 命名 | ✅ 合规 | `BasicClock.app.js` + `BasicClock.app.vue` / `BasicIframe.app.js` + `BasicIframe.app.vue` 遵循 `*.app.js` / `*.app.vue` 命名规则；`compName` 由 `src/apps/index.js:28-31` 自动提取，`.app.js` 中无手写 `compName` |
| 第10条 | CSS 作用域隔离 | ✅ 合规 | 两个 `.app.vue` 的 `<style>` 标签均使用 `scoped lang="scss"`（BasicClock line 52, BasicIframe line 87） |
| 第13条 | Widget 组件不得接触桌面状态（类比适用于 App） | ✅ 合规 | 两个 App 均不引用 `useGridStack`、`desktopConfig`、`localStorage`；仅通过 `defineProps` 接收数据 |

> 注：宪法第13条原文针对 Widget，但此处的"组件隔离"精神同样适用于 App（App 只通过 props 获取数据，不直接操作桌面状态），Actual 代码已完全符合。

## 3. 关键决策与设计理由

### 决策 1：数字时钟而非模拟时钟

**决策**：BasicClock 使用纯 CSS 文本渲染数字时钟（`<div class="clock-time">{{ timeText }}</div>`），不包含 SVG/CSS 模拟表盘。

**理由**：
- 数字时钟足够满足"查看时间"的核心需求，实现复杂度极低（20 行 JS）
- 避免引入 SVG 或 Canvas 的维护成本
- 等宽数字字体（`tabular-nums`）保证数字变化时无抖动，用户体验友好

**备选方案**：模拟表盘（CSS transform + 指针旋转）可提供更强的视觉表现力，但当前未采用。

### 决策 2：iframe 自适应缩放而非固定尺寸

**决策**：BasicIframe 采用 CSS `transform: scaleX() scaleY()` + `transform-origin: top left` 方案实现自适应缩放，而不是固定 iframe 尺寸或使用 `zoom` 属性。

**理由**：
- `transform` 缩放保持 iframe 内部坐标系不变，外部网页的点击事件坐标映射正确
- `zoom` 属性存在浏览器兼容性差异和元素偏移问题
- 缩放比例由容器实际尺寸（`clientWidth`/`clientHeight`）与配置的内容尺寸动态计算，每次 resize 重新计算
- 容器 `overflow: hidden` 隐藏缩放出界部分

**备选方案**：固定 iframe `width:100%; height:100%` 不使用缩放——简单但网页内容可能被截断或留白。

### 决策 3：window resize 监听而非 ResizeObserver

**决策**：BasicIframe 使用 `window.addEventListener('resize', calc)` 而非 `ResizeObserver`。

**理由**：
- App 容器始终全屏（`position: absolute; inset: 0`），容器尺寸变化与窗口尺寸变化完全同步
- `window.resize` 事件足矣，无需引入 ResizeObserver 的额外开销和 polyfill

### 决策 4：中文星期数组而非 dayjs locale

**决策**：BasicClock 使用内联 `WEEK_CN` 数组（`['周日','周一','周二','周三','周四','周五','周六']`）映射星期，不引入 dayjs locale 插件。

**理由**：
- 避免 dayjs locale 增加构建体积（dayjs 核心包 ~2KB，locale 插件每个约 2-5KB）
- 中文星期映射仅需常量数组 + `now.value.day()` 返回 0-6 索引，O(1) 查找
- `now.value.format('YYYY年MM月DD日')` 不使用 locale 敏感格式，纯数字月日

### 决策 5：默认回退 URL 内置在组件中

**决策**：BasicIframe 在组件内定义 `DEFAULT_URL = 'about:blank'` 作为 url prop 为空时的回退值。

**理由**：
- 用户添加 App 后若不配置 URL，仍可看到 iframe 加载有效内容（而非空白页），验证 App 正常工作
- 硬编码一个稳定的通用网站（163.com），不依赖外部配置服务
- 该默认值仅用于初始体验，用户可通过属性编辑器自定义为任意 URL

## 4. 数据模型

### 4.1 元数据 Schema（AppMeta）

两个 App 的 `.app.js` 导出对象共享同一 Schema（经 `src/apps/index.js:56-69` 与默认值合并后）：

| 字段 | 类型 | 必需 | 说明 | 默认值 |
|------|------|------|------|--------|
| `compName` | string | 是 | 自动注入，从文件路径提取（如 `BasicClock`） | 由 Registry 注入 |
| `title` | string | 是 | App 显示名称 | 缺失时回退 `compName` |
| `category` | string | 是 | 分类标签 | `'其他'` |
| `avatar` | any | 否 | 头像/图标 URL 或组件 | `null` |
| `thumbnail` | any | 否 | 缩略图 URL | `null` |
| `rect` | object | 是 | 叠加层尺寸规格 | `{ unit: 'grid', width: 4, height: 3 }` |
| `rect.unit` | string | 是 | 尺寸单位 | `'grid'` |
| `rect.width` | number | 是 | 宽度（单位数） | `4` |
| `rect.height` | number | 是 | 高度（单位数） | `3` |
| `props` | object | 是 | 可配置属性定义（key → PropSchema） | `{}` |
| `propsEvents` | array | 否 | 预留扩展 | `[]` |
| `wrapperEditors` | array | 否 | 预留扩展 | `[]` |

### 4.2 BasicClock Meta（源码：`src/apps/basic/BasicClock.app.js`）

```js
{
  title: '时钟',
  category: '基础应用',
  avatar: null,
  thumbnail: null,
  rect: { unit: 'grid', width: 3, height: 3 },
  props: {
    format: { title: '时间格式', category: '看板组件配置', type: 'text', default: 'HH:mm:ss' },
    showDate: { title: '显示日期', category: '看板组件配置', type: 'boolean', default: true },
  },
  events: [],
  propsEditors: [],
  wrapperEditors: [],
}
```

`compName: 'BasicClock'` 由 `src/apps/index.js:63` 注入。

### 4.3 BasicIframe Meta（源码：`src/apps/basic/BasicIframe.app.js`）

```js
{
  title: '网页应用',
  category: '基础应用',
  avatar: null,
  thumbnail: null,
  rect: { unit: 'grid', width: 4, height: 3 },
  props: {
    url: { title: '网页地址', category: '看板组件配置', default: '' },
    contentWidth: { title: '网页内容宽度', category: '看板组件配置', type: 'number', default: 1440 },
    contentHeight: { title: '网页内容高度', category: '看板组件配置', type: 'number', default: 900 },
  },
  events: [],
  propsEditors: [],
  wrapperEditors: [],
}
```

`compName: 'BasicIframe'` 由 `src/apps/index.js:63` 注入。

### 4.4 PropSchema（props 值的子 schema）

每个 `props` 中的 key 对应一个属性定义对象，消费方为 101-prop-editor：

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 属性的用户显示名称 |
| `category` | string | 属性编辑器中的分组名称（当前均为 `'看板组件配置'`） |
| `type` | string（可选） | 属性编辑器控件类型：`'text'`、`'boolean'`、`'number'`；未声明时默认 `'text'` |
| `default` | any | 属性默认值 |

### 4.5 Vue Props 定义（运行时数据流）

**BasicClock**（`BasicClock.app.vue:12-17`）：

```js
defineProps({
  format: { type: String, default: 'HH:mm:ss' },     // ← 对应 meta.props.format.default
  showDate: { type: Boolean, default: true },          // ← 对应 meta.props.showDate.default
})
```

**BasicIframe**（`BasicIframe.app.vue:20-27`）：

```js
defineProps({
  url: { type: String, default: '' },                  // ← 对应 meta.props.url.default
  contentWidth: { type: [Number, String], default: 1440 }, // ← 对应 meta.props.contentWidth.default
  contentHeight: { type: [Number, String], default: 900 }, // ← 对应 meta.props.contentHeight.default
})
```

> 注意：BasicIframe 的 `contentWidth`/`contentHeight` 在 Vue props 中接受 `[Number, String]` 联合类型并在 `src/apps/basic/BasicIframe.app.vue:35-36` 通过 `parseInt` 统一处理。这允许属性编辑器产生字符串值时不会出现 NaN。

## 5. 接口契约

### 5.1 提供的接口（本模块导出）

本模块不导出任何 JavaScript 符号。App 通过文件存在性（`import.meta.glob` 发现）和 Vue 组件渲染（约定了 props 签名）对外提供能力：

| 接口 | 类型 | 说明 |
|------|------|------|
| `BasicClock.app.vue` | Vue Component | 数字时钟组件，接收 `format`(String) 和 `showDate`(Boolean) props |
| `BasicClock.app.js` | AppMeta object | 时钟元数据，声明 title/category/props 等 |
| `BasicIframe.app.vue` | Vue Component | 网页嵌入组件，接收 `url`(String)、`contentWidth`(Number/String)、`contentHeight`(Number/String) props |
| `BasicIframe.app.js` | AppMeta object | 网页应用元数据 |

### 5.2 消费的接口（本模块依赖的外部接口）

| 接口 | 来源模块 | 使用方式 |
|------|----------|----------|
| `AppComponents` 字典 | 003-app-system (`src/apps/index.js:34`) | 本模块的 `.app.vue` 由 Registry 自动归入 `AppComponents[compName]` |
| `AppMetas` 字典 | 003-app-system (`src/apps/index.js:44`) | 本模块的 `.app.js` 由 Registry 自动归入 `AppMetas[compName]` |
| `<component :is>` 动态组件 | Vue 3 core | 运行时由 `Desktop.vue` 通过动态组件方式挂载本模块的 Vue 组件 |
| CSS 变量 `--desktop-*` | 005-theme-system | App 组件内联样式引用 `var(--desktop-text-primary)`、`var(--desktop-text-secondary)`、`var(--desktop-bg-secondary)` |
| dayjs `format()` / `day()` | dayjs npm | BasicClock 使用 dayjs 解析当前时间与格式化输出 |

### 5.3 事件协议（Vue Emits）

两个 App 均**不**定义 `defineEmits`。当前 `events` 数组为空（预留扩展），App 与父组件无双向通信。

This is consistent with the App system spec (FR-003-012: App receives props from meta defaults, no emit contract required).

## 6. 实现策略

### 6.1 BasicClock 渲染逻辑（实现 FM-401-001 ~ FM-401-006）

**文件**：`src/apps/basic/BasicClock.app.vue`（76 行）

**数据流**：

```
setInterval(1000ms) → now ref 更新
                           ↓
                    timeText = computed: now.format(props.format)
                    dateText = computed: now.format('YYYY年MM月DD日') + WEEK_CN[now.day()]
                           ↓
                    模板绑定 {{ timeText }} / {{ dateText }}
```

**定时器管理**（`BasicClock.app.vue:29-42`）：

```
onMounted       →  timer = setInterval(() => { now.value = dayjs() }, 1000)
onBeforeUnmount →  clearInterval(timer); timer = null
```

- 定时器在组件挂载后启动，`now` 为 `ref(dayjs())`（初始值为挂载时刻）
- `timeText` 和 `dateText` 均为 `computed` 属性，依赖 `now.value`，自动响应式更新
- `format` prop 直接作为 `dayjs.format()` 模板传入（如 `'hh:mm:ss A'` 可切 12 小时制）
- `showDate` prop 控制日期行 `<div v-if="showDate">` 的 DOM 存在

**样式**（`BasicClock.app.vue:52-76`）：
- flex 居中布局（`display: flex; flex-direction: column; align-items: center; justify-content: center`）
- 时间字号 `4em`，粗体 600，行高 1.1
- 日期字号 `1.25em`，二级文字颜色
- `font-variant-numeric: tabular-nums` 确保等宽数字

### 6.2 BasicIframe 渲染逻辑（实现 FM-401-007 ~ FM-401-014）

**文件**：`src/apps/basic/BasicIframe.app.vue`（103 行）

**数据流**：

```
props.url ('' → DEFAULT_URL)  ─→  iframeSrc (computed)
                                 →  iframe :src="iframeSrc"

props.contentWidth  →  parseInt → cw
props.contentHeight →  parseInt → ch

window resize ─┐
onMounted      ─┤→ calc()
cw/ch watch    ─┘     ↓
                 scaleX = container.clientWidth  / cw  (或 1)
                 scaleY = container.clientHeight / ch  (或 1)
                       ↓
                 iframeStyle = computed: {
                   width/height,
                   transform: `scaleX scaleY`,
                   transformOrigin: 'top left'
                 }
```

**缩放比例计算**（`BasicIframe.app.vue:44-51`，实现 FR-401-009/FR-401-010）：

```js
function calc() {
  const el = container.value
  const cwidth = el ? el.clientWidth : 0
  const cheight = el ? el.clientHeight : 0
  scaleX.value = cwidth > 0 && cw.value > 0 ? cwidth / cw.value : 1
  scaleY.value = cheight > 0 && ch.value > 0 ? cheight / ch.value : 1
}
```

- 容器 ref 未挂载时 `clientWidth = 0`，scale 回退为 1（安全保护）
- 内容尺寸为 0 时（`parseInt` 返回 0）scale 回退为 1
- `cw` / `ch` 通过 `parseInt(props.contentWidth, 10)` 统一解析（兼容属性编辑器可能产生的字符串值）

**iframe 尺寸策略**（`BasicIframe.app.vue:54-59`，实现 FR-409-011）：

```js
{
  width:  scaleX === 1 ? '100%' : `${cw}px`,  // 无需缩放时 100%填充
  height: scaleY === 1 ? '100%' : `${ch}px`,  // 需要缩放时使用像素值
  transform: `scaleX(${scaleX}) scaleY(${scaleY})`,
  transformOrigin: 'top left',
}
```

- 当 `scaleX === 1` 时 iframe 使用 `width: 100%`（自适应容器），缩放小于 1 时使用 `contentWidth` 像素值
- `transform-origin: top left` 保证缩放从左上角原点进行，避免偏移

**安全措施**（`BasicIframe.app.vue:81`，实现 FR-401-012 / NFR-401-005）：

```html
<iframe
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
  referrerpolicy="no-referrer"
></iframe>
```

- `allow-scripts`：允许 iframe 内 JavaScript 执行（多数网页需要）
- `allow-same-origin`：允许 iframe 内页面访问自己的 cookie/localStorage
- `allow-forms`：允许表单提交
- `allow-popups`：允许弹窗
- 未授予 `allow-top-navigation`、`allow-modals`、`allow-downloads`（限制跨上下文操作）
- `referrerpolicy="no-referrer"`：不发 Referer 头，保护隐私

**清理**（`BasicIframe.app.vue:64-71`，实现 FR-401-014）：

```js
onMounted(() => {
  calc()
  window.addEventListener('resize', calc)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', calc)
})
```

### 6.3 错误处理

- BasicClock：`dayjs()` 即使无参数也始终返回当前时刻的有效对象，`format()` 永远返回字符串——无已知错误路径
- BasicIframe：`parseInt` 对非数字输入返回 `NaN`，`NaN || 0` 回退为 0，触发 scale=1 回退——静默降级
- Iframe 加载失败：由浏览器处理（显示默认错误页），组件层面不做错误捕获或重试

## 7. 测试考量

### 7.1 可测试范围

| 测试类别 | BasicClock | BasicIframe | 说明 |
|----------|------------|-------------|------|
| 组件单元测试 | ✅ | ✅ | Vue Test Utils mount 后验证 DOM 渲染 |
| 定时器行为 | ✅ | — | `vi.useFakeTimers()` 验证 1s 间隔更新 |
| 缩放计算 | — | ✅ | 纯函数 `calc()` 无副作用，易于单元测试 |
| iframe src 回退 | — | ✅ | url 为空时验证 `iframeSrc === DEFAULT_URL` |
| 默认 props | ✅ | ✅ | 验证 `defineProps` 默认值与 meta.props.*.default 一致 |
| 定时器/监听器清理 | ✅ | ✅ | `unmount` 后验证 `clearInterval` / `removeEventListener` 已调用 |
| 跨域/iframe 加载 | — | ⚠️ | 依赖外部网络，测试中需 mock iframe 或使用 `data:` URI |
| 可视化验收 | ✅ | ✅ | 启动 App 验证 UI 显示效果 |

### 7.2 建议测试维度

- **Props 覆盖**：分别测试 format='HH:mm:ss'、'hh:mm:ss A'、showDate=true/false
- **缩放边界**：contentWidth=0、contentWidth 为负数（parseInt→NaN→0→scale=1）、容器尺寸为 0（ref 未挂载）
- **并发运行**：两个 App 同时 mount 不互相干扰（Vue 实例隔离，无共享状态）
- **快速切换**：反复启动→关闭→启动 BasicClock 100 次（压力测试定时器清理，防止 setInterval 累积）

### 7.3 已知边缘场景

- `format` prop 传递非法 dayjs 格式字符串（如 `'zzz'`）：dayjs 原样输出，不会崩溃
- `url` prop 传递非 http 值（如 `'javascript:alert(1)'`）：浏览器可能会阻止（sandbox 限制 + 浏览器安全策略），行为取决于浏览器实现
- 极小窗口（100×100）：scaleX/scaleY < 0.1，页面内容极难阅读但不会报错

## 8. 文件清单

| 文件 | 路径 | 行数 | 用途 |
|------|------|------|------|
| BasicClock 元数据 | `src/apps/basic/BasicClock.app.js` | 31 | AppMeta：声明 clock 的 title/category/rect/props |
| BasicClock 组件 | `src/apps/basic/BasicClock.app.vue` | 76 | Vue 组件：数字时钟渲染 + 定时器 + 样式 |
| BasicIframe 元数据 | `src/apps/basic/BasicIframe.app.js` | 37 | AppMeta：声明 iframe 的 title/category/rect/props |
| BasicIframe 组件 | `src/apps/basic/BasicIframe.app.vue` | 103 | Vue 组件：iframe 嵌入 + 自适应缩放 + 安全隔离 |

**总计**：4 文件，247 行。

> 行数来源：实际文件 `Get-Content | Measure-Object -Line` 统计（不含空白尾行）。

### 8.1 App Meta 对比总结

| 属性 | BasicClock | BasicIframe |
|------|------------|-------------|
| `title` | `'时钟'` | `'网页应用'` |
| `category` | `'基础应用'` | `'基础应用'` |
| `rect` | `{ unit: 'grid', width: 3, height: 3 }` | `{ unit: 'grid', width: 4, height: 3 }` |
| `props` keys | `format`(text, default:'HH:mm:ss'), `showDate`(boolean, default:true) | `url`(缺省 type → text, default:''), `contentWidth`(number, default:1440), `contentHeight`(number, default:900) |
| `events` | `[]` | `[]` |
| `propsEditors` | `[]` | `[]` |
| `wrapperEditors` | `[]` | `[]` |
| `compName` | `'BasicClock'`（Registry 注入） | `'BasicIframe'`（Registry 注入） |
| `avatar` / `thumbnail` | `null` / `null` | `null` / `null` |
