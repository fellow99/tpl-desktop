# 004-background-system 技术方案 (As-Built)

> 本文档为逆向技术方案，记录桌面背景系统实际的架构、设计决策与实现策略。
> 模块: 004-background-system
> 对应规格: specs/004-background-system/spec.md
> 最后更新: 2026-07-19

## 1. 技术上下文

### 1.1 运行时环境 — 代码运行在哪里

- 浏览器渲染主线程（无 Worker/Service Worker 参与）
- Vite 构建时通过 `import.meta.glob({ eager: true })` 静态解析所有 `*.bg.js` 导入

### 1.2 依赖 — 直接与间接

| 包 | 版本 | 用途 |
|---|---|---|
| `vue` | ^3.5.18 | Composition API（ref, computed, watch, nextTick, Transition, h） |
| `embla-carousel-vue` | — | 背景选择面板轮播（useEmblaCarousel） |
| Vite `import.meta.glob` | — | 构建时扫描注册（非运行时依赖） |

## 2. 宪法合规检查

| 原则 | 检查结果 | 证据 |
|------|---------|------|
| 第1条: 元数据驱动扩展 | ✅ 合规 | `src/backgrounds/index.js:18` 使用 `import.meta.glob('./**/*.bg.js', { eager: true })` 自动扫描 |
| 第3条: 模块级单例共享状态 | ✅ 合规 | `useBackgroundMetas.js:12` 模块级 `ref(BackgroundMetas)`，所有调用方共享同一实例 |
| 第5条: Props/Emits 单向数据流 | ✅ 合规 | `desktop-background.vue` 通过 `defineProps({ background })` 接收配置，`desktop-background-list.vue` 通过 `defineEmits(['selectBackground', 'close'])` 上报事件 |
| 第7条: Composition API | ✅ 合规 | 所有 `.vue` 使用 `<script setup>`，composable 为 `export function useXxx()` |
| 第8条: 命名约定 | ✅ 合规 | UI 组件 `desktop-*.vue`（kebab-case），元数据 `*.bg.js`，composable `use*.js` |
| 第9条: CSS 变量体系 | ✅ 合规 | 背景列表组件使用 `var(--desktop-bg-overlay)`, `var(--desktop-border)`, `var(--desktop-text-primary)` 等 |
| 第10条: CSS 作用域隔离 | ✅ 合规 | 所有组件使用 `<style scoped lang="scss">` |
| 第11条: 元数据默认值回退 | ✅ 合规 | `src/backgrounds/index.js:39-49` 提供完整默认值（`category→'其他'`, `type→'image'`, `title→name`） |
| 第12条: 错误处理策略 | ✅ 合规 | 元数据非法默认导出 `console.warn` + `continue` 跳过；渲染层未注册背景 `console.warn` + 返回 null |
| 第14条: 只读元数据消费 | ✅ 合规 | 所有消费方只读取 `backgroundMetas.value`，无修改操作 |
| 第15条: 持久化安全边界 | ✅ 合规 | `desktopConfig.background` 仅存 `{ type, name, title, category }`，不存实际文件路径 |

## 3. 关键决策

### 3.1 `*.bg.js` 元数据约定

**决策**: 每个背景通过独立的 `*.bg.js` 文件定义元数据，由 `import.meta.glob` 在构建时 eager 扫描注册。

**理由**:
- 与 Widget/App 的 `*.widget.js` / `*.app.js` 注册模式保持一致（宪法第1条）
- `import.meta.glob` 的静态分析特性使得 PNG/SVG/WebM 资源通过 ES import 引用时由 Vite 自动哈希化和生产优化
- 新增背景只需添加 `.bg.js` 文件 + 对应的资源文件放入同目录，无需修改任何注册代码

**资源组织**: 每个背景目录下放置完整资源集：
- 图片型（dark/light）: `*.svg`（全图） + `*.png`（缩略图） + `avatar-*.svg`（图标）
- 视频型（video）: `*.webm`（视频） + `*.png`（缩略图） + `avatar-*.svg`（图标）

### 3.2 元数据 name 自动注入而非手写

