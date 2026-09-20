# 规格文档索引

**项目名称：** tpl-desktop 工作台
**版本：** 0.1.0
**技术栈：** Vue 3 + Vite 7 + GridStack.js v11 + Swiper + Element Plus + Sass
**文档生成时间：** 2026-07-19
**最后更新：** 2026-07-20

---

## 一、文档总览

| 层级 | 分类 | 文档数量 | 说明 |
|------|------|---------|------|
| 整体 | 项目级顶层文档 | 6 | 架构、技术、宪法、结构、API 清单等全局文档 |
| 整体 | 整体规格文档 | 5 | overall-* 系列文档 |
| 模块 | 核心框架 & 系统集成（001〜011） | 22 | 桌面框架、Widget 系统、App 系统、背景、主题、图标库、认证 |
| 模块 | 编辑器组件（101） | 3 | 属性编辑器 |
| 模块 | 页面入口（201） | 3 | 桌面入口页启动链 |
| 模块 | 业务组件（301〜401） | 6 | 基础小部件、基础应用 |
| **合计** | **11 目录 / 45 文件** | | |

---

## 二、项目级顶层文档

全局性的架构、技术、宪法等文档，定义项目基线和开发准则。

| 文档 | 路径 | 说明 |
|------|------|------|
| **方案总纲** | [ARCHITECTURE.md](./ARCHITECTURE.md) | 系统整体架构设计、分层图、数据流 |
| **技术选型** | [TECH.md](./TECH.md) | 核心技术栈选型理由、版本、依赖说明 |
| **宪法原则** | [constitution.md](./constitution.md) | 项目开发原则、编码规范、治理规则 |
| **项目结构** | [STRUCTURE.md](./STRUCTURE.md) | 源码目录结构、路由清单、组件清单 |
| **API 清单** | [API.md](./API.md) | 全量 API 接口清单 |
| **检查清单** | [SPECS_CHECKLIST.md](./SPECS_CHECKLIST.md) | 规格文档完成度追踪 |

### 整体规格文档

描述跨模块的全局规格、方案和数据模型。

| 文档 | 路径 | 说明 |
|------|------|------|
| **整体规格** | [overall-spec.md](./overall-spec.md) | 系统级功能规格 |
| **整体方案** | [overall-plan.md](./overall-plan.md) | 系统级技术方案 |
| **数据模型** | [overall-data-model.md](./overall-data-model.md) | 全局数据实体定义 |
| **接口模型** | [overall-api.md](./overall-api.md) | 全局 API 规范与模块间契约 |
| **测试用例索引** | [overall-test-cases.md](./overall-test-cases.md) | 全模块测试用例总览索引（262 条） |

> 注：仅列出实际生成的文档，未生成的文档不在此表中。

---

## 三、核心框架 & 系统集成（001〜011）

### 001 — 桌面框架（Desktop Framework）

> 工作台核心编排层，负责多页面桌面的结构骨架：页面导航（Swiper）、网格布局引擎（GridStack.js）、编辑/浏览双模式切换、工具栏与状态栏 chrome，以及桌面配置的加载、合并与持久化。

| 文档 | 链接 | 说明 |
|------|------|------|
| 功能规格 | [001-desktop-framework/spec.md](./001-desktop-framework/spec.md) | 桌面框架功能规格 |
| 技术方案 | [001-desktop-framework/plan.md](./001-desktop-framework/plan.md) | 桌面框架技术实现方案 |
| 测试用例 | [001-desktop-framework/test-cases.md](./001-desktop-framework/test-cases.md) | 桌面框架 UI 功能测试用例 |

### 002 — 小部件系统（Widget System）

> Widget 核心扩展框架，定义元数据驱动的小部件注册、发现、展示和实例化机制。基于 `import.meta.glob` 自动扫描注册，零手动维护。提供 Widget 添加面板、容器外壳和预览系统。

| 文档 | 链接 | 说明 |
|------|------|------|
| 功能规格 | [002-widget-system/spec.md](./002-widget-system/spec.md) | 小部件系统功能规格 |
| 技术方案 | [002-widget-system/plan.md](./002-widget-system/plan.md) | 小部件系统技术实现方案 |
| 测试用例 | [002-widget-system/test-cases.md](./002-widget-system/test-cases.md) | 小部件系统 UI 功能测试用例 |

### 003 — App 应用系统（App System）

> 全屏叠加运行的独立应用能力。与嵌入网格的 Widget 不同，App 以全屏覆盖层形式渲染在桌面之上，拥有独立标题栏、最小化/恢复/关闭操作，支持应用市场和快捷方式。

