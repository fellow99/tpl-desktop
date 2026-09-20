<script setup>
// ============================================================
// 301-widget-basic-widgets: Markdown文字（BasicMarkdown）
// FR-012/013：使用 vue3-markdown 的 VMarkdownView 渲染 Markdown，
//   mode 控制渲染主题（light/dark）。
// C-04：通过 :deep(.markdown-body) 穿透第三方组件样式，
//   设置透明背景以适配深色主题（plan.md §6.4）。
// ============================================================
import { VMarkdownView } from 'vue3-markdown'
import 'vue3-markdown/dist/vue3-markdown.css'
import { DEFAULT_MARKDOWN } from './BasicMarkdown.widget.js'

defineProps({
  // Markdown 内容（默认值与元数据共享 DEFAULT_MARKDOWN，单一数据源）
  value: { type: String, default: DEFAULT_MARKDOWN },
  // 渲染主题（light/dark）
  mode: { type: String, default: 'light' },
})
</script>

<template>
  <div class="BasicMarkdown">
    <VMarkdownView class="markdown-view" :content="value" :mode="mode" />
  </div>
</template>

<style scoped lang="scss">
.BasicMarkdown {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--desktop-text-primary);
}

.markdown-view {
  width: 100%;
  height: 100%;
  overflow: auto;
}

// 穿透第三方样式：透明背景 + 跟随主题文字色（plan.md §6.4）
:deep(.markdown-body) {
  background: transparent;
  color: var(--desktop-text-primary);
}
</style>
