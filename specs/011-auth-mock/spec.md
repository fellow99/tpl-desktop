# 模拟认证（Auth Mock）规格文档

> 模块: 011-auth-mock
> 状态: 已实现
> 最后更新: 2026-07-19

## 1. 模块概述

### 1.1 目的 — 为什么存在此模块

模拟认证模块为纯前端工作台应用提供**无后端依赖的登录认证能力**。当后端认证中心不可达时（如开发环境或离线部署），系统 MUST 自动降级到本地模拟用户数据完成身份校验，确保桌面始终需要认证后才能访问。同时，登录状态 MUST 跨浏览器会话持久化，避免用户每次刷新都需重新登录。

### 1.2 解决的问题

- 工作台内容与桌面配置属于用户私有数据，需要登录门槛防止未授权访问
- 纯前端部署无后端认证中心时，需要一个可靠的降级认证策略
- 密码 MUST 经 RSA 加密后传输（有后端时），杜绝明文密码在网络层暴露
- 登录状态需要在浏览器刷新后自动恢复，避免重复认证
- 需要提供登出功能，清除当前登录状态并返回登录界面

### 1.3 范围

**包含**：
- 登录对话框 UI（用户名 + 密码输入、加载状态、错误提示）
- 密码 RSA 加密传输（通过 jsencrypt，公钥来自运行时配置）
- 后端认证尝试（POST 请求，含 try/catch 错误处理）
- 后端不可达时的本地模拟认证降级（比对 public/USERS_MOCK.json）
- 登录状态持久化到浏览器本地存储（localStorage）
- 会话恢复（刷新后自动从本地存储恢复登录状态）
- 登出（清除本地存储的登录信息）
- 未登录时桌面全屏覆盖层阻断访问

**不包含**：
- token 刷新机制（代码中不存在 token 字段，LoginUser 仅含 userId/userName/name）
- 基于角色的访问控制（RBAC）（USERS_MOCK.json 中无 role 字段，auth-service 无权限判断逻辑）
- 多因素认证（MFA）
- 注册/忘记密码流程
- OAuth2.0 / SSO 第三方登录
- 会话过期策略（无 token，无 expireTime 字段）

## 2. 用户故事

- US-001: 作为用户，我需要在首次访问时输入用户名和密码进行登录，登录后才能看到桌面。
- US-002: 作为用户，我输入正确的用户名和密码后，桌面应立即加载展示。
- US-003: 作为用户，我输入错误的凭证时，应看到清晰的错误提示。
- US-004: 作为用户，刷新浏览器后应自动恢复之前的登录状态，无需重新输入凭证。
- US-005: 作为用户，我可以通过登出操作退出当前会话，返回登录界面。
- US-011: 作为未认证的访问者，我应被全屏登录覆盖层阻止，无法看到或操作桌面内容。
- US-007: 作为用户，当后端认证中心不可用且我已配置有效的 RSA 公钥时，系统应自动降级到本地模拟认证，我仍可使用预设的凭证登录。

## 3. 功能需求

### 3.1 登录认证

- FR-011-001: 系统 MUST 提供登录对话框，包含用户名输入框、密码输入框（支持密码可见性切换）和登录提交按钮。
- FR-011-002: 系统 MUST 在用户名或密码为空时阻止提交，并提示用户补充输入。
- FR-011-003: 系统 MUST 在登录过程中禁用表单输入和提交按钮，显示加载状态。
- FR-011-004: 登录提交时，系统 MUST 先使用 RSA 公钥（来自运行时配置）对密码进行加密。
- FR-011-005: 当 RSA 公钥配置缺失时，系统 MUST 终止登录流程并抛出明确错误，绝不回退为明文传输。
- FR-011-006: 当 RSA 加密失败时，系统 MUST 终止登录流程并抛出错误。
- FR-011-007: 系统 MUST 先尝试对后端认证中心发起 POST 请求（密码为 RSA 加密后的密文）。
- FR-011-008: 后端认证返回非 2xx 响应时，系统 MUST 自动降级到本地模拟认证（fetch public/USERS_MOCK.json 进行用户名密码比对）。
- FR-011-009: 模拟认证 MUST 仅当后端不可达或返回非 2xx 时启用，MUST NOT 替代正常的后端认证路径。
- FR-011-010: 模拟认证时，密码比对 MUST 仅在本地内存中完成（不通过网络传输明文密码）。
- FR-011-011: 登录成功后，系统 MUST 将用户信息（仅含 userId、userName、name，剔除 password 及任何可能的敏感字段）持久化到本地存储。
- FR-011-012: 登录成功后，系统 MUST 关闭登录对话框并渲染桌面。

### 3.2 登录状态持久化与会话恢复