**决策**: `name` 字段由 `backgrounds/index.js` 的 `extractBgName()` 函数从文件路径提取（`'./dark/dark-001.bg.js'` → `'dark-001'`），禁止在 `.bg.js` 文件中手写 `name` 字段。

**理由**:
- 避免 name 与文件名不一致导致的混乱
- 保证 name 作为注册表键的唯一确定性
- 符合宪法第8条"组件名由注册表从文件路径自动提取"

**实现**: `src/backgrounds/index.js:21-24` — 正则提取 `./**/(.*).bg.js` → 取最后一段

### 3.3 embla-carousel-vue 轮播选择

**决策**: 使用 `embla-carousel-vue`（而非 Swiper 或 Element Plus Carousel）实现背景卡片水平轮播。

**理由**:
- 轻量级（~8KB gzipped），不引入额外轮播框架依赖
- 原生支持触摸滑动与鼠标拖拽，体验流畅
- `align: 'center'` + `containScroll: 'keepSnaps'` 配置满足卡片选择 UI 的居中对齐需求
- 提供 `scrollTo()` / `scrollPrev()` / `scrollNext()` 编程式控制 API

**证据**: `desktop-background-list.vue:16,27`
```js
import useEmblaCarousel from 'embla-carousel-vue'
const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'center', containScroll: 'keepSnaps' })
```

### 3.4 背景选择时自动切换主题

**决策**: `onSelectBackground` 中检查 `meta.theme` 字段，若存在则调用 `useTheme().setTheme()` 切换主题模式并同步 `desktopConfig.theme`。

**理由**:
- 确保视觉一致性：选择深色背景 → 自动进入深色模式；选择浅色背景 → 自动进入浅色模式
- 单向联动（背景→主题）：主题手动切换不自动更换背景，避免用户困惑
- video 型背景 theme 均为 `dark`，确保动态视频背景在深色模式下最佳呈现

**证据**: `Desktop.vue:270-284`
```js
function onSelectBackground(meta) {
  desktopConfig.value.background = { type: meta.type, name: meta.name, title: meta.title, category: meta.category }
  if (meta.theme) {
    setTheme(meta.theme)
    desktopConfig.value.theme = meta.theme
  }
  persistConfig()
}
```

### 3.5 背景持久化仅存引用键

**决策**: `desktopConfig.background` 仅持久化 `{ type, name, title, category }` 四个语义字段，实际资源 URL 由渲染层在运行时从 `backgroundMetas` 字典按 `name` 动态解析。

**理由**:
- 资源路径（Vite 构建产物的哈希化 URL）在每次构建后可能变化，持久化无意义
- 保持桌面配置的精简可读性
- 符合宪法第15条（持久化安全边界）

**证据**: `Desktop.vue:272-277` 数据写入 + `desktop-background.vue:29-41` 数据读取

## 4. 数据模型

### 4.1 背景元数据完整字段

| 字段 | 类型 | 来源 | 图片型 | 视频型 |
|------|------|------|--------|--------|
| `name` | `string` | 注册表自动注入 | ✅ | ✅ |
| `title` | `string` | `.bg.js` `export default` | `'暗色背景01'` | `'动态背景01'` |
| `category` | `string` | `.bg.js` `export default` | `'暗色系' \| '浅色系'` | `'动态'` |
| `type` | `'image' \| 'video'` | `.bg.js` `export default` | `'image'` | `'video'` |
| `theme` | `'light' \| 'dark' \| undefined` | `.bg.js` `export default` | `'dark'` (dark 系列) / `'light'` (light 系列) | `'dark'` |
| `avatar` | `string` (URL) | `.bg.js` import | `avatar-dark.svg` / `avatar-light.svg` | `avatar-video.svg` |
| `thumbnail` | `string` (URL) | `.bg.js` import | `dark-*.png` / `light-*.png` | `webm-*.png` |
| `image` | `string` (URL) | `.bg.js` import | `dark-*.svg` / `light-*.svg` | — |
| `video` | `string` (URL) | `.bg.js` import | — | `webm-*.webm` |

### 4.2 持久化数据子集

`DesktopConfig.background`:
```typescript
interface PersistedBackground {
  type: 'image' | 'video'
  name: string          // 例如 'dark-001'
  title: string         // 例如 '暗色背景01'
  category: string      // 例如 '暗色系'
}
```

