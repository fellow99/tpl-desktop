# 201-page-index: 测试用例

> 模块: 201-page-index
> 对应规格: [spec.md](./spec.md)
> 对应技术方案: [plan.md](./plan.md)
> 最后更新: 2026-07-19

---

## 测试环境

| 项目 | 内容 |
|---|---|
| 浏览器 | Playwright Chromium (headless) |
| 开发服务器 | `pnpm dev` (vite) |
| 目标 URL | `http://localhost:5173` |
| 构建验证 | `pnpm build` → 检查 `dist/` 产物 |

---

## TC-201-001: 首次加载 — 显示默认桌面

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-005, FR-201-006, FR-201-007, FR-201-008, FR-201-012, FR-201-013 |
| **优先级** | P0 |
| **前置条件** | localStorage 完全清空（无 `dashboard-desktop-data`、`dashboard-theme`、`dashboard-login-user`）；`/DEFAULT_DESKTOP_JSON.json` 正常可访问 |
| **测试步骤** | 1. 清空所有 localStorage<br>2. 导航到应用 URL<br>3. 等待页面加载完成 |
| **预期结果** | 1. 页面标题为"工作台"<br>2. `<html>` 无 `dark` class（默认跟随系统偏好，若系统为 light 则不添加 dark）<br>3. `#app` 挂载点存在<br>4. 登录覆盖层全屏显示，桌面内容不可见<br>5. desktop-dialog-login 登录对话框可见<br>6. 登录后：`.tpl-desktop` 容器渲染，statusbar/toolbar-main 可见<br>7. localStorage 中自动创建 `dashboard-desktop-data`（退出编辑触发） |

---

## TC-201-002: 刷新后恢复之前配置

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-005, FR-201-007, FR-201-008, FR-201-009, FR-201-013 |
| **优先级** | P0 |
| **前置条件** | 已登录用户完成以下定制：添加了 Widget（如 BasicText）、设置了背景（如 dark-001 暗色图片）、切换为深色主题、将 BasicClock 加入快捷方式；已退出编辑模式（配置已持久化）；localStorage 中有 `dashboard-login-user` 缓存 |
| **测试步骤** | 1. 在上述状态下刷新页面<br>2. 等待页面完全加载 |
| **预期结果** | 1. 不显示登录对话框，直接进入桌面<br>2. 之前添加的 Widget 仍在相同位置<br>3. 桌面背景为之前选择的 dark-001<br>4. 主题为深色（html.dark class 存在，Element Plus dark CSS vars 生效）<br>5. 底部工具栏快捷方式包含 BasicClock<br>6. 字体大小为之前设置的值（默认 16px） |

---

## TC-201-003: 刷新后不恢复 App 运行状态

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-022 |
| **优先级** | P1 |
| **前置条件** | 已登录，桌面正常渲染；用户已打开 BasicClock App（应用叠加层可见） |
| **测试步骤** | 1. 确认 App 叠加层中 BasicClock 可见<br>2. 刷新页面<br>3. 等待页面完全加载 |
| **预期结果** | 1. 登录会话恢复，进入桌面<br>2. App 叠加层不可见，BasicClock 未自动打开<br>3. desktopApps 数组为空（App 实例不持久化） |

---

## TC-201-004: fetch 默认 JSON 失败 — 硬编码回退

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-006 |
| **优先级** | P1 |
| **前置条件** | 模拟 `/DEFAULT_DESKTOP_JSON.json` 返回 HTTP 404（通过 Playwright route 拦截或删除该文件后测试） |
| **测试步骤** | 1. 使用 Playwright `page.route()` 拦截 `/DEFAULT_DESKTOP_JSON.json` 返回 404<br>2. 清空 localStorage<br>3. 导航到应用 URL<br>4. 登录后检查桌面状态 |
| **预期结果** | 1. 控制台输出 `[Desktop] 默认桌面配置加载失败，使用内置回退配置`<br>2. 应用不崩溃，不显示空白页<br>3. 桌面使用 FALLBACK_CONFIG 渲染（浅色主题、16px 字号、12×8 网格、1 个空页面）<br>4. 后续退出编辑时配置正常持久化到 localStorage |

---

