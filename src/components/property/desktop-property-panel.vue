<script setup>
// ============================================================
// 006-prop-editor: 属性编辑面板（desktop-property-panel）
//
// 契约（overall-api.md §desktop-property-panel）：
//   Props : visible（面板显隐）/ node（当前编辑的 GridStack 节点）/ meta（组件元数据）
//   Emits : update:visible(visible) / confirm({id, propsValues, wrapperValues})
//
// 确认提交模式（006 plan.md §3.1）：打开面板时 cloneDeep 一次属性值到
// 编辑副本（§6.4），表单就地修改副本；点击「应用」才发出 confirm，
// 取消/关闭抽屉丢弃副本，不影响节点数据（测试用例：取消不修改数据）。
// ============================================================
import { ref, watch } from 'vue'
import cloneDeep from 'lodash/cloneDeep'

const props = defineProps({
  // 面板显隐
  visible: { type: Boolean, required: true },
  // 当前编辑的 GridStack 节点（可能为 null，空态兜底）
  node: { type: Object, default: null },
  // 当前组件的元数据（可能为 null，空态兜底）
  meta: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'confirm'])

// 固定外框属性定义（plan.md §4.1 / overall-data-model.md §1.4）
const wrapperPropsMeta = {
  title: { title: '标题', category: '外框配置', default: '示例组件' },
  hideHeader: { title: '隐藏标题栏', category: '外框配置', type: 'boolean', default: false },
}

const activeTab = ref('props')
// 组件属性编辑副本 / 外框属性编辑副本（plan.md §4.1）
const editingProps = ref({})
const editingWrapperProps = ref({})

// 打开面板（或编辑目标切换）时重建编辑副本：
// 元数据默认值兜底 + 节点当前值覆盖，整体 cloneDeep 隔离引用
watch(
  () => [props.visible, props.node],
  ([visible]) => {
    if (!visible) return
    activeTab.value = 'props'
    const defaults = {}
    for (const [key, propMeta] of Object.entries(props.meta?.props || {})) {
      defaults[key] = propMeta?.default
    }
    editingProps.value = cloneDeep({ ...defaults, ...(props.node?.propsValues || {}) })
    editingWrapperProps.value = cloneDeep({
      title: props.node?.wrapperValues?.title ?? props.meta?.title ?? wrapperPropsMeta.title.default,
      hideHeader: props.node?.wrapperValues?.hideHeader ?? wrapperPropsMeta.hideHeader.default,
    })
  },
  { immediate: true },
)

// 「应用」→ 发出 confirm（FR-022），并关闭面板
function onConfirm() {
  if (!props.node?.id) {
    emit('update:visible', false)
    return
  }
  emit('confirm', {
    id: props.node.id,
    propsValues: editingProps.value,
    wrapperValues: editingWrapperProps.value,
  })
  emit('update:visible', false)
}

// 「取消」/ 关闭抽屉 → 丢弃编辑副本
function onCancel() {
  emit('update:visible', false)
}
</script>

<template>
  <el-drawer
    :model-value="visible"
    title="属性编辑"
    direction="rtl"
    size="380px"
    @update:model-value="(val) => emit('update:visible', val)"
  >
    <div class="desktop-property-panel-body">
      <div v-if="!node" class="panel-empty">未选择要编辑的组件</div>
      <el-tabs v-else v-model="activeTab">
        <el-tab-pane label="组件属性" name="props">
          <desktop-property-form :value="editingProps" :props="meta?.props" />
        </el-tab-pane>
        <el-tab-pane label="外框属性" name="wrapper">
          <desktop-property-form :value="editingWrapperProps" :props="wrapperPropsMeta" />
        </el-tab-pane>
      </el-tabs>
    </div>
    <template #footer>
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" :disabled="!node" @click="onConfirm">应用</el-button>
    </template>
  </el-drawer>
</template>

<style scoped lang="scss">
.desktop-property-panel-body {
  width: 100%;
}

.panel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: var(--desktop-text-secondary);
  font-size: 0.875em;
}
</style>
