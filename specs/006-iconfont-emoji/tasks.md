# 006-iconfont-emoji — 任务清单

> 需求编号: 006-iconfont-emoji
> 最后更新: 2026-07-20

## 任务依赖图

```
T1 (docs/iconfont-emoji.md)
  ├─→ T2 (constitution.md)
  └─→ T3-T8 (6 个 .vue 文件的 emoji 替换，全部并行)
         └─→ T9 (构建验证)
                └─→ T10 (Code Review)
```

## 任务列表

### T1: 创建 docs/iconfont-emoji.md

- **负责人**: orchestrator
- **优先级**: P0（阻塞 T3-T8）
- **预计工作量**: 1 次操作
- **描述**: 从 `public/ss-icon/demo_index.html` 的 Font class 区域提取全部约 170+ 图标对照数据，生成三列表格 `| 中文 | 类名 | emoji |`
- **产出**: `docs/iconfont-emoji.md`
- **验证**: 文件存在，表格行数 >= 170

### T2: 更新 specs/constitution.md

- **负责人**: orchestrator
- **优先级**: P0
- **预计工作量**: 1 次操作
- **描述**: 在编码规范章节新增「图标使用规范」条目，规定代码中使用 iconfont（不用 emoji），文档中使用 emoji
- **产出**: `specs/constitution.md` 更新
- **验证**: 文件中存在「图标使用规范」条目

### T3: 替换 desktop-app-wrapper.vue 中的 emoji

- **依赖**: T1
- **优先级**: P1
- **描述**: 将 L28 的 ➖ 替换为 `<span class="ss-icon ss-icon-minus"></span>`，L29 的 ❌ 替换为 `<span class="ss-icon ss-icon-close"></span>`
- **产出**: 更新后的 `src/components/viewport/desktop-app-wrapper.vue`

### T4: 替换 desktop-toolbar-main.vue 中的 emoji

- **依赖**: T1
- **优先级**: P1
- **描述**: L49 🏠 → `<span class="ss-icon ss-icon-home"></span>`
- **产出**: 更新后的 `src/components/desktop/desktop-toolbar-main.vue`

### T5: 替换 desktop-toolbar-edit.vue 中的 emoji

- **依赖**: T1
- **优先级**: P1
- **描述**: 替换约 11 处 emoji:
  - L53 🖼️→ss-icon-image
  - L59 ➕→ss-icon-plus
  - L65 🎨→ss-icon-bg-colors
  - L72 🎞️→ss-icon-file-video
  - L77 ↖️→ss-icon-arrow-left
  - L78 ↗️→ss-icon-arrow-rise
  - L80 ❌→ss-icon-close
  - L89 🔢→ss-icon-font-colors
  - L94 ➕→ss-icon-plus
  - L95 ➖→ss-icon-minus
  - L96 🔄→ss-icon-sync
  - L105 ✔️→ss-icon-check
- **产出**: 更新后的 `src/components/desktop/desktop-toolbar-edit.vue`

### T6: 替换 desktop-statusbar.vue 中的 emoji

- **依赖**: T1
- **优先级**: P1
- **描述**: L72 ✔️→ss-icon-check, 🗃️→ss-icon-archive, L78 👤→ss-icon-user
- **产出**: 更新后的 `src/components/desktop/desktop-statusbar.vue`

### T7: 替换 desktop-app-list.vue 中的 emoji

- **依赖**: T1
- **优先级**: P1
- **描述**: L183 📌→ss-icon-pushpin, 🔘→ss-icon-apps, L185 ❌→ss-icon-close
- **产出**: 更新后的 `src/components/desktop/desktop-app-list.vue`

### T8: 替换 desktop-background-list.vue 中的 emoji

- **依赖**: T1
- **优先级**: P1
- **描述**: L133 ✓→ss-icon-check
- **产出**: 更新后的 `src/components/desktop/desktop-background-list.vue`

### T9: 构建验证

- **依赖**: T1, T2, T3-T8
- **优先级**: P1
- **描述**: 运行 `pnpm build` 确认所有更改不破坏构建
- **产出**: 构建成功的终端输出

### T10: Code Review

- **依赖**: T9
- **优先级**: P1
- **描述**: 使用 `requesting-code-review` + `receiving-code-review` 对全部变更进行审查
- **产出**: `logs/YYYYMMDD-N/REVIEW_REPORT.md`
