<script setup>
// ============================================================
// 001-desktop-core: 桌面视口 —— Swiper 多页 + 每页独立 GridStack
//
// 契约（specs/overall-api.md §desktop-viewport-desktop）：
//   Props : desktopConfig / desktopMode('normal') / currentPageIndex(0) / userInfo(null)
//   Emits : widgetEdit(node, meta) / pageChange(newIndex)
//   Expose: addWidget / updateWidgetProps / switchPage /
//           getCurrentPageData / saveAllPages / broadcastToCurrentPageWidgets
//
// P-04：看板组件挂载唯一入口为 rerenderNode()，
//       使用 h(WidgetWrapper, wrapperProps, { default: () => h(Comp, compProps) })
//       + render(vnode, contentEl)，禁止 <template> 渲染 GridStack 内容。
// ============================================================
import { ref, shallowRef, computed, watch, nextTick, h, render, getCurrentInstance, onBeforeUnmount } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'gridstack/dist/gridstack.min.css'
import 'gridstack/dist/gridstack-extra.min.css'
import { useGridStack } from '../../composables/useGridStack.js'
import { useWidgetMetas } from '../../composables/useWidgetMetas.js'
import { WidgetComponents } from '../../widgets/index.js'
import { UIComponents } from '../index.js'

const props = defineProps({
  // 完整桌面配置（DesktopConfig，overall-data-model.md §1.7）
  desktopConfig: { type: Object, default: null },
  // 桌面模式：'normal' / 'editing'
  desktopMode: { type: String, default: 'normal' },
  // 当前页索引
  currentPageIndex: { type: Number, default: 0 },
  // 登录用户信息（FR-035 用户数据自动填充）
  userInfo: { type: Object, default: null },
})

const emit = defineEmits(['widgetEdit', 'pageChange'])

const {
  initGrid,
  destroyAll,
  getInstance,
  getAllInstances,
  registerWidgetEmitter,
  unregisterWidgetEmitter,
  emitToWidget,
  broadcastToAllWidgets,
  setActive,
} = useGridStack()
const { widgetMetas } = useWidgetMetas()

// FR-018：绑定 appContext 确保 VNode 依赖注入/全局组件完整
const appContext = getCurrentInstance()?.appContext || null
// 小部件外壳（P-02 唯一容器）
const WidgetWrapper = UIComponents['desktop-widget-wrapper']

// Swiper 模块与实例
const swiperModules = [Pagination]
const swiperRef = shallowRef(null)
// 每页 GridStack 容器元素（函数 ref 收集）
const gridContainers = ref([])
// 当前活动页索引（页面切换 O(1)：仅更新索引 + 活动状态）
const activePageIndex = ref(props.currentPageIndex || 0)

const pages = computed(() => props.desktopConfig?.pages || [])

// FR-009 默认 GridStack 配置（resize 全局禁用，编辑模式下 enableResize 恢复）
const DEFAULT_GRID_OPTIONS = {
  float: false,
  margin: 5,
  animate: true,
  cellHeight: 80,
  disableResize: true,
}

// FR-035 自动填充的用户数据属性
const USER_FILL_KEYS = []

// 实例 key：page_0 / page_1 / ...（FR-005）
function gridKey(idx) {
  return `page_${idx}`
}

function setGridContainer(el, idx) {
  if (el) gridContainers.value[idx] = el
}

// ==================== GridStack 初始化（FR-005~007） ====================

function initAllGridStacks() {
  const cols = props.desktopConfig?.grid?.cols || 12
  pages.value.forEach((page, idx) => {
    const el = gridContainers.value[idx]
    if (!el || getInstance(gridKey(idx))) return
    el.innerHTML = ''
    const grid = initGrid(gridKey(idx), el, { ...DEFAULT_GRID_OPTIONS, column: cols }, {
      onNodeAdded: (node) => rerenderNode(node, idx),
      onNodeRemoved: (node) => {
        if (node.id) unregisterWidgetEmitter(node.id)
      },
    })
    if (grid) {
      grid.load(Array.isArray(page.children) ? page.children : [])
    }
  })
  // 初始化后按当前模式统一设置交互性（FR-011/012）
  applyModeToGrids(props.desktopMode === 'editing')
}

// 卸载某实例下所有 widget 的 Vue VNode（销毁/重建前调用，FR-008）
function unmountGridWidgets(grid) {
  for (const node of grid?.engine?.nodes || []) {
    const contentEl = node.el?.querySelector('.grid-stack-item-content')
    if (contentEl) render(null, contentEl)
  }
}

