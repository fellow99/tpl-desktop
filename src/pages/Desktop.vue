<script setup>
// ============================================================
// 201-page-index: 工作台桌面入口页编排（pages/Desktop.vue）
//
// 职责（specs/201-page-index/plan.md §2~§4 / overall-data-model.md §2.2）：
//   - 桌面配置双源加载：DEFAULT_DESKTOP_JSON.json + localStorage 合并，
//     失败时回退硬编码配置（FR-001~004）
//   - 登录认证：登录覆盖层 + 会话恢复 + 退出登录（FR-019~023）
//   - 桌面模式管理（normal/editing）与退出编辑时的持久化（FR-005）
//   - App 生命周期（打开/最小化/关闭 + grid-active/deactive 协调，FR-007~015）
//   - 快捷方式管理（FR-016~018）、字体缩放（FR-024~027）、
//     主题切换（FR-028~031）、页面增删（FR-032~035）、主页（FR-036~037）
//   - 面板显隐协调（FR-038~039）与工具条事件分发（plan.md §6）
//
// 组件树（plan.md §2.1）：
//   登录覆盖层(!loginUser) → desktop-dialog-login
//   主桌面(desktopConfig && loginUser)：
//     statusbar / main(background+viewport+app) / toolbar-main / toolbar-edit / 各面板
// ============================================================
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useTheme } from '../composables/useTheme.js'
import { useWidgetMetas } from '../composables/useWidgetMetas.js'
import { useAppMetas } from '../composables/useAppMetas.js'
import { useBackgroundMetas } from '../composables/useBackgroundMetas.js'
import { useWujie } from '../composables/useWujie.js'
import { WidgetComponents } from '../widgets/index.js'
import { AppComponents } from '../apps/index.js'
import { logout, restoreSession } from '../api/auth-service.js'

// localStorage 持久化键（overall-data-model.md §3.1）
const STORAGE_KEY = 'dashboard-desktop-data'

// fetch 失败时的硬编码回退配置（FR-002）
const FALLBACK_CONFIG = {
  theme: 'light',
  'font-size': '16px',
  grid: { cols: 12, rows: 8 },
  background: null,
  pages: [{ title: '', children: [] }],
  shortcuts: [],
}

// ==================== 桌面状态（overall-data-model.md §2.2） ====================
const desktopMode = ref('normal')
const currentPageIndex = ref(0)
const desktopConfig = ref(null)
// 003-app-system：当前打开的 App 实例（独立 ref，不持久化，overall-data-model.md §1.8）
const desktopApps = ref([])
// 003-app-system：App 列表面板可见性
const appListVisible = ref(false)
// 003-app-system：App 应用市场可见性（与 app-list 平级挂载，避免 el-dialog 嵌套）
const appStoreVisible = ref(false)
// app-list 组件引用（store confirm → addFromStore 回写列表）
const appListRef = ref(null)
// 006-prop-editor：属性编辑面板状态（overall-data-model.md §2.2）
const widgetPropsVisible = ref(false)
const widgetPropsNode = ref(null)
const widgetPropsMeta = ref(null)
// 002-widget-system：看板组件选择列表可见性（编辑工具条「部件」入口）
const widgetListVisible = ref(false)
// 004-background-system：背景选择列表可见性（编辑工具条「背景」入口）
const backgroundListVisible = ref(false)
// 登录状态（FR-019~022）：loginUser 为空时登录覆盖层阻止进入桌面
const loginUser = ref(null)
const showLoginDialog = ref(false)

const viewportRef = ref(null)
const { setTheme } = useTheme()
const { widgetMetas } = useWidgetMetas()

// ==================== 配置加载与持久化 ====================

