# 桌面背景系统 — 功能规格

> 模块: 004-background-system
> 状态: 已实现
> 最后更新: 2026-07-19

## 1. 模块概述

### 1.1 目的 — 为什么需要这个模块

桌面背景系统为工作台提供可更换的视觉背景层，用户可从预置背景库中选择图片或视频作为桌面背景，并通过分类浏览快速找到所需风格。

### 1.2 解决的问题 — 它解决了什么痛点

- 用户对桌面视觉环境的个性化需求（不再局限于单一固定底色）
- 背景资源的组织与发现（按浅色系/暗色系/动态分类）
- 背景状态在页面刷新后的持久化保持
- 背景切换时的平滑视觉过渡，避免突兀闪烁

### 1.3 范围 — 包含与不包含

**包含**:
- 背景元数据的约定化定义（\*.bg.js）与构建时自动注册
- 三种背景分类：浅色系（light 图片）、暗色系（dark 图片）、动态（video 视频）
- 背景渲染层的图片 / 视频显示（`<img>` / `<video>`）
- 背景选择面板 UI（分类页签 + embla-carousel 轮播）
- 选择背景时自动同步主题模式（浅色/深色）
- 背景选择结果持久化到桌面配置

**不包含**:
- 主题模式切换本身的机制（归属模块 005-theme-system）
- 用户自定义上传背景
- 视频背景的音量控制、播放/暂停控制
- 桌面编排逻辑（归属模块 001-desktop-shell）

## 2. 用户故事

- 作为用户，我可以在编辑模式下打开背景选择面板，从预设库中选择一张图片或视频作为我的桌面背景，以获得更个性化的视觉体验。
- 作为用户，我可以按分类（全部/暗色系/浅色系/动态）快速筛选背景，通过水平滑动轮播浏览所有选项。
- 作为用户，选择新背景后，我的当前背景配置会被自动持久化，下次打开工作台时依然保持我上次选择的背景。
- 作为用户，选择深色系或浅色系背景时，应用主题会自动切换到对应的深色模式或浅色模式，使整体视觉协调一致。
- 作为用户，在浏览背景时可以看到缩略图预览、名称和分类标注，方便做出选择。
- 作为用户，当我未设置任何背景时，桌面只显示主题默认底色，不会出现异常空白。

## 3. 功能需求

### 3.1 背景元数据自动注册

- FR-004-001: 系统 MUST 在构建时通过 Vite `import.meta.glob` 自动扫描 `src/backgrounds/` 下所有 `*.bg.js` 文件，无需手动维护注册列表。
- FR-004-002: 系统 MUST 从文件路径自动提取背景名称（如 `./dark/dark-001.bg.js` → `dark-001`），作为背景的唯一标识键。
- FR-004-003: 系统 MUST 对每个元数据对象提供默认值回退：`category` 默认 `'其他'`，`type` 默认 `'image'`，`title` 缺失时回退为 `name`。
- FR-004-004: 系统 SHOULD 对同名背景冲突输出 `console.warn` 警告并以后加载者覆盖先加载者，不中断注册流程。
- FR-004-005: 系统 SHOULD 对 `default` 导出非对象的元数据文件输出 `console.warn` 警告并跳过该条目，不中断注册流程。

### 3.2 背景元数据模型

- FR-004-006: 图片型背景元数据 MUST 包含 `image` 字段（渲染用全图 URL）和 `thumbnail` 字段（选择面板预览用缩略图 URL）。
- FR-004-007: 视频型背景元数据 MUST 包含 `video` 字段（渲染用 WebM 视频 URL）和 `thumbnail` 字段（选择面板预览用缩略图 URL）。
- FR-004-008: 每个背景元数据 MUST 声明 `category` 字段（当前值：`暗色系`、`浅色系`、`动态`），用于选择面板的分类筛选。
- FR-004-009: 每个背景元数据 MUST 声明 `type` 字段（`'image'` 或 `'video'`），决定渲染层使用 `<img>` 还是 `<video>` 元素。
- FR-004-010: 每个背景元数据 SHOULD 声明 `theme` 字段（`'light'` 或 `'dark'`），在选择该背景时触发主题模式自动切换。
- FR-004-011: 每个背景元数据 SHOULD 包含 `avatar` 字段（小型图标 URL），预留用于更紧凑的背景选择 UI。

### 3.3 背景渲染层

- FR-004-012: 系统 MUST 在桌面视口之下、所有交互层之上渲染一个背景层（z-index: 0，`pointer-events: none`），不拦截任何鼠标/触控事件。
- FR-004-013: 图片型背景 MUST 使用 `<img>` 元素渲染，以 `object-fit: cover` 铺满视口。
- FR-004-014: 视频型背景 MUST 使用 `<video>` 元素渲染，设置 `autoplay`、`loop`、`muted`、`playsinline` 属性，以 `object-fit: cover` 铺满视口。
- FR-004-015: 背景渲染层 MUST 通过 `props.background` 的 `name` 字段从 `backgroundMetas` 字典中解析实际资源 URL，而非直接从桌面配置中读取路径。
- FR-004-016: 当 `props.background` 为 `null` 或 `name` 未在元数据中注册时，渲染层 MUST 不渲染任何内容，露出主题默认底色（`--desktop-bg-primary`）。
- FR-004-017: 背景切换 SHOULD 通过 Vue `<Transition>` 组件实现 300ms opacity 交叉渐变过渡，避免视觉跳变。

