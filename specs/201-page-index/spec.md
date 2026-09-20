# 桌面入口页（Page Index）规格文档

> 模块: 201-page-index
> 状态: R2 迭代中
> 最后更新: 2026-07-20

## 1. 模块概述

### 1.1 目的 — 为什么存在此模块

桌面入口页模块是工作台系统的**唯一入口点**，负责从零开始引导整个应用的启动流程。它将 HTML 文档→JavaScript 运行时→Vue 根组件完整串联，并在页面级编排层中管理所有跨子系统的状态、事件与生命周期，是整个应用能够运行的前提。

### 1.2 解决的问题

- 系统需要一条明确的启动链路将静态 HTML 转为可交互的单页桌面应用
- 用户定制的桌面布局、背景、主题、快捷方式需要在刷新后自动恢复
- 首次访问时需要自动加载默认配置，避免空白桌面
- 应用启动前需要消除主题闪烁（FOUC）——在 Vue 挂载前就应用深色/浅色主题
- 运行时外部配置（认证地址、RSA 公钥）需要可免构建注入
- App 应用需要作为叠加层在桌面上运行，并与 Widget 事件隔离
- 多个独立子系统（认证、主题、背景、Widget、App）需要一个中心协调者统一调度
- 用户需要登录保护，未认证时不得接触桌面内容

### 1.3 范围

**包含**：
- 启动链路：HTML 入口 → 主题反闪烁脚本 → 运行时配置注入 → Vue 应用挂载 → 根组件初始化
- 全局资源加载：Element Plus 组件库、Element Plus 暗色 CSS 变量、全局 SCSS（浅色/深色主题 CSS 变量体系、样式重置）
- 全局组件注册：UI 组件（desktop-*.vue）、Widget 组件（*.widget.vue）、App 组件（*.app.vue）的自动扫描全局注册
- 主题初始化：localStorage 持久化主题 > 系统偏好 > 默认深色的优先级链
- 桌面配置双源加载：fetch 默认 JSON + localStorage 用户配置合并，含 fetch 失败硬编码回退与 localStorage 损坏降级
- 登录认证编排：登录覆盖层显示/隐藏、登录成功回调、会话恢复、退出登录（清除本地数据+刷新）
- 页面级状态管理：编辑模式（normal/editing）切换及自动持久化、当前页码追踪、配置持有、所有面板显隐标志
- App 生命周期管理：打开（含重复实例去重与恢复置顶）、最小化/恢复、关闭；App 存在状态变化 → Widget 事件协调（300ms debounce）
- 快捷方式管理：添加/移除（compName/compId 双键匹配），随配置持久化
- 字体缩放：以 2px 步进增减（下限 10px），一键还原 16px，全局生效于根 DOM
- 主题切换：手动切换 + 背景选择联动自动切换，持久化到 desktopConfig 和 localStorage
- 桌面页面管理：当前页前/后插入新页并自动切换、删除（至少保留一页）、主页按钮（回首页+最小化所有 App）
- 工具条悬浮显隐：底部主工具条在 normal 模式下常态仅露出 1.3em，mouseenter/click/touchstart 触发动画完全显示，mouseleave 后 5s 自动隐藏
- 事件接线：Widget 列表选择→视口添加、背景选择→配置+自动主题、属性编辑→视口更新+持久化、页面切换→App/Widget 事件协调
- Vite 构建：单页面入口产出纯静态部署文件

**不包含**：
- GridStack 布局引擎实例管理、VNode 渲染、Widget 内容挂载（属于 001-desktop-framework）
- Widget/App/Background 的元数据注册与默认值回退（属于各自的 registry 模块）
- 认证服务的具体加密传输逻辑（属于 011-auth-mock API 层）
- 各子组件内部的渲染行为与 UI 交互（statusbar、toolbar、viewport、各面板的独立行为）

## 2. 用户故事

### 2.1 启动与首次加载

