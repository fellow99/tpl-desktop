// ============================================================
// 003-app-system: App 应用自动扫描注册入口
//
// 机制（spec.md FR-001~FR-004 / P-01 元数据驱动扩展）：
//   通过 Vite import.meta.glob 在构建时 eager 扫描本目录下所有
//   *.app.vue（Vue 组件）与 *.app.js（AppMeta 元数据）文件对。
//
// 文件名 → 组件名提取（与 widgets/index.js 一致）：
//   './basic/BasicClock.app.vue' → 'BasicClock'
//
// 元数据默认值回退（AppMeta 与 WidgetMeta 结构一致，FR-007）：
//   category → '其他'（FR-006），rect → { unit:'grid', width:4, height:3 }，
//   events / propsEditors / wrapperEditors → []
//   title 缺失时回退为 compName 占位
//
// 健壮性：
//   同名冲突覆盖、缺失 .app.js 的孤儿组件、default 导出非对象
//   均 console.warn 提示并降级处理，不中断注册流程。
//   本轮（round 7）无已注册 App，两个字典均为空对象，系统保持稳定。
//
// compName 字段由本模块自动注入，.app.js 中不应手写（spec.md §8）。
// ============================================================

const vueModules = import.meta.glob('./**/*.app.vue', { eager: true })
const jsModules = import.meta.glob('./**/*.app.js', { eager: true })

// 从 glob 路径提取组件名：'./basic/BasicClock.app.vue' → 'BasicClock'
function extractCompName(path) {
  const fileName = path.replace(/^\.\/(.*)\.app\.(vue|js)$/, '$1')
  return fileName.split('/').pop()
}

// App 组件字典：compName → Vue 组件
export const AppComponents = {}
for (const [path, module] of Object.entries(vueModules)) {
  const compName = extractCompName(path)
  if (compName in AppComponents) {
    console.warn(`[apps] App 组件名称冲突："${compName}" 已注册，将被 "${path}" 覆盖`)
  }
  AppComponents[compName] = module.default
}

// 元数据字典：compName → AppMeta（含默认值回退与 compName 注入，FR-003/FR-004）
export const AppMetas = {}
for (const [path, module] of Object.entries(jsModules)) {
  const compName = extractCompName(path)
  if (compName in AppMetas) {
    console.warn(`[apps] App 元数据名称冲突："${compName}" 已注册，将被 "${path}" 覆盖`)
  }
  // default 导出非对象（null/数组等非法形态含 undefined）时降级为空对象
  const raw = module.default
  const isValidMeta = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
  if (!isValidMeta) {
    console.warn(`[apps] "${path}" 的 default 导出不是对象，元数据将使用默认值`)
  }
  const meta = {
    category: '其他',
    rect: { unit: 'grid', width: 4, height: 3 },
    events: [],
    propsEditors: [],
    wrapperEditors: [],
    ...(isValidMeta ? raw : {}),
    compName,
  }
  // title 缺失时回退为 compName 占位
  if (!meta.title) {
    meta.title = compName
  }
  AppMetas[compName] = meta
}

// 孤儿 .app.vue（缺少配套 .app.js）：补一份最小默认元数据
for (const compName of Object.keys(AppComponents)) {
  if (!(compName in AppMetas)) {
    console.warn(`[apps] App "${compName}" 缺少 .app.js 元数据，使用默认值`)
    AppMetas[compName] = {
      title: compName,
      category: '其他',
      rect: { unit: 'grid', width: 4, height: 3 },
      events: [],
      propsEditors: [],
      wrapperEditors: [],
      compName,
    }
  }
}
