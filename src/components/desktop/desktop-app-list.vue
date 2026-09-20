<script setup>
// ============================================================
// 003-app-system: App 列表（desktop-app-list，R3 / T-015）
//
// 契约（spec.md FR-032~FR-040 / plan.md Step G）：
//   数据  : localStorage KEY 'dashboard-desktop-apps'（FR-034~036）
//           onMounted 反序列化加载，watch deep 自动持久化
//   布局  : el-dialog + category-tabs + app-grid（FR-032）
//   Props : shortcuts — desktopConfig.shortcuts（完整元数据条目，
//           用于 📌/🔘 图标判断，FR-039）
//   Emits : add-app({ compName, compId, appMeta })      — 点击 App 图标（FR-011）
//           toggle-shortcut({ compName, compId, appMeta }) — 快捷调用按钮（Step C）
//           open-store                                  — `+` 按钮（FR-037，
//           store 由 Desktop.vue 平级挂载，避免 el-dialog 嵌套）
//           close                                       — 关闭面板
//   Expose: addFromStore(appMeta) — store confirm 回写：hash 生成 compId
//           后入列并自动持久化（FR-038）
//
// 条目结构（DesktopAppEntry）：enriched AppMeta + compId 字段
// （plan Step G：appMeta.compId = hashId(JSON.stringify(appMeta))）。
// ============================================================
import { ref, computed, watch, onMounted } from 'vue'
import { useAppMetas } from '../../composables/useAppMetas.js'

const props = defineProps({
  // desktopConfig.shortcuts：[{ compName, appMeta, compId? }]
  shortcuts: { type: Array, default: () => [] },
})

const emit = defineEmits(['addApp', 'toggleShortcut', 'openStore', 'close'])

const { appMetas } = useAppMetas()

// ==================== localStorage 驱动的 App 列表（FR-034~036） ====================

const STORAGE_KEY = 'dashboard-desktop-apps'

const desktopApps = ref([])
// 初次加载完成前禁止持久化（防止 watch deep 在 mounted 加载前用空数组覆盖存储）
let loaded = false

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    desktopApps.value = Array.isArray(parsed) ? parsed : []
  } catch {
    desktopApps.value = []
  }
  loaded = true
}

function saveToStorage() {
  if (!loaded) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(desktopApps.value))
  } catch (error) {
    console.warn('[app-list] App 列表持久化失败', error)
  }
}

onMounted(loadFromStorage)
// 数据变更自动持久化（R3 决策 2）
watch(desktopApps, saveToStorage, { deep: true })

// hashId：字符串 hash 生成 compId（FR-038，djb2 变体）
function hashId(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

// ==================== 分类标签栏（FR-032 / TC-011 / TC-016） ====================

const ALL_CATEGORY = '全部'
const activeCategory = ref(ALL_CATEGORY)

// 分类 = 已添加 App 的分类 ∪ 已注册 AppMeta 的分类（TC-016：空列表仍显示注册分类）
const categories = computed(() => {
  const present = new Set()
  for (const item of desktopApps.value) present.add(item.category || '其他')
  for (const meta of Object.values(appMetas.value || {})) present.add(meta.category || '其他')
  return [ALL_CATEGORY, ...[...present].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))]
})

// 筛选 + 排序：先按分类排序，再按名称排序（FR-010）
const filteredApps = computed(() => {
  const items =
    activeCategory.value === ALL_CATEGORY
      ? [...desktopApps.value]
      : desktopApps.value.filter((item) => (item.category || '其他') === activeCategory.value)
  return items.sort((a, b) => {
    const ca = a.category || '其他'
    const cb = b.category || '其他'
    return ca.localeCompare(cb, 'zh-Hans-CN') || (a.title || '').localeCompare(b.title || '', 'zh-Hans-CN')
  })
})

// ==================== 快捷调用 / 移除（FR-039） ====================

// 是否已固定为快捷方式：compId 优先匹配，回退 compName
function isShortcut(item) {
  return (props.shortcuts || []).some((s) =>
    s?.compId && item.compId ? s.compId === item.compId : s?.compName === item.compName,
  )
}

function onToggleShortcut(item) {
  emit('toggleShortcut', { compName: item.compName, compId: item.compId, appMeta: item })
}

function onRemoveApp(item) {
  const idx = desktopApps.value.indexOf(item)
  if (idx >= 0) desktopApps.value.splice(idx, 1) // watch deep → 自动持久化
}

// ==================== 启动 App（FR-011） ====================

function onAppClick(item) {
  // 浅拷贝解除响应式代理，避免外部持有列表内部条目引用
  emit('addApp', { compName: item.compName, compId: item.compId, appMeta: { ...item } })
  emit('close')
}