// 双源加载：fetch 默认配置 → 合并 localStorage 用户配置（{ ...default, ...stored }）
async function loadDesktopConfig() {
  let defaults = null
  try {
    const res = await fetch('/DEFAULT_DESKTOP_JSON.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    defaults = await res.json()
  } catch (error) {
    console.error('[Desktop] 默认桌面配置加载失败，使用内置回退配置', error)
    defaults = FALLBACK_CONFIG
  }

  // localStorage 解析失败：静默回退到默认配置
  let stored = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    stored = raw ? JSON.parse(raw) : null
  } catch {
    stored = null
  }

  const merged = stored && typeof stored === 'object' && !Array.isArray(stored)
    ? { ...defaults, ...stored }
    : { ...defaults }
  // pages 结构兜底：保证视口始终有至少一页可渲染
  if (!Array.isArray(merged.pages) || !merged.pages.length) {
    merged.pages = [{ title: '', children: [] }]
  }
  desktopConfig.value = merged
}

// 持久化完整桌面配置到 localStorage
function persistConfig() {
  if (!desktopConfig.value) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(desktopConfig.value))
  } catch (error) {
    console.warn('[Desktop] 桌面配置持久化失败', error)
  }
}

// ==================== 登录认证（FR-019~023） ====================

// 登录成功（desktop-dialog-login success）：
// 用户信息已由 auth-service 缓存到 dashboard-login-user（不含密码，S-01）
function handleLoginSuccess(user) {
  loginUser.value = user
  showLoginDialog.value = false
}

// 退出登录（statusbar logout）：清除登录信息与桌面配置后刷新（FR-023）
function handleLogout() {
  logout()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage 不可用时静默忽略
  }
  window.location.reload()
}

// ==================== 模式切换（statusbar / toolbar-edit 入口） ====================

function enterEditMode() {
  desktopMode.value = 'editing'
}

function exitEditMode() {
  desktopMode.value = 'normal'
}

// 退出编辑 → 序列化所有页布局并持久化（FR-005 + overall-plan.md §4.3）
watch(desktopMode, (mode) => {
  if (mode === 'normal') {
    widgetListVisible.value = false
    backgroundListVisible.value = false
    widgetPropsVisible.value = false
    viewportRef.value?.saveAllPages()
    persistConfig()
  }
})

// ==================== 页面增删（FR-032~035） ====================

// 在当前页之前插入空页面并切换过去（FR-032/033）
function handleAddPageBefore() {
  if (!desktopConfig.value) return
  const idx = currentPageIndex.value
  // 先序列化现有布局，避免重建实例时丢失未保存的变更
  viewportRef.value?.saveAllPages()
  desktopConfig.value.pages.splice(idx, 0, { title: '', children: [] })
  persistConfig()
  nextTick(() => {
    viewportRef.value?.switchPage(idx)
    currentPageIndex.value = idx
  })
}

// 在当前页之后插入空页面并切换过去（FR-032/033）
function handleAddPageAfter() {
  if (!desktopConfig.value) return
  const idx = currentPageIndex.value
  viewportRef.value?.saveAllPages()
  desktopConfig.value.pages.splice(idx + 1, 0, { title: '', children: [] })
  persistConfig()
  nextTick(() => {
    viewportRef.value?.switchPage(idx + 1)
    currentPageIndex.value = idx + 1
  })
}

// 移除当前页（最少保留一页，FR-034/035）
function handleRemovePage() {
  const pages = desktopConfig.value?.pages
  if (!pages || pages.length <= 1) return
  viewportRef.value?.saveAllPages()
  pages.splice(currentPageIndex.value, 1)
  if (currentPageIndex.value > pages.length - 1) {
    currentPageIndex.value = pages.length - 1
  }
  persistConfig()
}

// ==================== 字体缩放（FR-024~027） ====================

function currentFontSize() {
  return parseInt(desktopConfig.value?.['font-size']) || 16
}

// 加大：+2px（FR-024）
function handleFontSizeIncrease() {
  if (!desktopConfig.value) return
  desktopConfig.value['font-size'] = `${currentFontSize() + 2}px`
  persistConfig()
}

// 减小：-2px，最小 10px（FR-024）
function handleFontSizeDecrease() {
  if (!desktopConfig.value) return
  desktopConfig.value['font-size'] = `${Math.max(10, currentFontSize() - 2)}px`
  persistConfig()
}

// 还原：16px（FR-025）
function handleFontSizeReset() {
  if (!desktopConfig.value) return
  desktopConfig.value['font-size'] = '16px'
  persistConfig()
}