### 3.4 背景选择面板

- FR-004-018: 系统 MUST 在编辑模式下提供"更换背景"面板入口（编辑工具条「背景」按钮），点击打开全屏模态面板（z-index: 200）。
- FR-004-019: 面板 MUST 包含分类页签，选项由已注册背景的 `category` 字段动态生成，固定顺序为：全部 → 暗色系 → 浅色系 → 动态 → 其他（按字母序）。
- FR-004-020: 面板 MUST 使用 embla-carousel-vue（`align: 'center'` + `containScroll: 'keepSnaps'`）展示背景卡片，支持触摸滑动和鼠标拖拽。
- FR-004-021: 每张卡片 MUST 显示 `thumbnail` 缩略图、`title` 名称和 `category` 分类标注；视频型背景卡片 MUST 额外显示"视频"角标。
- FR-004-022: 当前已选背景卡片 MUST 以高亮边框（`box-shadow` 内阴影）视觉区分，并显示 ✓ 图标。
- FR-004-023: 点击卡片 MUST 触发背景选择，立即关闭面板。
- FR-004-024: 切换分类页签后 MUST 重置轮播位置到第一张卡片。
- FR-004-025: 面板打开时 MUST 自动滚动轮播到当前已选背景的卡片位置（通过 embla `scrollTo`）。
- FR-004-026: 面板左右 MUST 提供导航按钮（‹ / ›），调用 embla `scrollPrev` / `scrollNext`。
- FR-004-027: 点击遮罩层或关闭按钮 MUST 关闭面板。

### 3.5 背景持久化

- FR-004-028: 选择背景后，系统 MUST 将 `{ type, name, title, category }` 精简信息写入 `desktopConfig.background` 并立即调用 `persistConfig()` 序列化到 localStorage。
- FR-004-029: 页面加载时，系统 MUST 从 `desktopConfig.background` 读取背景引用并传递给 `desktop-background` 渲染，实现刷新恢复。
- FR-004-030: 持久化数据 MUST NOT 包含实际资源路径（image/video/thumbnail URL），仅存储名称引用。

### 3.6 背景与主题联动

- FR-004-031: 选择背景时，若元数据包含 `theme` 字段，系统 MUST 自动调用 `useTheme().setTheme()` 切换对应主题模式（light/dark），并同步更新 `desktopConfig.theme`。
- FR-004-032: 仅通过工具栏主题按钮切换主题时，系统 MUST NOT 自动切换背景（单向联动：背景选择 → 主题切换，反之不成立）。

## 4. 关键实体

| 实体 | 描述 | 关键属性 |
|------|------|---------|
| BackgroundMeta（图片型） | 描述一张图片背景的元数据对象 | `name`(自动注入), `title`, `category`, `type`, `theme`, `avatar`, `thumbnail`, `image` |
| BackgroundMeta（视频型） | 描述一个视频背景的元数据对象 | `name`(自动注入), `title`, `category`, `type`, `theme`, `avatar`, `thumbnail`, `video` |
| DesktopConfig.background | 桌面配置中的背景引用（持久化子集） | `type`, `name`, `title`, `category` — 不包含实际资源 URL |

### BackgroundMeta 完整字段表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | string | 自动注入 | — | 背景唯一标识，从文件名提取（如 `dark-001`） |
| `title` | string | SUGGESTED | `name` | 用户可见名称（如 `暗色背景01`） |
| `category` | string | SUGGESTED | `'其他'` | 分类标签（`暗色系` / `浅色系` / `动态`） |
| `type` | `'image' \| 'video'` | SUGGESTED | `'image'` | 背景类型，决定渲染方式 |
| `theme` | `'light' \| 'dark'` | OPTIONAL | — | 选择该背景时自动切换到的主题模式 |
| `avatar` | string (URL) | OPTIONAL | — | 小图标资源路径 |
| `thumbnail` | string (URL) | OPTIONAL | — | 选择面板缩略图资源路径 |
| `image` | string (URL) | 图片型必填 | — | 全尺寸背景图资源路径 |
| `video` | string (URL) | 视频型必填 | — | WebM 视频资源路径 |

## 5. 验收场景

### 场景: 打开背景选择面板

- Given 用户在编辑模式下
- When 用户点击编辑工具条「背景」按钮
- Then 全屏模态背景选择面板弹出，显示分类页签（全部/暗色系/浅色系/动态）和 embla 轮播卡片

