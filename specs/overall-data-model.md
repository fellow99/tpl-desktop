# 工作台 — 全局数据模型 (Overall Data Model)

> 项目: tpl-desktop（工作台）
> 文档类型: As-Built（基于源代码逆向整理）
> 最后更新: 2026-07-19

## 1. 核心实体

### 1.1 WidgetMeta — 看板组件元数据

每个看板组件对应一个 `*.widget.js` 文件，default export 为此结构的 partial；注册表 (`src/widgets/index.js`) 合并此 partial 与默认值后注入 `compName`。

| 字段 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `title` | `string` | 否 | `compName` | 组件中文标题 |
| `category` | `string` | 否 | `'其他'` | 分类（如 `'3.基础组件'`） |
| `avatar` | `string \| null` | 否 | — | 头像图标（import 的 SVG URL） |
| `thumbnail` | `string \| null` | 否 | `null` | 缩略图 |
| `rect` | `{ unit, width, height }` | 否 | `{ unit:'grid', width:1, height:1 }` | 默认网格尺寸 |
| `rect.unit` | `'grid'` | 否 | `'grid'` | 单位（固定为 `'grid'`） |
| `rect.width` | `number` | 否 | `1` / `4`（App） | 默认网格宽度 |
| `rect.height` | `number` | 否 | `1` / `3`（App） | 默认网格高度 |
| `rect.fixed` | `boolean` | 否 | — | 存在时禁止调整尺寸 |
| `props` | `Record<string, PropMeta>` | 否 | — | 可配置属性定义 |
| `events` | `array` | 否 | `[]` | 预留扩展点（当前未消费） |
| `propsEditors` | `array` | 否 | `[]` | 预留扩展点（当前未消费） |
| `wrapperEditors` | `array` | 否 | `[]` | 预留扩展点（当前未消费） |
| `presets` | `array` | 否 | `undefined` | 预设变体列表（未定义时保持 undefined） |
| `compName` | `string` | —（自动注入） | 从文件名提取 | 全局唯一标识符 |

**完整示例**（`src/widgets/basic/BasicText.widget.js:9-26`）：

```json
{
  "title": "基础文字",
  "category": "3.基础组件",
  "avatar": "<imported SVG URL>",
  "thumbnail": null,
  "rect": { "unit": "grid", "width": 1, "height": 1 },
  "props": {
    "value": { "title": "文本内容", "category": "看板组件配置", "default": "这是一段文字" }
  },
  "events": [],
  "propsEditors": [],
  "wrapperEditors": [],
  "compName": "BasicText"
}
```

### 1.2 AppMeta — App 应用元数据

与 `WidgetMeta` **结构完全一致**（同源抽象），区别仅在注册表默认值：`rect` 默认宽高为 `4×3`。

### 1.3 PropMeta — 属性元数据

定义单个可编辑属性的 Schema，由属性编辑器 (`desktop-property-form.vue`) 根据 `type` 字段渲染对应控件。

| 字段 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `title` | `string` | MUST | — | 属性中文标签 |
| `category` | `string` | MAY | — | 分类（当前无实际渲染用途） |
| `type` | `'text' \| 'number' \| 'boolean' \| 'json' \| 'markdown' \| 'select' \| 'custom'` | 否 | `'text'` | 编辑器类型（大小写不敏感归一化） |
| `default` | `any` | 否 | — | 默认值 |
| `options` | `Array<{label, value}>` | 否 (仅 select) | — | select 类型的选项列表 |
| `custom` | `Component` | 否 (仅 custom) | — | 自定义编辑器的 Vue 组件 |

**类型 → 编辑器映射**（`desktop-property-form.vue:34-145`）：

| `type` 值 | 渲染控件 | 说明 |
|-----------|---------|------|
| `undefined` / `'text'` | `el-input type=text` | 默认 |
| `'number'` | `el-input type=number` | NaN 回退到 `propMeta.default ?? 0` |
| `'boolean'` | `el-switch` | — |
| `'json'` | `<textarea>` 等宽 20 行 | `change` 时 `JSON.parse` 校验，失败显示红框错误态 |
| `'markdown'` | `VMarkdownEditor` | vue3-markdown 编辑器 |
| `'select'` | 回退 `el-input type=text` | select 编辑器未实现 |
| `'custom'` | `<component :is="">` | 级联自定义编辑组件 |

### 1.4 wrapperPropsMeta — 固定外框属性

外框属性不由 Widget 元数据定义，而是在属性编辑面板中硬编码（`desktop-property-panel.vue:28-31`）：

```json
{
  "title": { "title": "标题", "category": "外框配置", "default": "示例组件" },
  "hideHeader": { "title": "隐藏标题栏", "category": "外框配置", "type": "boolean", "default": false }
}
```

