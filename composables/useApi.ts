/** Ensure absolute API origin — host without protocol becomes a relative path. */
const normalizeApiBase = (raw: unknown) => {
  let base = String(raw || '').trim().replace(/\/+$/, '')
  if (!base) return 'http://localhost:4000'
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`
  }
  return base
}

export const useApi = () => {
  const config = useRuntimeConfig()
  const base = normalizeApiBase(config.public.apiBase)
  const token = useCookie('web_token')
  const refreshToken = useCookie('web_refresh')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
  })

  const parse = async (res: Response) => {
    let data: any = null
    try {
      data = await res.json()
    } catch {
      data = {}
    }
    if (!res.ok) {
      const detail = Array.isArray(data?.details)
        ? data.details
            .map((d: { field?: string; message?: string }) => `${d.field || 'field'}: ${d.message || ''}`)
            .join('; ')
        : ''
      throw new Error(detail || data?.error || data?.message || 'Request failed')
    }
    return data
  }

  const request = async (method: string, path: string, body?: any, params?: Record<string, any>) => {
    const query = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : ''

    const doFetch = () =>
      fetch(`${base}/api/v1${path}${query}`, {
        method,
        headers: authHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })

    let res = await doFetch()

    // Try refresh once on 401
    if (res.status === 401 && refreshToken.value && path !== '/auth/refresh') {
      try {
        const refreshRes = await fetch(`${base}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshToken.value }),
        })
        const refreshData = await refreshRes.json()
        if (refreshRes.ok && refreshData?.data?.accessToken) {
          token.value = refreshData.data.accessToken
          if (refreshData.data.refreshToken) {
            refreshToken.value = refreshData.data.refreshToken
          }
          res = await doFetch()
        }
      } catch {
        /* fall through */
      }
    }

    return parse(res)
  }

  return {
    base,
    token,
    refreshToken,
    get: (path: string, params?: Record<string, any>) => request('GET', path, undefined, params),
    post: (path: string, body?: any) => request('POST', path, body),
    patch: (path: string, body?: any) => request('PATCH', path, body),
    del: (path: string) => request('DELETE', path),
  }
}
