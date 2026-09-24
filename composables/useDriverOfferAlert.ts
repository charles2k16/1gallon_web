/** Loops the driver offer tone while at least one job is waiting. */
let audio: HTMLAudioElement | null = null
let listening = false

const ensureAudio = () => {
  if (!import.meta.client) return null
  if (!audio) {
    audio = new Audio('/sounds/ringtone-notify.mp3')
    audio.loop = true
    audio.preload = 'auto'
  }
  return audio
}

export const useDriverOfferAlert = () => {
  const offers = useState<string[]>('driver_alert_offers', () => [])
  const { get } = useApi()
  const { connect, on } = useSocket()
  const auth = useAuth()

  const isOnline = computed(() => {
    const u = auth.user.value
    return !!(u?.driverProfile?.isAvailable ?? u?.isAvailable ?? true)
  })

  const shouldRing = computed(() => isOnline.value && offers.value.length > 0)

  const apply = (onRing: boolean) => {
    const tone = ensureAudio()
    if (!tone) return
    if (onRing) {
      tone.play().catch(() => {})
    } else {
      tone.pause()
      tone.currentTime = 0
    }
  }

  watch(shouldRing, (ring) => apply(ring))

  const sync = (rows: any[]) => {
    offers.value = (Array.isArray(rows) ? rows : [])
      .map((o) => String(o?._id || ''))
      .filter(Boolean)
  }

  const dismiss = (id: string) => {
    offers.value = offers.value.filter((x) => x !== id)
  }

  const refresh = async () => {
    try {
      const res = await get('/orders/driver/available')
      const rows = res.data?.orders || res.data || []
      sync(rows)
    } catch {
      /* keep the current list */
    }
  }

  const bind = () => {
    if (!import.meta.client || listening) return
    listening = true
    connect()
    on('order:new', () => refresh())
    on('order:offer', () => refresh())
    on('order:taken', () => refresh())
    on('order:cancelled', () => refresh())
    on('order:updated', () => refresh())
    refresh()

    const unlock = () => {
      const tone = ensureAudio()
      if (!tone) return
      const play = tone.play()
      if (!play) return
      play
        .then(() => {
          if (!shouldRing.value) {
            tone.pause()
            tone.currentTime = 0
          }
        })
        .catch(() => {})
    }
    window.addEventListener('pointerdown', unlock, { once: true })
  }

  return { offers, sync, dismiss, refresh, bind, shouldRing }
}