### 1.5 DesktopBackgroundMeta — 桌面背景元数据

每个背景对应一个 `*.bg.js` 文件，`name` 由注册表从文件名自动提取并注入。

| 字段 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `title` | `string` | 否 | `name` | 背景中文标题 |
| `category` | `string` | 否 | `'其他'` | 分类（如 `'暗色系'`、`'浅色系'`、`'动态'`） |
| `theme` | `'light' \| 'dark'` | 否 | — | 关联主题（选择背景时自动切换） |
| `type` | `'image' \| 'video'` | 否 | `'image'` | 背景类型 |
| `avatar` | `string` | 否 | — | 头像图标 URL |
| `thumbnail` | `string` | 否 | — | 缩略图 URL |
| `image` | `string` | 否 (type=image) | — | 背景图片 URL（SVG） |
| `video` | `string` | 否 (type=video) | — | 背景视频 URL（WebM） |
| `name` | `string` | —（自动注入） | 从文件名提取 | 全局唯一标识符 |

**示例 — 图片背景**（`src/backgrounds/dark/dark-001.bg.js:8-16`）：

```json
{
  "title": "暗色背景01",
  "category": "暗色系",
  "theme": "dark",
  "type": "image",
  "avatar": "<svg URL>",
  "thumbnail": "<png URL>",
  "image": "<svg URL>",
  "name": "dark-001"
}
```

**示例 — 视频背景**（`src/backgrounds/video/webm-001.bg.js:8-16`）：

```json
{
  "title": "动态背景01",
  "category": "动态",
  "theme": "dark",
  "type": "video",
  "avatar": "<svg URL>",
  "thumbnail": "<png URL>",
  "video": "<webm URL>",
  "name": "webm-001"
}
```

### 1.6 PluginMeta — 子应用清单项（007-wujie-system）

每个子应用在 `public/PLUGINS.json` 的 `plugins` 数组中对应一条记录。

| 字段 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `name` | `string` | MUST | — | 子应用唯一标识，对应 wujie `startApp({ name })` |
| `title` | `string` | MUST | — | 子应用显示名称 |
| `category` | `string` | MAY | `'未分类'` | 子应用分类 |
| `url` | `string` | MUST | — | 子应用加载 URL（wujie 入口 HTML 路径，经 vite proxy 转发） |
| `alive` | `boolean` | 否 | `true` | 是否开启保活模式（切换时不销毁实例） |
| `exec` | `boolean` | 否 | `false` | 是否开启预执行模式（加载时立即执行脚本） |
| `fiber` | `boolean` | 否 | `true` | 是否开启 Fiber 并发渲染模式 |
| `disabled` | `boolean` | 否 | `false` | 是否禁用（禁用后不加载该子应用） |

**示例**（`public/PLUGINS.json`）：
```json
{
  "plugins": [
    {
      "name": "tpl-desktop-plugin-demo",
      "title": "DEMO桌面插件",
      "category": "DEMO",
      "url": "/tpl-desktop-plugin-demo/plugin.html",
      "alive": true,
      "exec": false,
      "fiber": true,
      "disabled": false
    }
  ]
}
```

### 1.7 PluginManifest — 子应用清单容器

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `plugins` | `PluginMeta[]` | MUST | 子应用清单数组 |

### 1.8 PluginLoadState — 子应用加载状态（运行时）

不持久化，由 `useWujie` composable 维护：

| 字段 | 类型 | 描述 |
|------|------|------|
| `[pluginName]` | `{ status: 'loading' \| 'loaded' \| 'failed', error?: string }` | 每个已注册子应用的加载状态 |

状态转换：
```
[初始] ──[startApp]──→ 'loading'
'loading' ──[afterMount+exports就绪]──→ 'loaded'
'loading' ──[loadError/超时]──→ 'failed'
```

### 1.9 WujieExport — 子应用导出对象（运行时）

子应用通过 `window.__WUJIE_EXPORTS__` 暴露给主应用：

| 字段 | 类型 | 描述 |
|------|------|------|
| `widgets` | `Record<string, WidgetMeta>` | Widget 组件元数据字典 |
| `apps` | `Record<string, AppMeta>` | App 组件元数据字典 |
| `backgrounds` | `Record<string, DesktopBackgroundMeta>` | 背景元数据字典 |

### 1.10 WidgetMeta / AppMeta 扩展 — source 字段（007-wujie-system）

为区分组件来源，`WidgetMeta` 和 `AppMeta` 新增字段：

