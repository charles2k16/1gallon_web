<template>
  <div class="map-stage track-page">
    <MapView
      ref="mapRef"
      :center="mapCenter"
      :show-pin="false"
      :markers="markers"
      :route="routePoints"
      :interactive="true"
    />

    <div class="map-float top-bar">
      <button class="locate-btn" type="button" @click="navigateTo('/home')">←</button>
      <button
        v-if="driverPos || deliveryPos"
        class="locate-btn fit-btn"
        type="button"
        title="Fit trip"
        @click="fitTrip"
      >
        ◎
      </button>
    </div>

    <div v-if="etaLabel" class="map-float eta-chip">{{ etaLabel }}</div>

    <BottomSheet tall>
      <div v-if="loading && !order" class="center-load"><div class="spinner" /></div>
      <template v-else-if="order">
        <p class="eyebrow">{{ order.stationName || 'Delivery' }}</p>
        <h1 class="sheet-title">{{ statusLabel(order.status) }}</h1>
        <StatusPipeline :status="order.status" />

        <div v-if="findingDriver" class="searching" role="status">
          <div class="searching__bar" aria-hidden="true"><span /></div>
          <p>Searching available riders nearby.</p>
        </div>

        <div class="quote-mini">
          <div>
            <div class="muted" style="font-size: 0.75rem">Fuel</div>
            <strong>{{ fuelLabel(order.fuelType) }} · {{ Number(order.litres || 0).toFixed(1) }} L</strong>
          </div>
          <div style="text-align: right">
            <div class="muted" style="font-size: 0.75rem">Total</div>
            <strong>{{ formatGhs(order.totalAmount) }}</strong>
          </div>
        </div>

        <div v-if="driver" class="driver-card">
          <div class="avatar">
            <img v-if="driverPhoto" :src="driverPhoto" alt="" />
            <span v-else>{{ initials(driver.name) }}</span>
          </div>
          <div class="driver-card__meta">
            <strong>{{ driver.name || 'Driver' }}</strong>
            <span>Driver · {{ driver.vehiclePlate || driver.plateNumber || '—' }}</span>
            <span v-if="Number(driver.rating) > 0" class="stars">
              <i v-for="n in 5" :key="n" :class="{ on: n <= Math.round(Number(driver.rating)) }">★</i>
              {{ Number(driver.rating).toFixed(1) }}
            </span>
          </div>
          <a v-if="driver.phone" class="call-btn" :href="`tel:${driver.phone}`" aria-label="Call driver">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.2 3.6c.4-.4 1-.5 1.5-.3l2.2.9c.5.2.8.7.8 1.2l-.2 2.4a1.2 1.2 0 0 1-.7 1l-1.3.6a10.6 10.6 0 0 0 4.9 4.9l.6-1.3c.2-.4.6-.7 1-.7l2.4-.2c.5 0 1 .3 1.2.8l.9 2.2c.2.5.1 1.1-.3 1.5l-1.5 1.5c-.4.4-1 .6-1.6.5C10.6 18.2 5.8 13.4 5.2 6.7c-.1-.6.1-1.2.5-1.6l1.5-1.5Z"/></svg>
          </a>
        </div>

        <div v-if="needsPayment && driver" class="pay-due">
          <strong>{{ driver.name || 'Your driver' }} is ready to deliver</strong>
          <p>Complete your {{ paymentLabel(order.paymentMethod) }} payment so they can start your delivery.</p>
          <button class="btn btn-accent btn-block" :disabled="paying" @click="startPay">
            {{ paying ? 'Opening checkout…' : `Pay ${formatGhs(order.totalAmount)}` }}
          </button>
          <p v-if="payError" class="error-text" style="margin-top: 8px">{{ payError }}</p>
          <p v-if="paySuccess" class="chip chip-success" style="margin-top: 10px">Payment confirmed</p>
        </div>

        <div v-if="order.status === 'delivered' && !order.rating" class="rate-block">
          <p class="eyebrow">Rate your delivery</p>
          <StarRating v-model="rating" />
          <button class="btn btn-primary btn-block" style="margin-top: 12px" :disabled="!rating || ratingBusy" @click="submitRating">
            Submit rating
          </button>
        </div>
        <div v-else-if="order.rating" class="chip chip-success" style="margin-top: 12px">
          You rated ★ {{ order.rating }}
        </div>

        <button
          v-if="canCancel"
          class="btn btn-danger btn-block"
          style="margin-top: 16px"
          :disabled="busy"
          @click="cancelOrder"
        >
          Cancel order
        </button>
        <p v-if="actionError" class="error-text" style="margin-top: 8px">{{ actionError }}</p>
      </template>
      <div v-else class="empty">Order not found</div>
    </BottomSheet>

    <PaystackCheckoutModal
      :open="sheetOpen"
      :authorization-url="sheetUrl"
      :busy="verifying"
      @close="closeSheet"
      @done="verifyAndFinish"
    />
  </div>
