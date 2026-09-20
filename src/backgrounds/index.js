// ============================================================
// 004-background-system: 桌面背景自动扫描注册入口
//
// 机制（P-01 元数据驱动扩展 / plan.md §3.2 数据流）：
//   通过 Vite import.meta.glob 在构建时 eager 扫描本目录下所有
//   *.bg.js 背景元数据文件（DesktopBackgroundMeta，
//   overall-data-model.md §1.5）。
//
// 文件名 → 背景名提取：
//   './dark/dark-001.bg.js' → 'dark-001'
//   背景名即 DesktopConfig.background.name 引用键（§1.7）。
//
// 健壮性：
//   同名冲突覆盖、default 导出非对象均 console.warn 提示并降级，
//   不中断注册流程。name 由本模块自动注入，.bg.js 中不应手写。
// ============================================================

const bgModules = import.meta.glob('./**/*.bg.js', { eager: true })

// 从 glob 路径提取背景名：'./dark/dark-001.bg.js' → 'dark-001'
function extractBgName(path) {
  const fileName = path.replace(/^\.\/(.*)\.bg\.js$/, '$1')
  return fileName.split('/').pop()
}

// 背景元数据字典：name → DesktopBackgroundMeta（含 name 注入）
export const BackgroundMetas = {}
for (const [path, module] of Object.entries(bgModules)) {
  const name = extractBgName(path)
  if (name in BackgroundMetas) {
    console.warn(`[backgrounds] 背景名称冲突："${name}" 已注册，将被 "${path}" 覆盖`)
  }
  const raw = module.default
  const isValidMeta = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
  if (!isValidMeta) {
    console.warn(`[backgrounds] "${path}" 的 default 导出不是对象，该背景将被跳过`)
    continue
  }
  const meta = {
    category: '其他',
    type: 'image',
    ...raw,
    name,
  }
  // title 缺失时回退为 name 占位
  if (!meta.title) {
    meta.title = name
  }
  BackgroundMetas[name] = meta
}