| 字段 | 类型 | 描述 |
|------|------|------|
| `source` | `'local' \| 'plugin:<name>'` | 组件来源标识。本地 `import.meta.glob` 注册的为 `'local'`，从子应用注入的为 `'plugin:<pluginName>'`（如 `'plugin:tpl-desktop-plugin-demo'`） |

### 1.11 User — 用户实体

**模拟用户数据** (`USERS_MOCK.json`):

| 字段 | 类型 | 描述 |
|------|------|------|
| `userId` | `string` | 用户 ID |
| `userName` | `string` | 用户名（登录凭证） |
| `password` | `string` | 明文密码（仅用于本地比对，不进 localStorage） |
| `name` | `string` | 显示名称 |

**LoginUser — 运行时登录实体**（持久化到 `dashboard-login-user`，`auth-service.js:48-55`）：

| 字段 | 类型 | 描述 |
|------|------|------|
| `userId` | `string \| null` | 用户 ID |
| `userName` | `string` | 用户名 |
| `name` | `string` | 显示名称 |

> `password` 字段在 `toLoginUser()` 中**显式剔除**，不持久化（宪法第15条）。

### 1.7 DesktopConfig — 桌面配置

完整 JSON 结构（`DEFAULT_DESKTOP_JSON.json` 所示模型，运行时持久化到 `dashboard-desktop-data`）：

```json
{
  "theme": "light | dark",
  "font-size": "16px",
  "grid": {
    "cols": 12,
    "rows": 8
  },
  "background": {
    "type": "image | video",
    "name": "dark-001",
    "title": "暗色背景01",
    "category": "暗色系"
  } | null,
  "pages": [
    {
      "title": "",
      "children": [
        // GridStackNode[]
      ]
    }
  ],
  "shortcuts": [
    {
      "compName": "BasicClock",
      "compId": "<optional UUID>",
      "appMeta": { /* AppMeta partial */ }
    }
  ]
}
```

| 字段 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `theme` | `string` | MUST | `'light'` | 主题偏好 |
| `font-size` | `string` | MUST | `'16px'` | 全局字号 |
| `grid.cols` | `number` | MUST | `12` | 网格列数 |
| `grid.rows` | `number` | MUST | `8` | 网格行数（仅初始值参考） |
| `background` | `{ type, name, title, category } \| null` | MAY | `null` | 当前背景引用（不存实际资源 URL，由 name 从 backgroundMetas 解析） |
| `pages` | `[{ title, children }]` | MUST | `[{ title:'', children:[] }]` | 页面数组（至少一页兜底） |
| `pages[i].title` | `string` | MUST | `''` | 页面标题 |
| `pages[i].children` | `GridStackNode[]` | MUST | `[]` | 该页的 GridStack 节点数组 |
| `shortcuts` | `[{ compName, compId?, appMeta }]` | MUST | `[]` | App 快捷方式列表 |

### 1.8 GridStackNode — 看板组件实例数据

持久化在 `pages[i].children` 中，其结构由 GridStack `save()` 输出合并自定义字段形成：

| 字段 | 类型 | 来源 | 描述 |
|------|------|------|------|
| `id` | `string` | 创建时 `Date.now() + ''` 生成 | 实例唯一标识 |
| `x` | `number` | GridStack 计算 | 列坐标 |
| `y` | `number` | GridStack / 计算（底部堆叠） | 行坐标 |
| `w` | `number` | 元数据 / 选项覆盖 | 网格宽度 |
| `h` | `number` | 元数据 / 选项覆盖 | 网格高度 |
| `info` | `{ compName, presetKey? }` | 创建时写入 | 关联的组件元数据引用 |
| `propsValues` | `Record<string, any>` | 创建时从 meta.props.default 抽取 | 当前组件属性值 |
| `wrapperValues` | `{ title, hideHeader?, ... }` | 创建时设置 | 当前外框属性值 |
| `noResize` | `boolean` | `meta.rect.fixed` 映射 | 是否禁止调整大小 |
| `*other*` | — | GridStack 内部 | GridStack 原生字段（`content`, `el`, `_grid` 等） |

### 1.9 AppInstance — App 运行时实例

不持久化，仅在 `Desktop.vue` 的 `desktopApps` ref 中维护（`Desktop.vue:333-342`）：

| 字段 | 类型 | 描述 |
|------|------|------|
| `instanceId` | `string` | 稳定实例标识（`Date.now().toString(36) + random`） |
| `compName` | `string` | 关联的 App 组件名 |
| `compId` | `string?` | 可选的外部 ID（如应用市场的 hashId） |
| `appMeta` | `AppMeta \| null` | App 元数据引用（用于获取 props 默认值） |
| `wrapperValues` | `{ title }` | 外壳属性（标题栏文字） |
| `state` | `null \| 'minimize'` | 实例状态：`null` = 正常渲染，`'minimize'` = CSS 隐藏 |

