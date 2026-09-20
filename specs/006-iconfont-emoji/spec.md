# 006-iconfont-emoji — 图标库

> 需求编号: 006-iconfont-emoji
> 需求名称: 图标库
> 模块分类: 核心框架 / 系统集成
> 最后更新: 2026-07-20

## 概述

本模块引入 iconfont 图标库（`public/ss-icon/`），建立图标类名与中文含义的对照体系，并将现有 Vue 源码中的 Unicode emoji 图标替换为统一的 iconfont CSS 类名，确保图标在各平台/浏览器下的一致性呈现。

## 功能需求

### FR-001: iconfont 图标库集成

- 项目引入 `public/ss-icon/` 图标字体库（包含 `iconfont.css`、字体文件、demo 文档）
- 各 HTML 入口通过 `<link rel="stylesheet" href="./ss-icon/iconfont.css">` 引入 CSS
- 使用方式: `<span class="ss-icon ss-icon-xxx"></span>`

### FR-002: 图标对照文档

- 基于 `public/ss-icon/demo_index.html` 中的 Font class 栏目，整理一份 `docs/iconfont-emoji.md` 对照表
- 对照表包含三列: 中文含义、CSS 类名、emoji 标识（仅供文档直观展示）
- 共计约 170+ 个图标映射

### FR-003: 源代码 emoji → iconfont 替换

扫描所有 `.vue` 源码文件，将模板中直接使用的 Unicode emoji 字符替换为对应的 `ss-icon` CSS 类名:

| 原 emoji | 替换为 | 说明 |
|----------|--------|------|
| 🏠 | `<span class="ss-icon ss-icon-home"></span>` | 主页 |
| 🖼️ | `<span class="ss-icon ss-icon-image"></span>` | 背景图片 |
| ➕ | `<span class="ss-icon ss-icon-plus"></span>` | 添加 |
| 🎨 | `<span class="ss-icon ss-icon-bg-colors"></span>` | 主题/配色 |
| 🎞️ | `<span class="ss-icon ss-icon-file-video"></span>` | 页面/幻灯片 |
| ❌ | `<span class="ss-icon ss-icon-close"></span>` | 关闭/删除/移除 |
| 🔢 | `<span class="ss-icon ss-icon-font-colors"></span>` | 字号/字体 |
| ➖ | `<span class="ss-icon ss-icon-minus"></span>` | 减小/最小化 |
| 🔄 | `<span class="ss-icon ss-icon-sync"></span>` | 还原/重置 |
| ✔️ | `<span class="ss-icon ss-icon-check"></span>` | 完成/确认 |
| 🗃️ | `<span class="ss-icon ss-icon-archive"></span>` | 桌面/存储 |
| 👤 | `<span class="ss-icon ss-icon-user"></span>` | 用户 |
| 📌 | `<span class="ss-icon ss-icon-pushpin"></span>` | 快捷方式/固定 |
| 🔘 | `<span class="ss-icon ss-icon-apps"></span>` | 应用/按钮 |
| ✓ | `<span class="ss-icon ss-icon-check"></span>` | 选中/勾选 |
| ↖️ | `<span class="ss-icon ss-icon-arrow-left"></span>` | 往前添加页面 |
| ↗️ | `<span class="ss-icon ss-icon-arrow-rise"></span>` | 往后添加页面 |

### FR-004: 宪法原则更新

在 `specs/constitution.md` 中新增一条原则:
- 源代码中用到图标的地方使用 iconfont（不使用 emoji），确保跨平台一致性
- 而对应功能的 markdown 文档描述中使用 emoji（文档能更直观表达需求）

### FR-005: 受影响的文件

| 文件 | emoji 数量 | 主要变更 |
|------|-----------|---------|
| `src/components/viewport/desktop-app-wrapper.vue` | 2 | ➖❌ → minus/close |
| `src/components/desktop/desktop-toolbar-main.vue` | 1 | 🏠 → home |
| `src/components/desktop/desktop-toolbar-edit.vue` | 14 | 多个 emoji 替换 |
| `src/components/desktop/desktop-statusbar.vue` | 3 | ✔️🗃️👤 |
| `src/components/desktop/desktop-app-list.vue` | 3 | 📌🔘❌ |
| `src/components/desktop/desktop-background-list.vue` | 1 | ✓ → check |

## 验收标准

- [ ] `docs/iconfont-emoji.md` 存在且包含约 170+ 图标对照记录
- [ ] `specs/constitution.md` 包含 iconfont 使用原则
- [ ] 6 个 `.vue` 文件中不再出现 Unicode emoji（注释除外）
- [ ] 替换后界面视觉不变（图标语义一致）
- [ ] `pnpm build` 构建通过
- [ ] 所有 emoji → class 映射在对照表中有据可查

## 约束

- 不修改 `public/ss-icon/` 目录下的任何文件（含 iconfont.css）
- 不修改 `.widget.js` / `.app.js` / `.bg.js` 元数据文件
- 仅替换模板中的 emoji 文本内容，不修改逻辑代码
- 注释中的 emoji 保留不变（如 `// Emits : minimize — 点击最小化按钮`）
