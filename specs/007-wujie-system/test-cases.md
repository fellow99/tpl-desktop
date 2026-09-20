# 测试用例: wujie微前端机制

> **模块**: 007-wujie-system
> **对应规格**: [spec.md](./spec.md)
> **对应方案**: [plan.md](./plan.md)
> **状态**: 待实现
> **最后更新**: 2026-07-19

---

## 测试概览

| 编号范围 | 测试类别 | 用例数 |
|----------|----------|--------|
| TC-007-001 ~ TC-007-007 | 主应用启动与初始化 | 7 |
| TC-007-008 ~ TC-007-014 | 元数据注入 | 7 |
| TC-007-015 ~ TC-007-021 | 子应用功能验证 | 7 |
| TC-007-022 ~ TC-007-030 | 生命周期与降级 | 9 |
| TC-007-031 ~ TC-007-036 | 集成与边缘场景 | 6 |

> 合计 **36 条**测试用例，覆盖全部 21 个场景需求 + 15 个补充边缘场景。

---

## 一、主应用启动与初始化

### TC-007-001: 启动主应用 dev server 能正常加载，无报错

- **Priority**: P1
- **Type**: Functional
- **Precondition**: 项目已 `pnpm install`，依赖完整
- **Steps**:
  1. 在项目根目录执行 `pnpm dev`
  2. 观察终端输出，确认 Vite dev server 启动成功（默认 http://localhost:5173）
  3. 在浏览器打开 http://localhost:5173
  4. 打开浏览器 DevTools Console 面板
  5. 刷新页面并完成登录
- **Expected Result**:
  - Vite dev server 正常启动，无 fatal error
  - 页面正常渲染，无白屏或 404
  - Console 中无 JavaScript error（红色报错）
  - 无未捕获的 Promise rejection
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-002: PLUGINS.json 能被正确读取

- **Priority**: P1
- **Type**: Functional
- **Precondition**: `public/PLUGINS.json` 文件存在且为合法 JSON
- **Steps**:
  1. 启动主应用 dev server
  2. 打开浏览器 DevTools Network 面板
  3. 刷新页面并完成登录
  4. 在 Network 面板中筛选 `PLUGINS.json`
  5. 检查该请求的响应状态和内容
  6. 在 Console 执行 `window.__WUJIE_PLUGINS__` 或查看 useWujie 的内部状态
- **Expected Result**:
  - `PLUGINS.json` HTTP 请求返回 200 OK
  - 响应体为合法 JSON 数组，包含子应用条目（name、url、type 等字段）
  - JSON 数据被成功解析，无 JSON.parse 异常
  - 若 PLUGINS.json 不存在或格式错误，有明确 warning 日志且不阻断启动
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-003: useWujie 能加载子应用清单并初始化子应用

- **Priority**: P1
- **Type**: Functional
- **Precondition**: `public/PLUGINS.json` 配置了至少一个子应用（如 `DemoClock`），子应用 dev server (127.0.0.1:5273) 已启动
- **Steps**:
  1. 启动主应用 dev server
  2. 确保子应用 dev server 在 `127.0.0.1:5273` 运行
  3. 刷新主应用页面并完成登录
  4. 打开 Console，观察 `[Wujie]` 相关日志
  5. 在 Console 中检查 wujie 实例是否已初始化
- **Expected Result**:
  - Console 中有 `[Wujie]` 或 `[useWujie]` 初始化日志
  - 子应用清单被正确解析
  - 非 disabled 的子应用开始加载
  - 子应用 iframe/WebComponent 容器开始创建
  - 无 JavaScript error
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-004: 子应用加载完成后，Desktop.vue 才开始渲染桌面

- **Priority**: P1
- **Type**: Integration
- **Precondition**: PLUGINS.json 中至少有一个有效的子应用配置，子应用 dev server 已启动
- **Steps**:
  1. 启动主应用 dev server
  2. 在 Desktop.vue 渲染逻辑中添加调试断点或临时 console.log
  3. 刷新页面并完成登录
  4. 观察子应用加载完成事件与 Desktop.vue 渲染的时序
  5. 验证 loading 状态是否在子应用全部加载完成后才结束
