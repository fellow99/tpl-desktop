// ============================================================
// 007-wujie-system: wujie 子应用管理 Composable
//
// 职责（specs/007-wujie-system/plan.md §6.1）：
//   - 加载 public/PLUGINS.json 子应用清单
//   - 通过 wujie startApp() 初始化子应用 JS 运行时
//   - 通过 afterMount 生命周期获取子应用暴露的组件导出
//   - 提供插件加载状态追踪和就绪信号
//
// 模块级单例：所有调用方共享同一份 pluginMetas/pluginStates/isReady
// ============================================================

import { ref } from 'vue'
import WujieVue from 'wujie-vue3'
import { startApp } from 'wujie'

// wujie-vue3 将核心 API 挂载为静态属性（wujie-vue3/esm/index.js:276-279）
const { destroyApp: wujieDestroyApp } = WujieVue

// ==================== 模块级单例状态 ====================

/** @type {import('vue').Ref<Array<{name:string, title:string, category:string, url:string, alive:boolean, exec:boolean, fiber:boolean, disabled:boolean}>>} */
const pluginMetas = ref([])

/**
 * 插件加载状态：{ [pluginName]: { status: 'loading'|'loaded'|'failed', error?: string } }
 * @type {import('vue').Ref<Record<string, {status:string, error?:string}>>}
 */
const pluginStates = ref({})

/**
 * 所有插件是否已就绪（全部 loaded 或 failed）
 * @type {import('vue').Ref<boolean>}
 */
const isReady = ref(false)

/**
 * 插件导出缓存：{ [pluginName]: { widgets: Record<string,object>, apps: Record<string,object>, backgrounds: Record<string,object> } }
 * @type {import('vue').Ref<Record<string, {widgets:object, apps:object, backgrounds:object}>>}
 */
const pluginExports = ref({})

// ==================== 内部方法 ====================

/**
 * 加载并解析 PLUGINS.json，过滤 disabled 的插件
 */
async function loadPluginManifest() {
  try {
    const res = await fetch('/PLUGINS.json')
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const data = await res.json()
    const plugins = (data.plugins || []).filter((p) => !p.disabled)
    pluginMetas.value = plugins
  } catch (error) {
    console.warn('[useWujie] PLUGINS.json 加载失败，无子应用可用:', error)
    pluginMetas.value = []
  }
}

/**
 * 初始化单个子应用：
 *   1. 通过 wujie startApp() 启动 JS 沙箱
 *   2. 在 afterMount 中获取子应用 window 上暴露的导出对象
 *   3. 追踪加载状态到 pluginStates
 *
 * @param {object} plugin - PLUGINS.json 中的插件配置项
 * @returns {Promise<object>} 子应用导出对象
 */
function initPlugin(plugin) {
  const { name, url, alive, exec, fiber } = plugin
  pluginStates.value[name] = { status: 'loading' }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pluginStates.value[name] = {
        status: 'failed',
        error: `子应用 "${name}" 加载超时 (30s)`,
      }
      reject(new Error(`Plugin "${name}" load timeout`))
    }, 30000)

    startApp({
      name,
      url,
      // 保活模式：切换时不销毁实例
      alive: alive ?? true,
      // 延迟执行：不立即渲染 DOM，等显式激活
      exec: exec ?? false,
      // Fiber 并发渲染模式
      fiber: fiber ?? true,
      // 关闭路由同步（不注入主路由）
      sync: false,
      // 降级关闭
      degrade: false,
      // 挂载到隐藏容器（不需要可见渲染）
      el: '#wujie-plugins-container',
      // 生命周期钩子
      afterMount: (appWindow) => {
        clearTimeout(timeoutId)
        // 子应用挂载后，尝试读取其暴露的导出对象
        pollForExports(name, appWindow, resolve, reject)
      },
      loadError: (loadUrl, e) => {
        clearTimeout(timeoutId)
        console.error(`[useWujie] 子应用 "${name}" 资源加载失败:`, loadUrl, e)
        pluginStates.value[name] = {
          status: 'failed',
          error: `资源加载失败: ${loadUrl}`,
        }
        reject(e)
      },
    }).catch((e) => {
      clearTimeout(timeoutId)
      pluginStates.value[name] = {
        status: 'failed',
        error: e?.message || String(e),
      }
      reject(e)
    })
  })
}

/**
 * 轮询等待子应用暴露 __WUJIE_EXPORTS__
 * Vite ESM 异步加载可能导致 afterMount 时 exports 尚未就绪
 *
 * @param {string} pluginName
 * @param {Window} appWindow - 子应用 iframe 的 window 对象
 * @param {Function} resolve
 * @param {Function} reject
 */