- FR-011-013: 系统 MUST 将登录用户信息持久化到 localStorage，键名为 `dashboard-login-user`。
- FR-011-014: localStorage 操作 MUST 被 try/catch 包裹：写入失败时不阻断登录流程，读取失败时视为未登录。
- FR-011-015: 应用启动时，系统 MUST 尝试从 localStorage 恢复登录会话。
- FR-011-016: 恢复的会话 MUST 通过 `toLoginUser` 格式校验（必须含有效 `userName` 字段），无效或不完整的缓存数据 MUST 视为未登录。
- FR-011-017: 恢复的会话中 MUST NOT 包含密码或其他敏感字段。

### 3.3 登出

- FR-011-018: 系统 MUST 提供登出功能，清除 localStorage 中 `dashboard-login-user` 键。
- FR-011-019: 登出时系统 MUST 同时清除桌面配置缓存（`dashboard-desktop-data`）。
- FR-011-020: 登出后系统 MUST 重新加载页面，回到未登录状态。

### 3.4 登录防护

- FR-011-021: 当用户未登录时，系统 MUST 显示全屏登录覆盖层（z-index: 200，覆盖整个桌面区域），阻止用户看到或操作桌面内容。
- FR-011-022: 登录覆盖层中的对话框 MUST 不可通过点击遮罩或按 ESC 关闭，MUST 不显示关闭按钮。
- FR-011-023: 当用户已登录时，系统 MUST 在状态栏显示当前用户名称（`loginUser.name`）。

## 4. 关键实体

### 4.1 LoginUser（登录用户）

| 属性 | 类型 | 描述 | 来源 |
|------|------|------|------|
| userId | string \| null | 用户唯一标识 | `toLoginUser` 从后端或 mock 数据提取 |
| userName | string | 用户名（登录凭据） | `toLoginUser` 从后端或 mock 数据提取 |
| name | string | 用户展示名称 | `toLoginUser` 提取，回退到 userName |

> 证据: `auth-service.js:48-55` 中 `toLoginUser()` 函数显式只提取此三个字段，丢弃 password 等敏感字段。

### 4.2 MockUser（模拟用户数据 — USERS_MOCK.json）

| 属性 | 类型 | 描述 |
|------|------|------|
| userId | string | 用户唯一标识 |
| userName | string | 登录用户名 |
| password | string | 明文密码（仅用于本地模拟比对，不进入网络传输和 localStorage） |
| name | string | 用户展示名称 |

> 证据: `public/USERS_MOCK.json:1-8`，当前仅含一条记录 `admin / admin123 / 管理员`。

## 5. 验收场景

### 场景：登录成功（后端可用）

- Given: 后端认证中心正常运行，RSA 公钥配置有效，用户输入有效的用户名和密码
- When: 用户点击"登录"按钮
- Then: 密码经 RSA 加密后 POST 到后端，后端返回用户信息，`toLoginUser` 剔除敏感字段后缓存到 localStorage，登录对话框关闭，桌面正常渲染

### 场景：登录失败（错误凭证 — 后端可用）

- Given: 后端认证中心正常运行，用户输入无效的用户名或密码
- When: 用户点击"登录"按钮
- Then: 后端返回错误，系统不降级到 mock（后端可达时不会触发 mock 路径），显示错误消息

### 场景：登录成功（后端不可达 — 降级到模拟认证）

- Given: 后端认证中心不可达（网络错误或非 2xx），用户输入 USERS_MOCK.json 中的有效凭证（如 admin/admin123）
- When: 用户点击"登录"按钮
- Then: RSA 加密尝试后 POST 失败（try/catch 捕获），系统降级到 `loginViaMock`，fetch USERS_MOCK.json 进行本地密码比对，比对通过后缓存用户信息并渲染桌面

### 场景：登录失败（后端不可达 — 降级到模拟认证，错误凭证）

- Given: 后端不可达，用户输入 USERS_MOCK.json 中不存在的用户名或错误密码
- When: 用户点击"登录"按钮
- Then: 后端 POST 失败 → 降级 → USERS_MOCK.json 中无匹配用户或密码不匹配，抛出"用户名或密码错误"

### 场景：模拟用户数据加载失败

- Given: 后端不可达，且 USERS_MOCK.json 也无法加载（HTTP 错误）
- When: 用户点击"登录"按钮
- Then: 系统抛出"登录服务不可用，且模拟用户数据加载失败"

### 场景：空输入校验

- Given: 用户未填写用户名或密码
- When: 用户点击"登录"按钮
- Then: 前端直接提示"请输入用户名和密码"，不发起网络请求

### 场景：会话恢复（有效缓存）

- Given: 用户已登录，localStorage 中有有效的 `dashboard-login-user` JSON
- When: 用户刷新浏览器
- Then: 应用启动时调用 `restoreSession()`，读取 localStorage 解析为 LoginUser，验证 userName 字段有效后自动恢复登录状态，直接渲染桌面无需重新输入凭证