- **Expected Result**:
  - 桌面渲染晚于子应用加载完成
  - 在子应用未全部加载完毕前，桌面可显示 loading 状态或骨架屏
  - 子应用全部加载完成后，桌面一次性渲染（或按子应用逐个就绪后渐进展示）
  - 不会出现"桌面已渲染但子应用 Widget 入口缺失"的中间态
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-005: 子应用加载失败时，Desktop.vue 仍然能正常渲染（降级）

- **Priority**: P1
- **Type**: Edge Case
- **Precondition**: PLUGINS.json 中配置了至少一个子应用，但该子应用 dev server 未启动（或故意配置错误 URL）
- **Steps**:
  1. 启动主应用 dev server
  2. 确保子应用 dev server **未启动**（127.0.0.1:5273 不可达）
  3. 刷新主应用页面并完成登录
  4. 观察 Console 中的错误或 warning
  5. 观察桌面是否正常渲染
- **Expected Result**:
  - Console 中有子应用加载失败的 warning 日志（非致命 error）
  - Desktop.vue 正常渲染，不白屏、不崩溃
  - 失败的子应用对应入口（Widget/App/Background）不出现在主应用中
  - 登录、翻页、主题切换等核心功能不受影响
  - 主应用保持可用，仅降级缺少失败子应用的功能
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-006: PLUGINS.json 中 disabled=true 的子应用不被加载

- **Priority**: P2
- **Type**: Functional
- **Precondition**: PLUGINS.json 中至少有一个子应用设置了 `"disabled": true`，且子应用 dev server 已启动
- **Steps**:
  1. 在 PLUGINS.json 中将某个子应用的 `disabled` 字段设为 `true`
  2. 启动主应用和子应用 dev server
  3. 刷新主应用页面并完成登录
  4. 打开 DevTools Network 面板
  5. 检查是否有对被禁用子应用的网络请求
  6. 检查桌面上的 Widget 列表、App 列表、Background 列表
- **Expected Result**:
  - 被禁用的子应用不会发起 wujie 加载请求
  - 被禁用子应用的 Widget/App/Background 元数据不注入到主应用
  - Console 中有 `[Wujie] skip disabled plugin: <name>` 类日志
  - 其他非 disabled 的子应用正常加载
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-007: PLUGINS.json 为空数组时主应用正常启动

- **Priority**: P2
- **Type**: Edge Case
- **Precondition**: PLUGINS.json 内容为 `[]`（空数组）
- **Steps**:
  1. 修改 PLUGINS.json 为空数组 `[]`
  2. 启动主应用 dev server
  3. 刷新页面并完成登录
  4. 观察 Console 和桌面状态
- **Expected Result**:
  - 主应用正常启动，无报错
  - Console 中有 "无子应用配置" 类 info 日志
  - 桌面正常渲染（仅内置 Widget/App/Background）
  - 所有核心功能不受影响
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

## 二、元数据注入

### TC-007-008: 子应用的 Widget 元数据成功注入到主应用 widgetMetas

- **Priority**: P1
- **Type**: Integration
- **Precondition**: 子应用 `DemoText` 注册了 Widget 类型元数据，子应用 dev server 已启动
- **Steps**:
  1. 启动主应用 + 子应用 dev server
  2. 刷新主应用页面并完成登录
  3. 进入编辑模式
  4. 点击底部 "部件" 按钮打开 Widget 选择面板
  5. 在 Widget 列表中查找来自子应用的 Widget（如 DemoText）
- **Expected Result**:
  - Widget 选择面板中包含来自子应用的 Widget 条目
  - 条目显示正确的标题、图标、分类
  - 点击条目后预览区显示子应用 Widget 的实时预览
  - 添加后 Widget 在桌面网格中正常渲染
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-009: 子应用的 App 元数据成功注入到主应用 appMetas