| 文档 | 链接 | 说明 |
|------|------|------|
| 功能规格 | [003-app-system/spec.md](./003-app-system/spec.md) | App 应用系统功能规格 |
| 技术方案 | [003-app-system/plan.md](./003-app-system/plan.md) | App 应用系统技术实现方案 |
| 测试用例 | [003-app-system/test-cases.md](./003-app-system/test-cases.md) | App 应用系统 UI 功能测试用例 |

### 004 — 桌面背景系统（Background System）

> 提供可更换的桌面视觉背景层，支持图片和视频背景，按浅色系/暗色系/动态分类浏览（embla-carousel 轮播），背景选择结果持久化到桌面配置。

| 文档 | 链接 | 说明 |
|------|------|------|
| 功能规格 | [004-background-system/spec.md](./004-background-system/spec.md) | 桌面背景系统功能规格 |
| 技术方案 | [004-background-system/plan.md](./004-background-system/plan.md) | 桌面背景系统技术实现方案 |
| 测试用例 | [004-background-system/test-cases.md](./004-background-system/test-cases.md) | 桌面背景系统 UI 功能测试用例 |

### 005 — 主题系统（Theme System）

> 基于 CSS 自定义属性（`--desktop-*`）的浅色/深色双主题切换。通过 `html.dark` 类名驱动全界面同步切换，含反闪烁（Anti-FOUC）内联脚本、Element Plus 暗色集成、系统偏好自动跟随和字体缩放。

| 文档 | 链接 | 说明 |
|------|------|------|
| 功能规格 | [005-theme-system/spec.md](./005-theme-system/spec.md) | 主题系统功能规格 |
| 技术方案 | [005-theme-system/plan.md](./005-theme-system/plan.md) | 主题系统技术实现方案 |
| 测试用例 | [005-theme-system/test-cases.md](./005-theme-system/test-cases.md) | 主题系统 UI 功能测试用例 |

### 006 — 图标库（Iconfont & Emoji）

> 集成 ss-icon iconfont 图标库，建立 271 个图标与 CSS 类名的对照体系，将源代码中的 Unicode emoji 替换为统一的 iconfont 类名，确保跨平台视觉一致性。同时制定图标使用规范：代码用 iconfont，文档用 emoji。

| 文档 | 链接 | 说明 |
|------|------|------|
| 功能规格 | [006-iconfont-emoji/spec.md](./006-iconfont-emoji/spec.md) | 图标库功能规格 |
| 技术方案 | [006-iconfont-emoji/plan.md](./006-iconfont-emoji/plan.md) | 图标库技术实现方案 |
| 任务清单 | [006-iconfont-emoji/tasks.md](./006-iconfont-emoji/tasks.md) | 图标库任务拆解 |
| 测试用例 | [006-iconfont-emoji/test-cases.md](./006-iconfont-emoji/test-cases.md) | 图标库测试用例 |
| **图标对照表** | [../docs/iconfont-emoji.md](../docs/iconfont-emoji.md) | 271 条图标中文 ↔ 类名 ↔ emoji 对照 |

### 011 — 模拟认证（Auth Mock）

> 纯前端无后端依赖的登录认证能力。RSA 加密传输密码，后端认证中心不可达时自动降级到本地模拟用户验证。支持登录状态跨会话持久化和登出清除。

| 文档 | 链接 | 说明 |
|------|------|------|
| 功能规格 | [011-auth-mock/spec.md](./011-auth-mock/spec.md) | 模拟认证功能规格 |
| 技术方案 | [011-auth-mock/plan.md](./011-auth-mock/plan.md) | 模拟认证技术实现方案 |
| 测试用例 | [011-auth-mock/test-cases.md](./011-auth-mock/test-cases.md) | 模拟认证 UI 功能测试用例 |

---

## 四、编辑器组件（101）

### 101 — 属性编辑器（Property Editor）

> 统一的 Widget 属性可视化编辑体验。右侧滑出抽屉面板，根据 Widget 元数据 `props` 字段自动生成动态表单（类型映射驱动），支持编辑副本隔离和组件属性/外框属性双标签页。

| 文档 | 链接 | 说明 |
|------|------|------|
| 功能规格 | [101-prop-editor/spec.md](./101-prop-editor/spec.md) | 属性编辑器功能规格 |
| 技术方案 | [101-prop-editor/plan.md](./101-prop-editor/plan.md) | 属性编辑器技术实现方案 |
| 测试用例 | [101-prop-editor/test-cases.md](./101-prop-editor/test-cases.md) | 属性编辑器 UI 功能测试用例 |

---

## 五、页面入口（201）

### 201 — 桌面入口页（Page Index）

> 工作台系统唯一入口点，串联 HTML 文档 → JavaScript 运行时 → Vue 根组件的启动全链路。在页面级编排层中管理所有跨子系统状态、事件与生命周期，含反 FOUC、运行时配置注入、全局资源加载和全局组件自动注册。

