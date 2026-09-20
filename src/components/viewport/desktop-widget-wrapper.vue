<script setup>
// ============================================================
// 002-widget-system: 看板组件容器外壳（P-02 宿主与内容分离）
// 契约（specs/overall-api.md §desktop-widget-wrapper）：
//   Props : title('面板') / hideHeader(false) / editMode(true)
//   Emits : widget-edit → { node, meta }（点击编辑按钮）
//           widget-remove → node（点击删除按钮）
//   Slot  : default — 小部件内容 VNode，由视口通过 h(Comp, props) 创建
// node / meta 为接线属性：视口以 VNode 方式挂载时传入，
// 用于按契约携带 emit 载荷（overall-data-model.md §1.1/§1.2）。
// ============================================================

const props = defineProps({
  // 标题栏文字
  title: { type: String, default: '面板' },
  // 是否隐藏标题栏
  hideHeader: { type: Boolean, default: false },
  // 是否显示编辑/删除操作按钮
  editMode: { type: Boolean, default: true },
  // 当前实例的 GridStackNode（emit 载荷接线用）
  node: { type: Object, default: null },
  // 当前组件的 WidgetMeta（emit 载荷接线用）
  meta: { type: Object, default: null },
})

const emit = defineEmits(['widget-edit', 'widget-remove'])

// 点击编辑 → 通知宿主打开属性编辑面板
function handleEdit() {
  emit('widget-edit', { node: props.node, meta: props.meta })
}

// 点击删除 → 通知宿主移除该看板组件
function handleRemove() {
  emit('widget-remove', props.node)
}
</script>

<template>
  <div class="desktop-widget-wrapper">
    <div v-if="!hideHeader" class="wrapper-header">
      <i v-if="editMode" class="widget-dragger ss-icon ss-icon-drag-dot"></i>
      <div class="widget-title">{{ title }}</div>
      <div v-if="editMode" class="wrapper-actions" style="float: right;" @click.stop>
        <el-button size="small" circle @click="handleEdit"><span class="ss-icon ss-icon-settings"></span></el-button>
        <el-button size="small" circle @click="handleRemove"><span class="ss-icon ss-icon-close"></span></el-button>
      </div>
    </div>
    <div v-if="editMode" class="wrapper-header-float">
      <i v-if="editMode" class="wrapper-dragger ss-icon ss-icon-drag-dot"></i>
      <!-- <span class="widget-title">{{ title }}</span> -->
      <div v-if="editMode" class="wrapper-actions" style="float: right;" @click.stop> 
        <el-button size="small" circle @click="handleEdit"><span class="ss-icon ss-icon-settings"></span></el-button>
        <el-button size="small" circle @click="handleRemove"><span class="ss-icon ss-icon-close"></span></el-button>
      </div>
    </div>
    <div class="wrapper-content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
// 颜色一律取自 --desktop-* 主题变量（src/style/theme-var.scss，浅/深主题各自定义）
.desktop-widget-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 4px;
  background: var(--desktop-glass-bg);
  backdrop-filter: var(--desktop-glass-blur);
  -webkit-backdrop-filter: var(--desktop-glass-blur);
  border: 1px solid var(--desktop-glass-border);
  box-sizing: border-box;

  .wrapper-dragger {
    cursor: move;
    padding: 0 0.5em;
  }
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
    overflow: auto;
  }
}
</style>
