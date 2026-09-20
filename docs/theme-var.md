# 主题 CSS 变量参考

> 项目: tpl-desktop
> 模块: 005-theme-system
> 源文件: `src/style/theme-var.scss`
> 最后更新: 2026-07-20

## 概述

工作台使用 `--desktop-*` 命名前缀的 CSS 自定义属性（CSS Variables）统一管理所有视觉样式。浅色主题定义在 `:root` 级别，深色主题定义在 `html.dark` 级别，通过 CSS 级联实现切换。

**命名约定**: `--desktop-{类别}-{属性}`，如 `--desktop-bg-primary` = 背景类 + 主背景色。

---

## 完整变量表

### 主色调

| 变量 | 浅色 | 深色 | 说明 |
|---|---|---|---|
| `--desktop-color-primary` | `#007acc` | `#007acc` | 主品牌色 |
| `--desktop-color-primary-hover` | `#0088dd` | `#0088dd` | 主品牌色 hover |
| `--desktop-color-danger` | `#d73a49` | `#d73a49` | 危险色 |
| `--desktop-color-danger-hover` | `#e85662` | `#e85662` | 危险色 hover |
| `--desktop-color-success` | `#00cc7a` | `#00cc7a` | 成功色 |
| `--desktop-color-success-hover` | `#62e856` | `#62e856` | 成功色 hover |

### 全局背景

| 变量 | 浅色 | 深色 | 说明 |
|---|---|---|---|
| `--desktop-bg-primary` | `#f0f2f5` | `#0f0f1a` | 页面主体背景 |
| `--desktop-bg-secondary` | `#ffffff` | `#1a1a2e` | 卡片/面板背景 |
| `--desktop-bg-tertiary` | `#f8f9fa` | `#16213e` | 三级背景（嵌套容器） |
| `--desktop-bg-overlay` | `#ffffff` | `#1d1e1f` | 弹出层/浮层背景 |

### 全局文字

| 变量 | 浅色 | 深色 | 说明 |
|---|---|---|---|
| `--desktop-text-primary` | `#1a1a2e` | `#e0e0e0` | 主要文字色 |
| `--desktop-text-secondary` | `#666680` | `#a0a0b0` | 次要文字色 |
| `--desktop-text-muted` | `#999aaa` | `#606070` | 三级文字/占位符 |
| `--desktop-text-disabled` | `#c0c4cc` | `#6c6e72` | 禁用文字色 |

### 边框

| 变量 | 浅色 | 深色 | 说明 |
|---|---|---|---|
| `--desktop-border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` | 标准边框 |
| `--desktop-border-light` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.04)` | 浅边框/分割线 |

### 强调色

| 变量 | 浅色 | 深色 | 说明 |
|---|---|---|---|
| `--desktop-accent` | `#1890ff` | `#4FC3F7` | 强调/高亮色 |
| `--desktop-accent-dim` | `rgba(24,144,255,0.12)` | `rgba(79,195,247,0.15)` | 强调色淡背景 |
| `--desktop-danger` | `#e53935` | `#ff5252` | 危险色（组件级） |
| `--desktop-success` | `#43a047` | `#66bb6a` | 成功色（组件级） |
| `--desktop-warning` | `#fb8c00` | `#ffa726` | 警告色（组件级） |

### 阴影

| 变量 | 浅色 | 深色 | 说明 |
|---|---|---|---|
| `--desktop-shadow` | `0 4px 24px rgba(0,0,0,0.08)` | `0 4px 24px rgba(0,0,0,0.4)` | 通用阴影（大） |
| `--desktop-shadow-sm` | `0 2px 8px rgba(0,0,0,0.06)` | `0 2px 8px rgba(0,0,0,0.3)` | 通用阴影（小） |

### 编辑器界面

| 变量 | 浅色 | 深色 | 说明 |
|---|---|---|---|
| `--desktop-bg-header` | `#f5f5f5` | `#16213e` | 编辑器顶部工具栏背景 |
| `--desktop-bg-grid` | `#fafafa` | `#0f3460` | GridStack 网格容器背景 |
| `--desktop-grid-item-bg` | `#ffffff` | `#1a1a2e` | 网格项内容背景 |

### Widget 外框

| 变量 | 浅色 | 深色 | 说明 |
|---|---|---|---|
| `--desktop-widget-header-bg` | `#409EFF` | `#3370ff` | Widget 头部背景 |
| `--desktop-widget-header-text` | `#ffffff` | `#e5eaf3` | Widget 头部文字 |
| `--desktop-widget-content-bg` | `#ffffff` | `#16213e` | Widget 内容区背景 |

### 工具栏