## TC-201-005: localStorage 存储的配置 JSON 损坏 — 降级

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-007, FR-201-011 |
| **优先级** | P1 |
| **前置条件** | 手动向 localStorage['dashboard-desktop-data'] 写入非法 JSON 字符串（如 `"{broken"`）；已登录 |
| **测试步骤** | 1. 在浏览器控制台执行 `localStorage.setItem('dashboard-desktop-data', '{broken')`<br>2. 刷新页面 |
| **预期结果** | 1. JSON.parse 异常被 catch 静默捕获<br>2. stored 降级为 null<br>3. 桌面使用默认配置正常渲染<br>4. 应用不崩溃，不显示白屏 |

---

## TC-201-006: localStorage 完全不可用 — 静默降级

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-011 |
| **优先级** | P2 |
| **前置条件** | 通过 Playwright 设置 `page.addInitScript` 覆盖 localStorage.setItem 使其抛出异常；或使用无痕模式 |
| **测试步骤** | 1. 模拟 localStorage 写入时抛出 QuotaExceededError<br>2. 登录后修改桌面配置（如切换主题），退出编辑 |
| **预期结果** | 1. persistConfig 中 try/catch 捕获异常<br>2. 控制台输出 `[Desktop] 桌面配置持久化失败` 警告<br>3. 应用不崩溃，正常继续运行<br>4. 刷新后配置回退到默认值（持久化失败导致无存储数据） |

---

## TC-201-007: 登录态恢复 — 有效缓存

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-013 |
| **优先级** | P0 |
| **前置条件** | 用户已登录（localStorage['dashboard-login-user'] 含有效的 userId/userName/name）；localStorage['dashboard-desktop-data'] 存在 |
| **测试步骤** | 1. 确认 localStorage 中有 `dashboard-login-user`<br>2. 导航到应用 URL |
| **预期结果** | 1. 不显示登录对话框<br>2. loginUser ref 为有效用户对象<br>3. statusbar 显示用户名<br>4. 桌面内容正常渲染 |

---

## TC-201-008: 登录态恢复 — 无效缓存

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-012, FR-201-013 |
| **优先级** | P0 |
| **前置条件** | localStorage['dashboard-login-user'] 不存在或已过期（清除该 key） |
| **测试步骤** | 1. 在控制台 `localStorage.removeItem('dashboard-login-user')`<br>2. 刷新页面 |
| **预期结果** | 1. 显示全屏登录覆盖层<br>2. desktop-dialog-login 对话框弹出<br>3. 桌面内容（statusbar/toolbar/viewport）均不渲染 |

---

## TC-201-009: 退出登录 — 清除数据并刷新

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-015 |
| **优先级** | P1 |
| **前置条件** | 已登录，桌面上有定制内容（Widget/背景/快捷方式已持久化） |
| **测试步骤** | 1. 点击 statusbar 的登出按钮<br>2. 等待 `window.location.reload()` 触发 |
| **预期结果** | 1. 登出前 localStorage['dashboard-desktop-data'] 被 `removeItem` 清除<br>2. auth-service.logout() 清除 `dashboard-login-user`<br>3. 页面刷新后显示登录页<br>4. 登录后桌面为默认配置（非之前的定制配置） |

---

## TC-201-010: 暗色主题无闪烁（Anti-FOUC）

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-001 |
| **优先级** | P0 |
| **前置条件** | localStorage['dashboard-theme'] = 'dark'；页面首次加载（无缓存） |
| **测试步骤** | 1. 设置 localStorage['dashboard-theme'] = 'dark'<br>2. 使用浏览器 DevTools Performance 面板录制页面加载过程<br>3. 检查首帧渲染时 `<html>` 是否已有 `dark` class |
| **预期结果** | 1. `<html>` 元素在首帧渲染前（DOM 解析阶段）即带有 `dark` class<br>2. Element Plus dark CSS vars（`el-*` 暗色变量）从第一帧起生效<br>3. --desktop-* 暗色 CSS 变量从第一帧起生效<br>4. 整个加载过程中无颜色跳变（浅→深闪烁）<br>5. 若为首次访问（无 localStorage），系统偏好为 dark 时 `<html>` 也应有 `dark` class |

---

