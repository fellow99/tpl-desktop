# 工作台 — 全局接口契约 (Overall API)

> 项目: tpl-desktop（工作台）
> 文档类型: As-Built（基于源代码逆向整理）
> 最后更新: 2026-07-19

## 1. Composable 公共接口

### 1.1 useTheme

**源文件**: `src/composables/useTheme.js` (81 行)

```js
export function useTheme()
// → { initTheme, isDark, toggleTheme, setTheme, applyTheme }
```

| 导出 | 签名 | 描述 |
|------|------|------|
| `initTheme` | `() => void` | 初始化主题优先级：localStorage > 系统偏好 > 默认深色。仅在无存储值时跟随系统偏好。模块加载时注册 `window.matchMedia('(prefers-color-scheme: dark)')` 监听（单次注册）。 |
| `isDark` | `Ref<boolean>` | 模块级共享 ref，当前是否为深色模式 |
| `toggleTheme` | `() => void` | 切换浅色/深色，调用 `setTheme`（含持久化） |
| `setTheme` | `(theme: string) => void` | 设置指定主题（`'dark'` / `'light'`），应用到 `html.dark` class + 持久化到 `localStorage['dashboard-theme']` |
| `applyTheme` | `(theme: string) => void` | 仅应用主题到 `html.dark` class，**不持久化**。用于系统偏好自动跟随场景 |

**副作用**:
- `setTheme` / `toggleTheme` → 写入 `localStorage['dashboard-theme']`
- 所有主题方法 → 操作 `document.documentElement.classList.toggle('dark')`
- 模块级 `window.matchMedia` 监听注册一次（`useTheme.js:73-77`）
- 系统偏好变化且无存储值时自动 `applyTheme`（不持久化，以便后续仍可自动跟随）

### 1.2 useGridStack

**源文件**: `src/composables/useGridStack.js` (194 行)

```js
export function useGridStack()
// → { initGrid, destroyGrid, destroyAll, getInstance, getAllInstances,
//     registerWidgetEmitter, unregisterWidgetEmitter,
//     emitToWidget, broadcastToAllWidgets,
//     setActive, isActive }
```

#### 实例管理

| 导出 | 签名 | 描述 |
|------|------|------|
| `initGrid` | `(key: string, container: HTMLElement, gridOptions?: object, callbacks?: GridStackCallbacks) => GridStack \| null` | 初始化 GridStack 实例。如果 `container` 不存在或 GridStack.init 抛异常，返回 `null`。如果 `key` 已存在返回现有实例。自动绑定 DOM 事件并桥接到 widget。 |
| `destroyGrid` | `(key: string, removeDom?: boolean) => void` | 销毁指定实例。先清理该实例下所有 widget 事件注册，再调用 `grid.destroy(removeDom)` |
| `destroyAll` | `(removeDom?: boolean) => void` | 销毁所有实例 |
| `getInstance` | `(key: string) => GridStack \| null` | 获取指定实例 |
| `getAllInstances` | `() => GridStack[]` | 获取所有实例数组 |

#### Widget 事件桥接

| 导出 | 签名 | 描述 |
|------|------|------|
| `registerWidgetEmitter` | `(nodeId: string, emit: Function) => void` | 注册 widget emit 桥接。由 `rerenderNode` 在 VNode 挂载后调用。`emit` 函数为 Widget 组件 proxy 的 `$emit`，绑定的闭包签名为 `(eventName, payload) => widgetProxy.$emit(eventName, payload)` |
| `unregisterWidgetEmitter` | `(nodeId: string) => void` | 注销 widget emit 桥接 |
| `emitToWidget` | `(nodeId: string, eventName: string, payload: any) => void` | 向指定 widget 发送事件。未注册时静默跳过 |
| `broadcastToAllWidgets` | `(eventName: string, payload: any) => void` | 向所有已注册 widget 广播事件 |

#### 活动状态

| 导出 | 签名 | 描述 |
|------|------|------|
| `setActive` | `(key: string, active: boolean) => void` | 设置 GridStack 实例活动状态。状态变化时遍历其下所有 node → `emitToWidget(id, 'grid-active' \| 'grid-deactive')`。状态无变化时跳过广播 |
| `isActive` | `(key: string) => boolean` | 查询实例是否活动 |

#### GridStackCallbacks