- US-201-01: 作为用户，当我打开工作台网址时，系统立即展现出与我上次使用一致的主题色调，不会出现闪烁或颜色跳变。
- US-201-02: 作为首次访问的用户，当我没有任何本地数据时，系统自动加载一套可用的默认桌面布局，而不是空白页或错误提示。
- US-201-03: 作为运维人员，我可以在部署目录下直接编辑配置文件（认证地址、RSA 公钥），无需重新构建前端。

### 2.2 配置恢复与持久化

- US-201-04: 作为用户，当我定制了桌面（添加了 Widget、设置了背景、调整了主题、管理了快捷方式）并刷新页面后，所有定制内容自动恢复。
- US-201-05: 作为用户，当我完成编辑并退出编辑模式时，我的所有变更自动保存，不需要手动点击"保存"按钮。

### 2.3 登录与会话

- US-201-06: 作为未登录用户，我访问工作台时只看到登录界面，无法操作桌面内容。
- US-201-07: 作为已登录用户，我刷新页面后自动恢复登录状态，无需重复输入用户名密码。
- US-201-08: 作为用户，当我想退出时，点击退出登录会清除桌面配置和登录信息，恢复为干净状态。

### 2.4 App 运行与 Widget 隔离

- US-201-09: 作为用户，当我打开一个 App 时，它会以叠加层形式浮在桌面之上，桌面上的 Widget 自动暂停交互以防止冲突。
- US-201-10: 作为用户，当我关闭所有 App 后，桌面上的 Widget 自动恢复可交互状态。
- US-201-11: 作为用户，当我重复打开同一个 App 时，系统不会创建第二个实例，而是将已有实例恢复到前台。

### 2.5 快捷方式

- US-201-12: 作为用户，我可以在底部工具条看到常用 App 的快捷方式入口。
- US-201-13: 作为用户，我可以在 App 列表中管理快捷方式（添加/移除），刷新后保持。

### 2.6 字体与主题

- US-201-14: 作为用户，我可以在编辑模式下调整全局字体大小（2px 步进），并且一键恢复到默认 16px。
- US-201-15: 作为用户，我可以手动切换浅色/深色主题。
- US-201-16: 作为用户，当我选择某个背景时，如果该背景关联了推荐主题，主题会自动跟随切换。

### 2.7 页面管理

- US-201-17: 作为用户，我可以在编辑模式下在任意位置添加新页面，新页面自动作为当前页。
- US-201-18: 作为用户，当我想减少页面数量时，可以删除当前页——但如果只剩一页则无法删除。
- US-201-19: 作为用户，点击主页按钮可以一键回到首页并最小化所有打开的 App。

## 3. 功能需求

### 3.1 应用启动与环境初始化

- FR-201-001: 系统 MUST 在 Vue 应用挂载前通过内联脚本读取 localStorage['dashboard-theme']，若值为 'dark' 或无值但系统偏好为暗色则立即在 `<html>` 上添加 `dark` class，消除主题闪烁（FOUC）。
- FR-201-002: 系统 MUST 在 Vue 应用挂载前通过同步 `<script src="/config.js">` 挂载 `window.SYSTEM_CONFIGS`（含 authLoginUrl 和 rsaPublicKey），供认证服务等模块运行时读取。
- FR-201-003: 系统 MUST 在应用入口（desktop.js）中创建 Vue 应用实例，注册 Element Plus 组件库及其暗色 CSS 变量，全局注册 UI/Widget/App 三组组件，初始化主题（localStorage > 系统偏好 > 默认深色），最终挂载到 #app 元素。
- FR-201-004: 系统 MUST 通过全局 SCSS 引入浅色（`:root`）和深色（`html.dark`）主题的 CSS 变量体系（--desktop-*），并设置 `html, body, #app` 的全高度重置与全局过渡动画。

### 3.2 桌面配置加载与合并