- **Priority**: P1
- **Type**: Integration
- **Precondition**: 子应用 `DemoClock` 注册了 App 类型元数据，子应用 dev server 已启动
- **Steps**:
  1. 启动主应用 + 子应用 dev server
  2. 刷新主应用页面并完成登录
  3. 点击底部工具条 "⊞ App" 按钮打开 App 列表
  4. 点击 "＋" 打开应用市场
  5. 在左侧分类树中查找子应用提供的 App（如 DemoClock）
- **Expected Result**:
  - 应用市场分类树中包含子应用提供的 App 条目
  - 点击条目后中间预览区显示子应用 App 的实时预览
  - 添加后可从 App 列表启动该子应用
  - App 以全屏叠加层形式正常运行
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-010: 子应用的 Background 元数据成功注入到主应用 backgroundMetas

- **Priority**: P1
- **Type**: Integration
- **Precondition**: 子应用注册了 Background 类型元数据，子应用 dev server 已启动
- **Steps**:
  1. 启动主应用 + 子应用 dev server
  2. 刷新主应用页面并完成登录
  3. 进入编辑模式
  4. 点击底部 "背景" 按钮打开背景选择面板
  5. 浏览各分类，查找来自子应用的背景选项
- **Expected Result**:
  - 背景选择面板中包含来自子应用的背景条目
  - 条目显示正确的缩略图/预览
  - 点击选中后桌面背景切换为子应用提供的背景
  - 选择结果持久化到 localStorage
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-011: 子应用 Widget 样式能正确注入（无样式丢失）

- **Priority**: P2
- **Type**: Integration
- **Precondition**: 子应用的 Widget 有自定义样式（非纯默认样式），子应用 dev server 已启动
- **Steps**:
  1. 启动主应用 + 子应用 dev server
  2. 刷新主应用页面并完成登录
  3. 进入编辑模式，添加子应用 Widget 到桌面
  4. 退出编辑模式，在浏览模式下观察该 Widget 的外观
  5. 与子应用独立运行时截图对比
- **Expected Result**:
  - Widget 在主应用中样式与子应用独立运行时一致
  - 无样式冲突（主应用 CSS 变量不覆盖子应用样式）
  - 字号、颜色、间距等与子应用源码定义一致
  - 若使用 Shadow DOM，样式完全隔离
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-012: 同一子应用同时提供多种元数据类型

- **Priority**: P2
- **Type**: Functional
- **Precondition**: 某个子应用同时注册了 Widget + App（或 Widget + Background）元数据，子应用 dev server 已启动
- **Steps**:
  1. 启动主应用 + 子应用 dev server
  2. 刷新主应用页面并完成登录
  3. 分别打开 Widget 选择面板、App 应用市场、Background 选择面板
  4. 验证该子应用在所有三类入口中是否都正确出现
- **Expected Result**:
  - 子应用的 Widget 元数据正确注入 widgetMetas
  - 子应用的 App 元数据正确注入 appMetas（如适用）
  - 子应用的 Background 元数据正确注入 backgroundMetas（如适用）
  - 每种类型的元数据互不干扰
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-013: 子应用元数据使用默认分类时正确归类

- **Priority**: P3
- **Type**: Edge Case
- **Precondition**: 子应用元数据中 `category` 字段未定义或为空；子应用 dev server 已启动
- **Steps**:
  1. 修改子应用元数据，移除或置空 `category` 字段
  2. 重启子应用 dev server
  3. 刷新主应用页面并完成登录
  4. 打开 Widget 选择面板或 App 应用市场，查找该子应用
- **Expected Result**:
  - 该子应用被归入默认分类（如 "未分类" 或 "插件"）
  - 分类筛选功能仍能正常展示该条目
  - 不会因 category 缺失导致注入失败或报错
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-014: 子应用元数据字段缺失时的容错处理

- **Priority**: P2
- **Type**: Edge Case
- **Precondition**: 子应用元数据中缺少非必填字段（如 icon、description），子应用 dev server 已启动
- **Steps**:
  1. 修改子应用元数据，移除 `icon` 和 `description` 字段
  2. 重启子应用 dev server
  3. 刷新主应用页面并完成登录
  4. 观察该子应用在 Widget/App/Background 列表中的展示
