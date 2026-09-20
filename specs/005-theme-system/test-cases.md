# 005-theme-system — 测试用例

> 模块: 005-theme-system
> 状态: 已实现
> 最后更新: 2026-07-19

## 说明

所有测试用例基于已实现的源代码推导。优先级定义：**P1** = 核心路径（必须通过）、**P2** = 重要场景（应该通过）、**P3** = 边界与降级。

测试环境要求：现代浏览器（支持 CSS Variables 和 `matchMedia`），Vue 3 DevTools 可选。

---

## 测试用例

### TC-005-001: 从浅色切换为深色主题

- **优先级**: P1
- **关联 FR**: FR-005-005, FR-005-011, FR-005-017
- **前置条件**: 当前为浅色主题（`html` 无 `dark` 类），用户已登录，进入编辑模式
- **步骤**:
  1. 确认 `<html>` 元素无 `dark` 类名
  2. 确认 `localStorage.getItem('dashboard-theme')` 为 `'light'` 或 `null`
  3. 点击底部编辑工具条中的 🎨 主题按钮
- **预期结果**:
  - `<html>` 元素获得 `dark` 类名
  - `localStorage.getItem('dashboard-theme')` 返回 `'dark'`
  - `isDark.value` 为 `true`
  - 页面背景从 `#f7f8fa` 变为 `#1a1a2e`（通过 DevTools 检查 `--desktop-bg-primary` 计算值）
  - Widget 头部背景从 `#409EFF` 变为 `#3370ff`
  - Element Plus 下拉菜单背景变为深色（检查 `--el-bg-color` 计算值）
  - 过渡动画在 0.3s 内完成

---

### TC-005-002: 从深色切换为浅色主题

- **优先级**: P1
- **关联 FR**: FR-005-005, FR-005-011
- **前置条件**: 当前为深色主题（`html` 有 `dark` 类）
- **步骤**:
  1. 确认 `<html>` 元素有 `dark` 类名
  2. 确认 `localStorage.getItem('dashboard-theme')` 为 `'dark'`
  3. 点击编辑工具条中的 🎨 主题按钮
- **预期结果**:
  - `<html>` 元素的 `dark` 类名被移除
  - `localStorage.getItem('dashboard-theme')` 返回 `'light'`
  - `isDark.value` 为 `false`
  - 页面背景从 `#1a1a2e` 变为 `#f7f8fa`
  - `color-scheme` CSS 属性为 `light`

---

### TC-005-003: 主题持久化 — 刷新页面后恢复

- **优先级**: P1
- **关联 FR**: FR-005-011, FR-005-015, FR-005-019
- **前置条件**: 用户已手动切换为深色主题（`localStorage['dashboard-theme'] === 'dark'`）
- **步骤**:
  1. 确认 localStorage 中 `dashboard-theme` 值为 `'dark'`
  2. 刷新页面（F5 或 Ctrl+R）
  3. 观察页面加载过程
- **预期结果**:
  - 在 Vue 应用挂载前，`<html>` 元素已有 `dark` 类名（反闪烁脚本生效）
  - 页面加载过程中**不出现**浅色闪烁（白色背景瞬间闪现）
  - Vue 挂载后，`initTheme()` 保持 `dark` 类名不变
  - `isDark.value` 为 `true`
  - 页面以深色主题渲染

---

### TC-005-004: 首次访问 — 跟随系统深色偏好

- **优先级**: P2
- **关联 FR**: FR-005-013, FR-005-015
- **前置条件**: 清除 localStorage（`localStorage.clear()`），操作系统设置为深色模式
- **步骤**:
  1. 确认 `localStorage.getItem('dashboard-theme')` 为 `null`
  2. 确认操作系统偏好为深色（`matchMedia('(prefers-color-scheme: dark)').matches === true`）
  3. 刷新页面
- **预期结果**:
  - `<html>` 元素有 `dark` 类名
  - `isDark.value` 为 `true`
  - localStorage 中 `dashboard-theme` 键**不存在**（不写入，保持后续可跟随系统变化）
  - 页面以深色主题渲染

---

### TC-005-005: 首次访问 — 跟随系统浅色偏好