- FR-201-005: 系统 MUST 在根组件挂载后异步 fetch `/DEFAULT_DESKTOP_JSON.json` 获取默认桌面配置（theme、font-size、grid、background、pages、shortcuts）。
- FR-201-006: 当 fetch 默认 JSON 失败（网络错误、HTTP 非 2xx）时，系统 MUST 使用硬编码回退配置（theme:'light'、font-size:'16px'、grid:{cols:12,rows:8}、background:null、pages:[{title:'',children:[]}]、shortcuts:[]）确保应用不中断。
- FR-201-007: 系统 MUST 从 localStorage（key: `dashboard-desktop-data`）读取用户配置，若存在且为合法对象则浅合并到默认配置之上（`{ ...defaults, ...stored }`），用户键覆盖默认键。
- FR-201-008: 系统 MUST 对合并后的 pages 数组做兜底校验：若 pages 不是数组或为空，则强制赋值为 `[{ title: '', children: [] }]` 防止视口无页可渲染。

### 3.3 配置持久化

- FR-201-009: 退出编辑模式时，系统 MUST 先调用视口的 `saveAllPages()` 序列化所有页面布局，再将完整 desktopConfig 写入 localStorage（key: `dashboard-desktop-data`）。
- FR-201-010: 组件卸载前，若用户已登录且配置存在，系统 MUST 保存桌面配置（同 FR-201-009 流程）。
- FR-201-011: 配置持久化失败（localStorage 不可用、配额满）时，系统 MUST NOT 抛出异常或中断用户操作，静默降级并在控制台输出警告。

### 3.4 登录认证编排

- FR-201-012: 未登录状态（loginUser 为 null）下，系统 MUST 渲染全屏登录覆盖层阻止桌面内容访问。
- FR-201-013: 根组件挂载完成后，系统 MUST 调用 `restoreSession()` 检查 localStorage 中缓存的登录信息：有效则直接设置 loginUser 进入桌面，无效则设置 showLoginDialog 为 true 弹出登录对话框。
- FR-201-014: 登录成功后，系统 MUST 接收用户信息并设置 loginUser，关闭登录对话框，进入桌面。
- FR-201-015: 退出登录时，系统 MUST 清除 localStorage 中的桌面配置（`dashboard-desktop-data`）和登录缓存，然后刷新页面（`window.location.reload()`）。

### 3.5 编辑模式切换

- FR-201-016: 系统 MUST 支持 `normal` 和 `editing` 两种桌面模式，由 statusbar 和 toolbar-edit 的事件触发切换。
- FR-201-017: 退出编辑模式时，系统 MUST 自动关闭所有编辑相关面板（Widget 列表、背景列表、属性编辑面板）。

### 3.6 App 生命周期

- FR-201-018: 系统 MUST 通过 `desktopApps` 数组管理当前打开的 App 实例，每个实例包含 instanceId（唯一标识）、compName、compId?、appMeta、wrapperValues、state（null|'minimize'）。
- FR-201-019: 打开 App 时，若已存在同 compName（或同 compId）的实例，系统 MUST NOT 创建新实例，而是恢复已存在实例（state 置为 null）并移至数组末尾（z 序顶层）。这是偏离旧版 spec 的**设计决策**：重复打开等于聚焦已有实例。
- FR-201-020: App state MUST 支持 `null`（正常显示）和 `'minimize'`（最小化隐藏，实例保留）。
- FR-201-021: 关闭 App MUST 从 desktopApps 数组中移除对应实例，Vue 响应式销毁其组件。
- FR-201-022: App 实例 MUST NOT 持久化到 localStorage，刷新后 desktopApps 重置为空数组。
- FR-201-023: 当 desktopApps 从空变为非空时，300ms debounce 后 MUST 向当前页所有 Widget 广播 `grid-deactive` 事件。
- FR-201-024: 当 desktopApps 从非空变为空时，300ms debounce 后 MUST 向当前页所有 Widget 广播 `grid-active` 事件。
- FR-201-025: 快速连续打开/关闭 App 时，系统 MUST 清除前一次定时器防止事件顺序混乱与重复广播。

### 3.7 快捷方式管理