## TC-201-011: Vite 构建产物完整性

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-046, FR-201-047 |
| **优先级** | P0 |
| **前置条件** | 执行 `pnpm build` 完整构建 |
| **测试步骤** | 1. 运行 `pnpm build`<br>2. 检查 `dist/` 目录结构<br>3. 查看 `dist/index.html` 内容<br>4. 使用 `pnpm preview` 启动预览服务器验证可访问 |
| **预期结果** | 1. `dist/index.html` 存在<br>2. `dist/index.html` 中 `<script type="module"` 引用正确的打包 JS 文件（含 hash）<br>3. `dist/` 包含 JS/CSS 资源文件（`assets/` 目录）<br>4. `dist/DEFAULT_DESKTOP_JSON.json` 存在（public 目录内容原样复制）<br>5. `dist/config.js` 存在（public 目录内容原样复制）<br>6. `pnpm preview` 可正常访问，桌面渲染正常<br>7. 所有资源文件为纯静态，无需后端运行时 |

---

## TC-201-012: anti-FOUC — 系统偏好 fallback

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-001 |
| **优先级** | P1 |
| **前置条件** | localStorage 中无 `dashboard-theme` key；系统偏好设置为 dark（通过 Playwright `colorScheme: 'dark'`） |
| **测试步骤** | 1. 清空 localStorage<br>2. 设置浏览器 `prefers-color-scheme: dark`<br>3. 导航到应用 URL |
| **预期结果** | 1. `<html>` 带有 `dark` class<br>2. 桌面以深色主题渲染<br>3. 加载过程无浅→深闪烁 |

---

## TC-201-013: 字体缩放 — 步进与边界

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-029, FR-201-030, FR-201-031, FR-201-032 |
| **优先级** | P1 |
| **前置条件** | 已登录，桌面正常渲染，进入编辑模式（工具栏显示编辑工具条） |
| **测试步骤** | 1. 检查根 DOM `.tpl-desktop` 的 font-size<br>2. 连续点击"减小字体"按钮直到无法继续<br>3. 连续点击"增大字体"按钮 3 次<br>4. 点击"还原字体"按钮 |
| **预期结果** | 1. 初始 font-size 为 16px<br>2. 每次点击减小 2px：14px → 12px → 10px（下限，再点不减小）<br>3. 从 10px 每次点击增大 2px：12px → 14px → 16px<br>4. "还原"后 font-size 回到 16px<br>5. 桌面上所有文字视觉上相应缩放<br>6. 刷新后 font-size 保持最后设置的值 |

---

## TC-201-014: 手动主题切换

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-033 |
| **优先级** | P1 |
| **前置条件** | 已登录，桌面正常渲染，进入编辑模式 |
| **测试步骤** | 1. 确认当前为浅色主题（html 无 dark class）<br>2. 点击编辑工具条的"主题切换"按钮<br>3. 检查页面外观<br>4. 刷新页面 |
| **预期结果** | 1. 点击后 `<html>` 添加 `dark` class<br>2. 所有 --desktop-* CSS 变量切换为深色值<br>3. Element Plus 组件（el-dialog/el-button 等）同步变为深色<br>4. 刷新后深色主题保持（localStorage['dashboard-theme'] = 'dark'，desktopConfig.theme = 'dark'）<br>5. 再次点击切换回浅色 |

---

## TC-201-015: 背景选择联动主题

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-034 |
| **优先级** | P1 |
| **前置条件** | 已登录，桌面正常渲染，进入编辑模式；当前为浅色主题 |
| **测试步骤** | 1. 点击编辑工具条"背景"按钮打开背景选择面板<br>2. 选择一个关联了 `theme: 'dark'` 的背景（如 dark-001）<br>3. 观察页面外观<br>4. 刷新页面 |
| **预期结果** | 1. 桌面背景更换为所选背景<br>2. 主题自动切换为深色（html.dark class 添加）<br>3. desktopConfig.theme 更新为 'dark'<br>4. 刷新后背景和深色主题均保持 |

---

## TC-201-016: 页面增删 — 边界条件

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-036, FR-201-037, FR-201-038, FR-201-039 |
| **优先级** | P1 |
| **前置条件** | 已登录，桌面渲染，进入编辑模式；当前仅有 1 个页面 |
| **测试步骤** | 1. 点击"删除页面"按钮<br>2. 点击"向后添加页面"按钮<br>3. 确认切换到新页面<br>4. 添加 Widget 到第 2 页<br>5. 删除第 2 页 |
| **预期结果** | 1. 仅剩 1 页时"删除页面"按钮无效（canvas-remove-page 为 false），pages 长度不变<br>2. 点击"向后添加"后 pages 长度变为 2，自动切换到第 2 页（新页）<br>3. 新页面为空页（title='', children=[]）<br>4. 在第 2 页添加的 Widget 随页面删除被移除<br>5. 删除第 2 页后自动切回第 1 页（pages 长度 1，currentPageIndex 为 0） |

