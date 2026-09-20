# 011-auth-mock 技术方案（As-Built）

> 模块: 011-auth-mock
> 对应规格: [spec.md](./spec.md)
> 状态: 已实现
> 最后更新: 2026-07-19

## 1. 技术上下文

### 1.1 运行时环境

- **运行位置**: 浏览器（纯前端），无 SSR
- **入口链路**: `index.html` → `<script src="/config.js">`（注入 `window.SYSTEM_CONFIGS`）→ `src/desktop.js`（createApp 挂载 Desktop.vue）→ Desktop.vue `onMounted` 调用 `restoreSession()` → 登录覆盖层或桌面渲染
- **认证服务文件**: `src/api/auth-service.js`（140 行）
- **登录 UI 文件**: `src/components/desktop/desktop-dialog-login.vue`（100 行）
- **编排集成**: `src/pages/Desktop.vue:109-127`（登录/登出/会话恢复逻辑）、`Desktop.vue:442-445`（登录覆盖层模板）、`Desktop.vue:450`（登出入口在状态栏）

### 1.2 直接依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| jsencrypt | (npm, package.json) | RSA 公钥加密登录密码（`encryptPassword` → `JSEncrypt.setPublicKey` + `.encrypt()`） |
| vue | ^3.5.39 | Composition API（ref, emit） — 仅 `desktop-dialog-login.vue` 使用 |

### 1.3 间接依赖（通过运行时配置）

| 配置项 | 来源 | 默认值 | 用途 |
|--------|------|--------|------|
| `SYSTEM_CONFIGS.authLoginUrl` | `public/config.js` → `window.SYSTEM_CONFIGS` | `/authcenter/login` | 后端认证中心 POST 地址 |
| `SYSTEM_CONFIGS.rsaPublicKey` | `public/config.js` → `window.SYSTEM_CONFIGS` | PEM 格式 RSA 公钥 | 密码加密 |

> 证据: `public/config.js:5-12`

## 2. 宪法合规检查

依据 `specs/constitution.md` 的 16 条原则逐条检查：

| # | 原则 | 合规状态 | 证据 |
|---|------|---------|------|
| 1 | 元数据驱动的组件扩展 | N/A | 本模块不涉及 Widget/App/Background 注册 |
| 2 | 看板组件宿主与内容分离 | N/A | 本模块不涉及 GridStack 内 Widget 渲染 |
| 3 | 模块级单例共享状态 | ⚠️ 部分（不适用） | 本模块是纯函数服务层（auth-service.js），不持有模块级状态。登录状态由 Desktop.vue 的 `loginUser` ref 持有（符合原则 6）。唯一"共享值"是 localStorage key 常量 `LOGIN_USER_KEY`，为模块级 const 声明 |
| 4 | VNode 渲染与 GridStack 共存 | N/A | 本模块不涉及 GridStack |
| 5 | 纯 Props/Emits 单向数据流 | ✅ 合规 | `desktop-dialog-login.vue` 仅 emit('success', user) 上报结果，无 props 接收（自包含组件）。Desktop.vue 通过 import 直接调用 auth-service 函数，不涉及全局事件总线 |
| 6 | 页面编排器中心化状态 | ✅ 合规 | `loginUser` ref 由 Desktop.vue 持有（`Desktop.vue:59`），子组件 statusbar 通过 props `:user-info="loginUser"` 接收（`Desktop.vue:451`） |
| 7 | Composition API 唯一风格 | ✅ 合规 | `desktop-dialog-login.vue` 使用 `<script setup>` + Composition API |
| 8 | 命名约定 | ⚠️ 部分 | 认证服务文件 `auth-service.js` 不在 `desktop-*.vue` 命名范围内（属于 api/ 目录而非 components/）。UI 组件遵循 `desktop-*.vue`：`desktop-dialog-login.vue` |
| 9 | SCSS 主题 CSS 变量体系 | ✅ 合规 | 登录错误信息颜色引用 `var(--el-color-danger, #f56c6c)`（Element Plus 主题变量）；登录覆盖层背景引用 `var(--desktop-bg-primary)`（`Desktop.vue:575`） |
| 10 | CSS 作用域隔离 | ✅ 合规 | `desktop-dialog-login.vue:89` 使用 `<style scoped lang="scss">` |
| 11 | 元数据默认值回退 | N/A | 本模块不涉及 Registry |
| 12 | 错误处理策略 | ✅ 合规 | fetch 失败→降级 mock（`auth-service.js:110-116`）；localStorage 不可用→静默降级（`auth-service.js:59-63`）；JSON 解析失败→静默返回 null（`auth-service.js:133-138`）；RSA 公钥缺失/加密失败→明确抛错（`auth-service.js:34-43`） |
| 13 | Widget 组件不得接触桌面状态 | N/A | 本模块不涉及 Widget 组件 |
| 14 | 只读元数据消费 | N/A | 本模块不涉及元数据 |
| 15 | 持久化的数据安全边界 | ✅ 合规 | `toLoginUser()` 显式仅提取 `userId/userName/name`，剔除 `password`（`auth-service.js:48-55`）。localStorage 中无明文密码或 token |
| 16 | 依赖的引入与使用 | ✅ 合规 | jsencrypt 实际使用（`auth-service.js:18,37-39`）；mitt 和 pinia 已安装但本模块不使用（符合项目全局模式） |