// 页面增删后重建全部实例（children 已由页面编排器预先序列化）
function rebuildAllGrids() {
  for (const grid of getAllInstances()) unmountGridWidgets(grid)
  destroyAll(false)
  gridContainers.value = gridContainers.value.slice(0, pages.value.length)
  nextTick(() => {
    swiperRef.value?.update()
    const maxIdx = Math.max(0, pages.value.length - 1)
    if (activePageIndex.value > maxIdx) activePageIndex.value = maxIdx
    initAllGridStacks()
    swiperRef.value?.slideTo(activePageIndex.value, 0)
    setActive(gridKey(activePageIndex.value), true)
  })
}

watch(() => pages.value.length, (newLen, oldLen) => {
  if (newLen === oldLen || !swiperRef.value) return
  rebuildAllGrids()
})

// ==================== VNode 渲染（FR-016~021，P-04） ====================

// 看板组件挂载唯一入口
function rerenderNode(node, pageIdx) {
  const grid = getInstance(gridKey(pageIdx))
  const itemEl = node.el
  const contentEl = itemEl?.querySelector('.grid-stack-item-content')
  if (!grid || !contentEl) return

  // FR-017：渲染前先卸载旧实例
  render(null, contentEl)

  const compName = node.info?.compName
  const meta = widgetMetas.value[compName] || null
  const Comp = WidgetComponents[compName] || null

  node.propsValues = node.propsValues || {}
  node.wrapperValues = node.wrapperValues || {}

  // FR-035/036：用户数据自动填充（仅填充元数据声明且未设置值的属性）
  if (props.userInfo && meta?.props) {
    for (const key of USER_FILL_KEYS) {
      const current = node.propsValues[key]
      const unset = current === undefined || current === null || current === ''
      if (meta.props[key] && unset && props.userInfo[key] !== undefined) {
        node.propsValues[key] = JSON.stringify(props.userInfo[key])
      }
    }
  }

  // FR-021：外壳属性由模式决定。
  // FR-024 + overall-data-model.md §1.4：常规模式尊重用户外框设置
  // （hideHeader 未设置时默认 true 隐藏标题栏）；编辑模式强制显示标题栏
  // （编辑/删除按钮依赖标题栏）。
  const isNormal = props.desktopMode === 'normal'
  const wrapperProps = {
    ...node.wrapperValues,
    node,
    meta,
    hideHeader: true, // isNormal ? (node.wrapperValues?.hideHeader ?? true) : false,
    editMode: !isNormal,
    // 优先使用外壳 emit 的载荷，闭包值作为回退
    onWidgetEdit: (payload) => emit('widgetEdit', payload?.node ?? node, payload?.meta ?? meta),
    onWidgetRemove: (payloadNode) => removeWidgetNode(payloadNode ?? node, pageIdx),
  }

  // FR-020：组件未找到时渲染 fallback 提示
  const childVNode = Comp
    ? h(Comp, { ...node.propsValues })
    : h(
        'span',
        { style: 'display:inline-block;padding:8px;color:var(--desktop-text-secondary);' },
        `看板组件「${compName || '未知'}」未找到`,
      )

  const vnode = h(WidgetWrapper, wrapperProps, { default: () => childVNode })
  if (appContext) vnode.appContext = appContext
  render(vnode, contentEl)

  // FR-019：注册 widget emit 桥接
  const widgetProxy = Comp ? childVNode.component?.proxy : null
  if (node.id && widgetProxy?.$emit) {
    registerWidgetEmitter(node.id, (eventName, payload) => widgetProxy.$emit(eventName, payload))
  }
}

// 重渲染指定实例下所有节点
function rerenderAllForGrid(grid, pageIdx) {
  for (const node of grid?.engine?.nodes || []) {
    rerenderNode(node, pageIdx)
  }
}

// FR-024：删除小部件 —— 先卸载 Vue 组件，再移除节点，最后注销事件桥接
function removeWidgetNode(node, pageIdx) {
  const grid = getInstance(gridKey(pageIdx))
  const itemEl = node.el
  const contentEl = itemEl?.querySelector('.grid-stack-item-content')
  if (contentEl) render(null, contentEl)
  // 事件桥接注销由 removed 事件 → onNodeRemoved 回调统一处理（单一注销路径）
  if (grid && itemEl) grid.removeWidget(itemEl)
}

// ==================== 编辑/常规双模式（FR-010~015） ====================

