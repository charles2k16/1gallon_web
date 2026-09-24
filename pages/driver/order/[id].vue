<template>
  <div class="map-stage">
    <MapView
      ref="mapRef"
      :center="mapCenter"
      :show-pin="false"
      :markers="markers"
      :route="routePoints"
    />

    <div class="map-float top-bar">
      <button class="locate-btn" type="button" @click="navigateTo('/driver')">←</button>
      <a
        v-if="deliveryPos"
        class="nav-link"
        :href="googleMapsDirUrl(deliveryPos.lat, deliveryPos.lng)"
        target="_blank"
        rel="noopener"
      >
        Navigate
      </a>
    </div>

    <BottomSheet tall>
      <div v-if="loading && !order" class="center-load"><div class="spinner" /></div>
      <template v-else-if="order">
        <p class="eyebrow">{{ statusLabel(order.status) }}</p>
        <h1 class="sheet-title">{{ formatGhs(order.totalAmount) }}</h1>
        <StatusPipeline :status="order.status" />

        <div class="detail-grid">
          <div>
            <div class="muted tiny">Fuel</div>
            <strong>{{ fuelLabel(order.fuelType) }} · {{ Number(order.litres || 0).toFixed(1) }} L</strong>
          </div>
          <div>
            <div class="muted tiny">Delivery fee</div>
            <strong>{{ formatGhs(order.deliveryFee) }}</strong>
          </div>
        </div>

        <h2 class="section-title">Customer</h2>
        <div class="customer">
          <span class="customer__avatar" aria-hidden="true">{{ customerInitial }}</span>
          <div class="customer__meta">
            <strong>{{ customerName }}</strong>
            <span v-if="customerPhone">{{ customerPhone }}</span>
          </div>
          <a v-if="customerPhone" class="call-btn" :href="`tel:${customerPhone}`" aria-label="Call customer">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.2 3.6c.4-.4 1-.5 1.5-.3l2.2.9c.5.2.8.7.8 1.2l-.2 2.4a1.2 1.2 0 0 1-.7 1l-1.3.6a10.6 10.6 0 0 0 4.9 4.9l.6-1.3c.2-.4.6-.7 1-.7l2.4-.2c.5 0 1 .3 1.2.8l.9 2.2c.2.5.1 1.1-.3 1.5l-1.5 1.5c-.4.4-1 .6-1.6.5C10.6 18.2 5.8 13.4 5.2 6.7c-.1-.6.1-1.2.5-1.6l1.5-1.5Z"/></svg>
          </a>
        </div>

        <h2 class="section-title">Deliver fuel to</h2>
        <div class="dropoff">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Zm0-8.2a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6Z"/></svg>
          <div>
            <strong>{{ order.deliveryLocation?.address || 'Pinned location' }}</strong>
            <span v-if="landmark">{{ landmark }}</span>
          </div>
        </div>

        <p v-if="awaitingPayment" class="wait-pay">
          Waiting for customer payment. You'll be notified when you can start.
        </p>
        <p v-else-if="prepaidPaid" class="paid-note">
          Payment received — start the trip. Do not collect cash.
        </p>

        <button
          v-if="nextStatus && !awaitingPayment"
          class="btn btn-accent btn-block"
          style="margin-top: 12px"
          :disabled="busy"
          @click="advance"
        >
          {{ busy ? 'Updating…' : nextLabel }}
        </button>

        <button
          v-if="canCancel"
          class="btn btn-danger btn-block"
          style="margin-top: 10px"
          :disabled="busy"
          @click="cancelJob"
        >
          Cancel job
        </button>
        <p v-if="error" class="error-text" style="margin-top: 8px">{{ error }}</p>
      </template>
    </BottomSheet>
  </div>
</template>

<script setup lang="ts">
import {
  statusLabel,
  fuelLabel,
  formatGhs,
  isPrepaid,
  latLngFromCoords,
  fetchDrivingRoute,
  googleMapsDirUrl,
} from '~/utils/format'

definePageMeta({ layout: 'driver' })

const route = useRoute()
const orderId = computed(() => String(route.params.id))
const { get, post, patch } = useApi()
const { connect, on, emit } = useSocket()
const { locate } = useGeolocation()