### 4.3 背景注册表

`BackgroundMetas` — `Record<string, BackgroundMeta>`（模块级静态对象，`backgrounds/index.js:27`）：
- 键: 背景 name（如 `dark-001`）
- 值: 完整 BackgroundMeta 对象（含 name 注入与默认值回退）

`useBackgroundMetas()` 将其包装为 `ref(BackgroundMetas)` 提供响应式只读访问。

### 4.4 分类派生逻辑

分类列表从已注册 BackgroundMetas 的 `category` 字段动态派生（`desktop-background-list.vue:35-42`）：
1. 收集所有元数据的 `category` 值
2. 按固定首选顺序排列：`全部 → 暗色系 → 浅色系 → 动态`
3. 未知分类按字母序追加
4. 始终以 `'全部'` 为首位

## 5. 接口契约

### 5.1 提供的接口

#### `useBackgroundMetas()` (src/composables/useBackgroundMetas.js)

```typescript
function useBackgroundMetas(): {
  backgroundMetas: Ref<Record<string, BackgroundMeta>>
}
```

- 模块级单例，所有调用方共享同一响应式引用
- 只读消费（符合宪法第14条）

#### `desktop-background` 组件 (src/components/desktop/desktop-background.vue)

```typescript
// Props
interface BackgroundProps {
  background: null | {
    type: 'image' | 'video'
    name: string
    title: string
    category: string
  }
}
// 无 Emits（纯展示层）
```

#### `desktop-background-list` 组件 (src/components/desktop/desktop-background-list.vue)

```typescript
// Props
interface BackgroundListProps {
  currentBackground: null | { name: string, ... }
}

// Emits
interface BackgroundListEmits {
  selectBackground: (meta: BackgroundMeta) => void
  close: () => void
}
```

### 5.2 消费的接口

| 接口 | 来源 | 用途 |
|------|------|------|
| `useTheme().setTheme(theme)` | 005-theme-system | 背景选择时自动切换主题模式 |
| `import.meta.glob('./**/*.bg.js', { eager: true })` | Vite 构建 | 扫描所有 *.bg.js 元数据 |
| `persistConfig()` | Desktop.vue | 背景变更后持久化桌面配置 |

### 5.3 事件协议

无 pub/sub 或事件总线。所有通信通过 Props/Emits 完成：

```
desktop-background-list --emit('selectBackground', meta)--> Desktop.vue
                                |
                          Desktop.vue.onSelectBackground(meta)
                                |
                          persistConfig() → localStorage
                          setTheme(meta.theme) → html.dark toggle
                          desktopConfig.background = { ... }
                                |
                          desktop-background :background="desktopConfig.background"
                                |
                          computed resolved → <img> or <video>
```

## 6. 实现策略

### 6.1 架构模式

**注册表 + 响应式消费**:
1. `src/backgrounds/index.js` — 构建时注册表（模块级静态对象）
2. `src/composables/useBackgroundMetas.js` — 响应式封装（ref 包装）
3. `src/components/desktop/desktop-background.vue` — 渲染层（props → computed resolved → template）
4. `src/components/desktop/desktop-background-list.vue` — 选择面板（computed slides + embla 轮播 + emit）

### 6.2 渲染切换逻辑

`desktop-background.vue` 的 `resolved` computed (`:29-41`) 流程：

```
props.background
  → 判 null/无 name → 返回 null（不渲染）
  → backgroundMetas.value[bg.name] → 无 meta → console.warn + null
  → meta.type === 'video' ? meta.video : meta.image → 无 url → null
  → { key, type, url }
```

Vue `<Transition name="bg-fade">` + `:key="resolved.key"` 保证切换时新旧图层同时存在 300ms 完成 opacity 交叉渐变。

### 6.3 预览图机制

- 选择面板始终使用 `meta.thumbnail`（PNG 缩略图）展示卡片预览
- 缩略图通过 `import` 语句由 Vite 静态解析，获得生产优化后的哈希 URL
- 所有背景（含视频型）的 `thumbnail` 均为静态 PNG 图片

### 6.4 错误处理