### 场景: 分类浏览背景

- Given 背景选择面板已打开
- When 用户点击「暗色系」分类页签
- Then 轮播只显示 category 为 `暗色系` 的背景卡片，轮播位置重置到第一张
- When 用户随后点击「浅色系」分类页签
- Then 轮播只显示 category 为 `浅色系` 的背景卡片

### 场景: 切换图片背景

- Given 当前背景为 `dark-001`（暗色系图片）
- When 用户在面板中选择 `light-001`（浅色系图片）并点击卡片
- Then 桌面背景切换为浅色背景图，面板自动关闭，主题自动切换为浅色模式（`html.dark` 被移除），配置持久化到 localStorage

### 场景: 切换视频背景

- Given 当前背景为任意图片背景
- When 用户在面板中切换到「动态」分类，选择 `webm-001` 并点击卡片
- Then 桌面背景切换为 WebM 视频（自动播放、循环、静音），面板关闭，主题自动切换为深色模式（因为 webm-001 的 theme 为 `dark`）

### 场景: 背景持久化（刷新恢复）

- Given 用户已选择 `dark-002` 作为桌面背景
- When 用户刷新页面（或关闭后重新打开）
- Then 桌面配置从 localStorage 加载，`desktopConfig.background` 包含 `{ name: 'dark-002', ... }`，背景渲染层正确显示 `dark-002` 的图片

### 场景: 未设置背景时的默认态

- Given 用户从未选择过背景（`desktopConfig.background` 为 `null`）
- When 桌面渲染
- Then 背景渲染层不渲染任何内容，桌面显示主题默认底色 `var(--desktop-bg-primary)`

### 场景: 背景元数据缺失时的降级

- Given `desktopConfig.background.name` 指向一个已从文件系统删除的背景
- When 桌面渲染
- Then `desktop-background` 输出 `console.warn` 并回退到不渲染，露出主题默认底色

### 场景: 背景选择面板高亮当前背景

- Given 当前背景为 `dark-003`
- When 用户打开背景选择面板
- Then 轮播自动滚动到 `dark-003` 卡片位置，该卡片显示高亮边框和 ✓ 图标

## 6. 非功能需求

- 性能（视频背景）: WebM 视频占位资源为 VP8 编码，480×270 分辨率，约 3 秒循环。视频设置为 `muted` 以避免自动播放策略限制，`playsinline` 以支持移动端内联播放。（证据：`webm-*.bg.js` 注释）
- 背景切换过渡: 300ms opacity 渐变（FR-004-017），避免视觉闪烁。
- 错误恢复: 元数据注册阶段遇到非法默认导出时不中断注册流程；渲染阶段遇到未注册背景引用时静默降级到默认底色。
- 可访问性: 背景渲染层设置 `aria-hidden="true"`，不对辅助技术暴露。
- 安全性: 持久化到 localStorage 的背景数据仅包含名称引用（`type/name/title/category`），不包含实际文件路径。

## 7. 假设与约束

- 背景资源文件（PNG 缩略图、SVG 背景图、WebM 视频）在构建时由 `import.meta.glob` 的静态导入子句解析为打包产物路径，Vite 负责哈希化与缓存策略。
- 背景选择面板的 embla-carousel 行为假设浏览器正常支持 CSS `transform` 和触摸事件；未提供降级方案。
- `avatar` 字段在背景选择面板 UI 中已通过 `import` 加载但未被渲染使用，为预留扩展点。
- 背景与主题的联动为单向：选择背景 → 自动切换主题，主题手动切换不影响背景选择。

## 8. 依赖关系

### 上游依赖（本模块消费的接口）

| 依赖模块/组件 | 消费内容 | 证据 |
|--------------|---------|------|
| 005-theme-system (`useTheme`) | `setTheme()` 在 `onSelectBackground` 中调用以切换主题 | `Desktop.vue:279-281` |
| 001-desktop-shell (`Desktop.vue`) | 传递 `desktopConfig.background` prop，调用 `onSelectBackground` 处理选择事件 | `Desktop.vue:461,521-522` |
| Vite `import.meta.glob` | eager 扫描 `*.bg.js` 文件 | `src/backgrounds/index.js:18` |

### 下游依赖（消费本模块的接口）

| 消费者 | 消费内容 | 证据 |
|--------|---------|------|
| 001-desktop-shell (`Desktop.vue`) | `desktop-background` 渲染层组件 + `desktop-background-list` 选择面板组件 | `Desktop.vue:461-523` |
| — | `useBackgroundMetas()` 提供 `backgroundMetas` Ref 供渲染层和选择面板读取 | 两个消费组件各自调用 |

### 外部依赖

| 依赖 | 用途 |
|------|------|
| `embla-carousel-vue` | 背景选择面板的水平轮播交互 |
| `vue` (Composition API) | `ref`, `computed`, `watch`, `nextTick`, `Transition` |