- **优先级**: P2
- **关联 FR**: FR-005-013
- **前置条件**: 清除 localStorage，操作系统设置为浅色模式
- **步骤**:
  1. 确认 `localStorage.getItem('dashboard-theme')` 为 `null`
  2. 确认 `matchMedia('(prefers-color-scheme: light)').matches === true`
  3. 刷新页面
- **预期结果**:
  - `<html>` 元素无 `dark` 类名
  - `isDark.value` 为 `false`
  - 页面以浅色主题渲染

---

### TC-005-006: 手动设置后不再跟随系统主题变化

- **优先级**: P1
- **关联 FR**: FR-005-014
- **前置条件**: 用户已手动切换为浅色主题（`localStorage['dashboard-theme'] === 'light'`）
- **步骤**:
  1. 确认 localStorage 中有 `dashboard-theme` 值为 `'light'`
  2. 模拟操作系统主题切换为深色（使用浏览器 DevTools 的 Rendering 面板，或通过 `matchMedia` mock 触发 change 事件）
- **预期结果**:
  - `html` 元素仍无 `dark` 类名
  - 页面保持浅色主题
  - `useTheme` 的 matchMedia 监听器检测到 localStorage 有值，跳过自动跟随

---

### TC-005-007: 未手动设置时跟随系统主题变化

- **优先级**: P2
- **关联 FR**: FR-005-014
- **前置条件**: 用户从未手动设置主题（localStorage 中无 `dashboard-theme` 键），当前操作系统为浅色模式，页面以浅色呈现
- **步骤**:
  1. 确认 `localStorage.getItem('dashboard-theme')` 为 `null`
  2. 将操作系统主题切换为深色模式
  3. 观察页面变化
- **预期结果**:
  - `<html>` 元素自动添加 `dark` 类名
  - 页面切换为深色主题
  - localStorage 仍未写入（保持 `null`）
  - 若再次将系统切换回浅色，页面跟随切回

---

### TC-005-008: 主题对组件样式的影响 — 抽样验证点

- **优先级**: P2
- **关联 FR**: FR-005-004, FR-005-007
- **前置条件**: 已进入编辑模式，桌面可见
- **步骤**:
  1. 切换为深色主题
  2. 检查以下位置的颜色：
     - 顶部状态栏背景 → `var(--desktop-bg-header)` 计算值应为 `#16213e`
     - Widget 外框头部背景 → `var(--desktop-widget-header-bg)` 计算值应为 `#3370ff`
     - Widget 内容区背景 → `var(--desktop-widget-content-bg)` 计算值应为 `#16213e`
     - 编辑工具条背景 → 应跟随 `var(--desktop-bg-header)`
     - Element Plus 下拉菜单背景 → 应为深色
  3. 切换回浅色主题
  4. 检查上述位置颜色恢复浅色配色
- **预期结果**:
  - 深色模式下，所有 15 个 `--desktop-*` 变量均为对应深色值
  - 浅色模式下，所有 15 个 `--desktop-*` 变量均为对应浅色值
  - Element Plus 组件（按钮、下拉菜单、对话框）颜色跟随 `--el-*` 变量同步切换
  - Swiper 分页器颜色（`--swiper-pagination-color`）跟随 `--desktop-widget-header-bg` 变化

---

### TC-005-009: 选择背景时自动切换主题

- **优先级**: P2
- **关联 FR**: FR-005-018
- **前置条件**: 当前为浅色主题，存在一个 `theme: 'dark'` 的深色背景
- **步骤**:
  1. 确认当前为浅色主题
  2. 在编辑模式下点击"背景"按钮，打开背景列表
  3. 选择一个标记了 `theme: 'dark'` 的背景
- **预期结果**:
  - 背景切换为所选背景
  - 主题自动切换为深色（`html` 获得 `dark` 类名）
  - `localStorage['dashboard-theme']` 为 `'dark'`
  - `desktopConfig.theme` 同步为 `'dark'`

---

### TC-005-010: `color-scheme` 属性正确切换