| 场景 | 处理方式 | 位置 |
|------|---------|------|
| `.bg.js` default 导出非对象 | `console.warn` + `continue` 跳过 | `src/backgrounds/index.js:34-38` |
| 同名背景冲突 | `console.warn` + 后覆盖先 | `src/backgrounds/index.js:30-32` |
| 渲染层收到未注册 name | `console.warn` + 返回 null（不渲染） | `desktop-background.vue:33-36` |
| 渲染层无资源 url | 返回 null（不渲染） | `desktop-background.vue:38-39` |

### 6.5 轮播交互

- 分类切换: `watch(activeCategory) → nextTick → emblaApi.reInit() + scrollTo(0)` (`desktop-background-list.vue:60-65`)
- 打开定位: `watch(emblaApi, { once: true }) → findIndex(currentName) → scrollTo(idx)` (`desktop-background-list.vue:68-76`)
- 导航按钮: `scrollPrev()` / `scrollNext()` 直接调用 embla API (`desktop-background-list.vue:80-86`)

## 7. 测试考量

- **背景元数据注册**: 验证 12 个 `.bg.js` 全部被 `import.meta.glob` 扫描，`BackgroundMetas` 字典包含所有 name 键
- **默认值回退**: 构造缺失 `title` / `category` / `type` 的元数据对象，验证回退逻辑
- **资源解析**: 验证 `resolved` computed 在有效/无效/缺失 background prop 时的返回值
- **分类派生**: 验证 `categories` computed 的首选顺序和未知分类追加
- **渲染层**: 验证 `<img>` vs `<video>` 条件渲染，验证 null background 时不渲染
- **选择面板**: 验证 embla carousel 初始化、分类过滤、选中高亮、点击选择 + 自动关闭
- **持久化**: 验证 `onSelectBackground` 写入 `desktopConfig.background` 后 `persistConfig()` 被调用
- **主题联动**: 验证选择带 `theme` 字段的背景时 `setTheme()` 被正确调用

边缘情况:
- embla API 未就绪时导航按钮点击（`emblaApi.value?.scrollPrev()` 可选链安全调用）
- `backgroundMetas.value` 为空对象时面板显示空状态提示
- `currentBackground` prop 为 null 时不触发 embla 自动定位
- 视频背景的 `playsinline` 在桌面端的影响（无害）
- 背景缩略图 `draggable="false"` 防止 embla 拖拽冲突

## 8. 文件清单

| 文件 | 用途 | 行数 |
|------|------|------|
| `src/backgrounds/index.js` | 背景元数据自动扫描注册入口 | 50 |
| `src/composables/useBackgroundMetas.js` | 背景元数据响应式封装 | 16 |
| `src/components/desktop/desktop-background.vue` | 背景渲染层（img/video） | 96 |
| `src/components/desktop/desktop-background-list.vue` | 背景选择面板（分类+轮播） | 363 |
| `src/backgrounds/dark/dark-001.bg.js` | 暗色系背景 01 | 16 |
| `src/backgrounds/dark/dark-002.bg.js` | 暗色系背景 02 | 16 |
| `src/backgrounds/dark/dark-003.bg.js` | 暗色系背景 03 | 16 |
| `src/backgrounds/dark/dark-004.bg.js` | 暗色系背景 04 | 16 |
| `src/backgrounds/light/light-001.bg.js` | 浅色系背景 01 | 15 |
| `src/backgrounds/light/light-002.bg.js` | 浅色系背景 02 | 15 |
| `src/backgrounds/light/light-003.bg.js` | 浅色系背景 03 | 15 |
| `src/backgrounds/light/light-004.bg.js` | 浅色系背景 04 | 15 |
| `src/backgrounds/video/webm-001.bg.js` | 动态视频背景 01 | 16 |
| `src/backgrounds/video/webm-002.bg.js` | 动态视频背景 02 | 16 |
| `src/backgrounds/video/webm-003.bg.js` | 动态视频背景 03 | 16 |
| `src/backgrounds/video/webm-004.bg.js` | 动态视频背景 04 | 16 |
| `src/pages/Desktop.vue` | 编排层：onSelectBackground + 组件挂载 | 604（含所有模块） |
| **合计** | — | ~1,421 |
