import { ref } from 'vue'
import { WidgetMetas as LocalWidgetMetas } from '../widgets/index.js'

// ============================================================
// 002-widget-system: 看板组件元数据响应式封装
// 契约（specs/overall-api.md §useWidgetMetas）：
//   widgetMetas  Ref<Record<string, WidgetMeta>> 响应式小部件元数据字典
// P-03：模块级 ref() 共享，所有调用方读到同一份元数据
//
// 007-wujie-system: 支持子应用注入
//   injectWidgets(pluginName, widgets) —
//   将子应用暴露的 Widget 组件元数据合并到 widgetMetas，
//   每条元数据自动注入 compName 和 source 字段
// ============================================================

const widgetMetas = ref({ ...LocalWidgetMetas })

export function useWidgetMetas() {
  /**
   * 注入子应用的 Widget 元数据
   * @param {string} pluginName - 子应用名称（来源标识）
   * @param {Record<string, object>} widgets - { compName: { title, category, rect?, props?, ... } }
   */
  function injectWidgets(pluginName, widgets) {
    if (!widgets || typeof widgets !== 'object') return
    const updated = { ...widgetMetas.value }
    for (const [compName, rawMeta] of Object.entries(widgets)) {
      if (!rawMeta || typeof rawMeta !== 'object') continue
      if (compName in updated) {
        console.warn(`[useWidgetMetas] 组件名称冲突："${compName}" 已被 ${updated[compName].source || '本地'} 注册，将被子应用 "${pluginName}" 覆盖`)
      }
      updated[compName] = {
        category: '其他',
        rect: { unit: 'grid', width: 1, height: 1 },
        events: [],
        propsEditors: [],
        wrapperEditors: [],
        ...rawMeta,
        compName,
        source: `plugin:${pluginName}`,
      }
    }
    widgetMetas.value = updated
  }

  return { widgetMetas, injectWidgets }
}
