<script setup>
// ============================================================
// 003-app-system: App 组件外壳（desktop-app-wrapper）
//
// 契约（spec.md US-003 / FR-016 / TC-005）：
//   Props : title — 标题栏文字（来自 App 实例 wrapperValues.title）
//   Emits : minimize — 点击最小化按钮（➖）
//           close    — 点击关闭按钮（❌）
//   Slot  : default — App 内容，由 desktop-viewport-app 注入
//
// P-02 宿主与内容分离：外壳负责标题栏与操作按钮，
// App 组件本身只关注内容渲染。
// ============================================================

defineProps({
  // 标题栏文字
  title: { type: String, default: 'App' },
  // 是否隐藏标题栏
  hideHeader: { type: Boolean, default: false },
})

const emit = defineEmits(['minimize', 'close'])

function handleMinisize() {
  emit('minimize')
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <div class="desktop-app-wrapper">
    <div v-if="!hideHeader" class="wrapper-header">
      <div class="widget-title">{{ title }}</div>
      <div class="wrapper-actions" style="float: right;" @click.stop>
        <el-button size="small" circle @click="handleMinisize"><span class="ss-icon ss-icon-minus"></span></el-button>
        <el-button size="small" circle @click="handleClose"><span class="ss-icon ss-icon-close"></span></el-button>
      </div>
    </div>
    <div v-else class="wrapper-header-float">
      <div class="wrapper-actions" style="float: right;" @click.stop> 
        <el-button size="small" circle @click="handleMinisize"><span class="ss-icon ss-icon-minus"></span></el-button>
        <el-button size="small" circle @click="handleClose"><span class="ss-icon ss-icon-close"></span></el-button>
      </div>
    </div>
    <div class="wrapper-content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.desktop-app-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--desktop-glass-bg);
  backdrop-filter: var(--desktop-glass-blur);
  -webkit-backdrop-filter: var(--desktop-glass-blur);
  border: 1px solid var(--desktop-glass-border);
  box-sizing: border-box;

  .wrapper-header {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 10;
    width: 100%;
    background: var(--desktop-widget-header-bg);
    color: var(--desktop-widget-header-text);
    padding: 5px;
    text-align: center;
    display: flex;
    justify-content: space-between;
    .wrapper-title {
      font-weight: bolder;
      // 自动省略过长文本
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .wrapper-actions {
      white-space: nowrap;
    }
  }
  .wrapper-header-float {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 10;
    background: var(--desktop-widget-header-bg);
    padding: 2px;
    border-radius: 4px;
    .wrapper-actions {
      white-space: nowrap;
    }
    .wrapper-title {
      font-size: 0.8em;
      font-weight: bolder;
      padding: 0 0.5em;
      color: var(--desktop-text-secondary);
    }
  }
  .wrapper-content {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
}
</style>