function applyModeToGrids(isEditing) {
  pages.value.forEach((_, idx) => {
    const grid = getInstance(gridKey(idx))
    if (!grid) return
    grid.enableMove(isEditing)
    grid.enableResize(isEditing)
  })
}

watch(() => props.desktopMode, (newMode) => {
  const isEditing = newMode === 'editing'
  // FR-004 / US-005：编辑模式禁用 Swiper 手势滑动
  if (swiperRef.value) {
    swiperRef.value.allowTouchMove = !isEditing
  }
  applyModeToGrids(isEditing)
  // FR-015 退出编辑时的序列化由页面编排器统一调用（Desktop.vue watch desktopMode
  // → saveAllPages() + persistConfig()），视口不重复保存，保证单一保存路径
  nextTick(() => {
    // FR-013：广播模式切换事件
    broadcastToAllWidgets(isEditing ? 'grid-editing' : 'grid-editing-end', {})
    // FR-014：重渲染所有小部件更新外壳属性
    pages.value.forEach((_, idx) => rerenderAllForGrid(getInstance(gridKey(idx)), idx))
  })
}, { immediate: true })

// ==================== Swiper 生命周期与页面切换（FR-001~004, FR-032~034） ====================

function onSwiperInit(swiper) {
  swiperRef.value = swiper
  swiper.allowTouchMove = props.desktopMode !== 'editing'
  nextTick(() => {
    initAllGridStacks()
    // FR-032：首页自动激活
    setActive(gridKey(activePageIndex.value), true)
  })
}

function onSlideChange(swiper) {
  const newIndex = swiper.activeIndex
  if (newIndex === activePageIndex.value) return
  // FR-033：旧页 deactive → 新页 active
  setActive(gridKey(activePageIndex.value), false)
  activePageIndex.value = newIndex
  setActive(gridKey(newIndex), true)
  emit('pageChange', newIndex)
}

// FR-003：通过 API 切换到指定页面
function switchPage(index) {
  swiperRef.value?.slideTo(index)
}

watch(() => props.currentPageIndex, (idx) => {
  if (typeof idx === 'number' && idx !== activePageIndex.value) {
    switchPage(idx)
  }
})

// ==================== 小部件 CRUD（FR-022~026） ====================

function addWidget(widgetName, options = {}) {
  const meta = widgetMetas.value[widgetName]
  if (!meta) {
    console.warn(`[viewport-desktop] 添加失败：看板组件 "${widgetName}" 未注册`)
    return null
  }
  const grid = getInstance(gridKey(activePageIndex.value))
  if (!grid) {
    console.warn(`[viewport-desktop] 添加失败：当前页 GridStack 实例不存在`)
    return null
  }

  const w = options.w ?? meta.rect?.width ?? 2
  const height = options.h ?? meta.rect?.height ?? 2
  let { x, y } = options
  if (x === undefined || y === undefined) {
    // FR-022：点击添加 → 放到底部（最大 y + h）
    x = 0
    y = (grid.engine?.nodes || []).reduce((max, n) => Math.max(max, (n.y || 0) + (n.h || 1)), 0)
  }

  // 属性默认值来自元数据 props.default
  const defaults = {}
  for (const [key, propMeta] of Object.entries(meta.props || {})) {
    defaults[key] = propMeta?.default
  }

  const nodeData = {
    // FR-023：ID 由 Date.now() + '' 生成
    id: Date.now() + '',
    x,
    y,
    w,
    h: height,
    info: { compName: widgetName, ...(options.presetKey ? { presetKey: options.presetKey } : {}) },
    propsValues: { ...defaults, ...(options.propsValues || {}) },
    wrapperValues: { title: meta.title, ...(options.wrapperValues || {}) },
  }
  // FR-026：rect.fixed → 尺寸不可调整
  if (meta.rect?.fixed) nodeData.noResize = true

  grid.addWidget(nodeData) // → added 事件 → onNodeAdded → rerenderNode
  return nodeData.id
}

// FR-025：属性更新仅重渲染单个节点
function updateWidgetProps({ id, propsValues, wrapperValues } = {}) {
  if (!id) return
  for (let idx = 0; idx < pages.value.length; idx++) {
    const grid = getInstance(gridKey(idx))
    const node = (grid?.engine?.nodes || []).find((n) => n.id === id)
    if (!node) continue
    node.propsValues = node.propsValues || {}
    node.wrapperValues = node.wrapperValues || {}
    if (propsValues) Object.assign(node.propsValues, propsValues)
    if (wrapperValues) Object.assign(node.wrapperValues, wrapperValues)
    rerenderNode(node, idx)
    return
  }
}

