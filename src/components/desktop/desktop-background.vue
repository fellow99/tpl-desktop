<script setup>
// ============================================================
// 004-background-system: 桌面背景渲染层（desktop-background）
//
// 职责（spec.md FR-015-21~24）：
//   - 读取 desktopConfig.background（{ type, name, title, category }，
//     overall-data-model.md §1.7），按 name 从 backgroundMetas 解析
//     实际资源（image / video 路径，§1.5）
//   - type='image' → <img>；type='video' → <video autoplay loop muted playsinline>
//   - 均以 object-fit: cover 铺满视口（FR-015-23）
//   - 切换背景时通过 <Transition> opacity 渐变平滑过渡（FR-015-24，300ms）
//   - background 为 null 或 name 未注册时不渲染任何层，
//     露出页面主题默认底色（--desktop-bg-primary）
//
// 层级：位于桌面视口之下（z-index 0），pointer-events: none
// 不拦截任何交互。
// ============================================================
import { computed } from 'vue'
import { useBackgroundMetas } from '../../composables/useBackgroundMetas.js'

const props = defineProps({
  // 当前桌面背景配置（DesktopConfig.background），null 表示未设置
  background: { type: Object, default: null },
})

const { backgroundMetas } = useBackgroundMetas()

// name → 元数据 → 实际资源解析；任一环节缺失均回退 null（主题默认底色）
const resolved = computed(() => {
  const bg = props.background
  if (!bg || !bg.name) return null
  const meta = backgroundMetas.value[bg.name]
  if (!meta) {
    console.warn(`[desktop-background] 背景 "${bg.name}" 未注册，回退主题默认底色`)
    return null
  }
  const type = meta.type === 'video' ? 'video' : 'image'
  const url = type === 'video' ? meta.video : meta.image
  if (!url) return null
  return { key: meta.name, type, url }
})
</script>

<template>
  <div class="desktop-background" aria-hidden="true">
    <!-- key 变化触发进出场，双层同时存在实现 opacity 交叉渐变（FR-015-24） -->
    <transition name="bg-fade">
      <div v-if="resolved" :key="resolved.key" class="background-layer">
        <video
          v-if="resolved.type === 'video'"
          class="background-media"
          :src="resolved.url"
          autoplay
          loop
          muted
          playsinline
        ></video>
        <img v-else class="background-media" :src="resolved.url" alt="" />
      </div>
    </transition>
  </div>
</template>

<style scoped lang="scss">
.desktop-background {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  // 背景层不拦截桌面交互
  pointer-events: none;
}

.background-layer {
  position: absolute;
  inset: 0;
}

.background-media {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

// 背景切换 300ms 内完成视觉过渡（NFR）
.bg-fade-enter-active,
.bg-fade-leave-active {
  transition: opacity 0.3s ease;
}

.bg-fade-enter-from,
.bg-fade-leave-to {
  opacity: 0;
}
</style>
