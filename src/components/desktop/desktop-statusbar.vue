<script setup>
// ============================================================
// 201-page-index: 顶部状态栏（desktop-statusbar）
//
// 契约（spec.md §3 状态栏 / STRUCTURE.md / tasks R5+R7）：
//   - 左侧：实时时钟 HH:MM:SS + YYYY年MM月DD日 周X（每秒刷新），
//     pointer-events: none 不拦截桌面交互
//   - 右侧（pointer-events: auto）：
//       用户信息：显示用户名，el-popover 展示详情 + 退出登录（emit logout）
//   - 高度 2.5em（plan.md §2.2），flex-shrink: 0
//
// 注：编辑桌面入口已迁移至 desktop-toolbar-main 最左按钮（006-iconfont-emoji）
// ============================================================
import { ref, onMounted, onBeforeUnmount } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  // 登录用户信息（LoginUser，spec.md §4）
  userInfo: { type: Object, default: null },
})

const emit = defineEmits(['logout'])

// ==================== 实时时钟（每秒刷新） ====================

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const titleRef = ref({
  logo: window.SYSTEM_CONFIGS?.systemLogo || '',
  title: window.SYSTEM_CONFIGS?.systemTitle || '工作台',
  subtitle: window.SYSTEM_CONFIGS?.systemSubtitle || '桌面',
});
const datetimeRef = ref({
  timeText: '',
  dateText: ''
});
let clockTimer = null

function refreshClock() {
  const now = dayjs()
  datetimeRef.value = {
    timeText: now.format('HH:mm:ss'),
    dateText: `${now.format('YYYY年MM月DD日')} 周${WEEKDAYS[now.day()]}`
  }
}

onMounted(() => {
  refreshClock()
  clockTimer = setInterval(refreshClock, 1000)
})

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<template>
  <div class="desktop-statusbar">
    <!-- 左侧：实时时钟（不拦截交互） -->
    <div class="statusbar-title">
      <span v-if="titleRef.logo" class="logo">
        <img :src="titleRef.logo" alt="logo" />
      </span>
      <span class="title">{{ titleRef.title }}</span>
      <span class="subtitle">{{ titleRef.subtitle }}</span>
    </div>

    <!-- 右侧：用户信息 -->
    <div class="statusbar-actions">
      <div class="statusbar-clock">
        <span class="clock-date">{{ datetimeRef.dateText }}</span>
        <span class="clock-time">{{ datetimeRef.timeText }}</span>
      </div>

      <el-popover placement="bottom-end" :width="220" trigger="click">
        <template #reference>
          <button class="statusbar-btn statusbar-user" type="button" title="用户">
            <span class="user-icon"><span class="ss-icon ss-icon-user"></span></span>
          </button>
        </template>
        <div class="user-popover">
          <div class="user-popover-row">
            <span class="row-label">用户名</span>
            <span class="row-value">{{ userInfo?.userName || '—' }}</span>
          </div>
          <div class="user-popover-row">
            <span class="row-label">姓名</span>
            <span class="row-value">{{ userInfo?.name || '—' }}</span>
          </div>
          <el-button class="logout-btn" type="danger" plain size="small" @click="emit('logout')">
            退出登录
          </el-button>
        </div>
      </el-popover>
    </div>
  </div>
</template>

<style scoped lang="scss">
.desktop-statusbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  height: 2.5em;
  padding: 0 0.75em;
  background: var(--desktop-bg-header);
  border-bottom: 1px solid var(--desktop-border-light);
}

// 左侧时钟：不拦截交互（tasks T031）
.statusbar-title {
  display: flex;
  align-items: center;
  gap: 0.5em;

  .logo {
    display: flex;
    align-items: center;
    width: 1.5em;
    height: 1.5em;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .title {
    font-size: 1em;
    font-weight: 500;
    color: var(--desktop-text-primary);
  }

  .subtitle {
    font-size: 0.8125em;
    color: var(--desktop-text-secondary);
  }
}


.statusbar-clock {
  display: flex;
  align-items: center;
  gap: 0.625em;
  color: var(--desktop-text-primary);
  pointer-events: none;

.clock-time {
  font-size: 1em;
  // 等宽数字，秒数跳动不抖动
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}

.clock-date {
  color: var(--desktop-text-secondary);
  font-size: 0.8125em;
}
}

.statusbar-actions {
  display: flex;
  align-items: center;
  gap: 0.375em;
  pointer-events: auto;
}

.statusbar-btn {
  display: flex;
  align-items: center;
  gap: 0.375em;
  padding: 0.125em 0.5em;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--desktop-text-primary);
  font-size: 1em;
  line-height: 1.6;
  cursor: pointer;

  &:hover {
    background: var(--desktop-bg-secondary);
  }
}

.user-name {
  max-width: 8em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.8125em;
}

.user-popover {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-popover-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125em;

  .row-label {
    color: var(--desktop-text-secondary);
  }

  .row-value {
    color: var(--desktop-text-primary);
  }
}

.logout-btn {
  margin-top: 4px;
  width: 100%;
}
</style>
