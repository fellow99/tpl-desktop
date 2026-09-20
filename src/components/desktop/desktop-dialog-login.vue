<script setup>
// ============================================================
// 201-page-index: 登录对话框（desktop-dialog-login）
//
// 契约（spec.md FR-019~021 / plan.md §2.1 / constitution S-02）：
//   - el-dialog 登录表单（用户名 + 密码），不可点遮罩/ESC 关闭、
//     无关闭按钮 —— 由登录覆盖层承载，未登录时阻止进入桌面（FR-019）
//   - 提交 → auth-service.login()（内部完成 RSA 加密传输 + 会话缓存）
//   - 成功 → emit('success', user)；失败 → 中文错误提示（C-05）
// ============================================================
import { ref } from 'vue'
import { login } from '../../api/auth-service.js'

const emit = defineEmits(['success'])

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  if (loading.value) return
  if (!username.value.trim() || !password.value) {
    errorMessage.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const user = await login(username.value.trim(), password.value)
    emit('success', user)
  } catch (error) {
    errorMessage.value = error?.message || '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="true"
    title="登录工作台"
    width="360px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    align-center
  >
    <el-form label-position="top" @submit.prevent="handleSubmit">
      <el-form-item label="用户名">
        <el-input
          v-model="username"
          placeholder="请输入用户名"
          autocomplete="username"
          :disabled="loading"
          @keyup.enter="handleSubmit"
        />
      </el-form-item>
      <el-form-item label="密码">
        <el-input
          v-model="password"
          type="password"
          placeholder="请输入密码"
          autocomplete="current-password"
          show-password
          :disabled="loading"
          @keyup.enter="handleSubmit"
        />
      </el-form-item>
    </el-form>

    <!-- 登录失败提示（中文，C-05） -->
    <div v-if="errorMessage" class="login-error">{{ errorMessage }}</div>

    <template #footer>
      <el-button
        class="login-submit"
        type="primary"
        :loading="loading"
        @click="handleSubmit"
      >
        {{ loading ? '登录中…' : '登录' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.login-error {
  padding: 4px 0;
  color: var(--el-color-danger, #f56c6c);
  font-size: 0.8125em;
  line-height: 1.4;
}

.login-submit {
  width: 100%;
}
</style>