- **Expected Result**:
  - 子应用仍被正常注册和显示
  - 缺失的 icon 使用默认占位图标
  - 缺失的 description 不显示或显示空
  - 不会因字段缺失导致报错或主应用崩溃
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

## 三、子应用功能验证

### TC-007-015: 子应用 DemoClock 能通过主应用 App 系统正常打开

- **Priority**: P1
- **Type**: Functional
- **Precondition**: 子应用 DemoClock 已配置在 PLUGINS.json 中，子应用 dev server 已启动，DemoClock 已通过应用市场添加到 App 列表
- **Steps**:
  1. 启动主应用 + 子应用 dev server
  2. 刷新主应用页面并完成登录
  3. 点击底部工具条 "⊞ App" 按钮打开 App 列表
  4. 点击 "DemoClock" 条目启动
  5. 观察 App 窗口内的时钟显示
  6. 等待至少 5 秒，观察时钟是否实时跳动
- **Expected Result**:
  - DemoClock App 以全屏叠加层正常打开
  - 时钟显示正确的当前时间
  - 秒数每秒实时更新
  - 标题栏显示 "DemoClock"，含最小化和关闭按钮
  - 底部工具条运行中 App 区域出现 DemoClock 条目
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-016: 子应用 DemoText 能添加到桌面并正常渲染

- **Priority**: P1
- **Type**: Functional
- **Precondition**: 子应用 DemoText 已配置在 PLUGINS.json 中，子应用 dev server 已启动
- **Steps**:
  1. 启动主应用 + 子应用 dev server
  2. 刷新主应用页面并完成登录
  3. 进入编辑模式
  4. 点击 "部件" 打开 Widget 选择面板
  5. 找到 DemoText Widget 并点击添加到桌面
  6. 退出编辑模式
  7. 在浏览模式下观察 Widget 渲染内容
- **Expected Result**:
  - DemoText Widget 成功添加到桌面网格
  - Widget 渲染出子应用定义的文字内容
  - 文字样式正确（字体、大小、颜色）
  - 可拖拽移动和调整大小
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-017: 子应用 DemoImage 能添加到桌面并显示图片

- **Priority**: P1
- **Type**: Functional
- **Precondition**: 子应用 DemoImage 已配置在 PLUGINS.json 中，子应用 dev server 已启动
- **Steps**:
  1. 启动主应用 + 子应用 dev server
  2. 刷新主应用页面并完成登录
  3. 进入编辑模式，添加 DemoImage Widget 到桌面
  4. 退出编辑模式
  5. 观察 Widget 中图片的加载和显示
- **Expected Result**:
  - DemoImage Widget 成功添加到桌面
  - 图片正常加载并显示（无裂图）
  - 图片按设定的 object-fit 方式渲染
  - 图片路径正确（相对于子应用的资源路径）
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-018: 子应用 DemoNumber 能添加到桌面并显示动画数字

- **Priority**: P1
- **Type**: Functional
- **Precondition**: 子应用 DemoNumber 已配置在 PLUGINS.json 中，子应用 dev server 已启动
- **Steps**:
  1. 启动主应用 + 子应用 dev server
  2. 刷新主应用页面并完成登录
  3. 进入编辑模式，添加 DemoNumber Widget 到桌面
  4. 退出编辑模式
  5. 观察数字动画效果
- **Expected Result**:
  - DemoNumber Widget 成功添加到桌面
  - 数字正确显示并带有滚动/翻转动画
  - 数字值按子应用逻辑更新
  - 动画流畅无卡顿
  - 与子应用独立运行时效果一致
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-019: 子应用 DemoVideo 能添加到桌面并播放视频

- **Priority**: P1
- **Type**: Functional
- **Precondition**: 子应用 DemoVideo 已配置在 PLUGINS.json 中，子应用 dev server 已启动
- **Steps**:
  1. 启动主应用 + 子应用 dev server
  2. 刷新主应用页面并完成登录
  3. 进入编辑模式，添加 DemoVideo Widget 到桌面
  4. 退出编辑模式
  5. 观察视频是否自动播放
  6. 检查视频是否有声音（默认应静音）
