// 运行时全局配置（window.SYSTEM_CONFIGS）
// 部署后可直接修改此文件调整配置，无需重新构建。
// 由 index.html 在应用模块之前通过 <script> 标签加载。
window.SYSTEM_CONFIGS = {
  systemTitle: '工作台',
  systemSubtitle: '桌面',
  systemLogo: '/vite.svg',
  // 系统版本号（用于缓存清理）
  systemVersion: '1.0.0',
  // 认证中心登录接口（overall-api.md §1.1，dev 环境由 Vite proxy 转发 /authcenter）
  authLoginUrl: '/authcenter/login',
  // RSA 公钥（S-02：登录密码经 jsencrypt 加密后传输；部署时替换为认证中心下发的公钥）
  rsaPublicKey:
    'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDlOJu6TyygqxfWT7eLtGDwajtN\n' +
    'FOb9I5XRb6khyfD1Yt3YiCgQWMNW649887VGJiGr/L5i2osbl8C9+WJTeucF+S76\n' +
    'xFxdU6jE0NQ+Z+zEdhUTooNRaY5nZiu5PgDB0ED/ZKBUSLKL7eibMxZtMlUDHjm4\n' +
    'gwQco1KRMDSmXSMkDwIDAQAB',
}
