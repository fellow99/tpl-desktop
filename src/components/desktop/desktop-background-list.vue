<script setup>
// ============================================================
// 004-background-system: 桌面背景选择列表（desktop-background-list）
//
// 数据（FR-015-15）：useBackgroundMetas() 获取全部已注册背景元数据
// 轮播（FR-015-16~17）：embla-carousel-vue（useEmblaCarousel，
//   align: 'center' + containScroll: 'keepSnaps'，plan.md §3.3），
//   原生支持触摸滑动与鼠标拖拽
// 卡片（FR-015-18）：thumbnail 缩略图 + title 名称 + 分类/类型标注
// 选择（FR-015-19 / FR-015-26）：点击卡片 emit('selectBackground', meta)
//   后 emit('close') 自动关闭
// 高亮（FR-015-20）：currentBackground.name 匹配的卡片高亮描边
// 分类（FR-015-3）：顶部分类页签过滤（全部 / 暗色系 / 浅色系 / 动态）
// ============================================================
import { ref, computed, watch, nextTick } from 'vue'
import useEmblaCarousel from 'embla-carousel-vue'
import { useBackgroundMetas } from '../../composables/useBackgroundMetas.js'

const props = defineProps({
  // 当前桌面背景配置（DesktopConfig.background），用于选中态高亮
  currentBackground: { type: Object, default: null },
})

const emit = defineEmits(['selectBackground', 'close'])

const { backgroundMetas } = useBackgroundMetas()
const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'center', containScroll: 'keepSnaps' })

// ==================== 分类页签（FR-015-3） ====================

const ALL_CATEGORY = '全部'
// 已知分类固定顺序，未知分类追加在后
const PREFERRED_ORDER = ['暗色系', '浅色系', '动态']

const categories = computed(() => {
  const present = new Set(
    Object.values(backgroundMetas.value || {}).map((meta) => meta.category || '其他'),
  )
  const ordered = PREFERRED_ORDER.filter((cat) => present.has(cat))
  const extras = [...present].filter((cat) => !PREFERRED_ORDER.includes(cat)).sort()
  return [ALL_CATEGORY, ...ordered, ...extras]
})

const activeCategory = ref(ALL_CATEGORY)

// ==================== 轮播卡片数据 ====================

const slides = computed(() => {
  const metas = Object.values(backgroundMetas.value || {})
  const filtered =
    activeCategory.value === ALL_CATEGORY
      ? metas
      : metas.filter((meta) => (meta.category || '其他') === activeCategory.value)
  return filtered.sort((a, b) => a.name.localeCompare(b.name))
})

const currentName = computed(() => props.currentBackground?.name || null)

// 切换分类后重算轮播尺寸并回到首张
watch(activeCategory, () => {
  nextTick(() => {
    emblaApi.value?.reInit()
    emblaApi.value?.scrollTo(0, true)
  })
})

// 打开面板时定位到当前已选背景（embla 初始化完成后生效一次）
watch(
  emblaApi,
  (api) => {
    if (!api || !currentName.value) return
    const idx = slides.value.findIndex((meta) => meta.name === currentName.value)
    if (idx >= 0) api.scrollTo(idx, true)
  },
  { once: true },
)

// ==================== 交互 ====================

function scrollPrev() {
  emblaApi.value?.scrollPrev()
}

function scrollNext() {
  emblaApi.value?.scrollNext()
}

// FR-015-19 / FR-015-26：选择背景后立即应用并自动关闭
function onSelect(meta) {
  emit('selectBackground', meta)
  emit('close')
}
</script>