- **优先级**: P2
- **关联 FR**: FR-005-006
- **前置条件**: 任意初始主题
- **步骤**:
  1. 切换为深色主题，检查 `<html>` 的 `color-scheme` CSS 属性
  2. 切换为浅色主题，再次检查
- **预期结果**:
  - 深色模式下 `color-scheme` 为 `dark`
  - 浅色模式下 `color-scheme` 为 `light`
  - 浏览器原生控件（滚动条、输入框聚焦边框）颜色适配

---

### TC-005-011: localStorage 不可用时静默降级

- **优先级**: P3
- **关联 FR**: FR-005-012
- **前置条件**: localStorage 被禁用或已满（可通过浏览器隐私模式测试，或 mock `localStorage.setItem` 抛出异常）
- **步骤**:
  1. 使 localStorage 不可用
  2. 点击主题切换按钮
- **预期结果**:
  - 主题切换按钮**正常工作**，`html.dark` 类名正确切换
  - `isDark.value` 正确更新
  - 控制台**无**未捕获异常
  - 仅当次会话有效（刷新后丢失切换结果，走默认逻辑）

---

### TC-005-012: localStorage 存有异常值时安全降级

- **优先级**: P3
- **关联 FR**: FR-005-013, NFR-005-004
- **前置条件**: 手动设置 `localStorage.setItem('dashboard-theme', 'invalid-value')`
- **步骤**:
  1. 在 localStorage 中写入异常值（如 `'blue'`, `'Dark'` 等）
  2. 刷新页面
- **预期结果**:
  - `initTheme()` 中的 `stored === THEME_DARK || stored === THEME_LIGHT` 检查不匹配
  - 走系统偏好降级逻辑，不应用异常值
  - 页面正常渲染，无异常状态

---

### TC-005-013: 脱离编辑模式后主题按钮不可见

- **优先级**: P3
- **关联 FR**: FR-005-016
- **前置条件**: 用户在编辑模式下
- **步骤**:
  1. 确认编辑工具条可见，🎨 主题按钮可见
  2. 点击 ✔️ 完成编辑，退出编辑模式
- **预期结果**:
  - 编辑工具条隐藏
  - 🎨 主题按钮不可见
  - 主题状态保持不变（不会因退出编辑而重置）

---

## 测试用例与功能需求映射

| 测试用例 | 关联 FR |
|---|---|
| TC-005-001 | FR-005-005, FR-005-011, FR-005-017 |
| TC-005-002 | FR-005-005, FR-005-011 |
| TC-005-003 | FR-005-011, FR-005-015, FR-005-019 |
| TC-005-004 | FR-005-013, FR-005-015 |
| TC-005-005 | FR-005-013 |
| TC-005-006 | FR-005-014 |
| TC-005-007 | FR-005-014 |
| TC-005-008 | FR-005-004, FR-005-007 |
| TC-005-009 | FR-005-018 |
| TC-005-010 | FR-005-006 |
| TC-005-011 | FR-005-012 |
| TC-005-012 | FR-005-013, NFR-005-004 |
| TC-005-013 | FR-005-016 |

---

## 测试执行建议

1. **单元测试** (TC-005-001 ~ TC-005-007, TC-005-010 ~ TC-005-012): 使用 vitest + jsdom 环境，mock `localStorage` 和 `window.matchMedia`。直接测试 `useTheme.js` 导出的每个函数。
2. **组件测试** (TC-005-008, TC-005-009, TC-005-013): 使用 vitest + vue-test-utils 挂载 `Desktop.vue`，模拟编辑模式交互。
3. **E2E 测试** (TC-005-003, TC-005-008): 使用 Playwright 或 Chrome DevTools，在真实浏览器中验证反闪烁效果和视觉一致性。`TC-005-003`（反闪烁）必须使用 E2E 测试，单元测试无法模拟浏览器的脚本阻塞行为。

## 注意

- 字体缩放（font-size 调整）**不属于**本模块测试范围。字体缩放通过 `desktopConfig['font-size']` 以内联样式应用到 `tpl-desktop` 根容器，由 `Desktop.vue` 管理，应归入 201-page-index 或 001-desktop-framework 模块的测试用例。
- ECharts 图表主题同步**当前代码库未实现**，相关测试用例不列入本模块。