// ==================== HTML5 拖放（FR-027~029） ====================

function onDragOver(event) {
  // FR-029：非编辑模式阻止拖放
  if (props.desktopMode !== 'editing') return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}

function onDrop(event) {
  if (props.desktopMode !== 'editing') return
  event.preventDefault()
  let data = null
  try {
    data = JSON.parse(event.dataTransfer.getData('application/json'))
  } catch {
    return
  }
  if (!data || !data.compName) return
  const { compName, ...extra } = data
  const grid = getInstance(gridKey(activePageIndex.value))
  const gridEl = gridContainers.value[activePageIndex.value]
  if (!grid || !gridEl) return
  // FR-028：根据鼠标位置计算 GridStack 坐标
  const rect = gridEl.getBoundingClientRect()
  const x = Math.max(0, Math.floor((event.clientX - rect.left) / grid.cellWidth()))
  const y = Math.max(0, Math.floor((event.clientY - rect.top) / (grid.opts?.cellHeight || 80)))
  addWidget(compName, { x, y, ...extra })
}

// ==================== 数据序列化与广播 ====================

// 序列化指定页 GridStack 状态到配置数据
// 自定义字段（info/propsValues/wrapperValues）从活动引擎节点显式回填，
// 不依赖 GridStack 内部克隆行为保证往返持久化完整性
function savePageData(idx) {
  const grid = getInstance(gridKey(idx))
  const page = props.desktopConfig?.pages?.[idx]
  if (!grid || !page) return
  const saved = grid.save(false)
  const liveNodes = grid.engine?.nodes || []
  page.children = (Array.isArray(saved) ? saved : []).map((savedNode) => {
    const live = liveNodes.find((n) => n.id === savedNode.id)
    if (!live) return savedNode
    return {
      ...savedNode,
      info: savedNode.info ?? live.info,
      propsValues: savedNode.propsValues ?? live.propsValues,
      wrapperValues: savedNode.wrapperValues ?? live.wrapperValues,
    }
  })
}

// 保存所有页数据到 desktopConfig
function saveAllPages() {
  pages.value.forEach((_, idx) => savePageData(idx))
  return props.desktopConfig
}

// 获取当前页数据（先序列化再返回）
function getCurrentPageData() {
  savePageData(activePageIndex.value)
  return props.desktopConfig?.pages?.[activePageIndex.value] || null
}

// 向当前页所有 widget 广播事件（仅作用于当前实例下的小部件）
function broadcastToCurrentPageWidgets(eventName) {
  const grid = getInstance(gridKey(activePageIndex.value))
  for (const node of grid?.engine?.nodes || []) {
    emitToWidget(node.id, eventName, { id: node.id })
  }
}

// FR-008：组件卸载时销毁所有实例并清理 widget 事件注册
onBeforeUnmount(() => {
  for (const grid of getAllInstances()) unmountGridWidgets(grid)
  destroyAll(false)
})

defineExpose({
  addWidget,
  updateWidgetProps,
  switchPage,
  getCurrentPageData,
  saveAllPages,
  broadcastToCurrentPageWidgets,
})
</script>

<template>
  <div class="desktop-viewport-desktop" @dragover="onDragOver" @drop="onDrop">
    <!-- FR-001/002：slidesPerView 1，loop false，speed 300，pagination 可点击 -->
    <Swiper
      class="desktop-swiper"
      :modules="swiperModules"
      :slides-per-view="1"
      :loop="false"
      :speed="300"
      :pagination="{ clickable: true }"
      :allow-touch-move="desktopMode !== 'editing'"
      @swiper="onSwiperInit"
      @slide-change="onSlideChange"
    >
      <SwiperSlide v-for="(page, idx) in pages" :key="idx" class="desktop-slide">
        <!-- 每页独立 GridStack 容器，小部件由 rerenderNode 以 VNode 挂载（P-04） -->
        <div class="grid-stack" :ref="(el) => setGridContainer(el, idx)"></div>
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<style scoped lang="scss">
.desktop-viewport-desktop {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.desktop-swiper {
  width: 100%;
  height: 100%;
  // Swiper pagination 蓝点跟随主题色
  --swiper-pagination-color: var(--desktop-widget-header-bg);
  --swiper-pagination-bullet-inactive-color: var(--desktop-text-secondary);
}

.desktop-slide {
  overflow: hidden auto;
}

.grid-stack {
  min-height: 100%;
}
</style>
