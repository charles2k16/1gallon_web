export type LatLng = { lat: number; lng: number }

const ACCRA: LatLng = { lat: 5.6037, lng: -0.187 }

export const useGeolocation = () => {
  const position = useState<LatLng>('geo_pos', () => ({ ...ACCRA }))
  const error = ref<string | null>(null)
  const locating = ref(false)

  const locate = () =>
    new Promise<LatLng>((resolve) => {
      if (!import.meta.client || !navigator.geolocation) {
        resolve(position.value)
        return
      }
      locating.value = true
      error.value = null
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          position.value = next
          locating.value = false
          resolve(next)
        },
        () => {
          error.value = 'Could not get your location'
          locating.value = false
          resolve(position.value)
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
      )
    })

  return { position, error, locating, locate, ACCRA }
}
