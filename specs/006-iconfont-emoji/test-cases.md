# 006-iconfont-emoji — 测试用例

> 需求编号: 006-iconfont-emoji
> 最后更新: 2026-07-20

## 测试范围

本模块为文档 + 图标替换类需求，测试聚焦于:
1. 文档完整性（对照表、宪法原则）
2. 图标替换正确性（语法检查 + 视觉回归）
3. 构建无回归

## TC-001: iconfont-emoji.md 对照表完整性

| 属性 | 值 |
|------|-----|
| **优先级** | P0 |
| **测试类型** | 文档检查 |
| **前置条件** | `public/ss-icon/demo_index.html` 存在 |

**步骤**:
1. 检查 `docs/iconfont-emoji.md` 文件存在
2. 统计表格行数（不含表头），应 >= 170
3. 抽样检查 5 个图标映射: home、user、close、check、plus
4. 验证每条记录三列均非空（中文、类名、emoji）

**预期结果**: 文件存在，>= 170 行，抽样映射正确，所有列非空

## TC-002: constitution.md 图标原则存在

| 属性 | 值 |
|------|-----|
| **优先级** | P0 |
| **测试类型** | 文档检查 |

**步骤**:
1. 读取 `specs/constitution.md`
2. 搜索「图标使用规范」条目
3. 确认条目中提到 iconfont / emoji 使用约束

**预期结果**: 存在「图标使用规范」条目，内容包含 iconfont 强制使用说明

## TC-003: Vue 组件无残留 emoji

| 属性 | 值 |
|------|-----|
| **优先级** | P0 |
| **测试类型** | 代码扫描 |

**步骤**:
1. 扫描以下文件中 Unicode emoji 字符:
   - `src/components/viewport/desktop-app-wrapper.vue`
   - `src/components/desktop/desktop-toolbar-main.vue`
   - `src/components/desktop/desktop-toolbar-edit.vue`
   - `src/components/desktop/desktop-statusbar.vue`
   - `src/components/desktop/desktop-app-list.vue`
   - `src/components/desktop/desktop-background-list.vue`
2. 排除注释行中的 emoji

**预期结果**: 模板内容中不再出现 Unicode emoji 字符（注释行除外）

## TC-004: iconfont CSS 引用正确

| 属性 | 值 |
|------|-----|
| **优先级** | P1 |
| **测试类型** | 静态分析 |

**步骤**:
1. 检查 `index.html` 中包含 `<link rel="stylesheet" href="./ss-icon/iconfont.css">`
2. 检查替换后的 Vue 文件中 `<span class="ss-icon ...">` 的类名均在 `docs/iconfont-emoji.md` 中有对应记录

**预期结果**: HTML 入口正确引入 CSS，所有图标类名有据可查

## TC-005: 构建通过

| 属性 | 值 |
|------|-----|
| **优先级** | P0 |
| **测试类型** | 构建验证 |

**步骤**:
1. 在项目根目录执行 `pnpm build`
2. 检查退出码和错误输出

**预期结果**: `pnpm build` 退出码为 0，无构建错误

## TC-006: 替换前后语义一致性

| 属性 | 值 |
|------|-----|
| **优先级** | P1 |
| **测试类型** | 审查 |

**步骤**:
1. 对比 FC-003 中的 emoji→class 映射表
2. 对每个替换点确认: emoji 语义 == 目标 iconfont 类名语义
3. 特别检查 `🎞️→ss-icon-file-video`（页面 → 视频文件图标，虽非完美但语义近似）、`🔢→ss-icon-font-colors`（字号 → 字体颜色图标）、`🗃️→ss-icon-archive`（桌面 → 存档图标）

**预期结果**: 所有映射语义合理，无意义的偏移