| 文档 | 链接 | 说明 |
|------|------|------|
| 功能规格 | [201-page-index/spec.md](./201-page-index/spec.md) | 桌面入口页功能规格 |
| 技术方案 | [201-page-index/plan.md](./201-page-index/plan.md) | 桌面入口页技术实现方案 |
| 测试用例 | [201-page-index/test-cases.md](./201-page-index/test-cases.md) | 桌面入口页 UI 功能测试用例 |

---

## 六、业务组件（301〜401）

### 301 — 基础小部件（Basic Widgets）

> 工作台桌面内置的五种可视化内容展示 Widget：BasicText（纯文本）、BasicNumber（动画数字，@number-flow/vue）、BasicMarkdown（富文本，vue3-markdown）、BasicImage（图片，5 种 object-fit）、BasicVideo（视频，自动静音循环）。

| 文档 | 链接 | 说明 |
|------|------|------|
| 功能规格 | [301-widget-basic-widgets/spec.md](./301-widget-basic-widgets/spec.md) | 基础小部件功能规格 |
| 技术方案 | [301-widget-basic-widgets/plan.md](./301-widget-basic-widgets/plan.md) | 基础小部件技术实现方案 |
| 测试用例 | [301-widget-basic-widgets/test-cases.md](./301-widget-basic-widgets/test-cases.md) | 基础小部件 UI 功能测试用例 |

### 401 — 基础应用（Basic Apps）

> 工作台 App 系统的两个"开箱即用"基础应用：BasicClock（数字时钟，日期显示可配置）和 BasicIframe（iframe 嵌入外部网页，自适应缩放，安全沙箱隔离）。

| 文档 | 链接 | 说明 |
|------|------|------|
| 功能规格 | [401-app-basic-apps/spec.md](./401-app-basic-apps/spec.md) | 基础应用功能规格 |
| 技术方案 | [401-app-basic-apps/plan.md](./401-app-basic-apps/plan.md) | 基础应用技术实现方案 |
| 测试用例 | [401-app-basic-apps/test-cases.md](./401-app-basic-apps/test-cases.md) | 基础应用 UI 功能测试用例 |

---

## 七、模块编号一览

| 编号 | 模块名 | 英文名 | 分类 |
|------|--------|--------|------|
| 001 | 桌面框架 | Desktop Framework | 核心框架 |
| 002 | 小部件系统 | Widget System | 核心框架 |
| 003 | App 应用系统 | App System | 核心框架 |
| 004 | 桌面背景系统 | Background System | 核心框架 |
| 005 | 主题系统 | Theme System | 核心框架 |
| 006 | 图标库 | Iconfont & Emoji | 核心框架 |
| 011 | 模拟认证 | Auth Mock | 核心框架 |
| 101 | 属性编辑器 | Property Editor | 编辑器组件 |
| 201 | 桌面入口页 | Page Index | 页面入口 |
| 301 | 基础小部件 | Basic Widgets | 业务组件 |
| 401 | 基础应用 | Basic Apps | 业务组件 |

> 注：编号采用百位分组 — 0xx 核心框架/系统集成，1xx 编辑器组件，2xx 页面入口，3xx 业务组件（Widget），4xx 业务组件（App）。

---

## 八、模块文档结构规范

每个模块目录 `NNN-name/` 下包含以下标准文档：

| 文件 | 命名 | 说明 |
|------|------|------|
| 功能规格 | `spec.md` | 定义模块的功能需求、用户故事、验收标准 |
| 技术方案 | `plan.md` | 模块的技术实现方案、架构决策、组件设计 |
| 测试用例 | `test-cases.md` | 模块 UI 功能测试用例 |

> 如项目需要，模块目录还可扩展以下文档：
> - `tasks.md` — 开发任务拆解、依赖关系、里程碑
> - `api.md` — 模块涉及的 API 接口定义
> - `data-model.md` — 模块所需的实体、类型、枚举定义
> - `pages.md` — 模块包含的页面路由、组件树、交互流程

---

## 九、快速导航

| 目标读者 | 推荐阅读顺序 |
|---------|-------------|
| **新加入开发者** | constitution.md → STRUCTURE.md → overall-spec.md → 001-desktop-framework/spec.md → 201-page-index/spec.md |
| **架构师 / Tech Lead** | ARCHITECTURE.md → TECH.md → overall-plan.md → overall-api.md → overall-data-model.md |
| **前端开发** | STRUCTURE.md → API.md → 对应模块的 spec.md + plan.md |
| **测试 / QA** | SPECS_CHECKLIST.md → 各模块 test-cases.md |
| **产品经理** | overall-spec.md → 对应模块 spec.md |

---

**文档维护者：** tpl-desktop 开发团队
