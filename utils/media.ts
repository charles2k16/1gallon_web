export const resolveMediaUrl = (path?: string | null) => {
  if (!path || !String(path).trim()) return null
  const p = String(path).trim()
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  const { base } = useApi()
  if (p.startsWith('/')) return `${base}${p}`
  return `${base}/${p}`
}

export const initialsFromName = (name?: string | null, fallback = 'U') => {
  const n = String(name || '').trim()
  if (!n) return fallback
  return n
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