// ==================== 主页按钮（FR-036~037） ====================

// 回首页并最小化所有已打开的 App（不关闭）
function handleHome() {
  desktopApps.value.forEach((app) => {
    app.state = 'minimize'
  })
  currentPageIndex.value = 0
  viewportRef.value?.switchPage(0)
}

// ==================== 视口事件接线 ====================

// 002-widget-system T5/T6：看板组件列表选择 → 视口 addWidget
// mergedMeta（preset 变体合并元数据）翻译为视口 options（rect/title/props 覆盖默认值）
function onWidgetListAdd(compName, mergedMeta) {
  if (!viewportRef.value) return
  if (!mergedMeta) {
    viewportRef.value.addWidget(compName)
    return
  }
  const options = {}
  if (mergedMeta.rect?.width) options.w = mergedMeta.rect.width
  if (mergedMeta.rect?.height) options.h = mergedMeta.rect.height
  if (mergedMeta.presetKey) options.presetKey = mergedMeta.presetKey
  if (mergedMeta.title) options.wrapperValues = { title: mergedMeta.title }
  // 仅当 preset 覆盖了 props 时才传 propsValues（浅合并保持引用：
  // 未覆盖时 mergedMeta.props 与注册表 base meta.props 同引用），
  // 基础默认值由视口 addWidget 自行从元数据计算
  const baseProps = widgetMetas.value[compName]?.props
  if (mergedMeta.props && mergedMeta.props !== baseProps) {
    const propsValues = {}
    for (const [key, propMeta] of Object.entries(mergedMeta.props)) {
      propsValues[key] = propMeta?.default
    }
    options.propsValues = propsValues
  }
  viewportRef.value.addWidget(compName, options)
}

// 004-background-system：背景选择 → 更新配置 + 按元数据自动切换主题 + 立即持久化
// desktopConfig.background 仅存 { type, name, title, category }（overall-data-model.md §1.7），
// 实际资源路径由 desktop-background 按 name 从 backgroundMetas 解析
function onSelectBackground(meta) {
  if (!desktopConfig.value || !meta) return
  desktopConfig.value.background = {
    type: meta.type,
    name: meta.name,
    title: meta.title,
    category: meta.category,
  }
  // FR-030：选择背景时自动切换对应主题（light/dark）
  if (meta.theme) {
    setTheme(meta.theme)
    desktopConfig.value.theme = meta.theme
  }
  persistConfig()
}

// 006-prop-editor：外壳编辑按钮 → 记录编辑目标并打开属性面板
function onWidgetEdit(node, meta) {
  widgetPropsNode.value = node
  widgetPropsMeta.value = meta
  widgetPropsVisible.value = true
}

// 006-prop-editor：属性面板「应用」→ 视口更新节点并重渲染（plan.md §4.2），
// 随后立即序列化持久化（退出编辑模式的 saveAllPages 仍会兜底，
// 此处额外持久化防止编辑期间刷新页面丢失已应用的修改）
function onWidgetPropsConfirm(payload) {
  if (!payload) return
  viewportRef.value?.updateWidgetProps(payload)
  viewportRef.value?.saveAllPages()
  persistConfig()
}

function onPageChange(newIndex) {
  currentPageIndex.value = newIndex
  // 页面切换完成后：若有 App 打开，向新激活页 widget 补发 grid-deactive，
  // 避免视口 setActive 广播的 grid-active 让新页 widget 在 App 之下保持激活
  nextTick(() => {
    if (desktopApps.value.length > 0) {
      viewportRef.value?.broadcastToCurrentPageWidgets('grid-deactive')
      widgetsDeactivated = true
    }
  })
}

// ==================== App 生命周期（003-app-system） ====================

