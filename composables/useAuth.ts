export type AppRole = 'customer' | 'driver'

export const useAuth = () => {
  const { token, refreshToken, post, get } = useApi()
  const user = useState<any>('web_user', () => null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const role = computed<AppRole | null>(() => {
    const r = user.value?.role
    if (r === 'customer' || r === 'driver') return r
    return null
  })

  const homePath = computed(() => (role.value === 'driver' ? '/driver' : '/home'))

  const persistUser = (u: any) => {
    user.value = u
    if (import.meta.client && u) {
      localStorage.setItem('web_user', JSON.stringify(u))
    }
  }

  const clearSession = () => {
    token.value = null
    refreshToken.value = null
    user.value = null
    if (import.meta.client) localStorage.removeItem('web_user')
  }

  const requestOtp = async (phone: string, intent: AppRole, signup?: Record<string, string>) => {
    loading.value = true
    error.value = null
    try {
      const res = await post('/auth/request-otp', { phone, intent, signup })
      return res
    } catch (e: any) {
      error.value = e.message || 'Could not send code'
      throw e
    } finally {
      loading.value = false
    }
  }

  const verifyOtp = async (phone: string, otp: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await post('/auth/verify-otp', { phone, otp })
      const data = res.data || res
      token.value = data.accessToken
      refreshToken.value = data.refreshToken || null
      persistUser(data.user)
      // useCookie writes document.cookie in a watcher. Wait so route
      // middleware sees the session before the next navigation.
      await nextTick()
      return data.user
    } catch (e: any) {
      error.value = e.message || 'Invalid code'
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchMe = async () => {
    if (!token.value) return null
    try {
      const res = await get('/auth/me')
      const u = res.data?.user || res.data
      persistUser(u)
      return u
    } catch {
      clearSession()
      return null
    }
  }

  const restoreUser = () => {
    if (user.value) return
    if (import.meta.client) {
      try {
        const raw = localStorage.getItem('web_user')
        if (raw) user.value = JSON.parse(raw)
      } catch {
        /* ignore */
      }
    }
  }

  const logout = async () => {
    try {
      if (token.value) await post('/auth/logout')
    } catch {
      /* ignore */
    }
    clearSession()
    navigateTo('/auth')
  }

  return {
    user,
    role,
    homePath,
    loading,
    error,
    isLoggedIn,
    token,
    requestOtp,
    verifyOtp,
    fetchMe,
    restoreUser,
    logout,
    clearSession,
  }
}
