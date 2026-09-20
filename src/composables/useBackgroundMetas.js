import { ref } from 'vue'
import { BackgroundMetas as LocalBackgroundMetas } from '../backgrounds/index.js'

// ============================================================
// 004-background-system: 桌面背景元数据响应式封装
// 契约（specs/overall-api.md §useBackgroundMetas）：
//   backgroundMetas  Ref<Record<string, DesktopBackgroundMeta>>
//                    响应式背景元数据字典
// P-03：模块级 ref() 共享，所有调用方读到同一份元数据
//
// 007-wujie-system: 支持子应用注入
//   injectBackgrounds(pluginName, backgrounds) —
//   将子应用暴露的 Background 元数据合并到 backgroundMetas
// ============================================================

const backgroundMetas = ref({ ...LocalBackgroundMetas })

export function useBackgroundMetas() {
  /**
   * 注入子应用的 Background 元数据
   * @param {string} pluginName - 子应用名称（来源标识）
   * @param {Record<string, object>} backgrounds - { name: { title, category, theme?, type?, ... } }
   */
  function injectBackgrounds(pluginName, backgrounds) {
    if (!backgrounds || typeof backgrounds !== 'object') return
    const updated = { ...backgroundMetas.value }
    for (const [bgName, rawMeta] of Object.entries(backgrounds)) {
      if (!rawMeta || typeof rawMeta !== 'object') continue
      if (bgName in updated) {
        console.warn(`[useBackgroundMetas] 背景名称冲突："${bgName}" 已被 ${updated[bgName].source || '本地'} 注册，将被子应用 "${pluginName}" 覆盖`)
      }
      updated[bgName] = {
        category: '其他',
        type: 'image',
        ...rawMeta,
        name: bgName,
        source: `plugin:${pluginName}`,
      }
    }
    backgroundMetas.value = updated
  }

  return { backgroundMetas, injectBackgrounds }
}
