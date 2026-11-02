# AGENTS.md — tpl-desktop（桌面工作台 · 前端门户）

> 本文件为本子工程（`tpl-desktop/`）的 AI Agent 工作规范，是父工程 `tpl-workspace/AGENTS.md` 在本工程的具体化。
> 所有规范均基于本工程实际存在的技能、README 与 specs 编写。

---

## 一、项目简介

tpl-desktop 是「tpl-workspace」整体平台的**前端门户**：多页面可视化桌面 Web 应用（仿桌面环境），
支持拖拽布局、多页面翻页、App 叠加运行、动态背景与深色模式。作为 **wujie 微前端宿主**，
通过 `public/PLUGINS.json` 加载插件子应用（如 `tpl-desktop-plugin-demo`）。

## 二、技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Vue 3.5 + Vite |
| 构建 | Vite + pnpm |
| 桌面布局 | GridStack.js 11 + Swiper 14 |
| 微前端 | wujie |
| 认证 | RSA 加密登录（后端不可达自动降级 mock） |
| 持久化 | localStorage（布局/小部件/主题/背景） |

## 三、代码结构

```
src/
├── composables/        # 组合函数（如 useWidgetMetas）
├── components/         # 桌面/窗口/小部件组件
├── views/              # 页面（多页面桌面，Swiper 翻页）
├── store/              # 状态（布局、主题、认证）
├── public/PLUGINS.json # wujie 插件子应用清单
└── ...
```
详细模块地图见 `README.md`（模块地图一节）。

## 四、规格文档（specs）

`specs/` 下存放规格：`001-desktop-framework`、`002-widget-system`、`003-app-system`、
`004-background-system`、`005-theme-system`、`006-iconfont-emoji`、`007-wujie-system`、
`011-auth-mock`、`101-prop-editor`、`201-page-index`。

## 五、常用开发命令

```bash
pnpm install
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产
pnpm preview      # 预览生产构建
```

## 六、代码库探索规范（codegraph）

本工程已配置 codegraph 代码地图（`.codegraph/` 索引），并在 git `post-commit` 钩子中
自动增量更新（`codegraph sync`）。

- **提交后**无需手动操作，索引自动与 HEAD 保持同步。
- **探索代码**优先使用 codegraph，而非 grep/Read 循环：
  - `codegraph status` — 检查索引状态
  - `codegraph context "<任务>"` — 生成任务相关代码简报
  - `codegraph query <符号>` — 查找符号定义
  - `codegraph callers <符号>` / `codegraph callees <符号>` — 调用关系
  - `codegraph impact <符号>` — 变更影响范围（重构前必查）
  - `codegraph files --filter <目录>` — 索引文件树
- 索引过期（切换分支/外部 pull）时手动 `codegraph sync` 增量更新。
- `codegraph` 查询不到时先 `sync` 再重查；确属 codegraph 不支持的语法（如 SFC `<script setup>` 细节）才回退 grep。

> 索引目录 `.codegraph/` 已在 `.gitignore` 排除，不入库。

## 七、Git 提交规范

遵循父工程 `tpl-workspace/AGENTS.md` 的 Conventional Commits 规范，提交前加载 `git-commit` 技能。

## 八、开发流程与技能

- Vue 前端开发遵循父工程开发流程（`specs-based-devflow`、`frontend-design`、`requesting-code-review`、`systematic-debugging`）。
- 涉及 wujie 微前端与插件加载的改动，务必同时核对宿主（本工程）与子应用（`tpl-desktop-plugin-demo`）契约。
- 代码库探索一律走 **codegraph**（见第六节）。

---

> 维护者：fellow99 · 属「tpl-workspace 多端业务应用框架」
