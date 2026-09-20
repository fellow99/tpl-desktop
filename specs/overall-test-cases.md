# tpl-desktop 测试用例总览

> 项目: tpl-desktop（工作台）
> 最后更新: 2026-07-19
> 本文档是所有模块测试用例的索引总览，每个模块的详细用例请参见对应 test-cases.md。

## 一、用例统计总览

| 模块编号 | 模块名称 | 用例数 | 文档链接 |
|---|---|---|---|
| 001 | 桌面框架 | 59 | [test-cases.md](./001-desktop-framework/test-cases.md) |
| 002 | 小部件系统 | 22 | [test-cases.md](./002-widget-system/test-cases.md) |
| 003 | App 应用系统 | 21 | [test-cases.md](./003-app-system/test-cases.md) |
| 004 | 背景系统 | 22 | [test-cases.md](./004-background-system/test-cases.md) |
| 005 | 主题系统 | 13 | [test-cases.md](./005-theme-system/test-cases.md) |
| 011 | 认证与模拟登录 | 31 | [test-cases.md](./011-auth-mock/test-cases.md) |
| 101 | 属性编辑器 | 19 | [test-cases.md](./101-prop-editor/test-cases.md) |
| 201 | 页面入口与启动 | 25 | [test-cases.md](./201-page-index/test-cases.md) |
| 301 | 基础小部件 | 40 | [test-cases.md](./301-widget-basic-widgets/test-cases.md) |
| 401 | 基础应用 | 10 | [test-cases.md](./401-app-basic-apps/test-cases.md) |
| **合计** | **10 模块** | **262 条** | |

### 用例优先级分布

| 优先级 | 数量（约） | 说明 |
|---|---|---|
| P0 | ~62 | 核心路径，阻塞发布——必须全部通过 |
| P1 | ~120 | 重要功能，影响主流程可用性 |
| P2 | ~65 | 边界场景 / 技术验证 / 降级路径 |
| P3 | ~15 | 罕见场景（仅 004-background-system 和 005-theme-system 有 P3） |

> 注：部分模块使用 P1/P2/P3 代替 P0/P1/P2 的三级划分（如 005-theme-system），上表为映射后的近似分布。

---

## 二、核心业务流程的跨模块测试清单

以下场景覆盖 2+ 模块联动，是集成测试和 E2E 测试的核心对象。

### 场景 1: 首次加载完整流程 (201 → 011 → 001 → 005)

| 步骤 | 模块 | 关键测试点 | 关联用例 |
|---|---|---|---|
| 1 | 201 | `index.html` 加载 → anti-FOUC 脚本执行 → 注入 `window.SYSTEM_CONFIGS` → Vue 应用挂载 → 默认 JSON fetch | TC-201-001, TC-201-010, TC-201-022 |
| 2 | 011 | 登录覆盖层全屏显示 → 后端不可达降级 mock → RSA 加密 → 模拟认证成功 → 会话写入 localStorage | TC-011-001, TC-011-020 |
| 3 | 201 | 登录态恢复 → `loginUser` 赋值 → 桌面配置加载（localStorage 或默认 JSON） | TC-201-007, TC-201-001 |
| 4 | 001 | 桌面初始化：12 列 GridStack 网格 → Swiper 翻页容器 → statusbar + toolbar 渲染 → 页面激活 | TC-001-001, TC-001-021 |
| 5 | 005 | `initTheme()` 执行 → html.dark class 按 localStorage / 系统偏好设置 → CSS 变量全量生效 | TC-005-003, TC-005-004, TC-005-005 |

### 场景 2: 添加并编辑小部件完整链路 (001 → 002 → 301 → 101)