- FR-201-026: 快捷方式 MUST 存储在 `desktopConfig.shortcuts` 数组中（每项含 compName, appMeta, compId?），并随桌面配置持久化。
- FR-201-027: 快捷方式 MUST 支持通过 compId（优先）或 compName 匹配进行去重查重。
- FR-201-028: 快捷方式变更后 MUST 立即调用 persistConfig 保存。

### 3.8 字体缩放

- FR-201-029: 系统 MUST 支持以 2px 步进增加字体（`handleFontSizeIncrease`）和减小字体（`handleFontSizeDecrease`，下限 10px）。
- FR-201-030: 系统 MUST 支持一键还原字体到 16px（`handleFontSizeReset`）。
- FR-201-031: 字体大小 MUST 通过 Desktop.vue 根 DOM 的 `:style="{ fontSize }"` 向下渗透到所有子组件。
- FR-201-032: 字体大小 MUST 持久化到 `desktopConfig['font-size']`（字符串格式，如 `'14px'`），每次调整后立即保存。

### 3.9 主题切换

- FR-201-033: 系统 MUST 支持通过工具栏手动切换浅色/深色主题，调用 `toggleTheme()` 后同步更新 `desktopConfig.theme` 并持久化。
- FR-201-034: 选择背景时，若背景元数据含 `theme` 字段，系统 MUST 自动调用 `setTheme(meta.theme)` 同步切换主题并更新 `desktopConfig.theme`。
- FR-201-035: 根组件挂载后 MUST 将 `desktopConfig.theme` 应用到主题系统。

### 3.10 页面管理

- FR-201-036: 系统 MUST 支持在当前页之前（`handleAddPageBefore`）或之后（`handleAddPageAfter`）插入空页面（`{ title: '', children: [] }`），添加前先保存现有布局。
- FR-201-037: 添加新页面后 MUST 自动切换到新页面（调用视口 `switchPage` 并更新 `currentPageIndex`）。
- FR-201-038: 删除页面时，若 pages 数组长度 ≤ 1，系统 MUST 阻止删除操作。
- FR-201-039: 删除页面后，若 currentPageIndex 超出数组范围，MUST 自动调整到末页。

### 3.11 主页按钮

- FR-201-040: 点击主页按钮时 MUST 将所有已打开 App 的 state 设为 `'minimize'`，切换当前页到第 0 页。

### 3.12 面板协调

- FR-201-041: 系统 MUST 管理以下面板的显隐状态：Widget 选择列表、背景选择列表、App 列表面板、App 应用市场、属性编辑面板。
- FR-201-042: 属性编辑 MUST 传递被编辑节点引用（widgetPropsNode）和元数据（widgetPropsMeta）到属性编辑弹窗。

### 3.13 Widget 添加（事件接线）

- FR-201-043: Widget 列表选择后，系统 MUST 将组件名和合并后的元数据（含 preset 变体的 rect/title/props）翻译为视口的 addWidget options（w/h/presetKey/wrapperValues/propsValues），并调用视口添加。
- FR-201-044: 属性编辑确认后，系统 MUST 调用视口 `updateWidgetProps` 更新节点属性，随后立即调用 `saveAllPages` 序列化并持久化配置（防止编辑期间刷新丢失变更）。

### 3.14 页面切换 → Widget 事件

- FR-201-045: 页面切换后，若有 App 打开，系统 MUST 在 nextTick 内向新页所有 Widget 广播 `grid-deactive`，防止新页 Widget 在 App 之下错误激活。

### 3.15 构建与部署

- FR-201-046: 系统 MUST 通过 Vite 构建产出单页面的纯静态文件（HTML + JS + CSS + 静态资源），无需后端运行时。
- FR-201-047: Dev server MUST 配置 `/authcenter` 代理转发到 `http://localhost:8080`（仅开发环境生效）。

### 3.16 主工具条悬浮显隐