---

## TC-201-017: 快捷方式持久化

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-026, FR-201-027, FR-201-028 |
| **优先级** | P1 |
| **前置条件** | 已登录，桌面正常渲染；App 列表已打开 |
| **测试步骤** | 1. 在 App 列表中将 BasicClock 加入快捷方式<br>2. 刷新页面<br>3. 检查底部主工具条的快捷方式区域 |
| **预期结果** | 1. 加入后底部工具条快捷方式区域出现 BasicClock 入口<br>2. 刷新后快捷方式仍存在<br>3. 再次进入 App 列表可移除 BasicClock 快捷方式<br>4. 移除后刷新，快捷方式不再显示 |

---

## TC-201-018: App 打开 → 关闭 → Widget 事件协调

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-018, FR-201-019, FR-201-021, FR-201-023, FR-201-024, FR-201-025 |
| **优先级** | P1 |
| **前置条件** | 已登录，桌面正常渲染，当前页有 Widget（如 BasicText） |
| **测试步骤** | 1. 通过 App 列表打开 BasicClock App<br>2. 等待 300ms<br>3. 检查 Widget 是否收到 grid-deactive 事件（Widget 暂停交互）<br>4. 关闭 BasicClock App<br>5. 等待 300ms<br>6. 检查 Widget 是否收到 grid-active 事件（恢复交互） |
| **预期结果** | 1. BasicClock 叠加层渲染在桌面之上<br>2. 300ms 后 Widget 收到 grid-deactive，暂停拖拽等交互<br>3. 快速连续打开/关闭 App 不导致事件重复或顺序错乱（debounce 生效）<br>4. 关闭所有 App 后 Widget 收到 grid-active，恢复交互 |

---

## TC-201-019: 重复打开同一 App — 恢复而非新建

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-019 |
| **优先级** | P1 |
| **前置条件** | 已登录，BasicClock App 已打开（正常状态，state=null） |
| **测试步骤** | 1. 将 BasicClock 最小化（点击最小化按钮）<br>2. 再次从 App 列表打开 BasicClock<br>3. 检查 App 状态和实例数量 |
| **预期结果** | 1. 不创建新的 App 实例（desktopApps 数组长度不变）<br>2. 已有 BasicClock 实例的 state 从 'minimize' 恢复为 null<br>3. 该实例移至数组末尾（z 序最顶层）<br>4. 同一个 App 只存在一个实例 |

---

## TC-201-020: 主页按钮行为

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-040 |
| **优先级** | P1 |
| **前置条件** | 已登录；当前在第 2 页（若有）；已打开 BasicClock 和 BasicIframe 两个 App（均为正常显示状态） |
| **测试步骤** | 1. 点击底部主工具条的"主页"按钮<br>2. 检查页面和 App 状态 |
| **预期结果** | 1. 当前页面切换到第 0 页（首页）<br>2. 所有已打开 App 的 state 变为 'minimize'（隐藏在任务栏，不关闭）<br>3. toolbar-main 中运行中 App 入口反映最小化状态 |

---

## TC-201-021: 属性编辑 + 立即持久化

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-042, FR-201-044 |
| **优先级** | P1 |
| **前置条件** | 已登录，编辑模式下桌面有一个 BasicText Widget |
| **测试步骤** | 1. 点击 BasicText Widget 的编辑按钮<br>2. 修改属性值<br>3. 点击"应用"确认<br>4. 在未退出编辑模式的情况下刷新页面 |
| **预期结果** | 1. 属性编辑面板打开，显示对应 Widget 的可编辑属性<br>2. 点击"应用"后 Widget 内容更新<br>3. saveAllPages + persistConfig 立即触发<br>4. 刷新后（不需要退出编辑），属性修改已持久化 |

---

## TC-201-022: window.SYSTEM_CONFIGS 注入验证

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-002 |
| **优先级** | P2 |
| **前置条件** | 应用页面已加载 |
| **测试步骤** | 1. 在浏览器控制台执行 `window.SYSTEM_CONFIGS`<br>2. 检查 authLoginUrl<br>3. 检查 rsaPublicKey |
| **预期结果** | 1. `window.SYSTEM_CONFIGS` 为对象，非 undefined<br>2. `authLoginUrl` 为 `'/authcenter/login'`<br>3. `rsaPublicKey` 为非空字符串（以 `MIGfMA0GCSqGSIb3` 开头）<br>4. 该值在 desktop.js 执行前即已可用（config.js 为同步脚本） |