// ==================== 应用市场（FR-037/FR-038） ====================

// `+` 按钮 → 通知 Desktop.vue 打开平级挂载的 desktop-app-store
function onOpenStore() {
  emit('openStore')
}

// store confirm 回写（Desktop.vue 调用）：hash 生成 compId 后入列，
// watch deep → 自动持久化
function addFromStore(appMeta) {
  if (!appMeta) return
  const compId = hashId(JSON.stringify(appMeta))
  desktopApps.value.push({ ...appMeta, compId })
}

defineExpose({ addFromStore })
</script>

<template>
  <el-dialog
    :model-value="true"
    title="App 列表"
    width="56vw"
    @close="emit('close')"
  >
    <!-- 分类标签栏 -->
    <div class="app-list-tabs">
      <button
        v-for="category in categories"
        :key="category"
        class="tab-btn"
        :class="{ 'is-active': activeCategory === category }"
        type="button"
        @click="activeCategory = category"
      >
        {{ category }}
      </button>
    </div>

    <!-- App 网格 -->
    <div class="app-grid">
      <div
        v-for="(item, idx) in filteredApps"
        :key="`${item.compId || item.compName}_${idx}`"
        class="app-item"
        :title="item.title"
        @click="onAppClick(item)"
      >
        <!-- 浮动工具条（FR-039）：快捷调用 + 移除 -->
        <div class="app-item-tools" @click.stop>
          <button
            class="tool-btn"
            type="button"
            :title="isShortcut(item) ? '取消快捷调用' : '固定为快捷调用'"
            @click="onToggleShortcut(item)"
          >
            <span v-if="isShortcut(item)" class="ss-icon ss-icon-pushpin"></span>
            <span v-else class="ss-icon ss-icon-apps"></span>
          </button>
          <button class="tool-btn" type="button" title="移除" @click="onRemoveApp(item)">
            <span class="ss-icon ss-icon-close"></span>
          </button>
        </div>
        <div class="app-item-icon">
          <img v-if="item.thumbnail || item.avatar" :src="item.thumbnail || item.avatar" alt="" />
          <span v-else class="icon-fallback">{{ (item.title || item.compName || '?').slice(0, 1) }}</span>
        </div>
        <div class="app-item-title">{{ item.title || item.compName }}</div>
      </div>

      <!-- `+`：打开应用市场（FR-037，空列表时仍显示，TC-016） -->
      <div class="app-item app-item-add" title="从应用市场添加" @click="onOpenStore">
        <div class="app-item-icon"><span class="icon-add">＋</span></div>
        <div class="app-item-title">添加应用</div>
      </div>
    </div>

    <!-- 空列表提示 -->
    <div v-if="!desktopApps.length" class="app-list-empty">
      暂无已添加的 App，点击「＋」从应用市场添加
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.app-list-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.tab-btn {
  padding: 4px 12px;
  border: 1px solid var(--desktop-border);
  border-radius: 14px;
  background: transparent;
  color: var(--desktop-text-secondary);
  font-size: 0.8125em;
  cursor: pointer;

  &:hover {
    color: var(--desktop-text-primary);
  }

  &.is-active {
    border-color: var(--desktop-widget-header-bg);
    background: var(--desktop-widget-header-bg);
    color: var(--desktop-widget-header-text);
  }
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 12px;
  min-height: 120px;
  max-height: 48vh;
  overflow: auto;
}

.app-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border: 1px solid var(--desktop-border-light);
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    border-color: var(--desktop-widget-header-bg);
    background: var(--desktop-bg-secondary);

    .app-item-tools {
      opacity: 1;
      pointer-events: auto;
    }
  }
}

// 右上角浮动小工具条（hover 显示）
.app-item-tools {
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  gap: 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.tool-btn {
  padding: 1px 2px;
  border: none;
  background: transparent;
  font-size: 0.75em;
  line-height: 1;
  cursor: pointer;
}

.app-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;

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
  border-radius: 10px;
  background: var(--desktop-widget-header-bg);
  color: var(--desktop-widget-header-text);
  font-size: 1.25em;
}

.icon-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border: 1px dashed var(--desktop-border);
  border-radius: 10px;
  color: var(--desktop-text-secondary);
  font-size: 1.5em;
}

.app-item-title {
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--desktop-text-primary);
  font-size: 0.8125em;
}

.app-item-add:hover .icon-add {
  border-color: var(--desktop-widget-header-bg);
  color: var(--desktop-widget-header-bg);
}

.app-list-empty {
  padding: 12px 0 0;
  text-align: center;
  color: var(--desktop-text-secondary);
  font-size: 0.875em;
}
</style>