## 3. 关键技术决策

### 3.1 RSA 前置加密 — 密码绝不明文传输

**决策**: 在登录提交前，通过 `jsencrypt` 库使用 `window.SYSTEM_CONFIGS.rsaPublicKey` 对密码进行 RSA 加密，再将密文通过 POST body 发送。

**理由**: 
- 明确安全边界（constitution 第 15 条）：密码在任何阶段都不应裸奔于网络
- 公钥配置缺失或加密失败时**明确抛错终止**（`auth-service.js:34-43`），绝不静默回退为明文传输
- 加密在 `login()` 函数入口即执行（`auth-service.js:108`），与后端/降级路径解耦——无论走哪个认证路径，密码在网络层只以密文存在（降级路径不传输密码）

**实施**: `encryptPassword(password)` → `const encryptor = new JSEncrypt()` → `encryptor.setPublicKey(publicKey)` → `encryptor.encrypt(password)` → 返回 base64 密文。公钥来自运行时注入的 `window.SYSTEM_CONFIGS.rsaPublicKey`（PEM 格式，`public/config.js:8-12`）。

> 关联 FR: FR-011-004, FR-011-005, FR-011-006

### 3.2 后端优先 + 降级 Mock 的双路径认证

**决策**: 登录流程先尝试 `loginViaBackend(username, encryptedPassword)`（POST 后端），若抛出异常则 `catch` 降级到 `loginViaMock(username, password)`（fetch USERS_MOCK.json 本地明文比对）。

**理由**:
- 生产环境有后端认证中心时走正常 RSA 加密路径
- 开发/离线环境无后端时，通过 try/catch 自动降级，无需环境判断或配置开关
- 降级路径中的明文 password 仅在 `loginViaMock` 函数作用域内使用，不落 localStorage，不通过 HTTP 传输（仅 fetch USERS_MOCK.json 读取数据，密码比对在本地内存中完成）

**实施**: `auth-service.js:102-119` — `login()` 函数体：
```
1. 参数校验（空值抛错）
2. RSA 加密密码（无论走哪个后端路径都先加密）
3. try { loginViaBackend(username, encrypted) } → 返回 user
4. catch { console.warn(...) ; loginViaMock(username, password) } → 返回 user
5. cacheLoginUser(user) → 持久化
6. return user
```

> 关联 FR: FR-011-007, FR-011-008, FR-011-009

### 3.3 无 Token 无 Session 设计

**决策**: 登录状态仅通过 `LoginUser { userId, userName, name }` 表示，不产生或管理 token、refresh token、session ID 或过期时间。

**理由**:
- 纯前端应用无会话管理后端，token 无验证方
- 仅需要"已登录/未登录"二元状态来控制桌面访问权限
- 简化前端状态管理：`loginUser === null` → 未登录，`loginUser !== null` → 已登录

**验证**: `auth-service.js` 全文无 `token`、`session`、`expire`、`jwt`、`bearer` 等关键词。`toLoginUser` 仅提取 `userId/userName/name` 三字段。

> 关联 FR: FR-011-011, FR-011-013

### 3.4 登出 = 全量清理 + 页面重载

