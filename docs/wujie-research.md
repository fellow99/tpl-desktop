# 无界（Wujie）微前端框架 — 应用分析报告

> wujie 工程：wujie 官方仓库
> 基于 wujie 工程文档（`docs/`）和示例代码（`examples/`）的全面分析
> 参考文档：wujie 官方文档（`docs/`）

---

## 1. 框架概述与核心原理

无界是腾讯开源的一款微前端框架，其核心理念是利用浏览器原生的 **iframe** 和 **WebComponent（Shadow DOM）** 来实现天然的应用隔离，避免对子应用做过多的侵入式改造。

### 1.1 核心架构

```
┌─────────────────────────────────────────────────┐
│                    主应用                        │
│  ┌───────────────────────────────────────────┐  │
│  │  WujieVue 组件 / startApp()               │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  WebComponent (ShadowRoot) ← CSS隔离  │  │  │
│  │  │  ┌───────────────────────────────┐  │  │  │
│  │  │  │  子应用 DOM (渲染在此)         │  │  │  │
│  │  │  └───────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  iframe (同域) ← JS隔离             │  │  │
│  │  │  ┌───────────────────────────────┐  │  │  │
│  │  │  │  子应用实例 instance 运行在此  │  │  │  │
│  │  │  └───────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

- **JS 沙箱**：子应用的 JavaScript 注入到与主应用同域的 iframe 中运行，利用 iframe 天然的 window 隔离。
- **CSS 沙箱**：子应用的 DOM 渲染在主应用的 WebComponent（Shadow DOM）内部，天然样式隔离。
- **DOM 互联**：通过代理 iframe 的 `document` 查询类接口（`querySelector`、`getElementById` 等）到 WebComponent，实现 iframe 内 JS 实例操作 WebComponent 中的 DOM。
- **路由同步**：iframe 的 history 与主应用 history 在同一个 top-level browsing context 中，劫持 `history.pushState/replaceState` 将子应用路由同步到主应用 URL 查询参数。

### 1.2 与 iframe 方案对比

| 特性 | 纯 iframe | 无界 |
|------|-----------|------|
| JS 隔离 | 完美隔离 | 天然隔离（同域 iframe） |
| CSS 隔离 | 完美隔离 | 天然隔离（Shadow DOM） |
| 路由状态保持 | 刷新丢失 | 支持同步保持 |
| 弹窗全局覆盖 | 无法覆盖 | 支持（代理到 WebComponent） |
| 应用间通信 | 困难 | 多种方式（props/bus/window） |
| 子应用保活 | 不支持 | 支持 keep-alive 模式 |

---

## 2. 主应用接入方式（Vite + Vue3）

> 虽然 `examples/main-vue` 是基于 Webpack + Vue2 的主应用示例，但无界提供的 `wujie-vue3` 包可以用于 Vite + Vue3 主应用。

### 2.1 安装与引入

```bash
# Vue3 框架
npm i wujie-vue3 -S
```

```javascript
// main.ts
import { createApp } from "vue";
import WujieVue from "wujie-vue3";

const { bus, setupApp, preloadApp, destroyApp, refreshApp, clearAssetsCache } = WujieVue;
const app = createApp(App);
app.use(WujieVue);
app.mount("#app");
```

### 2.2 配置子应用（setupApp）

在 `main.js` 中通过 `setupApp()` 预先设置子应用的默认参数，避免在 `preloadApp` 和 `startApp` 中重复配置：
```javascript
// examples/main-vue/src/main.js:58-69
setupApp({
  name: "react16",           // 唯一标识
  url: hostMap("//localhost:7600/"), // 子应用地址
  exec: true,                // 预执行
  props: {                   // 注入数据
    jump: (name) => router.push({ name }),
  },
  fetch: credentialsFetch,   // 自定义 fetch
  alive: false,              // 是否保活
  degrade,                   // 降级兼容
  ...lifecycles,             // 生命周期钩子
});
```

### 2.3 预加载子应用（preloadApp）

```javascript
// examples/main-vue/src/main.js:133-154
preloadApp({ name: "react16" });
preloadApp({ name: "vue2" });
preloadApp({ name: "vue3" });
preloadApp({ name: "vite" });
```

### 2.4 在组件中使用 WujieVue

主应用中直接使用 `<WujieVue>` 组件加载子应用：
```vue
<!-- examples/main-vue/src/views/Vue2.vue -->
<template>
  <!-- 单例模式，name相同则复用一个无界实例，改变url则子应用重新渲染到对应路由 -->
  <WujieVue width="100%" height="100%" name="vue2" :url="vue2Url" :sync="true"></WujieVue>