- **Expected Result**:
  - DemoVideo Widget 成功添加到桌面
  - 视频正常加载并开始播放
  - 视频默认静音（不干扰用户）
  - 视频循环播放
  - 视频控件（如有）可正常交互
  - 视频路径正确（相对于子应用资源路径）
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-020: 子应用 backgrounds 能在主应用背景面板中显示

- **Priority**: P1
- **Type**: Functional
- **Precondition**: 子应用注册了 Background 类型元数据（如动态粒子背景），子应用 dev server 已启动
- **Steps**:
  1. 启动主应用 + 子应用 dev server
  2. 刷新主应用页面并完成登录
  3. 进入编辑模式
  4. 点击 "背景" 按钮打开背景选择面板
  5. 浏览所有背景分类
  6. 查找来自子应用的背景选项
- **Expected Result**:
  - 背景选择面板中出现了来自子应用的背景条目
  - 背景缩略图或预览正确显示
  - 背景条目有正确的名称和分类
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-021: 切换到子应用提供的背景后能正常渲染

- **Priority**: P2
- **Type**: Functional
- **Precondition**: 子应用 Background 已出现在背景选择面板中，子应用 dev server 已启动
- **Steps**:
  1. 在背景选择面板中点击子应用提供的背景
  2. 确认选择（如有确认按钮则点击）
  3. 退出编辑模式
  4. 观察桌面背景变化
  5. 刷新页面后检查背景是否保持
- **Expected Result**:
  - 桌面背景立即切换为子应用提供的背景
  - 背景渲染正确（如有动画则动画正常运行）
  - 背景覆盖整个桌面视口
  - 刷新页面后背景选择结果持久化并恢复
  - 不存在背景闪烁或空白
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

## 四、生命周期与降级

### TC-007-022: 多子应用同时加载互不干扰

- **Priority**: P2
- **Type**: Integration
- **Precondition**: PLUGINS.json 中配置了 3 个以上子应用，所有子应用 dev server 均已启动
- **Steps**:
  1. 启动主应用 + 所有子应用 dev server
  2. 刷新主应用页面并完成登录
  3. 在 Network 面板观察各子应用的加载时序
  4. 在 Console 检查是否有加载冲突的 error
  5. 分别打开各子应用的 Widget/App/Background
- **Expected Result**:
  - 所有子应用各自独立加载，无明显阻塞等待
  - Console 中无资源冲突 error（如变量名冲突、CSS 污染）
  - 各子应用的 Widget 可同时添加在同一桌面页面
  - 各子应用的 App 可同时打开运行
  - 每个子应用的沙箱隔离有效（状态、路由、事件互不影响）
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-023: 子应用单个加载失败不影响其他子应用

- **Priority**: P2
- **Type**: Edge Case
- **Precondition**: PLUGINS.json 中配置了多个子应用（≥2），其中一个子应用 dev server 未启动
- **Steps**:
  1. 修改 PLUGINS.json，其中一个子应用的 url 指向不可达地址
  2. 启动主应用 + 其他正常子应用的 dev server
  3. 刷新主应用页面并完成登录
  4. 观察 Console
  5. 验证正常子应用的功能
- **Expected Result**:
  - Console 中有不可达子应用的加载失败 warning（含具体子应用名称）
  - 正常子应用的 Widget/App/Background 不受影响，仍可正常使用
  - 主应用不崩溃、不白屏
  - 失败子应用的元数据不注入主应用
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-024: 子应用保活模式下刷新页面后状态保持

- **Priority**: P2
- **Type**: Functional
- **Precondition**: 某子应用配置了保活模式（alive: true），子应用 dev server 已启动，子应用 Widget 已添加到桌面
- **Steps**:
  1. 添加子应用 Widget 到桌面并设置特定状态（如输入文本、选择选项）
  2. 退出编辑模式
  3. 切换到其他页面
  4. 切回原页面
  5. 刷新页面并完成登录
  6. 观察 Widget 状态
