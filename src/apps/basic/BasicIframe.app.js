// ============================================================
// 401-app-basic-apps: 网页应用（BasicIframe）元数据
// spec.md FR-001~FR-005：title 网页应用 / category 基础应用 /
// rect 4×3 / props url + contentWidth + contentHeight
// avatar 暂不设置图标（spec §4 Schema）
// compName 由 apps/index.js 自动注入，此处不手写（003 spec §8）
// ============================================================
export default {
  title: '网页应用',
  category: '基础应用',
  avatar: null,
  thumbnail: null,
  rect: { unit: 'grid', width: 4, height: 3 },
  props: {
    url: {
      title: '网页地址',
      category: '看板组件配置',
      default: '',
    },
    contentWidth: {
      title: '网页内容宽度',
      category: '看板组件配置',
      type: 'number',
      default: 1440,
    },
    contentHeight: {
      title: '网页内容高度',
      category: '看板组件配置',
      type: 'number',
      default: 900,
    },
  },
  // Q-02：预留扩展点，保持空数组
  events: [],
  propsEditors: [],
  wrapperEditors: [],
}
