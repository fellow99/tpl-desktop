<script setup>
// ============================================================
// 003-app-system: App 应用市场（desktop-app-store，R3 / T-016）
//
// 契约（spec.md FR-041~FR-045 / plan.md Step H）：
//   数据  : useAppMetas 获取全部已注册 AppMeta（FR-042）
//   布局  : leftside-main-rightside 三栏（FR-043）
//     leftside : el-tree 两级树（category → AppMeta），default-expand-all
//     main     : App 实例预览区，h() + render() 动态创建（R3 决策 3）
//     rightside: 应用配置 form（title/category）+ App 属性配置区域
//   Emits : confirm(enrichedAppMeta) — 「添加」注入属性默认值后返回（FR-045）
//           close                    — 「取消」/关闭对话框
//
// 属性配置区域使用 006-prop-editor 的 desktop-property-form 动态表单
// （plan.md Step H）：表单就地修改 propsValues → 下方 deep watch 刷新预览。
// ============================================================
import { ref, reactive, computed, watch, nextTick, h, render, getCurrentInstance, onBeforeUnmount } from 'vue'
import { useAppMetas } from '../../composables/useAppMetas.js'
import { AppComponents } from '../../apps/index.js'

const emit = defineEmits(['confirm', 'close'])

const { appMetas } = useAppMetas()
// 绑定 appContext 确保预览 VNode 的依赖注入/全局组件完整
const appContext = getCurrentInstance()?.appContext || null

// ==================== el-tree 两级分类树（FR-043 leftside） ====================

// treeData：[{ label: category, children: [{ label: meta.title, compName }] }]
const treeData = computed(() => {
  const groups = {}
  for (const meta of Object.values(appMetas.value || {})) {
    const category = meta.category || '其他'
    if (!groups[category]) groups[category] = []
    groups[category].push({ label: meta.title, compName: meta.compName })
  }
  return Object.keys(groups)
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
    .map((category) => ({
      label: category,
      children: groups[category].sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN')),
    }))
})

const hasApps = computed(() => Object.keys(appMetas.value || {}).length > 0)

// ==================== 选中状态与配置 form ====================

const selectedCompName = ref('')
const selectedMeta = computed(() => appMetas.value[selectedCompName.value] || null)
// 应用配置 form：title/category 默认填充选中元数据（FR-043 rightside 上方）
const formValues = reactive({ title: '', category: '' })
// App 实例属性值（key → value），默认取 props.xxx.default
const propsValues = ref({})

function onNodeClick(data) {
  // 仅二级 App 叶子节点触发选中（一级 category 节点无 compName）
  if (!data.compName) return
  selectedCompName.value = data.compName
  const meta = appMetas.value[data.compName]
  formValues.title = meta?.title || data.compName
  formValues.category = meta?.category || '其他'
  const values = {}
  for (const [key, propMeta] of Object.entries(meta?.props || {})) {
    values[key] = propMeta?.default
  }
  propsValues.value = values
}

// ==================== main 预览区（h() + render()，R3 决策 3） ====================

const previewEl = ref(null)

function renderPreview() {
  if (!previewEl.value) return
  render(null, previewEl.value)
  const meta = selectedMeta.value
  if (!meta) return
  const Comp = AppComponents[meta.compName] || null
  const vnode = Comp
    ? h(Comp, { ...propsValues.value })
    : h(
        'div',
        { style: 'display:flex;align-items:center;justify-content:center;height:100%;color:var(--desktop-text-secondary);' },
        `App「${meta.compName}」未找到`,
      )
  if (appContext) vnode.appContext = appContext
  render(vnode, previewEl.value)
}

// 选中切换 / 属性变更 → 立刻刷新预览实例（FR-044）
watch([selectedCompName, propsValues], () => {
  nextTick(renderPreview)
}, { deep: true })

onBeforeUnmount(() => {
  if (previewEl.value) render(null, previewEl.value)
})

// ==================== 底部按钮（FR-045） ====================

function onCancel() {
  emit('close')
}

function onConfirm() {
  const meta = selectedMeta.value
  if (!meta) return
  // 以选中 AppMeta 为基础深拷贝，注入 form 的 title/category 与属性默认值
  const enriched = JSON.parse(JSON.stringify(meta))
  enriched.title = formValues.title || meta.title
  enriched.category = formValues.category || meta.category || '其他'
  enriched.props = enriched.props || {}
  for (const [key, value] of Object.entries(propsValues.value)) {
    if (!enriched.props[key]) enriched.props[key] = {}
    enriched.props[key].default = value
  }
  emit('confirm', enriched)
  emit('close')
}
</script>

<template>
  <el-dialog
    :model-value="true"
    title="App 应用市场"
    width="72vw"
    :close-on-click-modal="false"
    @close="emit('close')"
  >
    <div class="app-store-body">
      <!-- leftside：el-tree 分类树（FR-043） -->
      <aside class="store-aside">
        <el-tree
          v-if="hasApps"
          :data="treeData"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          @node-click="onNodeClick"
        />
        <div v-else class="store-empty">暂无可用的 App 应用</div>
      </aside>

      <!-- main：App 实例预览区 -->
      <main class="store-main">
        <div v-if="!selectedMeta" class="store-empty">
          {{ hasApps ? '请在左侧选择要预览的 App' : '暂无可用的 App 应用，无法预览' }}
        </div>
        <div v-show="selectedMeta" ref="previewEl" class="store-preview"></div>
      </main>

      <!-- rightside：应用配置 form + 属性配置区域 -->
      <aside class="store-rightside">
        <template v-if="selectedMeta">
          <div class="config-section">
            <div class="config-section-title">应用配置</div>
            <div class="config-item">
              <span class="config-label">应用名称</span>
              <el-input v-model="formValues.title" size="small" placeholder="应用名称" />
            </div>
            <div class="config-item">
              <span class="config-label">应用分类</span>
              <el-input v-model="formValues.category" size="small" placeholder="应用分类" />
            </div>
          </div>
          <div class="config-section">
            <div class="config-section-title">属性配置</div>
            <!-- 006-prop-editor 动态属性表单：就地修改 propsValues → deep watch 刷新预览 -->
            <desktop-property-form :value="propsValues" :props="selectedMeta?.props" />
          </div>
        </template>
        <div v-else class="store-empty">选择 App 后可配置属性</div>
      </aside>
    </div>

    <template #footer>
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" :disabled="!selectedMeta" @click="onConfirm">添加</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.app-store-body {
  display: flex;
  height: 56vh;
  border: 1px solid var(--desktop-border-light);
  border-radius: 4px;
  overflow: hidden;
}

.store-aside {
  flex-shrink: 0;
  width: 200px;
  overflow: auto;
  padding: 8px 4px;
  border-right: 1px solid var(--desktop-border-light);

  :deep(.el-tree) {
    background: transparent;
    color: var(--desktop-text-primary);
  }
}

.store-main {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  background: var(--desktop-bg-secondary);
}

.store-preview {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.store-rightside {
  flex-shrink: 0;
  width: 300px;
  overflow: auto;
  padding: 8px 12px;
  border-left: 1px solid var(--desktop-border-light);
}

.store-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 2em;
  padding: 8px;
  color: var(--desktop-text-secondary);
  font-size: 0.875em;
}

.config-section {
  margin-bottom: 12px;
}

.config-section-title {
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--desktop-border-light);
  color: var(--desktop-text-primary);
  font-size: 0.875em;
  font-weight: 600;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.config-label {
  color: var(--desktop-text-secondary);
  font-size: 0.8125em;
}
</style>