- FR-201-048: normal 模式下，底部主工具条常态 MUST 仅露出 1.3em 高度（`transform: translate(-50%, calc(100% - 1.3em))`），不遮挡桌面内容。
- FR-201-049: 鼠标进入（mouseenter）、点击（click）或手指触摸（touchstart）主工具条时，MUST 动画滑出完全显示（`transform: translate(-50%, -0.5em)`），且立即清除待执行的隐藏计时器。
- FR-201-050: 鼠标移出（mouseleave）主工具条后，MUST 启动 5 秒延迟计时器；计时器到期后动画隐藏工具条回到常态露出 1.3em 高度。
- FR-201-051: 工具条显隐 MUST 由 JS `ref(visible)` + CSS `.is-visible` class 驱动，**禁止**使用 CSS `:hover` 伪类（避免 thin strip hover 时因 transform 改变触发区域导致的抖动）。
- FR-201-052: 组件卸载时 MUST 清除 hide timer，防止内存泄漏。

## 4. 关键实体

| 实体 | 描述 | 关键属性 |
|---|---|---|
| DesktopConfig | 桌面配置对象，控制整个桌面的外观与布局 | theme, font-size, grid:{cols,rows}, background:{type,name,title,category}|null, pages:[{title,children:[]}], shortcuts:[{compName,appMeta,compId?}] |
| DesktopApp | 当前打开的 App 运行时实例 | instanceId, compName, compId?, appMeta, wrapperValues:{title}, state:null|'minimize' |
| LoginUser | 登录用户信息（不含密码） | userId, userName, name |
| Shortcut | 快捷方式条目 | compName, appMeta, compId? |
| SYSTEM_CONFIGS | 运行时全局配置（window 挂载） | authLoginUrl, rsaPublicKey |

## 5. 验收场景

### 场景：首次加载 — 默认桌面

- Given 用户首次访问工作台，localStorage 中无任何数据，`/DEFAULT_DESKTOP_JSON.json` 可正常 fetch
- When 页面加载完成
- Then 显示登录覆盖层；登录后桌面使用默认配置渲染（浅色主题、16px 字号、12×8 网格、无背景、1 个空页面、无快捷方式）

### 场景：fetch 默认 JSON 失败 — 回退

- Given `/DEFAULT_DESKTOP_JSON.json` 返回 HTTP 404
- When 页面加载完成
- Then 系统使用硬编码 FALLBACK_CONFIG 继续启动，桌面正常渲染，控制台输出错误日志

### 场景：刷新 — 恢复用户配置

- Given 用户已登录、已定制桌面（添加了 Widget、设置了背景图片、切换到深色主题、将某个 App 加入快捷方式）、已退出编辑模式
- When 用户刷新页面
- Then 自动恢复登录会话，桌面加载上次保存的布局（含 Widget 位置与属性、背景、深色主题、快捷方式）

### 场景：刷新 — 不恢复 App 运行状态

- Given 用户登录后打开了一个 App（如时钟），然后刷新页面
- When 页面重新加载
- Then 桌面恢复显示，但 App 不自动打开（desktopApps 为空，App 实例不持久化）

### 场景：localStorage 损坏 — 降级

- Given localStorage['dashboard-desktop-data'] 包含非法 JSON（如 `"{broken"`）
- When 页面加载
- Then JSON.parse 被 try/catch 捕获，stored 置为 null，系统使用默认配置正常渲染

### 场景：未登录 — 登录页

- Given localStorage 中无缓存的登录信息
- When 页面加载完成
- Then 全屏登录覆盖层遮挡桌面内容，desktop-dialog-login 对话框显示，statusbar/toolbar/viewport 均不渲染

### 场景：已登录 — 桌面

- Given localStorage 中有有效的 `dashboard-login-user` 缓存
- When 页面加载完成
- Then 直接进入桌面（不显示登录对话框），statusbar 显示用户名

### 场景：主题无闪烁

- Given 用户上次使用深色主题，localStorage['dashboard-theme'] = 'dark'
- When 用户刷新页面，在 Vue 挂载之前
- Then `<html>` 元素已带有 `dark` class，页面从第一帧就以深色渲染（Element Plus dark CSS vars + --desktop-* 深色变量均已生效），刷新全程无颜色跳变

### 场景：Vite 构建 — 静态部署

