import { GridStack } from 'gridstack'

// ============================================================
// 001-desktop-core: GridStack 多实例管理 + Widget 事件桥接
// 契约（specs/overall-api.md §useGridStack）：
//   实例管理  initGrid / destroyGrid / destroyAll / getInstance / getAllInstances
//   事件桥接  registerWidgetEmitter / unregisterWidgetEmitter /
//             emitToWidget / broadcastToAllWidgets
//   活动状态  setActive / isActive（状态变化时广播 grid-active/grid-deactive）
//
// GridStack DOM 事件 → GridStackCallbacks + Widget 事件（overall-api.md §2.3）：
//   added       → onNodeAdded       + grid-added        { id, x, y, w, h }
//   removed     → onNodeRemoved     + grid-removing     { id }
//   change      → onNodeChange      （无 widget 桥接）
//   dragstart   → onNodeDragStart   + grid-moving       { id, x, y, w, h }
//   dragstop    → onNodeDragStop    + grid-moving-end   { id, x, y, w, h }
//   resizestart → onNodeResizeStart + grid-resizing     { id, x, y, w, h }
//   resizestop  → onNodeResizeStop  + grid-resizing-end { id, x, y, w, h }
//
// P-03：模块级 Map 共享状态，桌面多页共用同一份实例注册表。
// ============================================================

// key（如 'page_0'）→ GridStack 实例
const grids = new Map()
// key → 活动状态（FR-032~034）
const activeStates = new Map()
// nodeId → widget emit 函数（WidgetEventBridge，FR-030/031）
const widgetEmitters = new Map()

// 节点位置载荷：{ id, x, y, w, h }
function nodePayload(node) {
  return { id: node.id, x: node.x, y: node.y, w: node.w, h: node.h }
}

// 向指定 widget 发送事件（未注册时静默跳过）
function emitToWidget(nodeId, eventName, payload) {
  const emit = widgetEmitters.get(nodeId)
  if (typeof emit === 'function') {
    emit(eventName, payload)
  }
}

// 向所有已注册 widget 广播事件
function broadcastToAllWidgets(eventName, payload) {
  for (const emit of widgetEmitters.values()) {
    if (typeof emit === 'function') {
      emit(eventName, payload)
    }
  }
}

// 注册 widget emit 桥接（rerenderNode 渲染完成后调用，FR-019）
function registerWidgetEmitter(nodeId, emit) {
  if (nodeId === undefined || nodeId === null) return
  widgetEmitters.set(nodeId, emit)
}

// 注销 widget emit 桥接（widget 移除时调用，FR-031）
function unregisterWidgetEmitter(nodeId) {
  widgetEmitters.delete(nodeId)
}

// GridStack DOM 事件 → 回调 + widget 事件桥接（bridgeWidgetEvent，FR-030）
function bindGridEvents(grid, key, callbacks = {}) {
  // added：先执行回调（rerenderNode 会注册 emitter），再桥接 grid-added
  grid.on('added', (event, items) => {
    for (const node of items || []) {
      callbacks.onNodeAdded?.(node, grid, key)
      emitToWidget(node.id, 'grid-added', nodePayload(node))
    }
  })
  // removed：先桥接 grid-removing（即将移除），再执行回调（回调内注销 emitter）
  grid.on('removed', (event, items) => {
    for (const node of items || []) {
      emitToWidget(node.id, 'grid-removing', { id: node.id })
      callbacks.onNodeRemoved?.(node, grid, key)
    }
  })
  grid.on('change', (event, items) => {
    for (const node of items || []) {
      callbacks.onNodeChange?.(node, grid, key)
    }
  })
  // dragstart/dragstop/resizestart/resizestop 回调签名为 (event, el)
  const elementEvents = [
    ['dragstart', 'onNodeDragStart', 'grid-moving'],
    ['dragstop', 'onNodeDragStop', 'grid-moving-end'],
    ['resizestart', 'onNodeResizeStart', 'grid-resizing'],
    ['resizestop', 'onNodeResizeStop', 'grid-resizing-end'],
  ]
  for (const [gridEvent, callbackName, widgetEvent] of elementEvents) {
    grid.on(gridEvent, (event, el) => {
      const node = el?.gridstackNode
      if (!node) return
      callbacks[callbackName]?.(node, grid, key)
      emitToWidget(node.id, widgetEvent, nodePayload(node))
    })
  }
}

// 初始化 GridStack 实例（失败时 console.error + 返回 null，overall-plan.md §4.4）
function initGrid(key, container, gridOptions = {}, callbacks = {}) {
  if (!container) {
    console.error(`[useGridStack] 初始化失败："${key}" 的容器元素不存在`)
    return null
  }
  if (grids.has(key)) {
    console.warn(`[useGridStack] 实例 "${key}" 已存在，返回现有实例`)
    return grids.get(key)
  }
  let grid = null
  try {
    grid = GridStack.init({ ...gridOptions }, container)
  } catch (error) {
    console.error(`[useGridStack] GridStack 初始化失败（key: ${key}）`, error)
    return null
  }
  bindGridEvents(grid, key, callbacks)
  grids.set(key, grid)
  activeStates.set(key, false)
  return grid
}

// 获取指定实例
function getInstance(key) {
  return grids.get(key) || null
}

// 获取所有实例
function getAllInstances() {
  return Array.from(grids.values())
}

// 销毁指定实例并清理该实例下的 widget 事件注册（FR-008）
function destroyGrid(key, removeDom = false) {
  const grid = grids.get(key)
  if (!grid) return
  for (const node of grid.engine?.nodes || []) {
    unregisterWidgetEmitter(node.id)
  }
  grid.destroy(removeDom)
  grids.delete(key)
  activeStates.delete(key)
}

// 销毁所有实例
function destroyAll(removeDom = false) {
  for (const key of Array.from(grids.keys())) {
    destroyGrid(key, removeDom)
  }
}

// 设置活动状态：变化时向该实例下所有 widget 广播 grid-active/grid-deactive
// 状态无变化时跳过广播（FR-034）；广播仅作用于目标实例下的小部件
function setActive(key, active) {
  const next = !!active
  if (!!activeStates.get(key) === next && activeStates.has(key)) return
  activeStates.set(key, next)
  const grid = grids.get(key)
  if (!grid) return
  const eventName = next ? 'grid-active' : 'grid-deactive'
  for (const node of grid.engine?.nodes || []) {
    emitToWidget(node.id, eventName, { id: node.id })
  }
}

// 查询活动状态
function isActive(key) {
  return !!activeStates.get(key)
}

// HMR：热更新本模块时销毁全部实例并清空注册表，避免旧实例/Map 泄漏
if (import.meta.hot) {
  import.meta.hot.dispose(() => destroyAll(false))
}

export function useGridStack() {
  return {
    // 实例管理
    initGrid,
    destroyGrid,
    destroyAll,
    getInstance,
    getAllInstances,
    // Widget 事件桥接
    registerWidgetEmitter,
    unregisterWidgetEmitter,
    emitToWidget,
    broadcastToAllWidgets,
    // 活动状态
    setActive,
    isActive,
  }
}
