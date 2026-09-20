// ============================================================
// UI 组件自动扫描注册入口（STRUCTURE.md §组件自动扫描机制 / C-02）
//
// 通过 Vite import.meta.glob 在构建时 eager 扫描本目录下所有
// desktop-*.vue 组件（kebab-case 命名），由 src/desktop.js 全局注册。
//
// 组件名 = 文件名（不含 .vue 后缀）：
//   './viewport/desktop-widget-wrapper.vue' → 'desktop-widget-wrapper'
// ============================================================

const vueModules = import.meta.glob('./**/desktop-*.vue', { eager: true })

// UI 组件字典：组件名（kebab-case）→ Vue 组件
export const UIComponents = {}
for (const [path, module] of Object.entries(vueModules)) {
  const name = path.split('/').pop().replace(/\.vue$/, '')
  UIComponents[name] = module.default
}
