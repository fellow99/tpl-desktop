// ============================================================
// 301-widget-basic-widgets: Markdown文字（BasicMarkdown）元数据
// FR-024 完整字段 / C-03 属性元数据
// value 使用 type: 'markdown' → 属性编辑器触发 VMarkdownEditor
// （006-prop-editor，round 9 接入）
// DEFAULT_MARKDOWN 为共享默认值：.widget.vue 的 defineProps default
// 与元数据 default 保持单一数据源。
// ============================================================
import avatar from './avatar.svg'

export const DEFAULT_MARKDOWN = `# Markdown 示例

这是一段 **Markdown** 富文本内容。

- 支持标题、加粗、*斜体*
- 支持列表与 \`行内代码\`

> 支持引用块
`

export default {
  title: 'Markdown文字',
  category: '3.基础组件',
  avatar,
  thumbnail: null,
  rect: { unit: 'grid', width: 3, height: 2 },
  props: {
    value: {
      title: 'Markdown 内容',
      category: '看板组件配置',
      type: 'markdown',
      default: DEFAULT_MARKDOWN,
    },
    mode: {
      title: '渲染主题',
      category: '看板组件配置',
      default: 'light',
    },
  },
  // Q-02：预留扩展点，保持空数组
  events: [],
  propsEditors: [],
  wrapperEditors: [],
}
