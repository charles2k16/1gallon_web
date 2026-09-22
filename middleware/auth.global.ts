export default defineNuxtRouteMiddleware(async (to) => {
  const token = useCookie('web_token')
  const auth = useAuth()
  auth.restoreUser()

  const publicPaths = ['/auth', '/payments/return']
  const isPublic = publicPaths.some((p) => to.path === p || to.path.startsWith(p + '/'))

  if (!token.value && !isPublic && to.path !== '/') {
    return navigateTo('/auth')
  }

  if (token.value && to.path === '/auth') {
    return navigateTo(auth.homePath.value)
  }

  // Role guards
  if (token.value && auth.user.value) {
    const role = auth.user.value.role
    if (to.path.startsWith('/driver') && role !== 'driver') {
      return navigateTo('/home')
    }
    if (
      role === 'driver' &&
      (to.path === '/home' || to.path === '/request' || to.path.startsWith('/tracking'))
    ) {
      return navigateTo('/driver')
    }
  }
})