const order = ref<any>(null)
const mapRef = ref<any>(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const driverPos = ref<{ lat: number; lng: number } | null>(null)
const routePoints = ref<{ lat: number; lng: number }[]>([])
let pingTimer: any
let didFit = false

const customer = computed(() => {
  const c = order.value?.customerId
  return c && typeof c === 'object' ? c : order.value?.customer || null
})

const customerName = computed(() => customer.value?.name || 'Customer')
const customerPhone = computed(() => String(customer.value?.phone || '').trim())
const customerInitial = computed(() => {
  const name = customerName.value.trim()
  return name ? name[0].toUpperCase() : 'C'
})
const landmark = computed(() => String(order.value?.deliveryLocation?.landmark || '').trim())

const deliveryPos = computed(() => latLngFromCoords(order.value?.deliveryLocation?.coordinates))

const mapCenter = computed(() => driverPos.value || deliveryPos.value || { lat: 5.6037, lng: -0.187 })

const markers = computed(() => {
  const m: any[] = []
  if (deliveryPos.value) {
    m.push({ id: 'drop', ...deliveryPos.value, color: '#e84b1a', label: 'Customer', kind: 'drop' })
  }
  if (driverPos.value) {
    m.push({ id: 'me', ...driverPos.value, color: '#0d0d0d', label: 'You', kind: 'driver' })
  }
  return m
})

const nextStatus = computed(() => {
  const s = order.value?.status
  if (s === 'assigned') return 'en_route'
  if (s === 'en_route') return 'arrived'
  if (s === 'arrived') return 'delivered'
  return null
})

const nextLabel = computed(() => {
  if (nextStatus.value === 'en_route') return 'Start trip →'
  if (nextStatus.value === 'arrived') return 'Mark arrived →'
  if (nextStatus.value === 'delivered') return 'Complete delivery →'
  return ''
})

const canCancel = computed(() =>
  order.value && !['delivered', 'cancelled', 'arrived'].includes(order.value.status),
)

const awaitingPayment = computed(() =>
  order.value?.status === 'assigned' &&
  isPrepaid(order.value?.paymentMethod) &&
  order.value?.paymentStatus !== 'paid',
)

const prepaidPaid = computed(() =>
  isPrepaid(order.value?.paymentMethod) && order.value?.paymentStatus === 'paid',
)

const markPaid = (payload: any) => {
  const id = payload?.orderId || payload?._id
  if (id && String(id) !== orderId.value) return
  if (payload?.paymentStatus === 'paid' && order.value) {
    order.value = { ...order.value, paymentStatus: 'paid' }
  }
  load()
}

const load = async () => {
  loading.value = true
  try {
    const res = await get(`/orders/${orderId.value}`)
    order.value = res.data?.order || res.data
    await refreshRoute()
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const refreshRoute = async () => {
  if (!driverPos.value || !deliveryPos.value) return
  const info = await fetchDrivingRoute(driverPos.value, deliveryPos.value)
  routePoints.value = info?.points || [driverPos.value, deliveryPos.value]
  if (!didFit) {
    didFit = true
    nextTick(() => {
      mapRef.value?.fitBounds?.(
        [driverPos.value!, deliveryPos.value!, ...routePoints.value],
        { top: 72, bottom: 320, left: 40, right: 40 },
      )
    })
  }
}

const ping = async () => {
  const p = await locate()
  driverPos.value = p
  emit('driver:location', { lat: p.lat, lng: p.lng, orderId: orderId.value })
  try {
    await patch('/users/me/driver-profile', {
      lat: p.lat,
      lng: p.lng,
    })
  } catch {
    /* ignore */
  }
  await refreshRoute()
}

const advance = async () => {
  const target = nextStatus.value
  if (!target) return
  busy.value = true
  error.value = ''
  try {
    await patch(`/orders/${orderId.value}/status`, { status: target })
    if (target === 'delivered') {
      await navigateTo('/driver')
      return
    }
    await load()
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

watch(
  () => order.value?.status,
  (status, prev) => {
    if (status === 'delivered' && prev && prev !== 'delivered') {
      navigateTo('/driver')
    }
  },
)

const cancelJob = async () => {
  if (!confirm('Cancel this job?')) return
  busy.value = true
  try {
    await post(`/orders/${orderId.value}/cancel`)
    await navigateTo('/driver')
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  connect()
  await load()
  await ping()
  pingTimer = setInterval(ping, 12000)
  on('order:updated', markPaid)
  on('order:payment', (payload: any) => {
    if (order.value) order.value = { ...order.value, paymentStatus: 'paid' }
    markPaid(payload)
  })
})

onBeforeUnmount(() => clearInterval(pingTimer))
</script>

<style scoped>
.top-bar {
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.locate-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--paper);
  box-shadow: var(--shadow);
  font-weight: 600;
}
.nav-link {
  background: var(--ink);
  color: var(--paper);
  padding: 10px 16px;
  border-radius: var(--radius-pill);
  font-weight: 600;
  font-size: 0.85rem;
  box-shadow: var(--shadow);
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 14px 0;
}
.tiny {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 2px;
}
.section-title {
  margin: 16px 0 8px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
}
.customer {
  display: flex;
  align-items: center;
  gap: 12px;
}
.customer__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  font-weight: 700;
  flex-shrink: 0;
}
.customer__meta {
  flex: 1;
  min-width: 0;
}
.customer__meta strong {
  display: block;
  font-size: 1rem;
  font-weight: 500;
}
.customer__meta span {
  display: block;
  margin-top: 1px;
  color: var(--muted);
  font-size: 0.82rem;
}
.call-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(13, 13, 13, 0.08);
}
.call-btn svg {
  width: 22px;
  height: 22px;
}
.dropoff {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.dropoff svg {
  width: 20px;
  height: 20px;
  color: var(--accent);
  flex-shrink: 0;
  margin-top: 1px;
}
.dropoff strong {
  display: block;
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1.35;
}
.dropoff span {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 0.82rem;
}
.wait-pay,
.paid-note {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: var(--radius);
  font-size: 0.9rem;
}
.wait-pay {
  background: var(--paper);
  border: 1px solid var(--border);
  color: var(--muted);
}
.paid-note {
  background: var(--success-bg);
  color: var(--success);
  font-weight: 600;
}
</style>