function pollForExports(pluginName, appWindow, resolve, reject) {
  let attempts = 0
  const maxAttempts = 50 // 5 秒（100ms 间隔）

  const check = setInterval(() => {
    attempts++
    try {
      const exports = appWindow.__WUJIE_EXPORTS__
      if (exports && typeof exports === 'object') {
        clearInterval(check)
        // 同时捕获子应用暴露的 Vue 组件定义（供主应用动态注册）
        const components = appWindow.__WUJIE_COMPONENTS__ || {}
        pluginExports.value[pluginName] = {
          ...exports,
          _components: components,
        }
        pluginStates.value[pluginName] = { status: 'loaded' }
        console.log(`[useWujie] 子应用 "${pluginName}" 加载完成`, {
          widgets: Object.keys(exports.widgets || {}),
          apps: Object.keys(exports.apps || {}),
          backgrounds: Object.keys(exports.backgrounds || {}),
          components: Object.keys(components),
        })
        resolve(exports)
        return
      }
    } catch {
      // 跨域或其他异常，继续轮询
    }
  }, 100)

  // 超时保护（pollForExports 本身也有超时，与 startApp 超时互斥）
  setTimeout(() => {
    if (check) {
      clearInterval(check)
      pluginStates.value[pluginName] = {
        status: 'failed',
        error: '子应用未在超时时间内暴露导出对象',
      }
      reject(new Error(`Plugin "${pluginName}" exports timeout`))
    }
  }, 10000)
}

// ==================== 公开 API ====================

/**
 * useWujie — wujie 子应用管理 Composable
 *
 * @returns {{ pluginMetas, pluginStates, isReady, pluginExports, initAllPlugins, getPluginExports, getWidgetExports, getAppExports, getBackgroundExports }}
 */
export function useWujie() {
  /**
   * 初始化所有子应用：
   *   1. 加载 PLUGINS.json 清单
   *   2. 并行启动所有非 disabled 的子应用
   *   3. 全部完成后（含失败），设置 isReady = true
   *
   * @returns {Promise<void>}
   */
  async function initAllPlugins() {
    await loadPluginManifest()

    if (pluginMetas.value.length === 0) {
      console.log('[useWujie] 无可用子应用，跳过初始化')
      isReady.value = true
      return
    }

    console.log(`[useWujie] 开始初始化 ${pluginMetas.value.length} 个子应用...`)
    const results = await Promise.allSettled(
      pluginMetas.value.map((plugin) => initPlugin(plugin))
    )

    const loaded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length
    console.log(`[useWujie] 子应用初始化完成: ${loaded} 成功, ${failed} 失败`)

    isReady.value = true
  }

  /**
   * 获取指定子应用的完整导出对象
   * @param {string} pluginName
   * @returns {object|null}
   */
  function getPluginExports(pluginName) {
    return pluginExports.value[pluginName] || null
  }

  /**
   * 获取指定子应用的 Widget 导出
   * @param {string} pluginName
   * @returns {Record<string, object>}
   */
  function getWidgetExports(pluginName) {
    return pluginExports.value[pluginName]?.widgets || {}
  }

  /**
   * 获取指定子应用的 App 导出
   * @param {string} pluginName
   * @returns {Record<string, object>}
   */
  function getAppExports(pluginName) {
    return pluginExports.value[pluginName]?.apps || {}
  }

  /**
   * 获取指定子应用的 Background 导出
   * @param {string} pluginName
   * @returns {Record<string, object>}
   */
  function getBackgroundExports(pluginName) {
    return pluginExports.value[pluginName]?.backgrounds || {}
  }

  /**
   * 获取指定子应用的 Vue 组件定义（供主应用动态注册）
   * @param {string} pluginName
   * @returns {Record<string, object>}
   */
  function getPluginComponents(pluginName) {
    return pluginExports.value[pluginName]?._components || {}
  }

  /**
   * 销毁指定子应用实例
   * @param {string} pluginName
   */
  function destroyPlugin(pluginName) {
    if (pluginStates.value[pluginName]) {
      wujieDestroyApp(pluginName)
      delete pluginStates.value[pluginName]
      delete pluginExports.value[pluginName]
    }
  }

  return {
    pluginMetas,
    pluginStates,
    isReady,
    pluginExports,
    initAllPlugins,
    getPluginExports,
    getWidgetExports,
    getAppExports,
    getBackgroundExports,
    getPluginComponents,
    destroyPlugin,
  }
}