- Given 执行 `vite build`
- When 构建完成
- Then `dist/` 目录包含 `index.html`、JS/CSS/静态资源，所有文件均为纯静态，可通过任意 HTTP 服务器直接部署

## 6. 非功能需求

- **加载性能**: 默认 JSON fetch + localStorage 读取 + 配置合并 MUST 在 1 秒内完成。
- **持久化性能**: 退出编辑时 saveAllPages + localStorage.setItem MUST 在 500ms 内完成。
- **App 事件防抖**: 300ms debounce 防止快速打开/关闭 App 导致事件顺序错乱。
- **主题切换**: 0ms 首次渲染延迟——反闪烁脚本在 `<html>` 解析前即执行，Element Plus dark CSS vars 与 --desktop-* 变量提前就绪。
- **安全**: 登录密码 MUST RSA 加密传输；localStorage 不得存储明文密码；退出登录 MUST 清除本地用户数据。
- **容错**: fetch 失败、localStorage 不可用/损坏、JSON 解析失败均 MUST NOT 中断应用启动。

## 7. 假设与约束

- 默认 JSON 文件（`DEFAULT_DESKTOP_JSON.json`）随构建部署在 `public/` 对应路径下
- localStorage 配额充足（桌面配置通常 < 100KB）
- 后端认证服务 `/authcenter` 可访问或降级可用
- 应用为单页面（无 vue-router），无多页路由需求
- 退出登录时清除桌面配置属于设计意图（用户数据隔离与安全），非意外行为

## 8. 依赖

- **下游**: 001-desktop-framework（视口能力：addWidget、updateWidgetProps、switchPage、saveAllPages、broadcastToCurrentPageWidgets）
- **下游**: 002-widget-system（Widget 组件全局注册 + 元数据）
- **下游**: 003-app-system（App 组件全局注册 + 叠加层渲染 + App 外壳）
- **下游**: 004-background-system（背景渲染组件 + 背景选择面板）
- **下游**: 005-theme-system（主题 composer：initTheme、toggleTheme、setTheme + CSS 变量体系）
- **下游**: 011-auth-mock（认证服务：login、logout、restoreSession + 登录对话框）
- **下游**: 101-prop-editor（属性编辑面板 + 动态表单）
- **上游**: Vite Dev Server（静态文件服务 + 代理转发）
- **上游**: 认证中心 `/authcenter`（生产环境通过反向代理转发）

---

## 9. R2 迭代：主工具条 App 显示重构

> 迭代版本: R2
> 目标组件: `desktop-toolbar-main`
> 父组件: `Desktop.vue`（无需改动，props 已就绪）

### 9.1 R2 目的

R1 中主工具条将「快捷方式」和「运行中 App」分成两个独立区域，各自直接使用 props 渲染。这导致：
- 已被加入快捷方式的 App 运行时，在「快捷方式」和「运行中 App」两个区域**同时出现**（视觉重复）
- 用户无法区分快捷方式中的 App 是否已经实例化运行

R2 通过引入 `shortcutsRef` / `appsRef` 两个计算属性实现交叉去重，使每个 App 只在工具条中出现一次。

### 9.2 R2 用户故事

- US-201-R2-01: 作为用户，当我把某个 App 加入快捷方式后，无论它是否正在运行，我只在「常驻 App」区域看到一个入口，不会出现重复图标。
- US-201-R2-02: 作为用户，在「常驻 App」区域我能通过绿点一眼看出哪些 App 已经实例化运行了。
- US-201-R2-03: 作为用户，在「当前活动 App」区域我只看到未加入快捷方式的运行中 App，避免信息冗余。
- US-201-R2-04: 作为用户，点击「常驻 App」和「当前活动 App」的图标行为一致——已运行则切换最小化/恢复，未运行则启动。

### 9.3 R2 功能需求

