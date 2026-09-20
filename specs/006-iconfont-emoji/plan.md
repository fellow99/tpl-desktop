# 006-iconfont-emoji — 技术方案

> 需求编号: 006-iconfont-emoji
> 最后更新: 2026-07-20

## 方案概述

本模块为纯文档 + 代码替换类需求，不涉及新组件或架构变更。核心工作分为两部分:
1. **文档产出**: 从 `demo_index.html` 提取图标对照数据，生成 `docs/iconfont-emoji.md`
2. **代码替换**: 6 个 Vue 组件文件中的 Unicode emoji → `<span class="ss-icon ...">`

## 技术决策

### TD-001: 图标引用方式

**决策**: 使用 font-class 方式引用图标

**理由**:
- font-class 语意明确，书写直观（`ss-icon-home` vs `&#xe702;`）
- 替换图标只需修改类名，无需变更 HTML 结构
- 与现有 HTML 入口中的 `<link rel="stylesheet" href="./ss-icon/iconfont.css">` 引入方式一致

**替代方案评估**:
- Unicode 引用 (`&#xe702;`): 语义不明确，可读性差 — **不采用**
- SVG Symbol 引用: 需要额外引入 `iconfont.js`，增加包体积 — **不采用**

### TD-002: emoji → icon 映射策略

**决策**: 语义映射（semantic mapping），而非视觉近似映射

**理由**:
- emoji 在不同操作系统中渲染效果差异极大（如 ✔️ 在 Windows 显示为绿色复选框，macOS 显示为灰色勾号）
- iconfont 图标在 css 变量体系下可统一着色
- 语义映射确保功能可理解，而非仅视觉相似

**映射表**:

| emoji | 语义 | ss-icon 类名 |
|-------|------|-------------|
| 🏠 | 主页 | `ss-icon-home` |
| 🖼️ | 图片/背景 | `ss-icon-image` |
| ➕ | 添加/加大 | `ss-icon-plus` |
| 🎨 | 主题/调色 | `ss-icon-bg-colors` |
| 🎞️ | 页面/幻灯片 | `ss-icon-file-video` |
| ❌ | 关闭/删除/移除 | `ss-icon-close` |
| 🔢 | 字号/字体属性 | `ss-icon-font-colors` |
| ➖ | 减小/最小化 | `ss-icon-minus` |
| 🔄 | 还原/重置 | `ss-icon-sync` |
| ✔️ | 完成/确认 | `ss-icon-check` |
| 🗃️ | 桌面/存储 | `ss-icon-archive` |
| 👤 | 用户 | `ss-icon-user` |
| 📌 | 快捷方式/图钉 | `ss-icon-pushpin` |
| 🔘 | 应用/按钮 | `ss-icon-apps` |
| ✓ | 勾选/选中 | `ss-icon-check` |
| ↖️ | 往前添加 | `ss-icon-arrow-left` |
| ↗️ | 往后添加 | `ss-icon-arrow-rise` |

### TD-003: 替换模板

原始代码示例:
```html
<button title="最小化" @click="emit('minimize')">➖</button>
```

替换后:
```html
<button title="最小化" @click="emit('minimize')">
  <span class="ss-icon ss-icon-minus"></span>
</button>
```

**原则**:
- 内联 emoji → `<span class="ss-icon ss-icon-xxx"></span>`
- 模板插值中的 emoji → 替换为对应类名的 `<span>`
- 注释中的 emoji 保留不变

## 实现步骤

### Step 1: 生成 iconfont-emoji.md

从 `public/ss-icon/demo_index.html` 的 `class="content font-class"` 区域提取所有 `<li class="dib">` 数据:
- `.name` div → 中文/英文名称
- `.code-name` div → CSS 类名（去掉前导 `.`）

格式化为 Markdown 表格。

### Step 2: 更新 constitution.md

在 `specs/constitution.md` 第二章「编码规范」中添加新条目（第13条，后续序号顺延）:

```markdown
### 第13条: 图标使用规范

**级别**: MUST

**正文**:
源代码中用到的 UI 图标一律使用 iconfont（`<span class="ss-icon ss-icon-xxx"></span>`），禁止直接使用 Unicode emoji 字符。iconfont 在 CSS 变量体系下可统一着色和缩放，确保跨平台视觉一致性。

对应功能的 markdown 文档描述中使用 emoji，以增强文档可读性和直观表达。
```

### Step 3: 替换 Vue 组件 emoji

逐个处理 6 个受影响的文件，每个文件独立修改:

| 文件 | 变更行 | 替换描述 |
|------|-------|---------|
| `desktop-app-wrapper.vue` | L28, L29 | ➖→ss-icon-minus, ❌→ss-icon-close |
| `desktop-toolbar-main.vue` | L49 | 🏠→ss-icon-home |
| `desktop-toolbar-edit.vue` | L53,59,65,72,77,78,80,89,94-96,105 | 11+ emoji → 对应 icon |
| `desktop-statusbar.vue` | L72, L78 | ✔️→ss-icon-check, 🗃️→ss-icon-archive, 👤→ss-icon-user |
| `desktop-app-list.vue` | L183, L185 | 📌→ss-icon-pushpin, 🔘→ss-icon-apps, ❌→ss-icon-close |
| `desktop-background-list.vue` | L133 | ✓→ss-icon-check |

## 参考资源

- `public/ss-icon/iconfont.css` — iconfont 样式定义
- `public/ss-icon/demo_index.html` — 图标展示与类名对照
- `docs/iconfont-emoji.md` — 生成后的图标对照文档
- `specs/constitution.md` — 项目架构宪法（待更新）