| 步骤 | 模块 | 关键测试点 | 关联用例 |
|---|---|---|---|
| 1 | 001 | 进入编辑模式 → 编辑工具栏出现 → 点击"部件"按钮 | TC-001-007, TC-001-043 |
| 2 | 002 | 部件列表面板打开 → 分类树渲染 → 选择 Widget → 预览区实时渲染 | TC-002-001, TC-002-003, TC-002-006, TC-002-007 |
| 3 | 301 | Widget 添加到桌面 → 组件实时渲染（如 BasicText 显示默认文本） | TC-301-001, TC-301-005 |
| 4 | 101 | 点击 Widget 标题栏"编辑"按钮 → 属性编辑抽屉滑出 → 修改 props → 点击"应用" | TC-101-001, TC-101-002, TC-101-003 |
| 5 | 301 | Widget 内容即时更新（如 BasicText 文本变更、BasicNumber 数值跳变） | TC-301-002, TC-301-007 |
| 6 | 001 | 退出编辑 → 配置持久化 → 刷新页面后 Widget 位置和属性均恢复 | TC-001-004, TC-001-054 |

### 场景 3: App 生命周期与桌面联动 (003 → 001 → 401)

| 步骤 | 模块 | 关键测试点 | 关联用例 |
|---|---|---|---|
| 1 | 003 | App 列表打开 → 从应用市场添加 App → 点击啟動 | TC-003-001, TC-003-002, TC-003-006 |
| 2 | 401 | App 组件全屏渲染（如 BasicClock 每秒更新、BasicIframe 加载网页） | TC-401-001, TC-401-004 |
| 3 | 001 | App 运行后 Widget 收到 `grid-deactive` 暂停交互；工具栏运行中 App 出现指示点 | TC-003-006, TC-001-038 |
| 4 | 003 | 最小化 App → Widget 收到 `grid-active` 恢复 → 恢复 App → Widget 再次 deactive | TC-003-007, TC-003-008 |
| 5 | 001 | 主页按钮 → 所有 App 最小化 + 跳转首页 | TC-001-035, TC-003-020 |
| 6 | 401 | 关闭 App → `onBeforeUnmount` 清理定时器/监听器 → Widget 恢复活性 | TC-401-009, TC-401-010 |

### 场景 4: 背景切换联动主题 (004 → 005 → 001)

| 步骤 | 模块 | 关键测试点 | 关联用例 |
|---|---|---|---|
| 1 | 001 | 进入编辑模式 → 点击"背景"按钮 | TC-001-042 |
| 2 | 004 | 背景选择面板打开 → embla 轮播显示 12 张背景 → 分类页签筛选 → 点击选择 | TC-004-001, TC-004-007 |
| 3 | 004 | 背景切换 → 300ms opacity 过渡动画 → 根据背景 `theme` 字段自动切主题 | TC-004-007, TC-004-009 |
| 4 | 005 | `setTheme(meta.theme)` 调用 → html.dark class 变更 → CSS 变量全量切换 | TC-005-009 |
| 5 | 001 | 退出编辑 → 配置持久化（background + theme 均保存） → 刷新恢复 | TC-004-010, TC-005-003 |

### 场景 5: 配置持久化完整链路 (201 → 001 → 各模块)

| 步骤 | 模块 | 关键测试点 | 关联用例 |
|---|---|---|---|
| 1 | 201 | 首次加载：fetch `DEFAULT_DESKTOP_JSON.json` → 解析为 desktopConfig | TC-201-001 |
| 2 | 201 | 后续加载：localStorage `dashboard-desktop-data` 覆盖默认配置 | TC-201-002, TC-201-005 |
| 3 | 001 | 编辑模式变更（Widget 增删、背景、主题、字号、快捷方式）→ 退出编辑 → `saveAllPages()` + `persistConfig()` | TC-001-004, TC-001-054, TC-001-055 |
| 4 | 201 | 刷新页面 → 登录态恢复 → desktopConfig 从 localStorage 加载 → 各模块恢复：Widget 布局 (002)、背景 (004)、主题 (005)、App 列表 (003)、快捷方式 (003) | TC-201-002 |
| 5 | 001 | 配置 JSON 损坏降级 → 回退默认配置，不崩溃 | TC-001-003, TC-201-005 |

### 场景 6: 后端故障降级登录 (011 standalone + 201)

