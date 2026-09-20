import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// Element Plus 内置暗色模式变量（html.dark 时生效，FR-007）
import 'element-plus/theme-chalk/dark/css-vars.css'
import WujieVue from 'wujie-vue3'
import './style.scss'
import Desktop from './pages/Desktop.vue'
import { useTheme } from './composables/useTheme.js'
import { WidgetComponents } from './widgets/index.js'
import { AppComponents } from './apps/index.js'
import { UIComponents } from './components/index.js'

// 主题初始化（005-theme）：localStorage > 系统偏好 > 默认深色
const { initTheme } = useTheme()
initTheme()

// 工作台应用入口：挂载 pages/Desktop.vue
// 组件自动扫描注册（actions 在后续轮次接入）
const app = createApp(Desktop)
app.use(ElementPlus)

// 007-wujie-system: wujie 微前端框架注册（plan.md §7.1）
app.use(WujieVue)

// UI 组件全局注册（desktop-*.vue，components/index.js 自动扫描）
for (const [name, comp] of Object.entries(UIComponents)) {
  app.component(name, comp)
}

// 看板组件全局注册（*.widget.vue，widgets/index.js 自动扫描，FR-010）
for (const [name, comp] of Object.entries(WidgetComponents)) {
  app.component(name, comp)
}

// App 组件全局注册（*.app.vue，apps/index.js 自动扫描，003-app-system FR-002）
for (const [name, comp] of Object.entries(AppComponents)) {
  app.component(name, comp)
}

// 007-wujie-system: 暴露主应用 Vue 实例到全局，供子应用组件动态注册
window.__MAIN_VUE_APP__ = app

app.mount('#app')
