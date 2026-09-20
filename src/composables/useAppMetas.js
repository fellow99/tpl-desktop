import { ref } from 'vue'
import { AppMetas as LocalAppMetas } from '../apps/index.js'

// ============================================================
// 003-app-system: App 元数据响应式封装
// 契约（specs/overall-api.md §useAppMetas）：
//   appMetas  Ref<Record<string, AppMeta>> 响应式 App 元数据字典
// P-03：模块级 ref() 共享，所有调用方读到同一份元数据
//
// 007-wujie-system: 支持子应用注入
//   injectApps(pluginName, apps) —
//   将子应用暴露的 App 组件元数据合并到 appMetas
// ============================================================

const appMetas = ref({ ...LocalAppMetas })

export function useAppMetas() {
  /**
   * 注入子应用的 App 元数据
   * @param {string} pluginName - 子应用名称（来源标识）
   * @param {Record<string, object>} apps - { compName: { title, category, rect?, props?, ... } }
   */
  function injectApps(pluginName, apps) {
    if (!apps || typeof apps !== 'object') return
    const updated = { ...appMetas.value }
    for (const [compName, rawMeta] of Object.entries(apps)) {
      if (!rawMeta || typeof rawMeta !== 'object') continue
      if (compName in updated) {
        console.warn(`[useAppMetas] App 名称冲突："${compName}" 已被 ${updated[compName].source || '本地'} 注册，将被子应用 "${pluginName}" 覆盖`)
      }
      updated[compName] = {
        category: '其他',
        rect: { unit: 'grid', width: 4, height: 3 },
        events: [],
        propsEditors: [],
        wrapperEditors: [],
        ...rawMeta,
        compName,
        source: `plugin:${pluginName}`,
      }
    }
    appMetas.value = updated
  }

  return { appMetas, injectApps }
}
