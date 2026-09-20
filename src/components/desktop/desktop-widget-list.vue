<script setup>
// ============================================================
// 002-widget-system: 桌面看板组件选择列表（T1~T5 / plan.md §6.7）
//
// 布局：aside-main 自定义面板（60vw × 70vh，非 el-dialog）
//   - 左侧 aside：el-tree 分类树（一级 category / 二级 widget）
//   - 右侧 main ：GridStack 预览（6列 × cellHeight 100，staticGrid）
//
// 预览规则（plan.md §6.6/§6.7）：
//   - 无 presets → 渲染 1 个标准版入口
//   - 有 presets → 仅渲染 preset 变体（{ ...meta, ...preset } 浅合并）
//   - 有 thumbnail → <img> 缩略图；无 → h() + render() 实时渲染
//     （直接渲染 widget 组件，不包裹 WidgetWrapper，T3/P-04）
//
// Emits：
//   addWidget(compName)             — 标准版
//   addWidget(compName, mergedMeta) — preset 变体（含 presetKey）
//   close                           — 关闭面板
// ============================================================
import { ref, computed, watch, nextTick, h, render, getCurrentInstance, onMounted, onBeforeUnmount } from 'vue'
import { GridStack } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'
import 'gridstack/dist/gridstack-extra.min.css'
import { useWidgetMetas } from '../../composables/useWidgetMetas.js'
import { WidgetComponents } from '../../widgets/index.js'

const emit = defineEmits(['addWidget', 'close'])

const { widgetMetas } = useWidgetMetas()
// 绑定 appContext 确保预览 VNode 的依赖注入/全局组件完整（P-04）
const appContext = getCurrentInstance()?.appContext || null

// ==================== el-tree 分类数据（T2） ====================

// treeData：[{ label: category, children: [{ label: meta.title, compName, avatar }] }]
const treeData = computed(() => {
  const groups = {}
  for (const meta of Object.values(widgetMetas.value || {})) {
    // category 为空的 widget fallback 到 "其他"（TC-WS-040）
    const category = meta.category || '其他'
    if (!groups[category]) groups[category] = []
    groups[category].push({ label: meta.title || meta.compName || '', compName: meta.compName, avatar: meta.avatar || null })
  }
  return Object.keys(groups)
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
    .map((category) => ({
      label: category,
      children: groups[category].sort((a, b) => {
        const sa = widgetMetas.value[a.compName]?.sort ?? Number.MAX_SAFE_INTEGER
        const sb = widgetMetas.value[b.compName]?.sort ?? Number.MAX_SAFE_INTEGER
        const labelA = a.label || ''
        const labelB = b.label || ''
        return sa - sb || labelA.localeCompare(labelB, 'zh-Hans-CN')
      }),
    }))
})

const selectedCompName = ref('')

function onNodeClick(data) {
  // 仅二级 widget 节点触发预览切换（一级 category 节点无 compName）
  if (data.compName) selectedCompName.value = data.compName
}

// ==================== 预览条目（T3/T4） ====================

function makePreviewItem(meta, presetKey) {
  return {
    compName: meta.compName,
    meta,
    presetKey,
    // 尺寸 clamp 到预览网格 6列 × 4行以内（plan.md §6.7）
    w: Math.min(meta.rect?.width || 1, 6),
    h: Math.min(meta.rect?.height || 1, 4),
  }
}

const previewItems = computed(() => {
  const meta = widgetMetas.value[selectedCompName.value]
  if (!meta) return []
  const presets = meta.presets
  const presetKeys = presets && typeof presets === 'object' ? Object.keys(presets) : []
  // 有 presets → 仅渲染 preset 变体；无（或空对象）→ 标准版入口（TC-WS-035）
  if (!presetKeys.length) return [makePreviewItem(meta, null)]
  return presetKeys.map((key) => makePreviewItem({ ...meta, ...presets[key] }, key))
})

// ==================== GridStack 预览网格（plan.md §6.7） ====================

const gridEl = ref(null)
let grid = null

// 预览卡片内联样式（render() 挂载的 VNode 不在本组件 scoped 范围内）
const CARD_STYLE = 'display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;cursor:pointer;'
const BODY_STYLE = 'flex:1;overflow:hidden;pointer-events:none;'
const CAPTION_STYLE =
  'flex-shrink:0;padding:2px 4px;font-size:12px;text-align:center;color:var(--desktop-text-secondary);' +
  'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'

// 缩略图 vs 实时渲染（T3：无 thumbnail 时 h() + render() 创建临时实例）
function rerenderPreviewNode(node) {
  const contentEl = node.el?.querySelector('.grid-stack-item-content')
  const idx = parseInt(String(node.id || '').replace('prev_', ''), 10)
  const item = previewItems.value[idx]
  if (!contentEl || !item) return

  render(null, contentEl)
  const { meta } = item
  // 卡片标注：变体名称（preset key 或 widget title）+ 尺寸信息（T4）
  const caption = `${item.presetKey || meta.title}（${item.w}×${item.h}）`

  if (meta.thumbnail) {
    contentEl.innerHTML =
      `<div style="${CARD_STYLE}">` +
      `<div style="${BODY_STYLE}"><img src="${meta.thumbnail}" alt="" style="width:100%;height:100%;object-fit:contain;"></div>` +
      `<div style="${CAPTION_STYLE}">${caption}</div></div>`
    return
  }

  const Comp = WidgetComponents[item.compName] || null
  const propsValues = {}
  for (const [key, propMeta] of Object.entries(meta.props || {})) {
    propsValues[key] = propMeta?.default
  }
  const preview = Comp
    ? h(Comp, propsValues)
    : h('span', { style: 'padding:8px;color:var(--desktop-text-secondary);' }, `看板组件「${item.compName}」未找到`)
  const vnode = h('div', { style: CARD_STYLE }, [
    h('div', { style: BODY_STYLE }, [preview]),
    h('div', { style: CAPTION_STYLE }, caption),
  ])
  if (appContext) vnode.appContext = appContext
  render(vnode, contentEl)
}