| 变量 | 浅色 | 深色 | 说明 |
|---|---|---|---|
| `--desktop-toolbar-bg` | `rgba(255,255,255,0.85)` | `rgba(20,20,40,0.85)` | 工具栏背景（半透明） |
| `--desktop-toolbar-blur` | `blur(12px)` | `blur(12px)` | 工具栏背景模糊 |
| `--desktop-toolbar-border` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.06)` | 工具栏边框 |

### 卡片

| 变量 | 浅色 | 深色 | 说明 |
|---|---|---|---|
| `--desktop-card-bg` | `rgba(255,255,255,0.85)` | `rgba(26,26,46,0.75)` | 卡片背景 |
| `--desktop-card-bg-hover` | `rgba(255,255,255,0.95)` | `rgba(30,30,55,0.85)` | 卡片 hover 背景 |
| `--desktop-card-border` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.06)` | 卡片边框 |

### 交互状态

| 变量 | 浅色 | 深色 | 说明 |
|---|---|---|---|
| `--desktop-hover-bg` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.06)` | hover 背景 |
| `--desktop-active-bg` | `rgba(24,144,255,0.12)` | `rgba(79,195,247,0.2)` | 激活/选中背景 |
| `--desktop-overlay` | `rgba(0,0,0,0.15)` | `rgba(0,0,0,0.45)` | 遮罩层 |

### 其他

| 变量 | 浅色 | 深色 | 说明 |
|---|---|---|---|
| `--desktop-statusbar-bg` | `linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)` | `linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)` | 状态栏渐变背景 |
| `--desktop-icon-color` | `#666680` | `#a0a0b0` | 图标默认颜色 |

### 毛玻璃效果

| 变量 | 浅色 | 深色 | 说明 |
|---|---|---|---|
| `--desktop-glass-bg` | `rgba(255,255,255,0.45)` | `rgba(255,255,255,0.08)` | 毛玻璃背景 |
| `--desktop-glass-border` | `rgba(255,255,255,0.18)` | `rgba(255,255,255,0.12)` | 毛玻璃边框 |
| `--desktop-glass-blur` | `blur(12px)` | `blur(12px)` | 毛玻璃模糊量 |

---

## 变量命名规范

| 前缀 | 类别 | 示例 |
|---|---|---|
| `--desktop-bg-` | 背景色 | `--desktop-bg-primary` |
| `--desktop-text-` | 文字色 | `--desktop-text-primary` |
| `--desktop-border` | 边框 | `--desktop-border` |
| `--desktop-shadow` | 阴影 | `--desktop-shadow` |
| `--desktop-accent` | 强调色 | `--desktop-accent` |
| `--desktop-danger` | 危险色 | `--desktop-danger` |
| `--desktop-success` | 成功色 | `--desktop-success` |
| `--desktop-warning` | 警告色 | `--desktop-warning` |
| `--desktop-card-` | 卡片 | `--desktop-card-bg` |
| `--desktop-toolbar-` | 工具栏 | `--desktop-toolbar-bg` |
| `--desktop-glass-` | 毛玻璃 | `--desktop-glass-bg` |
| `--desktop-hover-` | 悬停态 | `--desktop-hover-bg` |
| `--desktop-active-` | 激活态 | `--desktop-active-bg` |
| `--desktop-widget-` | Widget 组件 | `--desktop-widget-header-bg` |

---

## 使用指南

### 在 SCSS 中引用

```scss
.my-component {
  background: var(--desktop-bg-secondary);
  color: var(--desktop-text-primary);
  border: 1px solid var(--desktop-border);
  box-shadow: var(--desktop-shadow-sm);

  &:hover {
    background: var(--desktop-hover-bg);
  }
}
```

### 规则

1. **禁止硬编码颜色** — 必须使用 `var(--desktop-*)` 引用主题变量
2. **禁止使用 `--el-*` 前缀** — Element Plus 变量仅供其内部组件使用，自定义样式统一用 `--desktop-*`
3. **新增变量** — 在 `src/style/theme-var.scss` 的 `:root` 块和 `html.dark` 块中同时定义两套值
4. **命名语义化** — `--desktop-bg-primary` 而非 `--desktop-color-1`

### 主题切换原理

```
:root { --desktop-bg-primary: #f0f2f5; }          ← 浅色默认值
html.dark { --desktop-bg-primary: #0f0f1a; }      ← 深色覆盖

// JS 切换:
document.documentElement.classList.toggle('dark')
```

> 两套值并列定义于同一文件 `theme-var.scss`：浅色在 `:root` 块，深色在 `html.dark` 块。CSS 级联机制自动根据 `<html>` 的 `dark` class 切换。