- **Expected Result**:
  - 页面切换后子应用 Widget 状态保持（不重新加载/初始化）
  - 刷新页面后，如 localStorage 中有持久化数据，状态恢复
  - 保活子应用的 iframe/容器不被销毁重建
  - 非保活子应用在页面切换时按需销毁/重建
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-025: 子应用加载超时时的降级处理

- **Priority**: P2
- **Type**: Edge Case
- **Precondition**: 子应用响应极慢（可模拟 network throttle 或 large payload），超过设定的超时时间
- **Steps**:
  1. 使用 DevTools Network 面板设置 Slow 3G 限速
  2. 刷新主应用页面并完成登录
  3. 观察超时后的行为
  4. 恢复正常网络后重新加载
- **Expected Result**:
  - 超时后 Console 有 `[Wujie] load timeout: <name>` warning
  - 主应用不因超时卡死或白屏
  - 超时子应用被标记为加载失败
  - Desktop.vue 在超时后继续渲染（降级模式）
  - 其他子应用不受影响
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-026: 子应用运行时崩溃不影响主应用

- **Priority**: P2
- **Type**: Edge Case
- **Precondition**: 子应用 Widget 已添加到桌面并正常运行，子应用 dev server 已启动
- **Steps**:
  1. 在子应用 Widget 运行时模拟内部错误（如故意在 Console 触发子应用代码异常）
  2. 或停止子应用 dev server 模拟运行时断开
  3. 观察主应用状态
  4. 尝试主应用的其他操作：翻页、添加内置 Widget、切换主题
- **Expected Result**:
  - 子应用崩溃后，Widget 容器显示错误降级 UI（而非白屏）
  - 主应用的其他功能完全不受影响
  - Console 中有来自子应用的错误但以 `[Wujie]` 前缀包裹
  - 主应用不因子应用异常而崩溃
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-027: 子应用容器卸载时正确清理资源

- **Priority**: P2
- **Type**: Integration
- **Precondition**: 子应用 Widget 已添加到桌面，子应用 dev server 已启动
- **Steps**:
  1. 进入编辑模式
  2. 删除桌面上的子应用 Widget
  3. 退出编辑模式
  4. 使用 DevTools > Memory 或 Performance 面板检查
  5. 检查 Network 面板是否有残留的 WebSocket 连接或轮询
  6. 检查 Elements 面板中对应的 iframe/容器 DOM 是否被移除
- **Expected Result**:
  - 子应用对应的 iframe/DOM 容器从文档中彻底移除
  - 子应用的事件监听器被正确移除（无泄露）
  - 子应用打开的网络连接（WebSocket、轮询等）被关闭
  - 多次添加/删除后内存无明显增长（无泄漏）
  - Console 中无 `[Wujie] destroy error` 或类似错误
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-028: 子应用 dev server 断开后重连恢复

- **Priority**: P2
- **Type**: Edge Case
- **Precondition**: 子应用 Widget 已添加到桌面，子应用 dev server 正在运行
- **Steps**:
  1. 子应用 Widget 在桌面正常渲染
  2. 手动停止子应用 dev server
  3. 观察主应用中该 Widget 的表现
  4. 重新启动子应用 dev server
  5. 刷新主应用页面并完成登录
  6. 再次观察 Widget 状态
- **Expected Result**:
  - 停止 dev server 后，Widget 容器显示加载失败或断开提示
  - 主应用其他功能不受影响
  - 重启 dev server 并刷新后，Widget 恢复正常
  - Console 中有连接断开的 warning
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-029: 子应用间通信隔离性

- **Priority**: P3
- **Type**: Security / Edge Case
- **Precondition**: 至少 2 个子应用的 Widget 同时添加到了桌面，子应用 dev server 已启动
- **Steps**:
  1. 添加子应用 A 的 Widget 和子应用 B 的 Widget 到桌面
  2. 在 Console 中尝试从子应用 A 的 iframe 访问子应用 B 的 window 对象
  3. 验证各子应用是否在隔离沙箱中运行
  4. 修改子应用 A 的全局变量，检查是否影响子应用 B