function destroyGrid() {
  if (!grid) return
  for (const node of grid.engine?.nodes || []) {
    const contentEl = node.el?.querySelector('.grid-stack-item-content')
    if (contentEl) render(null, contentEl)
  }
  grid.off('added')
  grid.destroy(false)
  grid = null
  if (gridEl.value) gridEl.value.innerHTML = ''
}

function buildGrid() {
  destroyGrid()
  if (!gridEl.value || !previewItems.value.length) return
  grid = GridStack.init(
    { column: 6, cellHeight: 100, staticGrid: true, disableDrag: true, disableResize: true, margin: 5, float: false },
    gridEl.value,
  )
  grid.on('added', (event, nodes) => {
    for (const node of nodes || []) rerenderPreviewNode(node)
  })
  previewItems.value.forEach((item, idx) => {
    grid.addWidget({ id: `prev_${idx}`, w: item.w, h: item.h })
  })
}

// 切换 widget 时重建 GridStack（plan.md §6.7 生命周期）
watch(selectedCompName, () => {
  nextTick(() => buildGrid())
})

// ==================== 点击预览添加（T5，事件委托） ====================

function handleGridClick(event) {
  const itemEl = event.target.closest('.grid-stack-item')
  if (!itemEl) return
  const idx = parseInt(String(itemEl.getAttribute('gs-id') || '').replace('prev_', ''), 10)
  const item = previewItems.value[idx]
  if (!item) return
  if (item.presetKey) {
    // preset 变体：携带合并后的元数据 + presetKey
    emit('addWidget', item.compName, { ...item.meta, presetKey: item.presetKey })
  } else {
    emit('addWidget', item.compName)
  }
  emit('close')
}

onMounted(() => {
  gridEl.value?.addEventListener('click', handleGridClick)
})

onBeforeUnmount(() => {
  gridEl.value?.removeEventListener('click', handleGridClick)
  destroyGrid()
})
</script>

<template>
  <div class="desktop-widget-list">
    <div class="widget-list-mask" @click="emit('close')"></div>
    <div class="widget-list-panel">
      <div class="panel-header">
        <span class="panel-title">添加组件</span>
        <button class="panel-close" type="button" title="关闭" @click="emit('close')">×</button>
      </div>
      <div class="panel-body">
        <aside class="panel-aside">
          <el-tree
            :data="treeData"
            default-expand-all
            highlight-current
            :expand-on-click-node="false"
            @node-click="onNodeClick"
          >
            <template #default="{ data }">
              <span class="tree-node">
                <template v-if="data.children">{{ data.label }}</template>
                <template v-else>
                  <img v-if="data.avatar" class="tree-avatar" :src="data.avatar" alt="" />
                  <span class="tree-label">{{ data.label }}</span>
                </template>
              </span>
            </template>
          </el-tree>
        </aside>
        <main class="panel-main">
          <div v-if="!selectedCompName" class="main-empty">请在左侧选择要添加的看板组件</div>
          <div v-show="selectedCompName" ref="gridEl" class="grid-stack preview-grid"></div>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.desktop-widget-list {
  position: fixed;
  inset: 0;
  z-index: 200;
}

.widget-list-mask {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 40%);
}

// 面板尺寸：60vw × 70vh，max 90vw / 80vh（plan.md §6.7）
.widget-list-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  width: 60vw;
  height: 70vh;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  border: 1px solid var(--desktop-border);
  border-radius: 6px;
  background: var(--desktop-bg-overlay);
  box-shadow: var(--desktop-shadow);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: 2.5em;
  padding: 0 12px;
  border-bottom: 1px solid var(--desktop-border-light);
  color: var(--desktop-text-primary);
}

.panel-title {
  font-size: 0.9375em;
  font-weight: 600;
}

.panel-close {
  padding: 0 4px;
  border: none;
  background: transparent;
  color: var(--desktop-text-secondary);
  font-size: 1.25em;
  line-height: 1;
  cursor: pointer;

  &:hover {
    color: var(--desktop-text-primary);
  }
}

.panel-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.panel-aside {
  flex-shrink: 0;
  width: 220px;
  overflow: auto;
  border-right: 1px solid var(--desktop-border-light);
  padding: 8px 4px;

  :deep(.el-tree) {
    background: transparent;
    color: var(--desktop-text-primary);
  }
}

.tree-node {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}

.tree-avatar {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  object-fit: contain;
}

.tree-label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.panel-main {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 8px;
  background: var(--desktop-bg-secondary);
}

.main-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--desktop-text-secondary);
}

.preview-grid {
  min-height: 100%;
}
</style>