</template>
```

### 2.5 核心 Props 说明

| Prop | 类型 | 说明 |
|------|------|------|
| `name` | String | 子应用唯一标识，复用关键 |
| `url` | String | 子应用地址 |
| `sync` | Boolean | 路由同步开关 |
| `alive` | Boolean | 保活模式 |
| `props` | Object | 注入子应用的数据和方法 |
| `fetch` | Function | 自定义 fetch 函数 |
| `fiber` | Boolean | js fiber 模式执行（默认 true） |
| `degrade` | Boolean | 降级方案 |
| `plugins` | Array | 插件数组 |
| `beforeLoad/Mount/Unmount/after*` | Function | 生命周期钩子 |

---

## 3. 子应用接入方式

### 3.1 前提条件 — CORS 配置

子应用需要设置跨域响应头：
```javascript
// vue.config.js
module.exports = {
  devServer: {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
};
```

```typescript
// vite.config.ts (for Vite)
export default defineConfig({
  server: {
    cors: true,
  },
});
```

### 3.2 三种运行模式

| 模式 | alive | 生命周期改造 | 特点 |
|------|-------|-------------|------|
| **保活模式** | true | 不必须 | 状态和路由不丢失，切换是热插拔 |
| **单例模式** | false | 必须 | 切换时调 unmount/mount，复用 iframe |
| **重建模式** | false | 未改造 | 每次切换全量销毁重建，有白屏 |

### 3.3 Vue CLI + Vue2 子应用改造

**示例文件：** `examples/vue2/src/main.js`

```javascript
// examples/vue2/src/main.js:53-70
if (window.__POWERED_BY_WUJIE__) {
  let instance;
  let router;
  window.__WUJIE_MOUNT = () => {
    router = new VueRouter({ base, routes });
    instance = new Vue({ router, render: (h) => h(App) }).$mount("#app");
  };
  window.__WUJIE_UNMOUNT = () => {
    instance.$destroy();
    router?.options?.history?.destroy?.();
    instance = null;
    router = null;
  };
} else {
  new Vue({ router: new VueRouter({ base, routes }), render: (h) => h(App) }).$mount("#app");
}
```

**关键点：**
- 通过 `window.__POWERED_BY_WUJIE__` 判断是否运行在无界环境
- 定义 `window.__WUJIE_MOUNT`：创建 Vue 实例并挂载
- 定义 `window.__WUJIE_UNMOUNT`：调用 `$destroy()` 销毁实例
- 生产环境需处理 `publicPath`
- Vue2 子应用路由模式使用 `hash` 或 `history` 均可

### 3.4 Vite + Vue3 子应用改造

**示例文件：** `examples/vite/src/main.ts`

```typescript
// examples/vite/src/main.ts:26-85
declare global {
  interface Window {
    __POWERED_BY_WUJIE__?: boolean;
    __WUJIE_MOUNT: () => void;
    __WUJIE_UNMOUNT: () => void | Promise<void>;
    __WUJIE: { mount: () => void };
  }
}

if (window.__POWERED_BY_WUJIE__) {
  let instance: any;
  let router: any;
  window.__WUJIE_MOUNT = () => {
    router = createRouter({ history: createWebHistory(basename), routes });
    instance = createApp(App)
      .use(Tag).use(Button).use(Dialog)
      .use(Select).use(Popover).use(AButton)
      .use(ASelect).use(AModal).use(APopover)
      .use(router);
    instance.mount("#app");
  };
  window.__WUJIE_UNMOUNT = () => {
    instance?.unmount();
    router?.options?.history?.destroy?.();
    instance = null;
    router = null;
  };
  // 关键：Vite ESM 异步加载，必须主动调用 mount
  window.__WUJIE.mount();
} else {
  createApp(App)
    .use(/* ... */)
    .use(createRouter({ history: createWebHistory(basename), routes }))
    .mount("#app");
}
```

**Vite 子应用特殊注意事项：**
1. **必须主动调用 `window.__WUJIE.mount()`**：由于 Vite 使用 ESM 模块，脚本是异步加载的。无界框架调用 `__WUJIE_MOUNT` 的时机无法确定（可能 Vite 模块还没加载完），因此必须在 `__WUJIE_MOUNT` 定义完成后主动调用 `window.__WUJIE.mount()`。无界 mount 函数内置标记，不会重复执行。

2. **`window.location.host` 问题**：Vite 的 `<script type="module">` 无法被无界闭包劫持 `location`，因此子应用中需要使用 `window.location.host` 的地方应改为 `window.$wujie.location.host`。

3. **TypeScript 类型声明**：需要手动声明 `Window` 接口的扩展属性。

4. **路由 base**：生产环境需要设置 `base` 路径。

### 3.5 Vue CLI + Vue3 子应用改造

**示例文件：** `examples/vue3/src/main.js`

```javascript
// vue3 示例使用 Webpack 打包，与 vue2 的改造模式一致
// 但注意事项：vue3 示例中没有做生命周期改造（直接 mount），
// 因为它运行在保活模式 (alive: true) 下
createApp(App)
  .use(Tag).use(Button) /* ... */
  .use(router)
  .mount("#app");
```

**说明**：examples/vue3 子应用采用保活模式（主应用配置 `alive: true`），因此**无需进行生命周期改造**。

---

## 4. 主应用如何接入子应用

### 4.1 组件式接入

这是最常用的方式，使用 `wujie-vue2` 或 `wujie-vue3` 包的 `<WujieVue>` 组件：

```vue
<!-- examples/main-vue/src/views/Vue2.vue — 单例模式 -->
<WujieVue
  width="100%"
  height="100%"
  name="vue2"
  :url="vue2Url"
  :sync="true"
></WujieVue>

<!-- examples/main-vue/src/views/Vue3.vue — 保活模式 -->
<WujieVue
  width="100%"
  height="100%"
  name="vue3"
  :url="vue3Url"
  :sync="true"
></WujieVue>
```

### 4.2 命令式接入

不依赖框架封装，直接使用 wujie 核心 API：
```javascript
import { startApp } from "wujie";

startApp({
  name: "vue2",
  url: "http://localhost:7200/",
  el: document.querySelector("#container"),
  sync: true,
  props: { jump: (name) => router.push({ name }) },
});
```

### 4.3 路由级别的子应用接入

以 `examples/main-vue/src/router/index.js` 为例，核心路由设计模式：

```javascript
// examples/main-vue/src/router/index.js
const routes = [
  {
    path: "/vue2",           // 子应用默认路由（单例模式起始页）
    name: "vue2",
    component: Vue2,         // 渲染 <WujieVue name="vue2" url="...">
  },
  {
    path: "/vue2-sub/:path", // 子应用的子路由页面
    name: "vue2-sub",
    component: Vue2Sub,      // 渲染 <WujieVue name="vue2" :url="vue2Url + path">
  },
];
```

**不同模式下的路由跳转策略：**

#### 单例模式（Vue2、Vite 子应用）

```vue
<!-- examples/main-vue/src/views/Vue2-sub.vue -->
<template>
  <WujieVue name="vue2" :url="vue2Url"></WujieVue>
</template>

<script>
export default {
  computed: {
    vue2Url() {
      // 直接拼接路由路径，改变url触发子应用重新渲染到目标路由
      return hostMap("//localhost:7200/") + `#/${this.$route.params.path}`;
    },
  },
};
</script>
```

#### 保活模式（Vue3 子应用）

```vue
<!-- examples/main-vue/src/views/Vue3-sub.vue -->
<template>
  <WujieVue name="vue3" :url="vue3Url"></WujieVue>
</template>

<script>
import wujieVue from "wujie-vue2";
export default {
  watch: {
    "$route.params.path": {
      handler: function () {
        // 保活模式改变 url 无效，必须通过 bus 通信通知子应用路由变化
        wujieVue.bus.$emit("vue3-router-change", `/${this.$route.params.path}`);
      },
      immediate: true,
    },
  },
};
</script>
```

### 4.4 多子应用同时激活

```html
<WujieVue name="vue2" url="http://localhost:7200/"></WujieVue>
<WujieVue name="react16" url="http://localhost:7600/"></WujieVue>
```

无界支持一个页面同时激活多个子应用，每个子应用使用独立的 iframe + WebComponent。

---

## 5. 主应用与子应用之间的通信机制

无界提供三种通信方式，详见 `docs/guide/communication.md`。

### 5.1 Props 注入通信（单向：主 → 子）

**主应用：**
```javascript
// setupApp 或 WujieVue props
setupApp({
  name: "vue2",
  props: {
    jump: (name) => router.push({ name }),
    data: { user: "admin" },
  },
});
```

**子应用：**
```javascript
// 获取注入的 props，通过 window.$wujie.props
window.$wujie?.props.jump("react17");  // 调用主应用方法
window.$wujie?.props.data;              // 获取数据
```

**示例：** `examples/vue2/src/views/Communication.vue:37`
```javascript
handleClick() {
  window?.$wujie.props.jump("react17");
}
```

### 5.2 Window 通信（双向：同源直接访问）

由于子应用 iframe 与主应用同域，可以直接通过 `window.parent` 和 `window.querySelector("iframe[name=xxx]").contentWindow` 互相访问。

**主应用调用子应用全局对象：**
```javascript
window.document.querySelector("iframe[name=vue2]").contentWindow.someGlobalVar;
```

**子应用调用主应用全局对象：**
```javascript
window.parent.someGlobalVar;
window.parent.alert("来自子应用的消息");
```

**示例：** `examples/vue2/src/views/Communication.vue:39-41`
```javascript
handleAlert() {
  window?.parent.alert("主应用alert");
}
```

### 5.3 EventBus 通信（双向：去中心化）

无界提供全局 `EventBus` 实例，支持所有应用之间去中心化通信。API 风格类似 Vue 的事件系统：`$on`、`$emit`、`$off`、`$once`、`$clear`。

**主应用：**
```javascript
// examples/main-vue/src/main.js:29-40
import WujieVue from "wujie-vue2";
const { bus } = WujieVue;

// 监听子应用事件
bus.$on("click", (msg) => window.alert(msg));

// 监听子路由变化，同步高亮主应用菜单
bus.$on("sub-route-change", (name, path) => {
  const mainPath = `/${name}-sub${path}`;
  router.push({ path: mainPath });
});
```

**子应用：**
```javascript
// examples/vue2/src/views/Communication.vue:42-43
window.$wujie?.bus.$emit("click", "vue2");

// examples/vue2/src/App.vue:16-18 — 主动通知主应用路由变化
this.$route() {
  window.$wujie?.bus.$emit("sub-route-change", "vue2", this.$route.path);
}

// examples/vue3/src/App.vue:19 — 监听主应用发来的路由变更
mounted() {
  window.$wujie?.bus.$on("vue3-router-change", (path) => this.$router.push(path));
}
```

**重要注意：**
- 子应用销毁或重新渲染（非保活状态）时，框架会自动清理所有订阅事件
- 子应用内部组件的反复渲染可能导致重复订阅，需在 `unmount` 生命周期中手动调用 `$wujie.bus.$off` 取消订阅

### 5.4 通信方式对比总结

| 方式 | 方向 | 适用场景 |
|------|------|----------|
| props 注入 | 主→子 | 主应用向子应用传递数据或回调函数 |
| window.parent / iframe.contentWindow | 双向 | 直接访问全局变量、快速调用 |
| EventBus ($on/$emit) | 双向去中心化 | 任意应用间松耦合事件通信 |
| 组件 @event 监听 | 子→主 | 子应用 `$wujie.bus.$emit()` 的事件，主应用直接 `@event` 监听 |

---

## 6. 主应用获取和调用子应用核心对象

### 6.1 通过 Window 通信获取子应用全局对象

由于无界中子应用的 JS 运行在与主应用同域的 iframe 中，主应用可以直接访问子应用 iframe 的 `contentWindow` 获取其全局对象：

```javascript
// 获取子应用 iframe 的 window 对象
const childWindow = document.querySelector("iframe[name=vue2]").contentWindow;

// 获取子应用中的任何全局变量或实例
const childVueInstance = childWindow.someGlobalVar;
```

### 6.2 获取子应用的 Vue2 主对象

子应用需要在自己的代码中将 Vue 实例暴露到 iframe 的 `window` 上：

**子应用侧（暴露 Vue 实例）：**
```javascript
// examples/vue2/src/main.js 扩展
if (window.__POWERED_BY_WUJIE__) {
  let instance;
  window.__WUJIE_MOUNT = () => {
    const router = new VueRouter({ routes });
    instance = new Vue({ router, render: (h) => h(App) }).$mount("#app");
    // 将 Vue 实例暴露到 window 上供主应用访问
    window.vueApp = instance;
  };
  window.__WUJIE_UNMOUNT = () => {
    instance.$destroy();
    instance = null;
  };
}
```

**主应用侧（获取子应用 Vue 实例）：**
```javascript
// 获取子应用 iframe
const iframe = document.querySelector("iframe[name=vue2]");
if (iframe) {
  const childWindow = iframe.contentWindow;
  // 获取子应用的 Vue2 根实例
  const childVueInstance = childWindow.vueApp;
  // 获取子应用的 Vue 实例上的数据
  const childData = childVueInstance?.$data;
  // 调用子应用 Vue 实例的方法
  childVueInstance?.$emit("someEvent", data);
  // 访问子应用的 $router
  childWindow.vueApp?.$router?.push("/some-path");
}
```

### 6.3 通过生命周期钩子访问

主应用在 `startApp` 或 `setupApp` 配置的生命周期钩子中，可以拿到子应用 `iframe` 的 `window` 对象：

```javascript
// examples/main-vue/src/lifecycle.js
const lifecycles = {
  beforeLoad: (appWindow) => console.log(`${appWindow.__WUJIE.id} beforeLoad`),
  afterMount: (appWindow) => {
    // appWindow 就是子应用 iframe 的 window 对象
    // 可以通过它访问子应用的全局变量
    const vueApp = appWindow.vueApp;
    if (vueApp) {
      console.log("子应用 Vue 实例:", vueApp);
    }
  },
};
```

### 6.4 通过 props 注入回调获取

主应用注入回调函数，子应用在 mount 后将自身的核心对象通过该回调传回：

```javascript
// 主应用
let childInstance = null;
setupApp({
  name: "vue2",
  props: {
    onMounted: (instance) => {
      childInstance = instance; // 保存子应用主对象引用
    },
  },
});
```

```javascript
// 子应用
if (window.__POWERED_BY_WUJIE__) {
  window.__WUJIE_MOUNT = () => {
    const instance = new Vue({ router, render: (h) => h(App) }).$mount("#app");
    // 通过 props 回调将实例传回主应用
    window.$wujie?.props?.onMounted?.(instance);
  };
}
```

### 6.5 通过 Plugin 的 callback 访问

```javascript
// examples/main-vue/src/plugin.js
const plugins = [
  {
    jsBeforeLoaders: [
      {
        callback(appWindow) {
          // appWindow 是子应用 iframe 的 window
          // 可以在 js 执行前设置子应用 window 属性
          appWindow.__customFlag = true;
        },
      },
    ],
    jsAfterLoaders: [
      {
        callback(appWindow) {
          // 子应用 js 执行完毕，可以访问子应用的全局对象
          console.log("子应用全局对象:", appWindow.someGlobalVar);
        },
      },
    ],
  },
];
```

---

## 7. 子应用的 $wujie 对象详解

无界在子应用 `window` 上注入了 `$wujie` 对象，子应用可通过它获取框架提供的各种能力：

```typescript
window.$wujie = {
  bus: EventBus,       // 事件总线实例
  shadowRoot?: ShadowRoot,  // 子应用渲染容器
  props?: { [key: string]: any },  // 主应用注入的数据
  location?: Object,   // 正确的子应用 location（host 修正后）
};
```

### 7.1 子应用全局变量参考

| 变量 | 类型 | 说明 |
|------|------|------|
| `window.__POWERED_BY_WUJIE__` | Boolean | 是否在无界环境中运行 |
| `window.__WUJIE_PUBLIC_PATH__` | String | 子应用公共加载路径 |
| `window.__WUJIE_RAW_WINDOW__` | Window | 原生 window 对象 |
| `window.__WUJIE_RAW_DOCUMENT_QUERY_SELECTOR__` | Function | 未被劫持的 querySelector |
| `window.__WUJIE` | WuJie | 无界沙箱实例（不应直接使用） |
| `window.__WUJIE_MOUNT` | Function | 自定义 mount 生命周期 |
| `window.__WUJIE_UNMOUNT` | Function | 自定义 unmount 生命周期 |
| `window.$wujie` | Object | 框架提供给子应用的接口对象 |

---

## 8. 插件系统

无界提供丰富的插件体系，在运行时动态修改子应用行为，避免改动仓库代码：

```javascript
// examples/main-vue/src/plugin.js
const plugins = [
  {
    htmlLoader: (code) => code,         // 处理 HTML
    jsExcludes: ["some.js", /test\.js/], // 排除特定 JS
    jsBeforeLoaders: [                   // JS 执行前注入
      { src: "http://xxx.js" },         // 外联脚本
      { content: 'console.log("test")' }, // 内联脚本
      { callback(appWindow) { /* ... */ } }, // 回调
    ],
    jsLoader: (code, url) => code,      // JS 代码替换
    jsAfterLoaders: [/* ... */],         // JS 执行后注入
    cssExcludes: [/* ... */],            // 排除特定 CSS
    cssBeforeLoaders: [/* ... */],       // CSS 加载前注入
    cssLoader: (code, url) => code,     // CSS 代码替换
    cssAfterLoaders: [/* ... */],        // CSS 加载后注入
    // 事件钩子
    windowAddEventListenerHook: (iframeWindow, type, handler) => {},
    windowRemoveEventListenerHook: (iframeWindow, type, handler) => {},
    documentAddEventListenerHook: (iframeWindow, type, handler) => {},
    documentRemoveEventListenerHook: (iframeWindow, type, handler) => {},
    // 元素钩子
    appendOrInsertElementHook: (element, iframeWindow) => {},
    patchElementHook: (element, iframeWindow) => {},
    // 属性覆盖
    windowPropertyOverride: (iframeWindow) => {},
    documentPropertyOverride: (iframeWindow) => {},
  },
];
```

---

## 9. 生命周期完整流程

无界提供了完整的生命周期钩子：

```javascript
// examples/main-vue/src/lifecycle.js
const lifecycles = {
  beforeLoad: (appWindow) => {},    // 开始加载静态资源前
  beforeMount: (appWindow) => {},   // 调用 __WUJIE_MOUNT 前（需生命周期改造）
  afterMount: (appWindow) => {},    // 调用 __WUJIE_MOUNT 后（需生命周期改造）
  beforeUnmount: (appWindow) => {}, // 调用 __WUJIE_UNMOUNT 前（需生命周期改造）
  afterUnmount: (appWindow) => {},  // 调用 __WUJIE_UNMOUNT 后（需生命周期改造）
  activated: (appWindow) => {},     // 保活模式：进入时触发
  deactivated: (appWindow) => {},   // 保活模式：离开时触发
  loadError: (url, e) => {},        // 资源加载失败
};
```

**生命周期触发条件：**
- `beforeMount/afterMount/beforeUnmount/afterUnmount`：仅子应用做了生命周期改造时才触发
- `activated/deactivated`：仅保活模式（`alive: true`）子应用触发

---

## 10. 关键设计细节补充

### 10.1 路由同步机制

开启 `sync: true` 后，无界将子应用路径编码后挂载到主应用 URL 查询参数：
```
主应用URL: /vue2-sub/home?vue2=%2Fhome
```
刷新浏览器时，无界从查询参数中读回子应用路由并同步。

### 10.2 短路径

当子应用路由过长时可通过 `prefix` 配置缩短：
```javascript
prefix: { "prod": "/example/prod" }
// /example/prod/hello → {prod}/hello
```

### 10.3 降级方案

当浏览器不支持 `Proxy` 或 `WebComponent` 时自动降级：
- 用另一个 iframe 替换 WebComponent
- 用 `Object.defineProperty` 替换 `Proxy`
- 缺点：弹窗无法覆盖全局，需使用 `$wujie.location.host`

### 10.4 应用嵌套

无界支持应用嵌套，子应用内也可以嵌套更深的子应用。`bus` 在所有嵌套应用中去中心化通信。

### 10.5 应用间依赖共享

通过插件 + webpack externals 实现：
```javascript
// 主应用挂载共享包到 window
window.lodash = lodash;
// 注入到子应用
plugins: [{ jsBeforeLoaders: [{ content: 'window.lodash = window.parent.lodash' }] }]
// 子应用 webpack externals
externals: { lodash: { root: "lodash", commonjs: "lodash" } }
```

---

## 11. 总结

| 主题 | 关键结论 |
|------|----------|
| **主应用接入** | 使用 `wujie-vue2`/`wujie-vue3` 包，通过 `<WujieVue>` 组件或调用 `startApp()` 加载子应用，`setupApp()` 预设配置，`preloadApp()` 预加载优化 |
| **子应用接入（Vue2）** | 判断 `__POWERED_BY_WUJIE__`，定义 `__WUJIE_MOUNT/__WUJIE_UNMOUNT`，使用 `$destroy()` 清理 |
| **子应用接入（Vite+Vue3）** | 需额外处理：主动调用 `__WUJIE.mount()`（ESM 异步）、注意 `$wujie.location.host` 替代 `window.location.host`、手动声明 TS 类型 |
| **路由跳转** | 单例模式改 url 触发重渲染；保活模式通过 bus 通知子应用路由变化 |
| **通信** | props 注入（主→子）、window.parent/contentWindow（双向）、EventBus（去中心化双向） |
| **获取子应用核心对象** | 通过 `document.querySelector("iframe[name=xxx]").contentWindow` 获取子应用 window，访问其暴露的全局对象；也可通过生命周期钩子/plugin callback 中的 `appWindow` 参数获取 |