</template>

<script setup lang="ts">
import {
  statusLabel,
  fuelLabel,
  formatGhs,
  paymentLabel,
  isPrepaid,
  latLngFromCoords,
  fetchDrivingRoute,
} from '~/utils/format'
import { openPaystackPopup } from '~/composables/usePaystackCheckout'
import { resolveMediaUrl } from '~/utils/media'

definePageMeta({ layout: 'customer' })

const route = useRoute()
const orderId = computed(() => String(route.params.id))
const { get, post } = useApi()
const { connect, on, emit } = useSocket()

const mapRef = ref<any>(null)
const order = ref<any>(null)
const loading = ref(true)
const busy = ref(false)
const paying = ref(false)
const verifying = ref(false)
const payError = ref('')
const paySuccess = ref(false)
const actionError = ref('')
const rating = ref(0)
const ratingBusy = ref(false)
const driverPos = ref<{ lat: number; lng: number } | null>(null)
const routePoints = ref<{ lat: number; lng: number }[]>([])
const sheetOpen = ref(false)
const sheetUrl = ref('')
const payReference = ref('')
const routeMeta = ref<{ distanceMeters: number; durationSeconds: number } | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null
let locationPoll: ReturnType<typeof setInterval> | null = null
let routeTimer: ReturnType<typeof setTimeout> | null = null
let didFit = false

const stopPoll = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const closeSheet = () => {
  stopPoll()
  sheetOpen.value = false
  sheetUrl.value = ''
  paying.value = false
  verifying.value = false
}

const subscribeOrder = () => {
  emit('order:subscribe', orderId.value)
}

const hydrateDriverFromOrder = (force = false) => {
  if (driverPos.value && !force) return
  const d = order.value?.driverId
  if (!d || typeof d !== 'object') return
  const coords =
    d.driverProfile?.currentLocation?.coordinates ||
    d.currentLocation?.coordinates ||
    d.location?.coordinates
  const p = latLngFromCoords(coords)
  if (p) driverPos.value = p
}

const driverPhoto = computed(() => resolveMediaUrl(driver.value?.photoUrl || driver.value?.avatar))

const driver = computed(() => {
  const d = order.value?.driverId
  if (!d) return null
  if (typeof d !== 'object') return order.value?.driver || null
  return {
    ...d,
    photoUrl: d.photoUrl || d.avatarUrl || d.avatar || d.driverProfile?.photoUrl,
    vehiclePlate: d.vehiclePlate || d.plateNumber || d.driverProfile?.vehiclePlate,
    rating: d.rating ?? d.driverProfile?.rating,
    phone: d.phone,
    name: d.name,
  }
})

const deliveryPos = computed(() => latLngFromCoords(order.value?.deliveryLocation?.coordinates))

const mapCenter = computed(() => {
  if (driverPos.value) return driverPos.value
  if (deliveryPos.value) return deliveryPos.value
  return { lat: 5.6037, lng: -0.187 }
})

const markers = computed(() => {
  const m: any[] = []
  if (deliveryPos.value) {
    m.push({
      id: 'drop',
      ...deliveryPos.value,
      color: '#e84b1a',
      label: 'You',
      kind: 'drop',
    })
  }
  if (driverPos.value) {
    m.push({
      id: 'driver',
      ...driverPos.value,
      color: '#0d0d0d',
      label: driver.value?.name || 'Driver',
      kind: 'driver',
    })
  }
  return m
})