// 打开 App：push §1.8 运行时实例（instanceId/compName/compId?/appMeta/wrapperValues/state）
// 偏差说明（deliberate deviation from spec §9.2 push-only）：
//   同一 App（compId 优先，回退 compName）已打开时不重复创建，
//   而是恢复该实例（state=null）并移到数组末尾（z 序最顶）——
//   桌面惯例：重复打开等于聚焦/恢复已有实例并置顶。
function handleAddApp({ compName, compId, appMeta } = {}) {
  if (!compName) return
  const existingIdx = desktopApps.value.findIndex((app) =>
    compId && app.compId ? app.compId === compId : app.compName === compName,
  )
  if (existingIdx >= 0) {
    const [existing] = desktopApps.value.splice(existingIdx, 1)
    existing.state = null
    desktopApps.value.push(existing)
    return
  }
  desktopApps.value.push({
    // 稳定实例标识（v-for key 用，与 compId/compName 无关的唯一值）
    instanceId: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    compName,
    ...(compId ? { compId } : {}),
    appMeta: appMeta || null,
    wrapperValues: { title: appMeta?.title || compName },
    state: null,
  })
}

// 最小化：state='minimize'（CSS 隐藏，实例保活，§1.8）
function handleMinimizeApp(app) {
  if (app) app.state = 'minimize'
}

// 关闭：从数组移除 → v-for 响应式销毁实例（spec.md §9.3）
// instanceId 优先匹配（响应式代理下引用比较不可靠），缺失时回退引用匹配
function handleRemoveApp(app) {
  if (!app) return
  const idx = desktopApps.value.findIndex((item) =>
    app.instanceId ? item.instanceId === app.instanceId : item === app,
  )
  if (idx >= 0) desktopApps.value.splice(idx, 1)
}

// toolbar-main 运行中 App 点击：最小化 ↔ 恢复切换
function handleToggleAppState(app) {
  if (app) app.state = app.state === 'minimize' ? null : 'minimize'
}

// 应用市场确认（FR-038 流程：列表＋ → store → confirm → 条目回写列表）：
// store 与 app-list 平级挂载（避免 el-dialog 嵌套），confirm 后通过
// app-list 暴露的 addFromStore 完成 hashId 生成与 localStorage 持久化；
// 若列表已被关闭则先重新打开，nextTick 确保挂载与加载完成后再回写
function onStoreConfirm(appMeta) {
  if (!appMeta) return
  if (!appListVisible.value) appListVisible.value = true
  nextTick(() => {
    appListRef.value?.addFromStore(appMeta)
  })
}

// 快捷调用固定/移除（FR-016~018）：shortcuts 存完整元数据并随配置持久化
function handleToggleShortcut({ compName, compId, appMeta } = {}) {
  if (!desktopConfig.value || !compName) return
  const shortcuts = Array.isArray(desktopConfig.value.shortcuts)
    ? desktopConfig.value.shortcuts
    : (desktopConfig.value.shortcuts = [])
  const idx = shortcuts.findIndex((s) =>
    compId && s?.compId ? s.compId === compId : s?.compName === compName,
  )
  if (idx >= 0) {
    shortcuts.splice(idx, 1)
  } else {
    shortcuts.push({ compName, appMeta, ...(compId ? { compId } : {}) })
  }
  persistConfig()
}

// ==================== App ↔ Widget 事件管理（FR-013~015 + overall-plan.md §4.5） ====================

// 300ms debounce：快速打开/关闭抖动只广播最终状态，防止事件顺序混乱
let appEventTimer = null
// 当前 widget 是否处于 deactive 状态（避免重复广播同一状态）
let widgetsDeactivated = false

watch(() => desktopApps.value.length, (len) => {
  const hasApps = len > 0
  if (appEventTimer) clearTimeout(appEventTimer)
  appEventTimer = setTimeout(() => {
    appEventTimer = null
    if (hasApps && !widgetsDeactivated) {
      viewportRef.value?.broadcastToCurrentPageWidgets('grid-deactive')
      widgetsDeactivated = true
    } else if (!hasApps && widgetsDeactivated) {
      viewportRef.value?.broadcastToCurrentPageWidgets('grid-active')
      widgetsDeactivated = false
    }
  }, 300)
})

// ==================== 初始化（plan.md §4.11 + 007-wujie-system §5.3） ====================

// 子应用加载状态（用于模板显示加载文案）
const pluginsLoading = ref(true)

