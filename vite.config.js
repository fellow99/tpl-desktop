import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 工作台 — Vite 构建配置（单页面入口 index.html + dev proxy）
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 启用 Vue 3 模板编译器 — 支持 wujie 子应用动态注册的组件使用 template 字符串
      // 默认 runtime-only 构建不包含编译器，导致动态组件的 template 选项失效
      vue: 'vue/dist/vue.esm-bundler.js',
    },
  },
  server: {
    host: '0.0.0.0',
    watch: {
      usePolling: true,
      interval: 1000,
    },
    hmr: {
      overlay: true,
    },
    proxy: {
      // 子应用 tpl-desktop-plugin-demo 反向代理
      '/tpl-desktop-plugin-demo': {
        target: 'http://127.0.0.1:5273',
        changeOrigin: true,
      },
    },
  },
})
