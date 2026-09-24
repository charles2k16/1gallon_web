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
  const desktop = useDesktopNotify()

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
    const notifyOffer = (payload: any) => {
      const orderId = String(payload?.orderId || '')
      desktop.notify({
        title: payload?.title || 'New delivery offer',
        body: payload?.message || 'A new fuel delivery is available',
        tag: orderId || 'offer',
        path: '/driver',
      })
      refresh()
    }

    const notifyCancel = (payload: any) => {
      const orderId = String(payload?.orderId || '')
      if (orderId) {
        desktop.notify({
          title: payload?.title || 'Order cancelled',
          body: payload?.message || 'A delivery was cancelled',
          tag: orderId,
          path: '/driver',
        })
      }
      refresh()
    }

    connect()
    on('order:new', notifyOffer)
    on('order:offer', notifyOffer)
    on('order:taken', () => refresh())
    on('order:cancelled', notifyCancel)
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