**决策**: 登出时清除 `dashboard-login-user`（auth-service.logout）+ 清除 `dashboard-desktop-data`（Desktop.vue.handleLogout），然后 `window.location.reload()`。

**理由**: 
- 确保下次登录时桌面配置从默认/用户配置重新加载，不残留上一个会话的个性化数据
- `reload()` 是重置所有运行时状态最可靠的方式（GridStack 实例、Swiper、事件监听器等全部重建）

**实施**: `Desktop.vue:119-127` — `handleLogout()`：
```
1. logout() → localStorage.removeItem('dashboard-login-user')
2. localStorage.removeItem('dashboard-desktop-data')
3. window.location.reload()
```

> 关联 FR: FR-011-018, FR-011-019, FR-011-020

## 4. 数据模型

### 4.1 LoginUser 实体

```ts
interface LoginUser {
  userId: string | null    // 用户唯一标识（可null）
  userName: string         // 登录用户名
  name: string             // 展示名称（回退到 userName）
}
```

**收窄函数**: `toLoginUser(raw)`（`auth-service.js:48-55`）从后端响应或 mock 数据中提取此三个字段，丢弃所有其他字段（包括 password、token 等）。`userName` 为空时返回 null。

### 4.2 localStorage 持久化结构

| Key | 类型 | 写入方 | 读取方 | 序列化格式 |
|-----|------|--------|--------|-----------|
| `dashboard-login-user` | `LoginUser` | `cacheLoginUser()` (auth-service.js:58-64) | `restoreSession()` (auth-service.js:131-139) | `JSON.stringify(user)` |

与桌面配置的键区分：
| Key | 用途 | 登出时清除 |
|-----|------|-----------|
| `dashboard-login-user` | 认证会话 | auth-service.logout() 清除 |
| `dashboard-desktop-data` | 桌面布局配置 | Desktop.vue.handleLogout() 清除 |
| `dashboard-theme` | 主题偏好 | 不随登出清除（useTheme 管理） |

### 4.3 USERS_MOCK.json 结构

```json
[
  {
    "userId": "1001",
    "userName": "admin",
    "password": "admin123",
    "name": "管理员"
  }
]
```

`public/USERS_MOCK.json:1-8`，当前仅含一条记录。`loginViaMock()` 遍历数组通过 `userName` 字段匹配，再用 `password` 字段比对（`auth-service.js:93-98`）。

### 4.4 状态流转（登录生命周期）

```
应用启动 (Desktop.vue onMounted)
  │
  ├─ restoreSession() → 有效 LoginUser
  │   └─ loginUser = stored → 直接渲染桌面
  │       └─ 状态栏登出按钮 → handleLogout()
  │           ├─ logout()（清除 dashboard-login-user）
  │           ├─ 清除 dashboard-desktop-data
  │           └─ window.location.reload() → 回到应用启动状态
  │
  └─ restoreSession() → null
      └─ showLoginDialog = true → 全屏登录覆盖层
          └─ 用户登录
              ├─ login(username, password)
              │   ├─ encryptPassword(password) — 失败 → 错误提示
              │   ├─ try loginViaBackend() — 成功 → user
              │   └─ catch → loginViaMock() — 成功 → user / 失败 → 错误提示
              ├─ cacheLoginUser(user)（写入 localStorage）
              └─ emit('success', user)
                  └─ handleLoginSuccess(user)
                      ├─ loginUser = user
                      └─ showLoginDialog = false → 桌面渲染
```

## 5. 接口契约

### 5.1 auth-service 完整方法签名

**源文件**: `src/api/auth-service.js` (140 行)

```js
// 内部函数（不导出）
function systemConfigs()                              // → window.SYSTEM_CONFIGS || {}
function encryptPassword(password: string): string     // → RSA 加密后的 base64 密文
function toLoginUser(raw: object): LoginUser | null    // → 字段收窄，剔除敏感信息
function cacheLoginUser(user: LoginUser): void         // → localStorage.setItem('dashboard-login-user', JSON)
async function loginViaBackend(username: string, encryptedPassword: string): Promise<LoginUser>  // → POST {authLoginUrl}
async function loginViaMock(username: string, password: string): Promise<LoginUser>               // → fetch USERS_MOCK.json

// 导出函数
export async function login(username: string, password: string): Promise<LoginUser>
export function logout(): void
export function restoreSession(): LoginUser | null
```

