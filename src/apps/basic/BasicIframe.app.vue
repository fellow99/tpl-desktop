<script setup>
// ============================================================
// 401-app-basic-apps: 网页应用（BasicIframe）
// spec.md FR-006~FR-011：iframe 嵌入外部网页，根据容器实际大小
// 与网页内容尺寸（contentWidth/contentHeight）自动计算缩放比例。
//
// 缩放逻辑（FR-009）：
//   scaleX = containerWidth / contentWidth（两者均 > 0 时，否则为 1）
//   scaleY = containerHeight / contentHeight（两者均 > 0 时，否则为 1）
//   iframe 尺寸：scale 为 1 时使用 100%，否则使用 contentWidth/Height 像素值
// 样式（FR-010 / TC-004）：transform: scaleX() scaleY()，
//   transform-origin: top left，position: relative
//
// 响应式（plan §4 决策 3）：监听 window resize 重新计算，
// onBeforeUnmount 移除监听，无泄漏。
// Q-01：仅接收 props 渲染内容，可独立运行。
// ============================================================
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  // 网页地址（空值时回退默认演示地址，TC-003）
  url: { type: String, default: '' },
  // 网页内容原始宽度（px）
  contentWidth: { type: [Number, String], default: 1440 },
  // 网页内容原始高度（px）
  contentHeight: { type: [Number, String], default: 900 },
})

// 默认演示地址（test-cases.md TC-003：默认启动时 iframe src 为该地址）
const DEFAULT_URL = 'about:blank'

const iframeSrc = computed(() => props.url || DEFAULT_URL)

// 属性面板可能传入字符串数值，统一解析（plan Step 2：parseInt 处理）
const cw = computed(() => parseInt(props.contentWidth, 10) || 0)
const ch = computed(() => parseInt(props.contentHeight, 10) || 0)

// FR-011：容器 ref，获取实时尺寸
const container = ref(null)

const scaleX = ref(1)
const scaleY = ref(1)

// FR-008/FR-009：计算缩放比例（容器尺寸为 0 时保护回退为 1）
function calc() {
  const el = container.value
  const cwidth = el ? el.clientWidth : 0
  const cheight = el ? el.clientHeight : 0
  scaleX.value = cwidth > 0 && cw.value > 0 ? cwidth / cw.value : 1
  scaleY.value = cheight > 0 && ch.value > 0 ? cheight / ch.value : 1
}

// FR-009/FR-010/TC-004：iframe 尺寸 + transform 样式
const iframeStyle = computed(() => ({
  width: scaleX.value === 1 ? '100%' : `${cw.value}px`,
  height: scaleY.value === 1 ? '100%' : `${ch.value}px`,
  transform: `scaleX(${scaleX.value}) scaleY(${scaleY.value})`,
  transformOrigin: 'top left',
}))

// 内容尺寸配置变化时重新计算
watch([cw, ch], calc)

onMounted(() => {
  calc()
  window.addEventListener('resize', calc)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', calc)
})
</script>

<template>
  <div ref="container" class="BasicIframe">
    <!-- FR-006/FR-007：iframe 嵌入网页，src 绑定 url；sandbox + no-referrer 安全加固 -->
    <iframe
      class="clock-iframe"
      :src="iframeSrc"
      :style="iframeStyle"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      referrerpolicy="no-referrer"
    ></iframe>
  </div>
</template>

<style scoped lang="scss">
// 容器铺满宿主内容区，隐藏缩放溢出
.BasicIframe {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--desktop-bg-secondary);
}

// TC-004：position relative + transform（transform 值由内联样式注入）
.clock-iframe {
  position: relative;
  display: block;
  border: none;
}
</style>