| 步骤 | 模块 | 关键测试点 | 关联用例 |
|---|---|---|---|
| 1 | 201 | 登录覆盖层出现（未登录 → loginUser 为 null） | TC-201-008 |
| 2 | 011 | `loginViaBackend` 尝试 POST `/authcenter/login` → 网络失败 / 500 / 403 / 超时 | TC-011-023, TC-011-024, TC-011-025 |
| 3 | 011 | try/catch → 降级到 `loginViaMock` → fetch `USERS_MOCK.json` → 校验用户名密码 | TC-011-001 |
| 4 | 011 | 降级成功 → 写入 `dashboard-login-user` → 控制台输出降级警告 | TC-011-001 |
| 5 | 011 | USERS_MOCK.json 也失败 → 错误提示"登录服务不可用，且模拟用户数据加载失败" | TC-011-009 |
| 6 | 201 | 登录成功 → overlay 消失 → 桌面渲染 | TC-201-001 |

### 场景 7: 退出编辑自动保存与面板协调 (001 → 101 → 002 → 004)

| 步骤 | 模块 | 关键测试点 | 关联用例 |
|---|---|---|---|
| 1 | 001 | 编辑模式下打开多个面板（属性编辑 + 部件列表 + 背景列表） | TC-001-010 |
| 2 | 101 | 属性编辑面板有未保存变更 → 点击"完成" → 面板关闭（未保存变更丢弃） | TC-101-014 |
| 3 | 002 | 部件选择列表自动关闭 | TC-001-057 |
| 4 | 004 | 背景选择列表自动关闭 | TC-001-058 |
| 5 | 001 | `saveAllPages()` 序列化所有页面 GridStack 数据 → `persistConfig()` 写入 localStorage → 模式切换为 normal | TC-001-011, TC-001-004 |

---

## 三、按优先级分类的关键测试用例汇总

以下列出跨模块最关键的 P0 级测试用例（可作为 smoke test 最小集）：

| 优先级 | 模块 | 用例编号 | 用例名称 | 跨模块关联 |
|---|---|---|---|---|
| P0 | 201 | TC-201-001 | 首次加载 — 显示默认桌面 | 201→011→001 |
| P0 | 201 | TC-201-011 | Vite 构建产物完整性 | 201（构建验证） |
| P0 | 011 | TC-011-001 | 后端不可达时使用模拟认证成功登录 | 011→201→001 |
| P0 | 011 | TC-011-002 | 刷新页面后自动恢复登录会话 | 011→201 |
| P0 | 001 | TC-001-001 | 首次加载默认配置 | 001→201 |
| P0 | 001 | TC-001-004 | 退出编辑模式自动保存配置 | 001→所有模块 |
| P0 | 002 | TC-002-022 | 刷新页面后 Widget 按配置恢复 | 002→001→201 |
| P0 | 003 | TC-003-006 | 从 App 列表启动 App | 003→401→001 |
| P0 | 004 | TC-004-007 | 切换图片背景（暗色→浅色） | 004→005→001 |
| P0 | 301 | TC-301-038 | Widget 刷新后恢复 | 301→001→201 |
| P0 | 401 | TC-401-010 | 刷新页面后 App 运行状态不保留 | 401→201 |

---

## 四、测试建议

### E2E 测试工具推荐

- **Playwright**（推荐）：支持 Chromium headless，可 mock 网络请求（模拟后端不可达 / USERS_MOCK.json 404 / DEFAULT_DESKTOP_JSON.json 404），可控制 `colorScheme` 和 `prefers-color-scheme`，可操作 localStorage。所有跨模块场景均适合 Playwright。
- **Vitest + jsdom**：适用于纯逻辑单元测试（useTheme、auth-service、widget 注册、配置序列化）。
- **Vitest + @vue/test-utils**：适用于组件级别的属性编辑、Widget wrapper 事件桥接、背景列表分类筛选等。

### 优先自动化场景

按商业价值和稳定性排序：

1. **登录 → 桌面恢复 → 添加 Widget → 编辑属性 → 持久化 → 刷新验证**（场景 1 + 场景 2 + 场景 5 合并，覆盖 201→011→001→002→301→101）
2. **App 启动 → 最小化 → 恢复 → 关闭 → Widget 活性切换**（场景 3，覆盖 003→001→401）
3. **背景切换 → 主题联动 → 持久化恢复**（场景 4，覆盖 004→005→001）
4. **后端不可达降级 mock 登录**（场景 6，覆盖 011）
5. **退出编辑面板协调**（场景 7，覆盖 001→101→002→004）

