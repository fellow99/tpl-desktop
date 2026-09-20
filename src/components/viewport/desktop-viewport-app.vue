<script setup>
// ============================================================
// 003-app-system: App 渲染图层（desktop-viewport-app）
//
// 契约（spec.md FR-012~FR-016 / overall-plan.md §3.4）：
//   Props : apps — Desktop.vue 注入的 desktopApps
//           （元素结构见 overall-data-model.md §1.8：
//             { compName, compId?, appMeta, wrapperValues, state }）
//   Emits : minimize-app(app) — 外壳最小化按钮
//           remove-app(app)   — 外壳关闭按钮
//
// 层级（z-layering）：背景(0) < 视口(1) < App 叠加层(本层)。
// 图层自身 pointer-events: none，仅 App 实例可交互，
// 无 App / 全部最小化时不遮挡桌面操作。
//
// 状态渲染（§1.8 state）：
//   null        → 常规全屏渲染（desktop-app-wrapper 包裹）
//   'minimize'  → CSS 隐藏（opacity 0 + translateY），实例保活不销毁
//
// App 实例创建/销毁由 Vue 响应式 v-for 自动管理（spec.md §9.2/§9.3）；
// 本层非 GridStack 容器，不适用 P-04 的 h()+render() 约束。
// ============================================================
import { AppComponents } from '../../apps/index.js'

defineProps({
  // 当前打开的 App 实例列表（desktopApps）
  apps: { type: Array, default: () => [] },
})

const emit = defineEmits(['minimizeApp', 'removeApp'])

// App 初始 props：从 appMeta.props 提取 default 值
// （R3 决策 4：应用市场配置值注入在 props.xxx.default 中）
function appProps(app) {
  const values = {}
  for (const [key, propMeta] of Object.entries(app.appMeta?.props || {})) {
    values[key] = propMeta?.default
  }
  return values
}

// v-for key：Desktop.vue 注入的稳定实例标识 instanceId
// （回退 compId → compName，不使用索引避免增删导致实例错位复用）
function appKey(app) {
  return app.instanceId || app.compId || app.compName
}
</script>

<template>
  <div class="desktop-viewport-app">
    <!-- FR-015：每个 App 实例为独立 div + desktop-app-wrapper 全屏最大化 -->
    <div
      v-for="app in apps"
      :key="appKey(app)"
      class="app-instance"
      :class="{ 'is-minimized': app.state === 'minimize' }"
    >
      <desktop-app-wrapper
        :title="app.wrapperValues?.title || app.appMeta?.title || app.compName"
        :hideHeader="true"
        @minimize="emit('minimizeApp', app)"
        @close="emit('removeApp', app)"
      >
        <component
          :is="AppComponents[app.compName]"
          v-if="AppComponents[app.compName]"
          v-bind="appProps(app)"
        />
        <div v-else class="app-missing">App「{{ app.compName }}」未找到</div>
      </desktop-app-wrapper>
    </div>
  </div>
</template>

<style scoped lang="scss">
// 覆盖整个桌面视口区域；图层自身不拦截交互
.desktop-viewport-app {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

// 全屏最大化充满图层；后打开的 App 在最上层（DOM 顺序天然保证）
.app-instance {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s ease, transform 0.3s ease;

  // §1.8 'minimize'：隐藏但保活（opacity 0 + translateY）
  &.is-minimized {
    opacity: 0;
    transform: translateY(60px);
    pointer-events: none;
  }
}

.app-missing {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--desktop-text-secondary);
}
</style>