---

## TC-201-023: 全局组件注册 — UI/Widget/App 组件可用

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-003 |
| **优先级** | P1 |
| **前置条件** | 应用已挂载，已登录进入桌面 |
| **测试步骤** | 1. 检查 DOM 中是否渲染了 `<desktop-statusbar>`<br>2. 检查 `<desktop-toolbar-main>` 是否存在<br>3. 进入编辑模式，添加一个 Widget 后检查 Widget 组件是否挂载<br>4. 打开一个 App 后检查 App 组件是否挂载 |
| **预期结果** | 1. statusbar 的 Vue 组件正常渲染（非 `<desktop-statusbar>` 未解析的原生标签）<br>2. toolbar-main 的 Vue 组件正常渲染<br>3. 添加的 Widget 组件（如 BasicText）正常渲染内容<br>4. 打开的 App 组件正常渲染<br>5. 所有组件通过 `app.component()` 全局注册后可在任意模板中直接使用 kebab-case 标签名 |

---

## TC-201-024: 配置加载中状态

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-005, FR-201-008 |
| **优先级** | P2 |
| **前置条件** | 已登录（loginUser 非 null）；但 desktopConfig 尚未加载完成（模拟慢速 /DEFAULT_DESKTOP_JSON.json） |
| **测试步骤** | 1. 使用 Playwright route 拦截 `/DEFAULT_DESKTOP_JSON.json`，延迟 3 秒后响应<br>2. 导航到应用 URL（已恢复登录会话） |
| **预期结果** | 1. 桌面加载中文字"桌面配置加载中…"显示<br>2. statusbar/toolbar/viewport 均未渲染<br>3. 配置加载完成后加载提示消失，桌面正常渲染 |

---

## TC-201-025: 编辑退出自动保存

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-009, FR-201-017 |
| **优先级** | P0 |
| **前置条件** | 已登录，编辑模式下对桌面做了以下变更：添加 1 个 Widget、设置背景、切换主题 |
| **测试步骤** | 1. 在编辑模式下完成变更<br>2. 点击"完成编辑"按钮退出编辑<br>3. 刷新页面 |
| **预期结果** | 1. 退出编辑后 Widget 列表面板、背景列表面板自动关闭<br>2. 模式切换为 normal，底部显示主工具条<br>3. 刷新后所有变更（Widget、背景、主题）均已持久化并恢复 |

## TC-201-026: 主工具条悬浮显隐

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-048, FR-201-049, FR-201-050, FR-201-051, FR-201-052 |
| **优先级** | P1 |
| **前置条件** | 已登录，桌面处于 normal 模式，底部主工具条渲染 |
| **测试步骤** | 1. 检查 initial 状态：工具条底部仅露出约 1.3em<br>2. 鼠标移入工具条区域 → 检查工具条动画完全滑出<br>3. 手指触摸（或点击）工具条 → 工具条保持完全显示<br>4. 鼠标移出工具条 → 等待 5s → 工具条自动隐藏<br>5. 鼠标移出后 2s 再次移入 → hide timer 被清除，工具条保持显示<br>6. 切换到 editing 模式 → 编辑工具条常驻可见（不受此逻辑影响） |
| **预期结果** | 1. 初始态 `calc(100% - 1.3em)` 露出底部<br>2. mouseenter/click/touchstart → `is-visible` class 激活，工具条上滑至 `-0.5em`，无抖动<br>3. mouseleave 后 5s → 工具条自动下滑隐藏<br>4. 重入清除计时器，不隐藏<br>5. editing 模式不受影响<br>6. 组件卸载后无残留 setTimeout |

---

## R2 迭代新增测试用例

> 最后更新: 2026-07-20

### TC-201-027: 快捷方式 App 未运行 — 仅出现在常驻区域（无绿点）

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-053, FR-201-054, FR-201-055, FR-201-056 |
| **优先级** | P0 |
| **前置条件** | 已登录 normal 模式；BasicClock 已加入快捷方式但未运行；无其他 App 运行 |
| **测试步骤** | 1. 确认 BasicClock 在 desktopConfig.shortcuts 中<br>2. 确认 desktopApps 为空<br>3. 鼠标移入底部工具条使其完全显示<br>4. 检查工具条布局 |
| **预期结果** | 1. 常驻 App 区域（shortcutsRef）显示 BasicClock 图标<br>2. BasicClock 图标底部无绿点（state === undefined，未实例化）<br>3. 当前活动 App 区域（appsRef）为空<br>4. Home + App 列表按钮正常显示<br>5. 编辑桌面按钮正常显示 |

