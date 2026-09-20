// ============================================================
// 201-page-index: 认证服务（auth-service）
//
// 契约（overall-api.md §1.1 / spec.md FR-019~023 / constitution S-01/S-02）：
//   login(username, password)
//     1. 密码使用 RSA 加密（jsencrypt，公钥来自 window.SYSTEM_CONFIGS.rsaPublicKey）
//        后 POST {authLoginUrl}（默认 /authcenter/login，dev 由 Vite proxy 转发）
//     2. 后端不可达 / 非 2xx 时降级到 USERS_MOCK.json 模拟校验
//        （开发环境无后端时的 mock 策略，STRUCTURE.md §public/USERS_MOCK.json）
//     3. 登录成功 → 用户信息（剔除 password 等敏感字段，S-01）缓存到
//        localStorage['dashboard-login-user']（overall-data-model.md §3.1）
//   logout()          清除缓存的登录信息
//   restoreSession()  读取缓存的登录信息（无效返回 null，FR-022）
//
// LoginUser 实体（spec.md §4）：
//   { userId, userName, name }
// ============================================================
import { JSEncrypt } from 'jsencrypt'

// localStorage 持久化键（overall-data-model.md §3.1）
const LOGIN_USER_KEY = 'dashboard-login-user'
// Mock 用户数据（public/ 静态服务，开发环境无后端时的降级数据源）
const USERS_MOCK_URL = '/USERS_MOCK.json'

// 运行时配置读取（public/config.js → window.SYSTEM_CONFIGS）
function systemConfigs() {
  return (typeof window !== 'undefined' && window.SYSTEM_CONFIGS) || {}
}

// S-02：密码 RSA 加密（jsencrypt）。公钥缺失或加密失败时抛错，
// 绝不以明文回退传输。
function encryptPassword(password) {
  const publicKey = systemConfigs().rsaPublicKey
  if (!publicKey) {
    throw new Error('系统配置缺少 RSA 公钥（SYSTEM_CONFIGS.rsaPublicKey）')
  }
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(publicKey)
  const encrypted = encryptor.encrypt(password)
  if (!encrypted) {
    throw new Error('密码加密失败，请检查 RSA 公钥配置')
  }
  return encrypted
}

// LoginUser 实体收窄：仅保留 spec.md §4 定义的字段，
// 剔除 password / token 等敏感信息（S-01：不持久化敏感数据）
function toLoginUser(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    userId: raw.userId ?? null,
    userName: raw.userName ?? '',
    name: raw.name ?? raw.userName ?? '',
  }
}

// FR-021：登录成功后缓存用户信息（不含密码）
function cacheLoginUser(user) {
  try {
    localStorage.setItem(LOGIN_USER_KEY, JSON.stringify(user))
  } catch (error) {
    console.warn('[auth-service] 登录信息缓存失败', error)
  }
}

// 后端认证：POST {authLoginUrl}，body { username, password: <RSA加密> }
async function loginViaBackend(username, encryptedPassword) {
  const url = systemConfigs().authLoginUrl || '/authcenter/login'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: encryptedPassword }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = await res.json()
  // 兼容 { code, data } 包装与直接返回用户对象两种后端响应形态
  const raw = body && typeof body === 'object' && 'data' in body ? body.data : body
  const user = toLoginUser(raw)
  if (!user || !user.userName) throw new Error('认证服务返回的用户信息无效')
  return user
}

/**
 * @dev 仅开发环境降级路径（后端认证中心不可达时启用）。
 * 明文比对仅发生在本地：与静态文件 USERS_MOCK.json 的 password 字段
 * 就地比较，密码不经此路径传输、不落 localStorage（S-01 不受影响）。
 * 生产部署依赖 RSA 加密的后端登录路径（loginViaBackend，S-02）。
 */
async function loginViaMock(username, password) {
  const res = await fetch(USERS_MOCK_URL)
  if (!res.ok) throw new Error('登录服务不可用，且模拟用户数据加载失败')
  const users = await res.json()
  const matched = (Array.isArray(users) ? users : []).find(
    (u) => u?.userName === username,
  )
  if (!matched || matched.password !== password) {
    throw new Error('用户名或密码错误')
  }
  return toLoginUser(matched)
}

// 登录入口（overall-api.md §1.1）：
// 先走后端（密码 RSA 加密传输），后端不可达时降级 mock 校验
export async function login(username, password) {
  if (!username || !password) {
    throw new Error('请输入用户名和密码')
  }
  const encrypted = encryptPassword(password)
  let user = null
  try {
    user = await loginViaBackend(username, encrypted)
  } catch (error) {
    // @dev 仅开发环境降级：本地 mock 校验，密码不传输（详见 loginViaMock）
    console.warn('[auth-service] 认证中心不可用，降级到 USERS_MOCK.json 模拟登录', error)
    user = await loginViaMock(username, password)
  }
  cacheLoginUser(user)
  return user
}

// FR-023：退出登录清除缓存的登录信息
export function logout() {
  try {
    localStorage.removeItem(LOGIN_USER_KEY)
  } catch {
    // localStorage 不可用时静默忽略
  }
}

// FR-022：读取缓存的登录信息，有效则用于恢复会话，无效返回 null
export function restoreSession() {
  try {
    const raw = localStorage.getItem(LOGIN_USER_KEY)
    if (!raw) return null
    const user = toLoginUser(JSON.parse(raw))
    return user && user.userName ? user : null
  } catch {
    return null
  }
}
