<script setup>
// ============================================================
// 201-page-index: 底部主工具条（desktop-toolbar-main）
//
// 契约（plan.md §6 / spec.md §3.3/§3.8 / tasks T006）：
//   Props : shortcuts — desktopConfig.shortcuts（[{ compName, appMeta, compId? }]）
//           apps      — desktopApps 运行中 App 实例（§1.8）
//   Emits : enterEdit                            — 最右侧：编辑桌面（进入编辑模式）
//           home                                — 主页（FR-036/037）
//           show-app-list                       — App 列表入口
//           add-app({compName, compId, appMeta})— 点击快捷方式打开 App
//           toggle-app-state(app)               — 点击运行中 App 最小化↔恢复
//           close-app(app)                      — 运行中 App 关闭按钮
//   交互  : fixed 底部居中，常态露出 1em 高度便于触发；
//           mouseenter / click / touchstart → 动画显示；
//           mouseleave 后 5s → 动画隐藏（避免 CSS :hover 抖动）
// ============================================================
import { ref, computed, onBeforeUnmount } from 'vue'

const props = defineProps({
  // 快捷方式列表（持久化于 desktopConfig.shortcuts，FR-016）
  shortcuts: { type: Array, default: () => [] },
  // 当前运行中的 App 实例（不持久化，overall-data-model.md §1.8）
  apps: { type: Array, default: () => [] },
})

const emit = defineEmits(['enterEdit', 'home', 'showAppList', 'addApp', 'toggleAppState', 'closeApp'])

// ==================== R2: shortcutsRef / appsRef 计算属性（交叉去重） ====================

// shortcutsRef: shortcuts 与 apps 交叉 —— shortcut + App 实例的 state 属性
// 有 state → 该 App 已实例化运行，显示绿点
const shortcutsRef = computed(() => {
  return props.shortcuts.map((shortcut) => {
    const app = props.apps.find((a) =>
      shortcut.compId && a.compId ? a.compId === shortcut.compId : a.compName === shortcut.compName,
    )
    return app ? { ...shortcut, state: app.state } : { ...shortcut }
  })
})

// appsRef: apps 中不在 shortcuts 里的实例（已在 shortcutsRef 显示的实例不重复出现）
const appsRef = computed(() => {
  return props.apps.filter((app) => {
    return !props.shortcuts.some((s) =>
      app.compId && s.compId ? s.compId === app.compId : s.compName === app.compName,
    )
  })
})

// ==================== 工具条显隐（JS 驱动，避免 CSS :hover 抖动） ====================

const visible = ref(false)
let hideTimer = null

const HIDE_DELAY = 5000 // 鼠标移出后 5s 自动隐藏

function showToolbar() {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  visible.value = true
}

function scheduleHide() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => { visible.value = false }, HIDE_DELAY)
}

onBeforeUnmount(() => {
  if (hideTimer) clearTimeout(hideTimer)
})

// ==================== App 交互 ====================

// 常驻 App 点击（shortcutsRef 区域）：
//   先查 props.apps 是否存在匹配实例 → 存在则 toggleMinimize，不存在则启动
function onShortcutClick(shortcut) {
  if (!shortcut?.compName) return
  const existingApp = props.apps.find((a) =>
    shortcut.compId && a.compId ? a.compId === shortcut.compId : a.compName === shortcut.compName,
  )
  if (existingApp) {
    emit('toggleAppState', existingApp)
  } else {
    emit('addApp', {
      compName: shortcut.compName,
      compId: shortcut.compId,
      appMeta: shortcut.appMeta,
    })
  }
}

// 当前活动 App 点击（appsRef 区域）：实例必然存在于 props.apps，直接 toggle
function onRunningAppClick(app) {
  if (app) emit('toggleAppState', app)
}

// App 图标解析：thumbnail → avatar → 标题首字回退
function appIcon(meta) {
  return meta?.thumbnail || meta?.avatar || ''
}

function appInitial(meta, compName) {
  return (meta?.title || compName || '?').slice(0, 1)
}
</script>

