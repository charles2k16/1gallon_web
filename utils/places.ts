export type PlaceSuggestion = {
  id: string
  name: string
  fullName: string
  lat: number
  lng: number
}

type SearchOpts = {
  apiBase?: string
  token?: string
  proximity?: { lat: number; lng: number }
  limit?: number
}

const normalizeApiBase = (raw?: string) => {
  let base = String(raw || '').trim().replace(/\/+$/, '')
  if (!base) return ''
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`
  return base
}

const mapPlace = (p: any, i = 0): PlaceSuggestion | null => {
  const lat = Number(p.lat)
  const lng = Number(p.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    id: String(p.id || i),
    name: p.name || p.address?.split?.(',')?.[0] || 'Place',
    fullName: p.address || p.fullName || p.name || '',
    lat,
    lng,
  }
}

/** Prefer API proxy (no CORS). Falls back to Mapbox + Photon in the browser. */
export const searchPlaces = async (
  query: string,
  tokenOrOpts?: string | SearchOpts,
  proximity?: { lat: number; lng: number },
  limit = 8,
): Promise<PlaceSuggestion[]> => {
  const q = query.trim()
  if (q.length < 2) return []

  const opts: SearchOpts =
    typeof tokenOrOpts === 'string' || tokenOrOpts == null
      ? { token: tokenOrOpts || '', proximity, limit }
      : { limit, ...tokenOrOpts }

  const lim = opts.limit ?? 8
  const prox = opts.proximity

  // 1) Backend proxy — Mapbox + Nominatim + Photon (server-side, no CORS)
  const apiBase = normalizeApiBase(opts.apiBase)
  if (apiBase) {
    try {
      const params = new URLSearchParams({ q })
      if (prox && Number.isFinite(prox.lat) && Number.isFinite(prox.lng)) {
        params.set('lat', String(prox.lat))
        params.set('lng', String(prox.lng))
      }
      const res = await fetch(`${apiBase}/api/v1/geo/suggest?${params}`)
      if (res.ok) {
        const data = await res.json()
        const list = (data?.data || []).map(mapPlace).filter(Boolean) as PlaceSuggestion[]
        if (list.length) return list.slice(0, lim)
      }
    } catch {
      /* fall through */
    }
  }

  // 2) Mapbox — no type filter so districts / informal names match better
  const token = opts.token || ''
  if (token) {
    try {
      const params = new URLSearchParams({
        access_token: token,
        country: 'gh',
        autocomplete: 'true',
        limit: String(lim),
        language: 'en',
      })
      if (prox && Number.isFinite(prox.lat) && Number.isFinite(prox.lng)) {
        params.set('proximity', `${prox.lng},${prox.lat}`)
      }
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params}`,
      )
      if (res.ok) {
        const data = await res.json()
        const features = data.features || []
        if (features.length) {
          return features
            .map((f: any) => ({
              id: String(f.id),
              name: f.text || f.place_name?.split(',')[0] || 'Place',
              fullName: f.place_name || f.text,
              lng: Number(f.center?.[0]),
              lat: Number(f.center?.[1]),
            }))
            .filter((s: PlaceSuggestion) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
        }
      }
    } catch {
      /* fall through */
    }
  }

  // 3) Photon (Komoot) — CORS-friendly OpenStreetMap autocomplete
  try {
    const params = new URLSearchParams({
      q: q.includes('Ghana') ? q : `${q}, Ghana`,
      limit: String(lim),
      lang: 'en',
    })
    if (prox && Number.isFinite(prox.lat) && Number.isFinite(prox.lng)) {
      params.set('lat', String(prox.lat))
      params.set('lon', String(prox.lng))
    }
    const res = await fetch(`https://photon.komoot.io/api/?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.features || [])
      .map((f: any, i: number) => {
        const [lng, lat] = f.geometry?.coordinates || []
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        const p = f.properties || {}
        const name = p.name || p.street || p.city || p.district || 'Place'
        const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean)
        return {
          id: `photon-${p.osm_id || i}`,
          name,
          fullName: [...new Set(parts)].join(', ') || name,
          lat: Number(lat),
          lng: Number(lng),
        } as PlaceSuggestion
      })
      .filter(Boolean) as PlaceSuggestion[]
  } catch {
    return []
  }
}

export const reverseGeocode = async (
  lat: number,
  lng: number,
  tokenOrOpts?: string | { apiBase?: string; token?: string },
): Promise<string> => {
  const opts =
    typeof tokenOrOpts === 'string' || tokenOrOpts == null
      ? { token: tokenOrOpts || '' }
      : tokenOrOpts

  const apiBase = normalizeApiBase(opts.apiBase)
  if (apiBase) {
    try {
      const params = new URLSearchParams({ lat: String(lat), lng: String(lng) })
      const res = await fetch(`${apiBase}/api/v1/geo/reverse?${params}`)
      if (res.ok) {
        const data = await res.json()
        const p = data?.data
        if (p?.address || p?.name) return p.address || p.name
      }
    } catch {
      /* fall through */
    }
  }

  if (opts.token) {
    try {
      const params = new URLSearchParams({
        access_token: opts.token,
        language: 'en',
      })
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?${params}`,
      )
      const data = await res.json()
      return data.features?.[0]?.place_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    } catch {
      /* fall through */
    }
  }

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      lang: 'en',
    })
    const res = await fetch(`https://photon.komoot.io/reverse?${params}`)
    if (res.ok) {
      const data = await res.json()
      const p = data.features?.[0]?.properties
      if (p) {
        const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean)
        if (parts.length) return [...new Set(parts)].join(', ')
      }
    }
  } catch {
    /* ignore */
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}