---

### TC-201-028: 快捷方式 App 已运行 — 去重显示 + 绿点

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-053, FR-201-054, FR-201-055, FR-201-056, FR-201-059 |
| **优先级** | P0 |
| **前置条件** | 已登录 normal 模式；BasicClock 已加入快捷方式且正在运行（state=null）；无其他 App 运行 |
| **测试步骤** | 1. 打开 BasicClock App（desktopApps 含 1 个实例）<br>2. 鼠标移入底部工具条使其完全显示<br>3. 检查工具条布局 |
| **预期结果** | 1. 常驻 App 区域显示 BasicClock 图标<br>2. BasicClock 图标底部有绿色圆点（state !== undefined，已实例化）<br>3. 当前活动 App 区域**不显示** BasicClock（已去重到常驻区域）<br>4. desktopApps 长度为 1，但 appsRef 长度为 0 |

---

### TC-201-029: 非快捷方式 App 运行 — 仅出现在活动区域

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-054, FR-201-055, FR-201-058, FR-201-059 |
| **优先级** | P0 |
| **前置条件** | 已登录 normal 模式；BasicIframe 未加入快捷方式；BasicIframe 正在运行 |
| **测试步骤** | 1. 打开 BasicIframe App<br>2. 鼠标移入底部工具条使其完全显示<br>3. 检查工具条布局 |
| **预期结果** | 1. 常驻 App 区域不显示 BasicIframe<br>2. 当前活动 App 区域显示 BasicIframe 图标<br>3. BasicIframe 图标有绿色圆点（运行中实例）<br>4. 点击 BasicIframe 图标 → emit toggleAppState（最小化/恢复切换） |

---

### TC-201-030: 常驻 App 点击 — 未实例化则启动

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-057 |
| **优先级** | P1 |
| **前置条件** | 已登录 normal 模式；BasicClock 已加入快捷方式；BasicClock 当前未运行 |
| **测试步骤** | 1. 确认 desktopApps 为空<br>2. 鼠标移入工具条显示<br>3. 点击常驻 App 区域的 BasicClock 图标 |
| **预期结果** | 1. emit('addApp', {compName, compId, appMeta}) 触发<br>2. Desktop.vue 的 handleAddApp 创建新 App 实例<br>3. App 叠加层显示 BasicClock<br>4. 工具条中 BasicClock 图标出现绿点（实例化后 state 存在） |

---

### TC-201-031: 常驻 App 点击 — 已实例化则切换状态

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-057 |
| **优先级** | P1 |
| **前置条件** | 已登录 normal 模式；BasicClock 已加入快捷方式且正在运行（state=null） |
| **测试步骤** | 1. 确认 BasicClock 正常显示在 App 叠加层<br>2. 鼠标移入工具条显示<br>3. 点击常驻 App 区域的 BasicClock 图标 |
| **预期结果** | 1. emit('toggleAppState', appInstance) 触发<br>2. App 最小化（state='minimize'），叠加层隐藏<br>3. 再次点击 → App 恢复显示（state=null） |

---

### TC-201-032: shortcuts/apps 更新时 shortcutsRef/appsRef 响应式同步

| 项目 | 内容 |
|---|---|
| **关联 FR** | FR-201-055 |
| **优先级** | P1 |
| **前置条件** | 已登录 normal 模式；工具条可见 |
| **测试步骤** | 1. 工具条中观察当前状态<br>2. 打开 App 列表，将 BasicIframe 加入快捷方式<br>3. 观察工具条变化<br>4. 打开 BasicIframe App<br>5. 观察工具条变化<br>6. 关闭 BasicIframe |
| **预期结果** | 1. 加入快捷方式后，shortcutsRef 立即更新包含 BasicIframe<br>2. 打开 BasicIframe 后，shortcutsRef 中 BasicIframe 出现绿点<br>3. 关闭 BasicIframe 后，shortcutsRef 中 BasicIframe 绿点消失<br>4. 全程无手动刷新页面，响应式自动同步 |