onMounted(async () => {
  // 007-wujie-system: 先初始化所有 wujie 子应用，再加载桌面配置
  const { initAllPlugins, pluginExports, pluginMetas } = useWujie()
  const { injectWidgets } = useWidgetMetas()
  const { injectApps } = useAppMetas()
  const { injectBackgrounds } = useBackgroundMetas()

  // 初始化子应用（内部使用 Promise.allSettled，不会因单个失败而阻塞）
  await initAllPlugins()

  // 子应用就绪后，将其导出的组件/元数据注入到主应用注册表
  for (const plugin of pluginMetas.value) {
    const exports = pluginExports.value[plugin.name]
    if (exports) {
      if (exports.widgets) injectWidgets(plugin.name, exports.widgets)
      if (exports.apps) injectApps(plugin.name, exports.apps)
      if (exports.backgrounds) injectBackgrounds(plugin.name, exports.backgrounds)

      // 将子应用的 Vue 组件定义注册到主应用 Vue 实例和组件字典
      const { getPluginComponents } = useWujie()
      const components = getPluginComponents(plugin.name)
      const mainApp = window.__MAIN_VUE_APP__
      if (mainApp && components) {
        for (const [compName, comp] of Object.entries(components)) {
          // 注册到 Vue 全局组件（供模板 <component :is> 解析）
          mainApp.component(compName, comp)
          // 注入到 import.meta.glob 构建的静态组件字典
          // （viewport-app 使用 AppComponents[compName]，viewport-desktop 使用 WidgetComponents[compName]）
          if (!(compName in AppComponents)) {
            AppComponents[compName] = comp
          }
          if (!(compName in WidgetComponents)) {
            WidgetComponents[compName] = comp
          }
        }
      }
    }
  }
  pluginsLoading.value = false

  await loadDesktopConfig()
  // FR-031：页面加载时应用 desktopConfig.theme
  if (desktopConfig.value?.theme) setTheme(desktopConfig.value.theme)
  // FR-022：检查缓存的登录信息 —— 有效则恢复会话，无效则显示登录框
  const stored = restoreSession()
  if (stored) {
    loginUser.value = stored
  } else {
    showLoginDialog.value = true
  }
})

onBeforeUnmount(() => {
  if (appEventTimer) clearTimeout(appEventTimer)
  // FR-006：组件卸载前保存桌面配置
  if (loginUser.value && desktopConfig.value) {
    viewportRef.value?.saveAllPages()
    persistConfig()
  }
})
</script>