<template>
  <div
    class="desktop-toolbar-main"
    :class="{ 'is-visible': visible }"
    @mouseenter="showToolbar"
    @mouseleave="scheduleHide"
    @touchstart="showToolbar"
    @click="showToolbar"
  >
    <div class="toolbar-body">
      <!-- 主页（FR-036/037：回首页 + 最小化所有 App） -->
      <button class="toolbar-item" type="button" title="主页" @click="emit('home')">
        <span class="item-icon"><span class="ss-icon ss-icon-home"></span></span>
        <span class="item-label">主页</span>
      </button>

      <!-- App 列表入口 -->
      <button class="toolbar-item" type="button" title="App 列表" @click="emit('showAppList')">
        <span class="item-icon">⊞</span>
        <span class="item-label">App</span>
      </button>

      <!-- ② 常驻 App（shortcutsRef：shortcuts 交叉 apps，附带 state 属性） -->
      <template v-if="shortcutsRef.length">
        <span class="toolbar-divider"></span>
        <button
          v-for="item in shortcutsRef"
          :key="item.compId || item.compName"
          class="toolbar-item toolbar-running"
          :class="{ 'is-minimized': item.state === 'minimize' }"
          :title="item.state !== undefined ? (item.state === 'minimize' ? '恢复' : '最小化') : `打开 ${item.appMeta?.title || item.compName}`"
          @click="onShortcutClick(item)"
        >
          <span class="item-icon">
            <img v-if="appIcon(item.appMeta)" :src="appIcon(item.appMeta)" alt="" />
            <span v-else class="icon-fallback">{{ appInitial(item.appMeta, item.compName) }}</span>
          </span>
          <span class="item-label">{{ item.appMeta?.title || item.compName }}</span>
          <!-- R2: 绿点 — state !== undefined 表示已实例化 -->
          <span v-if="item.state !== undefined" class="running-dot running-dot--green"></span>
        </button>
      </template>

      <!-- ③ 当前活动 App（appsRef：apps 中不在 shortcuts 里的实例） -->
      <template v-if="appsRef.length">
        <span class="toolbar-divider"></span>
        <button
          v-for="app in appsRef"
          :key="app.instanceId || app.compId || app.compName"
          class="toolbar-item toolbar-running"
          :class="{ 'is-minimized': app.state === 'minimize' }"
          :title="app.state === 'minimize' ? '恢复' : '最小化'"
          @click="onRunningAppClick(app)"
        >
          <span class="item-icon">
            <img v-if="appIcon(app.appMeta)" :src="appIcon(app.appMeta)" alt="" />
            <span v-else class="icon-fallback">{{ appInitial(app.appMeta, app.compName) }}</span>
          </span>
          <span class="item-label">{{ app.wrapperValues?.title || app.compName }}</span>
          <!-- R2: 绿点 — appsRef 中均为运行中实例，始终显示 -->
          <span v-if="app.state !== undefined" class="running-dot running-dot--green"></span>
        </button>
      </template>

      <!-- 编辑桌面（进入编辑模式） -->
      <span class="toolbar-divider"></span>
      <button class="toolbar-item" type="button" title="编辑桌面" @click="emit('enterEdit')">
        <span class="item-icon"><span class="ss-icon ss-icon-edit"></span></span>
        <span class="item-label">编辑</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
// fixed 底部居中；常态露出 1em 高度便于触发，JS 驱动 .is-visible 控制显隐
.desktop-toolbar-main {
  position: fixed;
  bottom: 0;
  left: 50%;
  z-index: 100;
  padding-top: 0.75em;
  // 隐藏态：底部露出约 1.3em（toolbar-body 自身高度的一部分）
  transform: translate(-50%, calc(100% - 1.3em));
  transition: transform 0.25s ease;

  &.is-visible {
    transform: translate(-50%, -0.5em);
  }
}

.toolbar-body {
  display: flex;
  align-items: stretch;
  gap: 0.375em;
  max-width: 90vw;
  padding: 0.375em 0.625em;
  border: 1px solid var(--desktop-border);
  border-radius: 10px;
  background: var(--desktop-bg-overlay);
  box-shadow: var(--desktop-shadow);
  overflow: auto hidden;
}

.toolbar-item {
  position: relative;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  align-items: center;
  gap: 0.125em;
  min-width: 3.5em;
  padding: 0.25em 0.5em;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--desktop-text-primary);
  cursor: pointer;

  &:hover {
    background: var(--desktop-bg-secondary);
  }
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75em;
  height: 1.75em;
  font-size: 1.125em;
  line-height: 1;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.icon-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 6px;
  background: var(--desktop-widget-header-bg);
  color: var(--desktop-widget-header-text);
  font-size: 0.875em;
}

.item-label {
  max-width: 5em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--desktop-text-secondary);
  font-size: 0.6875em;
}

.toolbar-divider {
  flex-shrink: 0;
  align-self: center;
  width: 1px;
  height: 2em;
  background: var(--desktop-border);
}

// 运行中 App：底部绿点指示器
.toolbar-running {
  &.is-minimized {
    opacity: 0.55;
  }

  .running-dot {
    position: absolute;
    bottom: 1px;
    left: 50%;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--desktop-widget-header-bg);
    transform: translateX(-50%);

    // R2: 绿色圆点标识 — 已实例化运行的 App
    &.running-dot--green {
      width: 6px;
      height: 6px;
      background: #22c55e;
    }
  }
}
</style>
