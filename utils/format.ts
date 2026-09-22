export const FUEL_TYPES = ['petrol', 'super', 'diesel'] as const

export const fuelLabel = (type: string) => {
  const map: Record<string, string> = {
    petrol: 'Petrol',
    super: 'Super',
    diesel: 'Diesel',
    kerosene: 'Kerosene',
  }
  return map[type] || type
}

export const PAYMENT_METHODS = ['cash_on_delivery', 'card', 'mobile_money'] as const

export const paymentLabel = (method: string) => {
  switch (method) {
    case 'card':
      return 'Card'
    case 'mobile_money':
      return 'Mobile money'
    case 'cash_on_delivery':
    default:
      return 'Cash on delivery'
  }
}

export const isPrepaid = (method?: string | null) =>
  method === 'card' || method === 'mobile_money'

export const ORDER_PIPELINE = [
  'pending',
  'confirmed',
  'assigned',
  'en_route',
  'arrived',
  'delivered',
] as const

export const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: 'Finding driver',
    confirmed: 'Confirmed',
    assigned: 'Driver assigned',
    en_route: 'On the way',
    arrived: 'Arrived',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }
  return map[status] || status
}

export const formatGhs = (n: number | string | undefined | null) => {
  const v = Number(n || 0)
  return `GHS ${v.toFixed(2)}`
}

export const latLngFromCoords = (coordinates: any): { lat: number; lng: number } | null => {
  if (!coordinates) return null
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const lng = Number(coordinates[0])
    const lat = Number(coordinates[1])
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (lat === 0 && lng === 0) return null
    return { lat, lng }
  }
  if (typeof coordinates === 'object') {
    const lat = Number(coordinates.lat ?? coordinates.latitude)
    const lng = Number(coordinates.lng ?? coordinates.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  }
  return null
}

export type RouteInfo = {
  points: { lat: number; lng: number }[]
  distanceMeters: number
  durationSeconds: number
}

export const fetchDrivingRoute = async (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RouteInfo | null> => {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson`
    const res = await fetch(url)
    const data = await res.json()
    const route = data?.routes?.[0]
    if (!route) return null
    const coords: number[][] = route.geometry?.coordinates || []
    return {
      points: coords.map(([lng, lat]) => ({ lat, lng })),
      distanceMeters: route.distance || 0,
      durationSeconds: route.duration || 0,
    }
  } catch {
    return null
  }
}

export const googleMapsDirUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
