<script setup>
// ============================================================
// 006-prop-editor: 动态属性表单（desktop-property-form）
//
// 契约（overall-api.md §desktop-property-form）：
//   Props : value（当前属性值对象，会被就地修改，不做深拷贝 —— spec.md §7）
//           props（属性元数据 Schema：{ propName: PropMeta }）
//   Emits : 无 —— 通过直接修改 value 对象回写数据
//
// 类型映射（006 plan.md §3.2 / overall-data-model.md §1.3）：
//   undefined / 'text' → el-input text
//   'number'           → el-input type=number
//   'boolean'          → el-switch
//   'json'             → textarea（monospace，20 行，change 时 JSON.parse 校验）
//   'markdown'         → VMarkdownEditor（vue3-markdown）
//   'custom'           → <component :is="propMeta.custom">（plan.md §3.3 级联编辑契约）
//   其他（如 'select'）→ 回退 el-input text（plan §3.2 未定义 select 编辑器）
//
// 类型匹配大小写不敏感：getPropType 将 type 转小写后再分支（plan.md §3.2）。
// ============================================================
import { computed, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { VMarkdownEditor } from 'vue3-markdown'
import 'vue3-markdown/dist/vue3-markdown.css'

const formProps = defineProps({
  // 当前属性值对象（就地修改）
  value: { type: Object, required: true },
  // 属性元数据定义
  props: { type: Object, default: null },
})

// 大小写不敏感的类型归一化（未指定 type 视为 text）
function getPropType(propMeta) {
  return String(propMeta?.type || 'text').toLowerCase()
}

// 渲染条目：[{ name, meta, title, type }]
const propEntries = computed(() =>
  Object.entries(formProps.props || {}).map(([name, propMeta]) => ({
    name,
    meta: propMeta || {},
    title: propMeta?.title || name,
    type: getPropType(propMeta),
  })),
)

// custom 类型编辑组件回传新值 → 写回属性值对象（plan.md §5.1）
function handleChangeProp(propName, val) {
  formProps.value[propName] = val
}

// number 类型防护：change/blur 时清空或非法输入回退到元数据默认值（?? 0）
function sanitizeNumber(entry) {
  const val = formProps.value[entry.name]
  const num =
    typeof val === 'number'
      ? val
      : val === '' || val === null || val === undefined
        ? NaN
        : Number(val)
  if (!Number.isFinite(num)) {
    formProps.value[entry.name] = entry.meta.default ?? 0
  } else if (typeof val !== 'number') {
    formProps.value[entry.name] = num
  }
}

// JSON 校验错误状态：{ propName: true }，校验通过即清除（内联红框 + 中文提示）
const jsonErrors = reactive({})

// 编辑目标切换（value 对象整体替换）时清除残留错误状态
watch(
  () => formProps.value,
  () => {
    for (const key of Object.keys(jsonErrors)) delete jsonErrors[key]
  },
)

// JSON 校验：change 时 JSON.parse，失败 ElMessage.error 提示 + 内联错误态，
// 不阻止输入（spec.md §7 / plan.md §6.2、§6.3）
function validateJson(entry) {
  const raw = formProps.value[entry.name]
  if (raw === undefined || raw === null || raw === '') {
    delete jsonErrors[entry.name]
    return
  }
  try {
    JSON.parse(raw)
    delete jsonErrors[entry.name]
  } catch {
    jsonErrors[entry.name] = true
    ElMessage.error(`属性「${entry.title}」JSON 格式错误`)
  }
}
</script>

<template>
  <div class="desktop-property-form">
    <el-form v-if="propEntries.length" label-position="top" size="small" @submit.prevent>
      <el-form-item v-for="entry in propEntries" :key="entry.name" :label="entry.title">
        <!-- boolean → 开关 -->
        <el-switch v-if="entry.type === 'boolean'" v-model="value[entry.name]" />

        <!-- number → 数值输入（change 时 NaN/空值回退默认值） -->
        <el-input
          v-else-if="entry.type === 'number'"
          v-model.number="value[entry.name]"
          type="number"
          @change="sanitizeNumber(entry)"
        />

        <!-- json → 代码编辑区（monospace，20 行，非法 JSON 内联错误态） -->
        <div v-else-if="entry.type === 'json'" class="json-field">
          <textarea
            v-model="value[entry.name]"
            class="json-editor"
            :class="{ 'is-error': jsonErrors[entry.name] }"
            rows="20"
            spellcheck="false"
            @change="validateJson(entry)"
          ></textarea>
          <div v-if="jsonErrors[entry.name]" class="json-error-hint">JSON 格式错误</div>
        </div>

        <!-- markdown → Markdown 编辑器 -->
        <VMarkdownEditor
          v-else-if="entry.type === 'markdown'"
          v-model="value[entry.name]"
          class="markdown-editor"
          locale="zh"
        />

        <!-- custom → 看板组件作者提供的自定义编辑组件（FR-025~028） -->
        <component
          :is="entry.meta.custom"
          v-else-if="entry.type === 'custom' && entry.meta.custom"
          :model-value="value[entry.name]"
          :props-value="value"
          @update:model-value="(val) => handleChangeProp(entry.name, val)"
        />

        <!-- text / 未定义类型（含 select）回退 → 文本输入 -->
        <el-input v-else v-model="value[entry.name]" type="text" />
      </el-form-item>
    </el-form>

    <div v-else class="form-empty">暂无可配置属性</div>
  </div>
</template>

<style scoped lang="scss">
.desktop-property-form {
  width: 100%;
}

// JSON 代码编辑区：等宽字体（overall-data-model.md §1.3）
.json-field {
  width: 100%;
}

.json-editor {
  box-sizing: border-box;
  width: 100%;
  padding: 8px;
  border: 1px solid var(--desktop-border);
  border-radius: 4px;
  background: var(--desktop-bg-secondary);
  color: var(--desktop-text-primary);
  font-family: 'Courier New', Consolas, Monaco, monospace;
  font-size: 0.8125em;
  line-height: 1.5;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: var(--el-color-primary);
  }

  // 非法 JSON：内联错误态（红框）
  &.is-error,
  &.is-error:focus {
    border-color: var(--el-color-danger);
  }
}

.json-error-hint {
  margin-top: 4px;
  color: var(--el-color-danger);
  font-size: 0.75em;
  line-height: 1.4;
}

.markdown-editor {
  width: 100%;
  min-height: 280px;
}

.form-empty {
  padding: 16px 8px;
  color: var(--desktop-text-secondary);
  font-size: 0.875em;
  text-align: center;
}
</style>
