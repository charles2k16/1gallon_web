import type { PlaceSuggestion } from '~/utils/places'

const KEY = 'recent_delivery_locations'
const MAX = 6

const samePlace = (a: PlaceSuggestion, b: PlaceSuggestion) => {
  if (a.id && a.id === b.id) return true
  return Math.abs(a.lat - b.lat) < 0.0005 && Math.abs(a.lng - b.lng) < 0.0005
}

export const loadRecentLocations = (): PlaceSuggestion[] => {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as PlaceSuggestion[]
    return list.filter((p) => p?.name && Number.isFinite(p.lat) && Number.isFinite(p.lng))
  } catch {
    return []
  }
}

export const saveRecentLocation = (place: PlaceSuggestion) => {
  if (!import.meta.client || !place.name.trim()) return loadRecentLocations()
  const next = [place, ...loadRecentLocations().filter((p) => !samePlace(p, place))].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export const removeRecentLocation = (place: PlaceSuggestion) => {
  if (!import.meta.client) return []
  const next = loadRecentLocations().filter((p) => !samePlace(p, place))
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export const placeFromAddress = (lat: number, lng: number, address: string): PlaceSuggestion | null => {
  const trimmed = address.trim()
  if (!trimmed || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const name = trimmed.split(',')[0]?.trim() || trimmed
  return { id: `${lat.toFixed(5)},${lng.toFixed(5)}`, name, fullName: trimmed, lat, lng }
}