<template>
  <div class="tpl-desktop" :style="{ fontSize: desktopConfig?.['font-size'] || '16px' }">
    <!-- 007-wujie-system: wujie 子应用隐藏挂载容器（不渲染可见内容，仅用于 JS 沙箱） -->
    <div id="wujie-plugins-container" style="display:none"></div>

    <!-- 登录覆盖层（FR-019）：未登录时阻止访问桌面 -->
    <div v-if="!loginUser" class="desktop-login-layer">
      <desktop-dialog-login v-if="showLoginDialog" @success="handleLoginSuccess" />
    </div>

    <!-- 主桌面（plan.md §2.1：desktopConfig && loginUser） -->
    <template v-if="desktopConfig && loginUser">
      <!-- 顶部状态栏：时钟 + 用户信息/登出 -->
      <desktop-statusbar
        :user-info="loginUser"
        @logout="handleLogout"
      />

      <!-- 主区域（flex:1）：背景(z0) < 视口(z1) < App 叠加层(z10) -->
      <div class="desktop-main">
        <!-- 004-background-system：背景渲染层（不拦截交互） -->
        <desktop-background :background="desktopConfig?.background" />

        <desktop-viewport-desktop
          ref="viewportRef"
          class="desktop-viewport-layer"
          :desktop-config="desktopConfig"
          :desktop-mode="desktopMode"
          :current-page-index="currentPageIndex"
          :user-info="loginUser"
          @widget-edit="onWidgetEdit"
          @page-change="onPageChange"
        />

        <!-- 003-app-system：App 渲染图层，浮动在视口之上 -->
        <desktop-viewport-app
          class="desktop-app-layer"
          :apps="desktopApps"
          @minimize-app="handleMinimizeApp"
          @remove-app="handleRemoveApp"
        />
      </div>

      <!-- 底部主工具条（常规模式）：编辑桌面 + 主页 + App列表 + 快捷方式 + 运行中 App -->
      <desktop-toolbar-main
        v-if="desktopMode === 'normal'"
        :shortcuts="desktopConfig?.shortcuts || []"
        :apps="desktopApps"
        @enter-edit="enterEditMode"
        @home="handleHome"
        @show-app-list="appListVisible = true"
        @add-app="handleAddApp"
        @toggle-app-state="handleToggleAppState"
        @close-app="handleRemoveApp"
      />

      <!-- 底部编辑工具条（编辑模式）：主题/部件/页面/字号/完成 -->
      <desktop-toolbar-edit
        v-if="desktopMode === 'editing'"
        :can-remove-page="(desktopConfig?.pages?.length || 0) > 1"
        @show-background-list="backgroundListVisible = true"
        @show-widget-list="widgetListVisible = true"
        @add-page-before="handleAddPageBefore"
        @add-page-after="handleAddPageAfter"
        @remove-page="handleRemovePage"
        @font-size-increase="handleFontSizeIncrease"
        @font-size-decrease="handleFontSizeDecrease"
        @font-size-reset="handleFontSizeReset"
        @exit-edit="exitEditMode"
      />

      <!-- 002-widget-system：看板组件选择列表（编辑工具条「部件」入口打开） -->
      <desktop-widget-list
        v-if="widgetListVisible"
        @add-widget="onWidgetListAdd"
        @close="widgetListVisible = false"
      />

      <!-- 004-background-system：背景选择列表（编辑工具条「背景」入口打开） -->
      <desktop-background-list
        v-if="backgroundListVisible"
        :current-background="desktopConfig?.background"
        @select-background="onSelectBackground"
        @close="backgroundListVisible = false"
      />

      <!-- 006-prop-editor：属性编辑面板（widgetEdit 打开，应用 → 视口更新 + 持久化） -->
      <desktop-property-panel
        v-model:visible="widgetPropsVisible"
        :node="widgetPropsNode"
        :meta="widgetPropsMeta"
        @confirm="onWidgetPropsConfirm"
      />

      <!-- 003-app-system：App 列表面板（快捷方式管理 + 应用市场入口） -->
      <desktop-app-list
        v-if="appListVisible"
        ref="appListRef"
        :shortcuts="desktopConfig?.shortcuts || []"
        @add-app="handleAddApp"
        @toggle-shortcut="handleToggleShortcut"
        @open-store="appStoreVisible = true"
        @close="appListVisible = false"
      />

      <!-- 003-app-system：App 应用市场（与 app-list 平级挂载，避免 el-dialog 嵌套） -->
      <desktop-app-store
        v-if="appStoreVisible"
        @confirm="onStoreConfirm"
        @close="appStoreVisible = false"
      />
    </template>

    <!-- 配置加载中（已登录但配置未就绪，含子应用加载阶段） -->
    <div v-else-if="loginUser" class="desktop-loading">
      {{ pluginsLoading ? '子应用加载中…' : '桌面配置加载中…' }}
    </div>
  </div>
</template>

<style scoped lang="scss">
// plan.md §2.2：flex 列式分区（statusbar 固定高 + main 填充 + toolbars fixed）
.tpl-desktop {
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--desktop-bg-primary);
}

// 登录覆盖层（FR-019）：全屏遮挡，登录对话框由 el-dialog 渲染在其上
.desktop-login-layer {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--desktop-bg-primary);
}

.desktop-loading {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  color: var(--desktop-text-secondary);
}

// 主区域：填充 statusbar 以下全部空间，承载背景/视口/App 三层
.desktop-main {
  position: relative;
  flex: 1;
  overflow: hidden;
}

// 视口位于背景渲染层（z-index 0）之上
.desktop-viewport-layer {
  position: relative;
  z-index: 1;
  height: 100%;
}

// App 叠加层位于视口之上、工具条/面板之下
.desktop-app-layer {
  z-index: 10;
}
</style>