- **Expected Result**:
  - 子应用 A 和 B 的 JavaScript 执行环境互相隔离
  - 子应用的全局变量、localStorage、sessionStorage 互不影响
  - 子应用的 CSS 样式不互相污染
  - 子应用无法访问主应用的内部状态（除非通过显式 API）
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-030: 子应用预加载机制

- **Priority**: P3
- **Type**: Functional
- **Precondition**: PLUGINS.json 中某子应用配置了 `preload: true`，子应用 dev server 已启动
- **Steps**:
  1. 启动主应用 dev server
  2. 刷新页面并完成登录
  3. 在 Network 面板中观察：在用户还未添加该子应用 Widget/App 之前，是否已经发起了对该子应用的预加载请求
  4. 之后添加该子应用 Widget 到桌面
  5. 对比预加载和未预加载子应用的首次渲染速度
- **Expected Result**:
  - 登录后预加载子应用的资源请求已在后台发起
  - 首次添加预加载子应用的 Widget 时渲染明显更快
  - 预加载不阻塞主应用启动
  - 若预加载失败，不影响主应用正常运行
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

## 五、集成与边缘场景

### TC-007-031: 反向代理正确转发 /tpl-desktop-plugin-demo 请求到 127.0.0.1:5273

- **Priority**: P3
- **Type**: Integration
- **Precondition**: vite.config.js 中配置了 `/tpl-desktop-plugin-demo` → `http://127.0.0.1:5273` 的 proxy，子应用 dev server 已启动
- **Steps**:
  1. 启动主应用 dev server + 子应用 dev server
  2. 在浏览器中直接访问 `http://localhost:5173/tpl-desktop-plugin-demo/`（主应用 dev server 地址下的子应用路径）
  3. 在 Network 面板中检查请求头和响应头
  4. 验证 `changeOrigin` 是否生效（请求头 Host 是否被改写）
  5. 测试子应用的静态资源（JS、CSS、图片）是否能通过代理正确加载
- **Expected Result**:
  - 访问 `/tpl-desktop-plugin-demo/` 返回子应用的内容（200 OK）
  - 子应用的 JS bundle、CSS、图片等静态资源通过代理正确加载
  - `changeOrigin: true` 生效，后端收到的 Host 头为目标地址
  - 无 CORS 错误
  - WebSocket（如有，HMR）通过代理正常工作
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-032: 子应用独立调试入口 index.html 能正常运行

- **Priority**: P3
- **Type**: Functional
- **Precondition**: 子应用项目有自己的 `index.html` 入口文件，子应用 dev server 已启动
- **Steps**:
  1. 直接在浏览器打开 `http://127.0.0.1:5273`（子应用 dev server 地址）
  2. 观察子应用是否能脱离主应用独立运行
  3. 测试子应用的所有功能：Widget 渲染、App 模式、Background 模式
  4. 打开 Console 检查是否有依赖主应用的报错
- **Expected Result**:
  - 子应用独立运行时能正常加载
  - 子应用的所有功能（Widget/App/Background）均可在独立模式下展示
  - Console 中无缺失主应用上下文的致命报错
  - 子应用能优雅处理主应用 API 缺失的情况（mock 或降级）
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-033: 子应用响应主应用的主题切换

- **Priority**: P2
- **Type**: Integration
- **Precondition**: 子应用 Widget 已添加到桌面，子应用 dev server 已启动，主应用当前为浅色主题
- **Steps**:
  1. 进入编辑模式
  2. 点击 "主题" 按钮切换为深色主题
  3. 退出编辑模式
  4. 观察子应用 Widget 的样式变化
  5. 重复切换浅色/深色主题
- **Expected Result**:
  - 子应用 Widget 跟随主应用主题切换（如有适配）
  - 子应用通过主应用传递的主题变量更新自身样式
  - 切换过程平滑无闪烁
  - 若子应用未适配深色主题，至少不出现样式错乱
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-034: 子应用响应主应用的字体缩放