<template>
  <div class="desktop-background-list">
    <div class="background-list-mask" @click="emit('close')"></div>
    <div class="background-list-panel">
      <div class="panel-header">
        <span class="panel-title">切换主题</span>
        <button class="panel-close" type="button" title="关闭" @click="emit('close')">×</button>
      </div>

      <!-- 分类页签 -->
      <div class="panel-tabs">
        <button
          v-for="cat in categories"
          :key="cat"
          class="tab-btn"
          :class="{ active: cat === activeCategory }"
          type="button"
          @click="activeCategory = cat"
        >
          {{ cat }}
        </button>
      </div>

      <!-- embla 卡片轮播（触摸滑动 / 鼠标拖拽） -->
      <div class="panel-carousel">
        <button class="nav-btn" type="button" title="上一张" @click="scrollPrev">‹</button>
        <div ref="emblaRef" class="embla">
          <div class="embla-container">
            <div
              v-for="meta in slides"
              :key="meta.name"
              class="embla-slide"
              :class="{ selected: meta.name === currentName }"
              @click="onSelect(meta)"
            >
              <div class="slide-thumb">
                <img class="thumb-img" :src="meta.thumbnail" :alt="meta.title" draggable="false" />
                <span v-if="meta.type === 'video'" class="thumb-badge">视频</span>
                <span v-if="meta.name === currentName" class="thumb-check"><span class="ss-icon ss-icon-check"></span></span>
              </div>
              <div class="slide-caption">
                <span class="caption-title">{{ meta.title }}</span>
                <span class="caption-category">{{ meta.category }}</span>
              </div>
            </div>
            <div v-if="!slides.length" class="embla-empty">当前分类暂无背景</div>
          </div>
        </div>
        <button class="nav-btn" type="button" title="下一张" @click="scrollNext">›</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.desktop-background-list {
  position: fixed;
  inset: 0;
  z-index: 200;
}

.background-list-mask {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 40%);
}

.background-list-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  width: 720px;
  max-width: 92vw;
  overflow: hidden;
  border: 1px solid var(--desktop-border);
  border-radius: 6px;
  background: var(--desktop-bg-overlay);
  box-shadow: var(--desktop-shadow);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: 2.5em;
  padding: 0 12px;
  border-bottom: 1px solid var(--desktop-border-light);
  color: var(--desktop-text-primary);
}

.panel-title {
  font-size: 0.9375em;
  font-weight: 600;
}

.panel-close {
  padding: 0 4px;
  border: none;
  background: transparent;
  color: var(--desktop-text-secondary);
  font-size: 1.25em;
  line-height: 1;
  cursor: pointer;

  &:hover {
    color: var(--desktop-text-primary);
  }
}

.panel-tabs {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  padding: 10px 12px 0;
}

.tab-btn {
  padding: 3px 12px;
  border: 1px solid var(--desktop-border);
  border-radius: 999px;
  background: transparent;
  color: var(--desktop-text-secondary);
  font-size: 0.8125em;
  cursor: pointer;

  &:hover {
    color: var(--desktop-text-primary);
  }

  &.active {
    border-color: var(--desktop-widget-header-bg);
    background: var(--desktop-widget-header-bg);
    color: var(--desktop-widget-header-text);
  }
}

.panel-carousel {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 8px 16px;
}

.nav-btn {
  flex-shrink: 0;
  width: 28px;
  height: 56px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--desktop-text-secondary);
  font-size: 1.5em;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background: var(--desktop-bg-secondary);
    color: var(--desktop-text-primary);
  }
}

// embla 结构样式：viewport overflow hidden + flex container
.embla {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.embla-container {
  display: flex;
  gap: 12px;
}

.embla-slide {
  flex: 0 0 200px;
  min-width: 0;
  overflow: hidden;
  border: 2px solid var(--desktop-border-light);
  border-radius: 6px;
  background: var(--desktop-bg-secondary);
  cursor: pointer;
  user-select: none;

  &:hover {
    border-color: var(--desktop-widget-header-bg);
  }

  // FR-015-20：当前已选背景高亮
  &.selected {
    border-color: var(--desktop-widget-header-bg);
    box-shadow: 0 0 0 2px var(--desktop-widget-header-bg) inset;
  }
}

.slide-thumb {
  position: relative;
  height: 110px;
}

.thumb-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.thumb-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgb(0 0 0 / 55%);
  color: #fff;
  font-size: 0.6875em;
}

.thumb-check {
  position: absolute;
  bottom: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--desktop-widget-header-bg);
  color: var(--desktop-widget-header-text);
  font-size: 0.75em;
}

.slide-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 8px;
}

.caption-title {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--desktop-text-primary);
  font-size: 0.8125em;
}

.caption-category {
  flex-shrink: 0;
  color: var(--desktop-text-secondary);
  font-size: 0.6875em;
}

.embla-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 110px;
  color: var(--desktop-text-secondary);
  font-size: 0.875em;
}
</style>
