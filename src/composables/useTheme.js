import { ref } from 'vue'

// ============================================================
// 005-theme: 主题切换状态管理 composable
// 契约（specs/overall-api.md §useTheme）：
//   initTheme()      从 localStorage 初始化主题
//   isDark           Ref<boolean> 当前是否为深色模式
//   toggleTheme()    切换浅色/深色
//   setTheme(theme)  设置指定主题（应用 + 持久化）
//   applyTheme(theme) 应用主题到 <html> class（不持久化）
// 持久化键：localStorage['dashboard-theme'] = 'dark' | 'light'
// ============================================================

const STORAGE_KEY = 'dashboard-theme'
const DARK_CLASS = 'dark'
const THEME_DARK = 'dark'
const THEME_LIGHT = 'light'

// 模块级共享状态：与 index.html 反闪烁脚本已设置的 html.dark 保持同步
const isDark = ref(document.documentElement.classList.contains(DARK_CLASS))

// localStorage 防御性读取：失败时视为无存储值
function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// localStorage 防御性写入：失败时静默忽略
function storeTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // 持久化不可用（隐私模式/存储禁用）：仅本次会话生效
  }
}

// 应用主题到 <html> class（FR-010：切换 html.dark，无需刷新）
function applyTheme(theme) {
  const dark = theme === THEME_DARK
  document.documentElement.classList.toggle(DARK_CLASS, dark)
  isDark.value = dark
}

// 设置指定主题：应用并持久化（FR-014）
function setTheme(theme) {
  const normalized = theme === THEME_DARK ? THEME_DARK : THEME_LIGHT
  applyTheme(normalized)
  storeTheme(normalized)
}

// 切换浅色/深色
function toggleTheme() {
  setTheme(isDark.value ? THEME_LIGHT : THEME_DARK)
}

// 初始化优先级（FR-015）：localStorage > 系统偏好 > 默认深色
// 未手动设置过时不写入 localStorage，保持后续可自动跟随系统（FR-016）
function initTheme() {
  const stored = readStoredTheme()
  if (stored === THEME_DARK || stored === THEME_LIGHT) {
    applyTheme(stored)
    return
  }
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
  applyTheme(prefersLight ? THEME_LIGHT : THEME_DARK)
}

// FR-016：监听系统主题变化，仅在用户未手动设置过主题时自动跟随
// 模块级注册一次，避免多处调用 useTheme() 时重复挂监听
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!readStoredTheme()) {
    applyTheme(e.matches ? THEME_DARK : THEME_LIGHT)
  }
})

export function useTheme() {
  return { initTheme, isDark, toggleTheme, setTheme, applyTheme }
}