### 已知风险点

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| 6 个废弃依赖（mitt、pinia、three、jsonpath-plus、element-resize-detector、@imengyu/vue3-context-menu）在 package.json 已声明但代码中未实际使用 | 不影响现有功能测试，但如有测试引用它们应移除 | 测试代码中避免 import 这些包；如需右键菜单测试，确认当前实现已迁移到自定义方案 |
| 无后端需 mock 降级路径 | login 测试必须模拟后端不可达环境（Playwright `page.route()` 拦截 POST `/authcenter/login` 或直接断开网络） | auth-service mock 降级模式需专门 mock 环境；TC-011-023~025 需要 Playwright route 拦截 |
| localStorage 污染需清理 | 跨用例执行时残余 localStorage 数据会导致误判 | 每个 E2E 用例的 `beforeEach` 中执行 `localStorage.clear()` |
| GridStack 拖拽需要真实 DOM | 纯 jsdom 环境无法测试 GridStack 的拖拽交互（mousedown/mousemove/mouseup 序列、`data-transfer` 行为） | GridStack 相关用例（TC-001-023~025、TC-002-016）使用 Playwright 真实浏览器测试 |
| `onBeforeUnmount` 中的 `saveAllPages` 刷新时可靠性不确定 | 页面刷新场景下 `loginUser` 和 `viewportRef` 是否有效取决于时序（参见 TC-001-056） | 优先通过"退出编辑 → 刷新"路径验证持久化，刷新前不依赖 onBeforeUnmount 的兜底逻辑 |

### 端到端验证检查清单（Smoke Test）

以下 5 条作为每次发布的必过 E2E smoke test：

- [ ] SMOKE-01: 清空 localStorage → 访问应用 → 登录（admin/admin123）→ 桌面以默认配置渲染（浅色主题、1 页、12 列网格、statusbar + toolbar 可见）
- [ ] SMOKE-02: 登录态保持 → 进入编辑模式 → 添加 BasicText Widget → 修改文本为 "E2E Test" → 退出编辑 → 刷新 → Widget 文本仍为 "E2E Test"
- [ ] SMOKE-03: 进入编辑模式 → 选择 dark-001 背景 → 主题自动切换深色 → 退出编辑 → 刷新 → 深色主题 + dark-001 背景均恢复
- [ ] SMOKE-04: 从 App 列表启动 BasicClock → 时钟每秒更新 → 最小化 → 点击主页 → 回到首页 + 时钟最小化 → 恢复时钟 → 时间连续无跳变
- [ ] SMOKE-05: `pnpm build` 成功 → `pnpm preview` 访问 → 登录成功 → 桌面正常渲染（验证生产构建无问题）

---

## 五、废弃依赖与测试注意事项

### 6 个 Unused Dependencies

`package.json` 中声明了以下依赖，但当前源代码中未实际引用：

| 依赖包 | 在 package.json 中的用途声明 | 当前代码状态 |
|---|---|---|
| `mitt` | 事件总线 | 已迁移到自定义 event-emitter（`src/utils/event-emitter.js`），mitt 未 import |
| `pinia` | 状态管理 | 全局状态通过 `desktopConfig` reactive + `provide/inject` 管理，Pinia 未安装插件或创建 store |
| `three` | 3D 渲染 | 未找到任何 `import * as THREE` 或相关 three.js 代码 |
| `jsonpath-plus` | JSON 路径查询 | 未找到 `JSONPath` import，配置读写使用直接对象访问 |
| `element-resize-detector` | 元素尺寸监听 | 未找到 import；iframe 缩放使用原生 `ResizeObserver` |
| `@imengyu/vue3-context-menu` | 右键菜单 | 桌面右键菜单已替换为自定义实现（desktop-context-menu），该包未 import |