- **Priority**: P3
- **Type**: Integration
- **Precondition**: 子应用 Widget 已添加到桌面，子应用使用相对字体单位（rem/em），主应用字号为默认 16px
- **Steps**:
  1. 进入编辑模式
  2. 点击 "字号" → "➕ 加大" 数次（如加大到 22px）
  3. 退出编辑模式
  4. 观察子应用 Widget 内的文本大小变化
- **Expected Result**:
  - 子应用 Widget 内的文本跟随主应用字号变化
  - 使用 rem 单位的元素正确响应根元素 font-size 变化
  - 字号变化不导致子应用布局错乱
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-035: 子应用在 Swiper 多页面切换中保持状态

- **Priority**: P2
- **Type**: Integration
- **Precondition**: 桌面有多个页面，第 1 页和第 2 页各有一个子应用 Widget
- **Steps**:
  1. 在第 1 页添加子应用 Widget A
  2. 滑动到第 2 页，添加子应用 Widget B
  3. 来回滑动第 1 页和第 2 页多次
  4. 每次切回时观察 Widget 状态
  5. 检查是否有不必要的重新加载或闪烁
- **Expected Result**:
  - 切回原页面时，子应用 Widget 状态保持（非重新初始化）
  - 保活子应用切换时不触发重新加载
  - 非保活子应用在页面不可见时暂停活性（如收到 grid-deactive 事件）
  - 切换过程无闪烁或白屏
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

### TC-007-036: 子应用资源跨域访问正确配置

- **Priority**: P3
- **Type**: Edge Case
- **Precondition**: 子应用使用了跨域资源（如外部 CDN 字体、第三方 API），子应用 dev server 已启动
- **Steps**:
  1. 添加子应用 Widget 到桌面
  2. 在 Network 面板检查子应用发出的所有网络请求
  3. 检查是否有被浏览器拦截的 CORS 请求
  4. 检查 Console 中的 CORS 相关错误
- **Expected Result**:
  - 子应用通过主应用代理访问自身资源时无 CORS 错误
  - 子应用访问外部 CDN 资源时，若 CDN 支持 CORS，请求成功
  - 子应用内 fetch/XHR 请求按预期工作（通过 wujie 的 fetch 代理或直接请求）
  - 无因跨域导致的资源加载失败或功能异常
- **Actual Result**: (测试时填写)
- **Status**: PASS / FAIL / SKIP

---

## 附录 A: 测试环境要求

| 组件 | 版本/配置 | 说明 |
|------|-----------|------|
| Node.js | ≥18 | 运行环境 |
| pnpm | ≥8 | 包管理器 |
| 主应用 dev server | `pnpm dev` → localhost:5173 | Vite 开发服务器 |
| 子应用 dev server | `127.0.0.1:5273` | 子应用独立开发服务器 |
| 浏览器 | Chrome/Edge 最新版 | 需 DevTools 支持 |
| PLUGINS.json | `public/PLUGINS.json` | 子应用配置文件 |
| localStorage | 可清空 | 测试前建议清空以模拟首次加载 |

## 附录 B: 优先级定义

| 优先级 | 含义 | 阻塞发布？ |
|--------|------|-----------|
| P1 | 核心功能，必须全部通过 | 是 |
| P2 | 重要功能 / 边界场景 | 否（但必须在发布前修复） |
| P3 | 边缘场景 / 优化验证 | 否 |

## 附录 C: 状态定义

| 状态 | 含义 |
|------|------|
| PASS | 测试通过，实际结果与预期一致 |
| FAIL | 测试失败，实际结果与预期不符（需附 Bug 编号） |
| SKIP | 测试跳过（需附原因：环境不可用 / 功能未实现 / 不适用） |

---

> **用例总数**: 36
> **P1 用例**: 14 (核心功能)
> **P2 用例**: 16 (重要功能与边界)
> **P3 用例**: 6 (边缘场景与优化)
