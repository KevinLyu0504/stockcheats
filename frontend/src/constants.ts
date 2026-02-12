/** LocalStorage 键名 */
export const STORAGE_KEYS = {
  FAVORITES: 'apex-vision-favorites',
  AUTH_TOKEN: 'apex-vision-token',
  AUTH_USER: 'apex-vision-user',
  /** 记住的账号列表（仅用户名，不存密码） */
  REMEMBERED_ACCOUNTS: 'apex-vision-remembered-accounts',
} as const

/** 路由路径 */
export const ROUTE_PATHS = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/',
} as const