#### login(username, password) → Promise\<LoginUser\>

实现 FR-011-001 至 FR-011-012。

1. **参数校验**: `!username || !password` → `throw Error('请输入用户名和密码')`
2. **RSA 加密**: `encryptPassword(password)` → 公钥缺失或加密失败 `throw Error`
3. **后端认证**: `await loginViaBackend(username, encrypted)` → 成功返回 `LoginUser`
4. **降级认证**: catch → `console.warn(...)` → `await loginViaMock(username, password)` → 成功/失败
5. **缓存**: `cacheLoginUser(user)` → localStorage
6. **返回**: `user`

#### logout() → void

实现 FR-011-018。

- `localStorage.removeItem('dashboard-login-user')`
- try/catch 包裹，localStorage 不可用时静默忽略

#### restoreSession() → LoginUser | null

实现 FR-011-015 至 FR-011-017。

- `localStorage.getItem('dashboard-login-user')` → JSON.parse → `toLoginUser()` → 校验 `userName` 存在
- 无效返回 null，不抛异常

### 5.2 组件接口

#### desktop-dialog-login

**源文件**: `src/components/desktop/desktop-dialog-login.vue` (100 行)

| 方向 | 接口 | 类型 | 描述 |
|------|------|------|------|
| Emits | `success` | `(user: LoginUser) => void` | 登录成功后触发，携带 LoginUser 对象 |

无 Props 传入。组件是自包含的：内部管理 username/password/loading/errorMessage 四个 ref。

**父组件集成**（Desktop.vue）:
```html
<div v-if="!loginUser" class="desktop-login-layer">
  <desktop-dialog-login v-if="showLoginDialog" @success="handleLoginSuccess" />
</div>
```

### 5.3 运行时配置接口

```ts
interface SystemConfigs {
  authLoginUrl: string    // 默认 '/authcenter/login'，后端认证中心地址
  rsaPublicKey: string    // PEM 格式 RSA 公钥，用于 jsencrypt
}
```

通过 `public/config.js` 注入 `window.SYSTEM_CONFIGS`。`systemConfigs()` 在 SSR 或 window 不可用时返回 `{}`（`auth-service.js:26-28`）。

## 6. 实现策略

### 6.1 架构模式

**纯函数服务层 (Service Layer)**：`auth-service.js` 是纯函数模块，不持有状态、不使用 Vue 响应式。所有函数通过 export/import 与消费者解耦。

`desktop-dialog-login.vue` 使用 Composition API 自包含模式管理表单状态，通过 emit 上报登录结果。

### 6.2 加密流程（`encryptPassword`）

```
password (明文)
  → systemConfigs().rsaPublicKey 检查
    → 缺失: throw Error('系统配置缺少 RSA 公钥')
    → 存在: 继续
  → new JSEncrypt()
  → encryptor.setPublicKey(publicKey)
  → encryptor.encrypt(password)
    → 失败: throw Error('密码加密失败，请检查 RSA 公钥配置')
    → 成功: 返回 base64 密文字符串
```

### 6.3 降级流程（`login` 主函数）

```
login(username, password)
  │
  ├─ 空值检查 → throw
  │
  ├─ encrypted = encryptPassword(password)  ← 无论后端可用与否，先加密
  │
  ├─ try:
  │   └─ user = await loginViaBackend(username, encrypted)
  │       ├─ POST {authLoginUrl}, body: { username, password: encrypted }
  │       ├─ !res.ok → throw Error(`HTTP ${res.status}`)
  │       ├─ 响应解析: 兼容 { code, data } 包装与直接用户对象
  │       └─ toLoginUser(raw) → 校验 → 返回
  │
  ├─ catch (error):
  │   ├─ console.warn('[auth-service] 认证中心不可用，降级...', error)
  │   └─ user = await loginViaMock(username, password)  ← 传入原始明文
  │       ├─ fetch('/USERS_MOCK.json')
  │       ├─ !res.ok → throw Error('登录服务不可用，且模拟用户数据加载失败')
  │       ├─ 遍历 JSON 数组: find(u => u.userName === username)
  │       ├─ 无匹配 → throw Error('用户名或密码错误')
  │       ├─ matched.password !== password → throw Error('用户名或密码错误')
  │       └─ toLoginUser(matched) → 返回
  │
  ├─ cacheLoginUser(user) ← localStorage 持久化
  └─ return user
```