- FR-201-053: `shortcutsRef` 计算属性 MUST 将 `shortcuts` 与 `apps` 交叉——对每条 shortcut，若 `apps` 中存在匹配实例（compId 优先匹配，回退 compName），则附加该实例的 `state` 属性（`null` 或 `'minimize'`）；不存在则 `state` 为 `undefined`。
- FR-201-054: `appsRef` 计算属性 MUST 过滤 `apps`——仅保留在 `shortcuts` 中**不存在**匹配（compId 优先，回退 compName）的 App 实例。已在 shortcutsRef 中显示的实例不再重复出现在 appsRef。
- FR-201-055: `shortcutsRef` 和 `appsRef` MUST 为 Vue computed 属性，当 `props.shortcuts` 或 `props.apps` 变化时自动重新计算。
- FR-201-056: 工具条模板 MUST 重构为四个区域，从左到右依次为：① Home + App 列表、② 常驻 App（渲染 shortcutsRef）、③ 当前活动 App（渲染 appsRef）、④ 编辑桌面按钮。
- FR-201-057: 区域②「常驻 App」点击图标时 MUST：先查 `props.apps` 中是否存在匹配实例 → 存在则 `emit('toggleAppState', app)`；不存在则 `emit('addApp', {compName, compId, appMeta})`。
- FR-201-058: 区域③「当前活动 App」点击图标时 MUST：因 appsRef 中的实例必然存在于 props.apps，直接 `emit('toggleAppState', app)`。
- FR-201-059: 「常驻 App」和「当前活动 App」区域的 App 图标，若数据项有 `state` 字段（值非 undefined），MUST 在图标底部显示绿色圆点指示器，表示该 App 已实例化运行。
- FR-201-060: 区域① Home/App 列表按钮与区域④编辑桌面按钮的功能 MUST 与 R1 完全一致，不做任何修改。

### 9.4 R2 关键实体变更

| 实体 | 变更 | 说明 |
|---|---|---|
| shortcutsRef (新增) | 组件内部 computed | `shortcuts` 交叉 `apps`：shortcut + { state?: 'minimize' \| null } |
| appsRef (新增) | 组件内部 computed | `apps` 减去已在 shortcuts 中的实例 |

```typescript
// shortcutsRef 条目形态
type ShortcutRef = {
  compName: string
  appMeta: AppMeta | null
  compId?: string
  state?: null | 'minimize'  // 来自匹配的 App 实例；undefined = 未实例化
}

// appsRef 条目形态（同 DesktopApp，仅过滤）
type AppsRef = DesktopApp  // { instanceId, compName, compId?, appMeta, wrapperValues, state }
```

### 9.5 R2 验收场景

#### 场景：快捷方式 App 未运行 — 仅出现在常驻区域

- Given 用户已将 BasicClock 加入快捷方式，BasicClock 未运行
- When 桌面处于 normal 模式，底部主工具条可见
- Then 常驻 App 区域显示 BasicClock 图标（无绿点），当前活动 App 区域为空

#### 场景：快捷方式 App 已运行 — 去重显示 + 绿点

- Given BasicClock 已加入快捷方式且正在运行
- When 桌面处于 normal 模式
- Then 常驻 App 区域显示 BasicClock 图标（带绿点），当前活动 App 区域不显示 BasicClock

#### 场景：非快捷方式 App 运行 — 仅出现在活动区域

- Given BasicClock 未加入快捷方式，BasicIframe 正在运行
- When 桌面处于 normal 模式
- Then 常驻 App 区域无 BasicIframe，当前活动 App 区域显示 BasicIframe（带绿点）

#### 场景：常驻 App 点击 — 已实例化则切换状态

- Given BasicClock 在 shortcutsRef 中且 `state !== undefined`（已运行）
- When 点击常驻区域中的 BasicClock 图标
- Then emit('toggleAppState', appInstance) 触发，App 最小化↔恢复切换

#### 场景：常驻 App 点击 — 未实例化则启动

- Given BasicClock 在 shortcutsRef 中且 `state === undefined`（未运行）
- When 点击常驻区域中的 BasicClock 图标
- Then emit('addApp', {compName, compId, appMeta}) 触发，启动 BasicClock