**测试影响**：
- 以上 6 个包不影响任何现有功能测试，无需在测试环境中 mock 或提供它们
- 如未来测试中引入了对这些包的 import，需先确认依赖是否实际存在于 `node_modules`（它们仍在 `package.json` 中声明，`pnpm install` 会安装）
- 建议：执行 `pnpm install --production` 验证生产依赖树不因这些冗余包而膨胀

### auth-service Mock 降级模式

- `src/services/auth-service.js` 中 `loginViaBackend` 的 catch 块会无条件降级到 `loginViaMock`（不区分后端错误类型：网络错误、HTTP 401、HTTP 500 均走 mock）
- 测试需要模拟后端不可用的多种场景：网络断开（`page.route()` 返回 `abort()`）、HTTP 500、HTTP 403、连接超时
- mock 降级成功的前提是 `public/USERS_MOCK.json` 可正常 fetch → 测试时需要保证该文件可访问或 mock fetch 返回模拟用户数据

### GridStack 拖拽测试需要真实 DOM

- GridStack.js v11 的拖拽交互（`dragIn`、`dragOut`、`resizable`）依赖完整的浏览器 DOM 事件链，无法在 jsdom 中模拟
- 涉及 GridStack 的用例（001-desktop-framework 的网格交互、002-widget-system 的 grid-moving 事件桥接）必须使用 Playwright 真实浏览器测试
- CSV 网格坐标格式化（`x,y → col,row`）等纯逻辑部分可在单元测试中覆盖

---

## 六、模块依赖关系总览

以下依赖图用于规划集成测试的顺序和范围：

```
201-page-index (启动入口)
  ├─→ 011-auth-mock (登录门禁)
  └─→ 001-desktop-framework (桌面容器)
        ├─→ 002-widget-system (Widget 注册/列表/外壳)
        │     ├─→ 301-widget-basic-widgets (5 种基础 Widget 组件)
        │     └─→ 101-prop-editor (属性编辑面板)
        ├─→ 003-app-system (App 列表/生命周期)
        │     └─→ 401-app-basic-apps (2 种基础 App 组件)
        ├─→ 004-background-system (背景选择/渲染)
        │     └─→ 005-theme-system (主题联动)
        └─→ 005-theme-system (主题切换/CSS 变量)
```

> 箭头方向：调用者 → 被调用者。集成测试应沿着依赖方向设计，自底向上验证。

---

## 七、附录：各模块测试用例编号范围

| 模块 | 编号前缀 | 编号范围 | 用例数 | 主要测试类别 |
|---|---|---|---|---|
| 001-desktop-framework | TC-001 | 001~059 | 59 | 配置加载、模式切换、页面管理、导航、网格交互、字体缩放、工具栏、状态栏、拖放、序列化、面板协调 |
| 002-widget-system | TC-002 | 001~022 | 22 | 小部件列表、分类树、预览、添加/删除、事件桥接、元数据降级、持久化恢复 |
| 003-app-system | TC-003 | 001~021 | 21 | App 列表/市场、生命周期、快捷方式、多 App 并存、状态隔离 |
| 004-background-system | TC-004 | 001~022 | 22 | 面板交互、分类浏览、背景切换、过渡动画、持久化、降级、视频播放、样式穿透 |
| 005-theme-system | TC-005 | 001~013 | 13 | 切换/持久化、反闪烁、系统偏好跟随、背景联动、color-scheme、降级 |
| 011-auth-mock | TC-011 | 001~031 | 31 | 登录成功/失败、RSA 加密、会话持久化、登出、未登录防护、后端降级、交互体验 |
| 101-prop-editor | TC-101 | 001~019 | 19 | 面板开闭、各类型编辑、confirm/cancel、切换目标、退出联动、空态、主题兼容 |
| 201-page-index | TC-201 | 001~025 | 25 | App 启动、配置加载、会话恢复、anti-FOUC、构建产物、字体缩放、主题切换、全局组件注册 |
| 301-widget-basic-widgets | TC-301 | 001~040 | 40 | BasicText(4) + BasicNumber(10) + BasicMarkdown(5) + BasicImage(9) + BasicVideo(7) + 通用场景(5) |
| 401-app-basic-apps | TC-401 | 001~010 | 10 | BasicClock(3) + BasicIframe(3) + 跨应用生命周期(4) |