### 场景：会话恢复（缓存无效或损坏）

- Given: localStorage 中 `dashboard-login-user` 为非法 JSON 或不含 userName 字段
- When: 用户刷新浏览器
- Then: `restoreSession()` 返回 null，系统显示登录覆盖层要求重新认证

### 场景：登出

- Given: 用户已登录，桌面正常渲染
- When: 用户通过状态栏触发登出操作
- Then: `logout()` 清除 `dashboard-login-user`，Desktop.vue 清除 `dashboard-desktop-data`，`window.location.reload()` 重新加载页面，回到登录界面

### 场景：未登录防护

- Given: 用户未登录（loginUser 为 null）
- When: 页面首次加载或会话恢复失败
- Then: 全屏登录覆盖层（z-index: 200）覆盖整个视口，桌面内容（状态栏、视口、工具栏等）完全不可见、不可交互

### 场景：RSA 公钥缺失

- Given: `window.SYSTEM_CONFIGS.rsaPublicKey` 未配置
- When: 用户尝试登录
- Then: `encryptPassword()` 抛出"系统配置缺少 RSA 公钥"，登录流程终止

## 6. 非功能需求

### 6.1 安全性

- NFR-011-001: 用户密码 MUST NOT 以明文形式存储于 localStorage（`toLoginUser` 显式仅提取 userId/userName/name）。
- NFR-011-002: 后端传输密码 MUST 经过 RSA 公钥加密，公钥缺失时 MUST NOT 回退明文传输。
- NFR-011-003: 模拟认证的明文密码比对 MUST 仅发生在浏览器本地内存中，MUST NOT 通过 HTTP 传输明文密码。
- NFR-011-004: 登出 MUST 清除本地存储中所有认证相关数据。

### 6.2 降级可靠性

- NFR-011-005: 后端不可达时系统 MUST 自动降级到模拟认证，不阻断用户登录流程。
- NFR-011-006: 模拟用户数据加载失败时系统 MUST 给出明确的错误提示。
- NFR-011-007: localStorage 不可用时（如隐私模式），登录状态缓存失败 SHOULD 输出控制台警告但不阻断登录流程。

### 6.3 用户体验

- NFR-011-008: 登录按钮 MUST 在提交过程中显示加载动画（旋转图标 + "登录中…" 文案）。
- NFR-011-009: 登录错误信息 MUST 使用中文显示，不使用英文或技术错误码。
- NFR-011-010: 登录对话框 MUST 支持键盘操作（Enter 提交、Tab 切换焦点）。

## 7. 假设与约束

1. **运行时配置注入**: 系统假定 `window.SYSTEM_CONFIGS` 已在 `index.html` 通过 `<script src="/config.js">` 同步注入，早于 Vue 应用挂载。若此脚本加载失败，`systemConfigs()` 回退为空对象（`auth-service.js:26-28`）。
2. **模拟用户数据静态服务**: 系统假定 `public/USERS_MOCK.json` 可通过 Vite dev server 或同域 HTTP 服务正常 fetch。生产部署时此文件可能不存在（仅 dev 环境降级用）。
3. **无后端 = 无 token**: 本模块设计上不产生或管理认证 token，LoginUser 实体不含 token 字段。若后续接入真实认证中心返回 token，需修改 `toLoginUser` 和 `cacheLoginUser`。
4. **单用户会话**: 系统假定同一浏览器内仅存在一个登录会话，不支持多用户同时登录切换。
5. **登出 = 页面重载**: 登出操作通过 `window.location.reload()` 执行，会销毁所有运行时状态（包括未保存的 App 状态）。

## 8. 依赖关系

### 8.1 上游依赖

| 模块 | 依赖内容 | 依赖方式 |
|------|---------|---------|
| 运行时配置 (public/config.js) | `window.SYSTEM_CONFIGS.rsaPublicKey`、`window.SYSTEM_CONFIGS.authLoginUrl` | 同步读取 |
| 静态文件 (public/USERS_MOCK.json) | 模拟用户账号密码数据 | fetch |
| jsencrypt (npm) | RSA 公钥加密 | import |
| 后端认证中心 (/authcenter/login) | 真实用户认证 | POST（可选，通过 Vite proxy） |

### 8.2 下游依赖

| 模块 | 消费内容 | 消费方式 |
|------|---------|---------|
| 001-desktop-framework (Desktop.vue) | `login()`、`logout()`、`restoreSession()` | import 调用 |
| desktop-dialog-login | `login()` | import 调用 |

> 证据: `Desktop.vue:23` — `import { logout, restoreSession } from '../api/auth-service.js'`; `desktop-dialog-login.vue:12` — `import { login } from '../../api/auth-service.js'`
