<script setup>
// ============================================================
// 201-page-index: 底部编辑工具条（desktop-toolbar-edit）
//
// 契约（plan.md §6 / spec.md §3.5~§3.7 / tasks T019~T022）：
//   仅编辑模式渲染（Desktop.vue v-if="desktopMode === 'editing'"）
//   Props : canRemovePage — 页面数 > 1 时才允许移除本页（FR-034）
//   Emits : show-background-list — 🎨 主题（背景+主题切换入口）
//           show-widget-list     — ➕ 部件
//           add-page-before / add-page-after / remove-page — 🎞️ 页面下拉
//           font-size-increase / font-size-decrease / font-size-reset — 🔢 字号下拉
//           exit-edit            — ✔️ 完成（退出编辑 = 自动保存）
// ============================================================
defineProps({
  // 是否允许移除当前页（pages.length > 1，FR-034 最少保留一页）
  canRemovePage: { type: Boolean, default: false },
})

const emit = defineEmits([
  'showBackgroundList',
  'showWidgetList',
  'addPageBefore',
  'addPageAfter',
  'removePage',
  'fontSizeIncrease',
  'fontSizeDecrease',
  'fontSizeReset',
  'exitEdit',
])

// 页面下拉菜单命令分发（T020）
function onPageCommand(command) {
  if (command === 'before') emit('addPageBefore')
  else if (command === 'after') emit('addPageAfter')
  else if (command === 'remove') emit('removePage')
}

// 字号下拉菜单命令分发（T021）
function onFontCommand(command) {
  if (command === 'increase') emit('fontSizeIncrease')
  else if (command === 'decrease') emit('fontSizeDecrease')
  else if (command === 'reset') emit('fontSizeReset')
}
</script>

<template>
  <div class="desktop-toolbar-edit">
    <div class="toolbar-body">
      <!-- 主题（004-background-system 入口：背景选择 + 自动主题切换） -->
      <button class="toolbar-item" type="button" title="切换主题与背景" @click="emit('showBackgroundList')">
        <span class="item-icon"><span class="ss-icon ss-icon-bg-colors"></span></span>
        <span class="item-label">主题</span>
      </button>

      <!-- 部件（002-widget-system 入口） -->
      <button class="toolbar-item" type="button" title="添加看板组件" @click="emit('showWidgetList')">
        <span class="item-icon"><span class="ss-icon ss-icon-plus"></span></span>
        <span class="item-label">部件</span>
      </button>

      <!-- 页面增删（FR-032~035，T020） -->
      <el-dropdown trigger="click" placement="top" @command="onPageCommand">
        <button class="toolbar-item" type="button" title="页面管理">
          <span class="item-icon"><span class="ss-icon ss-icon-file-video"></span></span>
          <span class="item-label">页面</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="before"><span class="ss-icon ss-icon-arrow-left"></span> 往前添加</el-dropdown-item>
            <el-dropdown-item command="after"><span class="ss-icon ss-icon-arrow-rise"></span> 往后添加</el-dropdown-item>
            <el-dropdown-item command="remove" :disabled="!canRemovePage" divided>
              <span class="ss-icon ss-icon-close"></span> 移除本页
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 字号缩放（FR-024~025，T021） -->
      <el-dropdown trigger="click" placement="top" @command="onFontCommand">
        <button class="toolbar-item" type="button" title="字号调整">
          <span class="item-icon"><!-- 字号调整：ss-icon 无专用 font-size 图标，使用 font-colors 作为字体属性近似 --><span class="ss-icon ss-icon-font-colors"></span></span>
          <span class="item-label">字号</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="increase"><span class="ss-icon ss-icon-plus"></span> 加大</el-dropdown-item>
            <el-dropdown-item command="decrease"><span class="ss-icon ss-icon-minus"></span> 减小</el-dropdown-item>
            <el-dropdown-item command="reset" divided><span class="ss-icon ss-icon-sync"></span> 还原</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <span class="toolbar-divider"></span>

      <!-- 完成编辑（退出 = 自动保存，FR-005） -->
      <button class="toolbar-item" type="button" title="完成编辑并保存" @click="emit('exitEdit')">
        <span class="item-icon"><span class="ss-icon ss-icon-check"></span></span>
        <span class="item-label">完成</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
// fixed 底部居中（plan.md §2.2），编辑期间常驻完全可见
.desktop-toolbar-edit {
  position: fixed;
  bottom: 0.5em;
  left: 50%;
  z-index: 100;
  transform: translateX(-50%);
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
}

.toolbar-item {
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
}

.item-label {
  color: var(--desktop-text-secondary);
  font-size: 0.6875em;
  white-space: nowrap;
}

.toolbar-divider {
  flex-shrink: 0;
  align-self: center;
  width: 1px;
  height: 2em;
  background: var(--desktop-border);
}
</style>