```ts
{
  onNodeAdded?: (node: GridStackNode, grid: GridStack, key: string) => void
  onNodeRemoved?: (node: GridStackNode, grid: GridStack, key: string) => void
  onNodeChange?: (node: GridStackNode, grid: GridStack, key: string) => void
  onNodeDragStart?: (node: GridStackNode, grid: GridStack, key: string) => void
  onNodeDragStop?: (node: GridStackNode, grid: GridStack, key: string) => void
  onNodeResizeStart?: (node: GridStackNode, grid: GridStack, key: string) => void
  onNodeResizeStop?: (node: GridStackNode, grid: GridStack, key: string) => void
}
```

#### Widget 事件表（GridStack DOM → Widget emit）

| GridStack 事件 | 回调 | Widget 事件 | Payload |
|---------------|------|-------------|---------|
| `added` | `onNodeAdded` → 回调 | `grid-added` | `{ id, x, y, w, h }` |
| `removed` | `onNodeRemoved` → 回调 | `grid-removing` | `{ id }` |
| `change` | `onNodeChange` → 回调 | —（无 widget 桥接） | — |
| `dragstart` | `onNodeDragStart` → 回调 | `grid-moving` | `{ id, x, y, w, h }` |
| `dragstop` | `onNodeDragStop` → 回调 | `grid-moving-end` | `{ id, x, y, w, h }` |
| `resizestart` | `onNodeResizeStart` → 回调 | `grid-resizing` | `{ id, x, y, w, h }` |
| `resizestop` | `onNodeResizeStop` → 回调 | `grid-resizing-end` | `{ id, x, y, w, h }` |

**内部状态**:
- 模块级 `grids` Map (`key → GridStack 实例`)
- 模块级 `activeStates` Map (`key → boolean`)
- 模块级 `widgetEmitters` Map (`nodeId → emit 函数`)

**HMR**: 模块热更新时 `import.meta.hot.dispose` → `destroyAll(false)` 防止旧实例泄漏

### 1.3 useWidgetMetas

**源文件**: `src/composables/useWidgetMetas.js` (15 行)

```js
export function useWidgetMetas()
// → { widgetMetas }
```

| 导出 | 类型 | 描述 |
|------|------|------|
| `widgetMetas` | `Ref<Record<string, WidgetMeta>>` | 模块级响应式 Widget 元数据字典。值来自 `src/widgets/index.js` 的 `WidgetMetas` 构建时产物，运行时只读。 |

### 1.4 useAppMetas

**源文件**: `src/composables/useAppMetas.js` (15 行)

```js
export function useAppMetas()
// → { appMetas }
```

| 导出 | 类型 | 描述 |
|------|------|------|
| `appMetas` | `Ref<Record<string, AppMeta>>` | 模块级响应式 App 元数据字典。结构与 `widgetMetas` 一致，值来自 `src/apps/index.js` 的 `AppMetas`。 |

### 1.5 useBackgroundMetas

**源文件**: `src/composables/useBackgroundMetas.js` (16 行)

```js
export function useBackgroundMetas()
// → { backgroundMetas }
```

| 导出 | 类型 | 描述 |
|------|------|------|
| `backgroundMetas` | `Ref<Record<string, DesktopBackgroundMeta>>` | 模块级响应式背景元数据字典。值来自 `src/backgrounds/index.js` 的 `BackgroundMetas`。 |

---

## 2. 核心组件 Props / Emits 契约

### 2.1 desktop-viewport-desktop

**源文件**: `src/components/viewport/desktop-viewport-desktop.vue` (479 行)

#### Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `desktopConfig` | `Object` | `null` | 完整 DesktopConfig 对象 |
| `desktopMode` | `String` | `'normal'` | `'normal' \| 'editing'` |
| `currentPageIndex` | `Number` | `0` | 当前页索引（与 Swiper activeIndex 同步） |
| `userInfo` | `Object` | `null` | 登录用户信息（`LoginUser` 类型） |

#### Emits

| 事件 | Payload | 描述 |
|------|---------|------|
| `widgetEdit` | `(node: GridStackNode, meta: WidgetMeta)` | Widget 外壳「编辑」按钮点击 → Desktop.vue 打开属性编辑面板 |
| `pageChange` | `(newIndex: number)` | Swiper 页面切换 → Desktop.vue 更新 `currentPageIndex` |

#### Expose（通过 `defineExpose`）