### 6.4 会话生命周期

```
┌─────────────┐    登录成功     ┌─────────────────┐
│  未登录状态   │ ──────────→  │   已登录状态      │
│ loginUser=null │ ←────────── │ loginUser=User    │
│ showLogin=true │   登出+reload │ showLogin=false   │
└─────────────┘              └─────────────────┘
       │                            │
       │  refresh                   │  refresh
       ▼                            ▼
  restoreSession()             restoreSession()
  → null → 登录框              → User → 桌面直接渲染
```

### 6.5 错误处理

| 错误场景 | 处理方式 | 用户可见 |
|----------|---------|---------|
| RSA 公钥缺失 | `throw Error('系统配置缺少 RSA 公钥（SYSTEM_CONFIGS.rsaPublicKey）')` | 对话框显示错误 |
| RSA 加密失败 | `throw Error('密码加密失败，请检查 RSA 公钥配置')` | 对话框显示错误 |
| 后端 POST 失败（网络错误） | catch → 自动降级 mock | 不直接暴露网络错误给用户 |
| 后端 POST 非 2xx | `throw Error('HTTP ${res.status}')` → catch → 降级 mock | 不直接暴露 HTTP 状态码给用户 |
| 后端响应无效 | `throw Error('认证服务返回的用户信息无效')` | 对话框显示错误 |
| Mock 数据加载失败 | `throw Error('登录服务不可用，且模拟用户数据加载失败')` | 对话框显示错误 |
| Mock 用户名或密码不符 | `throw Error('用户名或密码错误')` | 对话框显示中文错误 |
| localStorage 写入失败 | `console.warn` 静默降级 | 无（不影响登录流程） |
| localStorage 读取/解析失败 | 返回 null（视为未登录） | 用户看到登录框 |

## 7. 测试考量

### 7.1 单元测试建议

- `encryptPassword()`: 公钥存在时返回非空字符串；公钥缺失时抛错；无效公钥时抛错
- `toLoginUser()`: 正常对象仅保留三字段；password 字段被剔除；null 返回 null；userName 为空的用户返回 null
- `cacheLoginUser()` + `restoreSession()` 往返：写入后读取一致性
- `loginViaMock()`: 正确凭证返回用户；错误凭证抛错；USERS_MOCK.json 不可达抛错
- `loginViaBackend()`: 模拟 fetch 的 POST 请求格式和响应解析

### 7.2 集成测试建议

- 完整 `login()` 流程：后端可用/不可用两种场景
- `restoreSession()` 在页面启动时的自动调用
- `logout()` 清除 localStorage 后页面重载

### 7.3 边界情况

- 用户名/密码包含特殊字符（空格、Unicode）
- localStorage 配额已满时 `cacheLoginUser` 行为
- USERS_MOCK.json 为非法 JSON 时 `loginViaMock` 行为
- 多次快速连续点击登录按钮的防重复提交
- RSA 公钥为超大或格式错误的 PEM 字符串

## 8. 文件清单

| 文件 | 用途 | 行数 |
|------|------|------|
| `src/api/auth-service.js` | 认证服务核心：login/logout/restoreSession + 内部加密/降级函数 | 140 |
| `src/components/desktop/desktop-dialog-login.vue` | 登录对话框 UI 组件（el-dialog + el-form） | 100 |
| `public/USERS_MOCK.json` | 模拟用户数据（admin/admin123/管理员） | 8 |
| `public/config.js` | 运行时配置（authLoginUrl + rsaPublicKey） | 13 |
| `src/pages/Desktop.vue:109-127` | 登录/登出/会话恢复的编排逻辑 | 19 |
| `src/pages/Desktop.vue:442-445` | 登录覆盖层模板（v-if !loginUser） | 4 |
| `src/pages/Desktop.vue:450-456` | 状态栏用户信息 + 登出按钮接线 | 7 |

> 行数为实际计数。Desktop.vue 总 604 行，认证相关逻辑约占 30 行。