---

## 2. 状态机

### 2.1 App 生命周期（App Instance State Machine）

```
  null ──[最小化]──→ 'minimize'
  'minimize' ──[恢复]──→ null
  null / 'minimize' ──[关闭]──→ [销毁]
```

**状态含义**：
- `null`: 常规渲染，全屏覆盖桌面视口（`desktop-viewport-app.vue:81-91`）
- `'minimize'`: CSS `opacity:0; transform: translateY(60px); pointer-events:none`，实例保持在 `desktopApps` 数组中不销毁（`desktop-viewport-app.vue:92-97`）

**关闭**: 从 `desktopApps` 数组中 `splice` 移除，Vue v-for 响应式销毁 DOM（`Desktop.vue:351-357`）。

**重复打开**: 已存在同 compName/compId 的实例时，不创建新实例，而是将已有实例的 state 恢复为 `null` 并 move 到数组末尾（置于顶层 z 序）（`Desktop.vue:324-331`）。

### 2.2 桌面模式状态机（Desktop Mode）

```
  'normal' ──[进入编辑]──→ 'editing'
  'editing' ──[退出编辑]──→ 'normal'
```

| 状态 | 特征 | 触发方 |
|------|------|--------|
| `'normal'` | GridStack 禁用拖拽/调整大小；Swiper 手势翻页启用；底部显示主工具条 | statusbar「退出编辑」、toolbar-edit「完成」 |
| `'editing'` | GridStack 启用拖拽/调整大小；Swiper 手势翻页禁用；强制显示 Widget 标题栏；底部显示编辑工具条 | statusbar「编辑模式」按钮 |

**退出编辑时**: 自动序列化所有页的 GridStack 状态到 `desktopConfig.pages`，然后持久化到 localStorage（`Desktop.vue:149-157`）。

### 2.3 登录状态机

```
  [初始] ──→ 检查 localStorage['dashboard-login-user']
                ├── 有效 JSON + userName 存在 → loginUser = user（进入桌面）
                └── 不存在/无效 → showLoginDialog = true（显示登录覆盖层）

  showLoginDialog = true ──[登录成功 emit('success', user)]──→ loginUser = user

  loginUser 存在 ──[退出登录]──→ 清除 localStorage + reload
```

---

## 3. localStorage 持久化清单

| Key | 值 | 读/写位置 | 生命周期 |
|-----|-----|-----------|----------|
| `dashboard-desktop-data` | `DesktopConfig` JSON | `Desktop.vue:26,69-107` | 退出编辑/卸载时写入；启动时读取 |
| `dashboard-theme` | `'dark' \| 'light'` | `useTheme.js:14,23-38` + `index.html:13` | 主题切换时写入；启动时读取 |
| `dashboard-login-user` | `LoginUser` JSON | `auth-service.js:21,58-64,122-127,131-138` | 登录成功时写入；退出时删除；启动时读取 |

---

## 4. 验证规则

### 4.1 桌面配置合并规则

(`Desktop.vue:69-97`)
1. fetch `DEFAULT_DESKTOP_JSON.json` → `defaults`
2. localStorage `dashboard-desktop-data` → JSON.parse → `stored`
3. `merged = { ...defaults, ...stored }`（用户配置浅合并覆盖默认）
4. `pages` 兜底：至少保证 `[{ title: '', children: [] }]`
5. `stored` 为非对象（null / 数组）或 JSON 解析失败时丢弃

### 4.2 属性编辑器 number 类型防护

(`desktop-property-form.vue:54-67`)
- `change/blur` 时校验 `Number.isFinite()`
- `<空字符串> / null / undefined` → 视为 NaN
- NaN → 回退到 `propMeta.default ?? 0`

### 4.3 JSON 属性编辑器校验

(`desktop-property-form.vue:82-95`)
- `change` 时 `JSON.parse()` 校验
- 失败 → `ElMessage.error` + 红框错误态，**不阻止输入**

### 4.4 GridStackNode ID 稳定性

(`desktop-viewport-desktop.vue:314`)
- ID 由 `Date.now() + ''` 生成（毫秒时间戳字符串）
- 无法保证严格的全局唯一（快速连续添加可能碰撞），当前不作为高可靠性分布式 ID 使用

---

## 5. 版本历史

| 日期 | 变更 |
|------|------|
| 2026-07-19 | 007-wujie-system: 新增 PluginMeta、PluginManifest、PluginLoadState、WujieExport 实体；WidgetMeta/AppMeta 新增 source 字段 |
| 2026-07-19 | 初始 As-Built 版本 |