const etaLabel = computed(() => {
  if (!routeMeta.value) return ''
  const mins = Math.max(1, Math.ceil(routeMeta.value.durationSeconds / 60))
  const km = routeMeta.value.distanceMeters / 1000
  const dist = km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(routeMeta.value.distanceMeters)} m`
  return `${mins} min · ${dist}`
})

const fitTrip = () => {
  const pts = [
    ...(driverPos.value ? [driverPos.value] : []),
    ...(deliveryPos.value ? [deliveryPos.value] : []),
    ...routePoints.value,
  ]
  mapRef.value?.fitBounds?.(pts, { top: 72, bottom: 320, left: 40, right: 40 })
}

const needsPayment = computed(() => {
  if (!order.value) return false
  if (!isPrepaid(order.value.paymentMethod)) return false
  if (order.value.paymentStatus === 'paid') return false
  const assigned = ['assigned', 'en_route', 'arrived'].includes(order.value.status)
  return assigned
})

const findingDriver = computed(() => {
  const status = order.value?.status
  if (!status || status === 'cancelled' || status === 'delivered') return false
  if (driver.value) return false
  return status === 'pending' || status === 'confirmed'
})

const canCancel = computed(() => {
  if (!order.value) return false
  return !['arrived', 'delivered', 'cancelled'].includes(order.value.status)
})

const initials = (name?: string) => {
  if (!name) return 'D'
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const load = async (opts: { silent?: boolean } = {}) => {
  if (!opts.silent) loading.value = true
  try {
    const res = await get(`/orders/${orderId.value}`)
    order.value = res.data?.order || res.data
    hydrateDriverFromOrder(true)
    subscribeOrder()
    await updateRoute()
  } catch {
    if (!opts.silent) order.value = null
  } finally {
    if (!opts.silent) loading.value = false
  }
}

const updateRoute = async () => {
  if (!driverPos.value || !deliveryPos.value) {
    routePoints.value = []
    routeMeta.value = null
    return
  }
  const info = await fetchDrivingRoute(driverPos.value, deliveryPos.value)
  if (info?.points?.length) {
    routePoints.value = info.points
    routeMeta.value = {
      distanceMeters: info.distanceMeters,
      durationSeconds: info.durationSeconds,
    }
  } else {
    // Straight-line fallback like Flutter
    routePoints.value = [driverPos.value, deliveryPos.value]
    routeMeta.value = null
  }
  if (!didFit) {
    didFit = true
    nextTick(() => fitTrip())
  }
}

const scheduleRoute = () => {
  if (routeTimer) clearTimeout(routeTimer)
  routeTimer = setTimeout(() => {
    updateRoute()
  }, 1200)
}

const verifyPayment = async (reference: string) => {
  const res = await get(`/payments/verify/${encodeURIComponent(reference)}`)
  const data = res.data || res
  return data.paid === true || data.paymentStatus === 'paid'
}

const onPaymentConfirmed = async () => {
  paySuccess.value = true
  payError.value = ''
  closeSheet()
  await load()
}

const verifyAndFinish = async () => {
  if (!payReference.value || verifying.value) return
  verifying.value = true
  try {
    const paid = await verifyPayment(payReference.value)
    if (paid) {
      await onPaymentConfirmed()
    } else {
      payError.value = 'Payment not confirmed yet — tap Done again after completing checkout'
    }
  } catch (e: any) {
    payError.value = e.message || 'Could not verify payment'
  } finally {
    verifying.value = false
    paying.value = false
  }
}

const startSheetFallback = (authorizationUrl: string, reference: string) => {
  sheetUrl.value = authorizationUrl
  payReference.value = reference
  sheetOpen.value = true
  stopPoll()
  // Poll while sheet is open (iframe can't report success cross-origin)
  pollTimer = setInterval(async () => {
    try {
      const paid = await verifyPayment(reference)
      if (paid) await onPaymentConfirmed()
    } catch {
      /* keep polling */
    }
  }, 4000)
}

const startPay = async () => {
  paying.value = true
  payError.value = ''
  paySuccess.value = false
  try {
    const res = await post('/payments/initialize', { orderId: orderId.value })
    const data = res.data || res
    if (data.paid === true) {
      await onPaymentConfirmed()
      return
    }
    const url = data.authorizationUrl || data.authorization_url
    const reference = data.reference as string | undefined
    const accessCode = (data.accessCode || data.access_code) as string | undefined
    if (!reference) throw new Error('No payment reference returned')

    payReference.value = reference

    // Prefer in-page Paystack popup (same idea as Flutter sheet)
    if (accessCode) {
      try {
        const result = await openPaystackPopup({ accessCode, reference })
        if (result.paid) {
          const paid = await verifyPayment(result.reference || reference)
          if (paid) {
            await onPaymentConfirmed()
            return
          }
          payError.value = 'Payment submitted — confirming…'
          // One more verify pass
          await new Promise((r) => setTimeout(r, 800))
          if (await verifyPayment(reference)) {
            await onPaymentConfirmed()
            return
          }
        }
        if (result.cancelled) {
          payError.value = ''
          return
        }
        if (result.error) {
          // Fall through to sheet
          console.warn('[pay]', result.error)
        }
      } catch (e) {
        console.warn('[pay] popup unavailable, using sheet', e)
      }
    }

    if (!url) throw new Error('No payment URL returned')
    startSheetFallback(url, reference)
  } catch (e: any) {
    payError.value = e.message || 'Payment failed to start'
    paying.value = false
  } finally {
    if (!sheetOpen.value) paying.value = false
  }
}

const cancelOrder = async () => {
  if (!confirm('Cancel this order?')) return
  busy.value = true
  actionError.value = ''
  try {
    await post(`/orders/${orderId.value}/cancel`)
    await load()
  } catch (e: any) {
    actionError.value = e.message
  } finally {
    busy.value = false
  }
}

const submitRating = async () => {
  ratingBusy.value = true
  try {
    await post(`/orders/${orderId.value}/rate`, { rating: rating.value })
    await load()
  } catch (e: any) {
    actionError.value = e.message
  } finally {
    ratingBusy.value = false
  }
}

const onPayMessage = async (ev: MessageEvent) => {
  if (ev.origin !== window.location.origin) return
  const data = ev.data
  if (!data || data.source !== '1gallon-paystack') return
  if (data.type === 'pay_success') {
    if (data.reference) payReference.value = String(data.reference)
    await onPaymentConfirmed()
  }
}

onMounted(async () => {
  const sock = connect()
  sock?.on('connect', subscribeOrder)
  await load()
  on('order:updated', (payload: any) => {
    const id = payload?.orderId || payload?._id || payload?.order?._id
    if (id && String(id) !== orderId.value) return
    load({ silent: true })
  })
  on('order:cancelled', () => load({ silent: true }))
  on('driver:location', (payload: any) => {
    if (payload?.orderId && String(payload.orderId) !== orderId.value) return
    if (payload?.lat != null && payload?.lng != null) {
      driverPos.value = { lat: Number(payload.lat), lng: Number(payload.lng) }
      scheduleRoute()
    }
  })
  // Backup poll — refresh driver coords from API if sockets are quiet
  locationPoll = setInterval(() => {
    if (['delivered', 'cancelled'].includes(order.value?.status)) return
    load({ silent: true })
  }, 15000)
  window.addEventListener('message', onPayMessage)
})

onBeforeUnmount(() => {
  stopPoll()
  if (locationPoll) clearInterval(locationPoll)
  if (routeTimer) clearTimeout(routeTimer)
  emit('order:unsubscribe', orderId.value)
  window.removeEventListener('message', onPayMessage)
})
</script>

<style scoped>
.track-page {
  /* fill shell */
}
.searching {
  margin: 10px 0 4px;
}
.searching__bar {
  height: 4px;
  border-radius: 4px;
  background: var(--border);
  overflow: hidden;
}
.searching__bar span {
  display: block;
  height: 100%;
  width: 40%;
  border-radius: 4px;
  background: var(--ink);
  animation: rider-search 1.2s ease-in-out infinite;
}
.searching p {
  margin-top: 8px;
  color: var(--muted);
  font-size: 0.82rem;
}
@keyframes rider-search {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(280%); }
}
.top-bar {
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.locate-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--paper);
  box-shadow: var(--shadow);
  font-size: 1.1rem;
  font-weight: 600;
}
.fit-btn {
  font-size: 1.05rem;
}
.eta-chip {
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 6;
  background: var(--ink);
  color: var(--paper);
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: var(--shadow);
  white-space: nowrap;
}
.quote-mini {
  display: flex;
  justify-content: space-between;
  padding: 14px;
  background: var(--paper-2);
  border-radius: 14px;
  margin: 12px 0;
}
.driver-card {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 12px 0;
  padding: 14px;
  border-radius: 16px;
  background: var(--paper);
  border: 1px solid var(--border);
}
.driver-card .avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--ink);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  flex-shrink: 0;
}
.driver-card .avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.driver-card__meta {
  flex: 1;
  min-width: 0;
}
.driver-card__meta strong {
  display: block;
  font-size: 1rem;
  font-weight: 600;
}
.driver-card__meta span {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 0.82rem;
}
.stars {
  color: var(--ink);
  letter-spacing: 1px;
}
.stars i {
  font-style: normal;
  color: var(--border);
}
.stars i.on {
  color: #e6a800;
}
.call-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.call-btn svg {
  width: 18px;
  height: 18px;
}
.pay-due {
  margin-top: 12px;
  padding: 16px;
  border-radius: 16px;
  background: var(--ink);
  color: #fff;
}
.pay-due strong {
  display: block;
  font-size: 0.95rem;
  font-weight: 600;
}
.pay-due p {
  margin: 6px 0 14px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.82rem;
  line-height: 1.4;
}
.pay-due .btn {
  border-radius: 999px;
}
.rate-block {
  margin-top: 14px;
  padding: 14px;
  border-radius: 14px;
  background: var(--white);
  border: 1px solid var(--border);
}
</style>
