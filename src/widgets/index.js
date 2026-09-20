// ============================================================
// 002-widget-system: 看板组件自动扫描注册入口
//
// 机制（plan.md §3.1 / spec.md FR-009~FR-011）：
//   通过 Vite import.meta.glob 在构建时 eager 扫描本目录下所有
//   *.widget.vue（Vue 组件）与 *.widget.js（WidgetMeta 元数据）文件对。
//
// 文件名 → 组件名提取（plan.md §6.2）：
//   './basic/BasicText.widget.vue' → 'BasicText'
//
// 元数据默认值回退（plan.md §6.3 / TC-WS-001）：
//   category → '其他'，rect → { unit:'grid', width:1, height:1 }，
//   events / propsEditors / wrapperEditors → []
//   title 缺失时回退为 compName 占位（TC-WS-003）
//   presets 不设默认（TC-WS-034：未定义时保持 undefined）
//
// 健壮性：
//   同名冲突覆盖、缺失 .widget.js 的孤儿组件、default 导出非对象
//   均 console.warn 提示并降级处理，不中断注册流程。
//
// compName 由本模块自动注入（spec.md FR-025），.widget.js 中不应手写。
// ============================================================

const vueModules = import.meta.glob('./**/*.widget.vue', { eager: true })
const jsModules = import.meta.glob('./**/*.widget.js', { eager: true })

// 从 glob 路径提取组件名：'./basic/BasicText.widget.vue' → 'BasicText'
function extractCompName(path) {
  const fileName = path.replace(/^\.\/(.*)\.widget\.(vue|js)$/, '$1')
  return fileName.split('/').pop()
}

// 看板组件字典：compName → Vue 组件
export const WidgetComponents = {}
for (const [path, module] of Object.entries(vueModules)) {
  const compName = extractCompName(path)
  if (compName in WidgetComponents) {
    console.warn(`[widgets] 看板组件名称冲突："${compName}" 已注册，将被 "${path}" 覆盖`)
  }
  WidgetComponents[compName] = module.default
}

// 元数据字典：compName → WidgetMeta（含默认值回退与 compName 注入）
export const WidgetMetas = {}
for (const [path, module] of Object.entries(jsModules)) {
  const compName = extractCompName(path)
  if (compName in WidgetMetas) {
    console.warn(`[widgets] 看板组件元数据名称冲突："${compName}" 已注册，将被 "${path}" 覆盖`)
  }
  // default 导出非对象（null/数组外的非法形态含 undefined）时降级为空对象
  const raw = module.default
  const isValidMeta = typeof raw === 'object' && raw !== null
  if (!isValidMeta) {
    console.warn(`[widgets] "${path}" 的 default 导出不是对象，元数据将使用默认值`)
  }
  const meta = {
    category: '其他',
    rect: { unit: 'grid', width: 1, height: 1 },
    events: [],
    propsEditors: [],
    wrapperEditors: [],
    ...(isValidMeta ? raw : {}),
    compName,
  }
  // title 缺失时回退为 compName 占位（TC-WS-003）
  if (!meta.title) {
    meta.title = compName
  }
  WidgetMetas[compName] = meta
}

// 孤儿 .widget.vue（缺少配套 .widget.js）：补一份最小默认元数据
for (const compName of Object.keys(WidgetComponents)) {
  if (!(compName in WidgetMetas)) {
    console.warn(`[widgets] 看板组件 "${compName}" 缺少 .widget.js 元数据，使用默认值`)
    WidgetMetas[compName] = {
      title: compName,
      category: '其他',
      rect: { unit: 'grid', width: 1, height: 1 },
      events: [],
      propsEditors: [],
      wrapperEditors: [],
      compName,
    }
  }
}

// plan.md §5.1 接口契约命名：Components（desktop.js 全局注册消费）
export { WidgetComponents as Components }