| 方法 | 签名 | 描述 |
|------|------|------|
| `addWidget` | `(widgetName: string, options?: { w?, h?, x?, y?, presetKey?, propsValues?, wrapperValues? }) => string \| null` | 向当前活动页添加 Widget。返回新节点的 ID 或 null |
| `updateWidgetProps` | `({ id, propsValues?, wrapperValues? }) => void` | 更新指定节点属性并重渲染 |
| `switchPage` | `(index: number) => void` | 切换到指定页面 |
| `getCurrentPageData` | `() => object \| null` | 先序列化当前页再返回数据 |
| `saveAllPages` | `() => DesktopConfig` | 序列化所有页 GridStack 状态到 `desktopConfig.pages`，返回配置对象 |
| `broadcastToCurrentPageWidgets` | `(eventName: string) => void` | 向当前页所有 widget 发送事件 |

### 2.2 desktop-viewport-app

**源文件**: `src/components/viewport/desktop-viewport-app.vue` (107 行)

#### Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `apps` | `Array` | `[]` | `AppInstance[]` — Desktop.vue 的 `desktopApps` ref |

#### Emits

| 事件 | Payload | 描述 |
|------|---------|------|
| `minimizeApp` | `(app: AppInstance)` | App 外壳「最小化」按钮 → Desktop.vue `handleMinimizeApp` |
| `removeApp` | `(app: AppInstance)` | App 外壳「关闭」按钮 → Desktop.vue `handleRemoveApp` |

### 2.3 desktop-widget-wrapper

**源文件**: `src/components/viewport/desktop-widget-wrapper.vue` (114 行)

#### Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `title` | `String` | `'面板'` | 标题栏文字 |
| `hideHeader` | `Boolean` | `false` | 是否隐藏标题栏（常规模式默认 `true`，编辑模式强制 `false`） |
| `editMode` | `Boolean` | `true` | 是否显示编辑/删除按钮 |
| `node` | `Object` | `null` | 当前 GridStackNode（emit 载荷接线用） |
| `meta` | `Object` | `null` | 当前 WidgetMeta（emit 载荷接线用） |

#### Emits

| 事件 | Payload | 描述 |
|------|---------|------|
| `widget-edit` | `{ node: GridStackNode, meta: WidgetMeta }` | 点击「编辑」按钮 |
| `widget-remove` | `(node: GridStackNode)` | 点击「删除」按钮 |

#### Slots

| 插槽 | 描述 |
|------|------|
| `default` | Widget 内容 VNode，由视口通过 `h(Comp, compProps)` 创建 |

### 2.4 desktop-app-wrapper

**源文件**: `src/components/viewport/desktop-app-wrapper.vue` (95 行)

#### Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `title` | `String` | `'App'` | 标题栏文字 |

#### Emits

| 事件 | Payload | 描述 |
|------|---------|------|
| `minimize` | — | 点击「最小化」按钮 |
| `close` | — | 点击「关闭」按钮 |

#### Slots

| 插槽 | 描述 |
|------|------|
| `default` | App 组件内容，由 `desktop-viewport-app` 通过 `<component :is="">` 注入 |

### 2.5 desktop-property-panel

**源文件**: `src/components/property/desktop-property-panel.vue` (117 行)

#### Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `visible` | `Boolean` | `required: true` | 面板显隐（v-model） |
| `node` | `Object` | `null` | 当前编辑的 GridStackNode |
| `meta` | `Object` | `null` | 当前组件的 WidgetMeta / AppMeta |

#### Emits

| 事件 | Payload | 描述 |
|------|---------|------|
| `update:visible` | `(visible: boolean)` | v-model 双向绑定 |
| `confirm` | `{ id, propsValues, wrapperValues }` | 点击「应用」→ Desktop.vue `onWidgetPropsConfirm` |

### 2.6 desktop-property-form

**源文件**: `src/components/property/desktop-property-form.vue` (205 行)

#### Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `value` | `Object` | `required: true` | 当前属性值对象（**就地修改**，不做深拷贝） |
| `props` | `Object` | `null` | 属性元数据 Schema (`Record<string, PropMeta>`) |

#### Emits

无。通过直接修改 `value` 对象回写数据。

---

## 3. Meta 文件约定接口

### 3.1 Widget Meta 文件 (`*.widget.js`)

**扫描路径**: `src/widgets/**/*.widget.js`  
**配对规则**: 同目录同名 `.widget.vue`  
**导出**: `export default { ... }`（非对象时降级到默认元数据）

#### 必填字段

无严格必填字段（注册表提供全量默认值回退）

