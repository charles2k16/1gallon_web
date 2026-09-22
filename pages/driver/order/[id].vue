<template>
  <div class="map-stage">
    <MapView
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
          <div style="grid-column: 1 / -1">
            <div class="muted tiny">Address</div>
            <strong>{{ order.deliveryLocation?.address || 'Pinned location' }}</strong>
          </div>
          <div v-if="customer">
            <div class="muted tiny">Customer</div>
            <strong>{{ customer.name || customer.phone }}</strong>
          </div>
        </div>

        <a v-if="customer?.phone" class="btn btn-ghost btn-block" style="margin-top: 12px" :href="`tel:${customer.phone}`">
          Call customer
        </a>

        <button
          v-if="nextStatus"
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
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const driverPos = ref<{ lat: number; lng: number } | null>(null)
const routePoints = ref<{ lat: number; lng: number }[]>([])
let pingTimer: any

const customer = computed(() => {
  const c = order.value?.customerId
  return c && typeof c === 'object' ? c : order.value?.customer || null
})

const deliveryPos = computed(() => latLngFromCoords(order.value?.deliveryLocation?.coordinates))

const mapCenter = computed(() => driverPos.value || deliveryPos.value || { lat: 5.6037, lng: -0.187 })

const markers = computed(() => {
  const m: any[] = []
  if (deliveryPos.value) m.push({ id: 'drop', ...deliveryPos.value, color: '#e84b1a' })
  if (driverPos.value) m.push({ id: 'me', ...driverPos.value, color: '#0d0d0d' })
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
  if (!nextStatus.value) return
  busy.value = true
  error.value = ''
  try {
    await patch(`/orders/${orderId.value}/status`, { status: nextStatus.value })
    await load()
    if (nextStatus.value === null || order.value?.status === 'delivered') {
      await navigateTo('/driver')
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

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
  on('order:updated', (payload: any) => {
    const id = payload?.orderId || payload?._id
    if (!id || String(id) === orderId.value) load()
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
</style>