#### 推荐字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | `string` | 标题（缺失时回退为 compName） |
| `category` | `string` | 分类（缺失时 `'其他'`） |
| `rect` | `{ unit:'grid', width, height, fixed? }` | 网格尺寸（缺失时 w=1, h=1） |
| `avatar` | `string \| null` | 图标 |
| `props` | `Record<string, PropMeta>` | 属性定义 |

#### 不应手写的字段

- `compName` — 由注册表从文件名自动提取注入

#### 完整示例

参见 `src/widgets/basic/BasicText.widget.js` 和 `src/widgets/basic/BasicImage.widget.js`

### 3.2 App Meta 文件 (`*.app.js`)

**扫描路径**: `src/apps/**/*.app.js`  
**配对规则**: 同目录同名 `.app.vue`  
**导出**: `export default { ... }`（非对象时降级到默认元数据）

结构与 Widget Meta 完全一致，区别仅在注册表默认值：`rect` 默认 `{ width:4, height:3 }`。

完整示例参见 `src/apps/basic/BasicClock.app.js` 和 `src/apps/basic/BasicIframe.app.js`

### 3.3 Background Meta 文件 (`*.bg.js`)

**扫描路径**: `src/backgrounds/**/*.bg.js`  
**导出**: `export default { ... }`（非对象时该背景被跳过）

#### 必填字段

无严格必填字段（category 默认 `'其他'`，type 默认 `'image'`）

#### 推荐字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | `string` | 标题（缺失时回退为 name） |
| `category` | `string` | 分类（缺失时 `'其他'`） |
| `type` | `'image' \| 'video'` | 类型（缺失时 `'image'`） |
| `theme` | `'light' \| 'dark'` | 关联主题（选择时自动切换） |
| `avatar` | `string` | 图标 URL（import） |
| `thumbnail` | `string` | 缩略图 URL（import） |
| `image` | `string` | 背景图 URL（import，type=image 时使用） |
| `video` | `string` | 背景视频 URL（import，type=video 时使用） |

#### 不应手写的字段

- `name` — 由注册表从文件名自动提取注入（如 `dark-001.bg.js` → `'dark-001'`）

#### 完整示例

参见 `src/backgrounds/dark/dark-001.bg.js` 和 `src/backgrounds/video/webm-001.bg.js`

---

## 4. auth-service 接口

**源文件**: `src/api/auth-service.js` (140 行)

```js
export async function login(username: string, password: string): Promise<LoginUser>
export function logout(): void
export function restoreSession(): LoginUser | null
```

### login(username, password)

1. 参数校验：空 `username` / `password` → `throw Error('请输入用户名和密码')`
2. RSA 加密：`encryptPassword(password)` — 公钥来自 `window.SYSTEM_CONFIGS.rsaPublicKey`，公钥缺失或加密失败 → `throw Error`
3. 后端认证：POST `window.SYSTEM_CONFIGS.authLoginUrl`（默认 `/authcenter/login`），body `{ username, password: <RSA加密> }`
4. 降级：后端不可达或非 2xx → `console.warn` + `loginViaMock(username, <明文password>)`（fetch `/USERS_MOCK.json` 本地比对）
5. 响应解析：兼容 `{ code, data }` 包装与直接返回用户对象两种形态
6. 返回 `LoginUser { userId, userName, name }`（密码已剔除）
7. 缓存：`localStorage['dashboard-login-user'] = JSON.stringify(user)`

### logout()

清除 `localStorage['dashboard-login-user']`。localStorage 不可用时静默忽略。

### restoreSession()

读取 `localStorage['dashboard-login-user']` → JSON.parse → `toLoginUser()` 收窄 → 校验 `userName` 存在。无效返回 `null`。

---

## 5. 运行时配置接口

**源文件**: `public/config.js` (13 行)

通过 `index.html` 的 `<script src="/config.js">` 在 Vue 应用之前注入到 `window.SYSTEM_CONFIGS`。

```ts
interface SystemConfigs {
  authLoginUrl: string    // 认证中心登录接口 URL（默认 '/authcenter/login'）
  rsaPublicKey: string    // RSA 公钥（PEM 格式，用于 jsencrypt 加密登录密码）
}
```

**访问方式**: `(typeof window !== 'undefined' && window.SYSTEM_CONFIGS) || {}`（`auth-service.js:26-28`）

**部署后修改**: 直接编辑 `dist/config.js`（或部署服务器的 `/config.js`），无需重新构建。

---

## 6. 版本历史

| 日期 | 变更 |
|------|------|
| 2026-07-19 | 初始 As-Built 版本 |
