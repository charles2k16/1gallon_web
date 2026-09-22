<template>
  <div class="map-stage">
    <MapView
      ref="mapRef"
      :center="mapCenter"
      :show-pin="false"
      :markers="mapMarkers"
      @ready="onMapReady"
    />

    <div class="map-float top-bar">
      <div class="brand-pill">
        <span class="brand">1GALLON</span>
      </div>
      <button class="locate-btn" type="button" :disabled="locating" @click="recenter">
        {{ locating ? '…' : '◎' }}
      </button>
    </div>

    <BottomSheet>
      <div v-if="greeting" class="eyebrow">{{ greeting }}</div>
      <h1 class="sheet-title">Fuel, delivered</h1>
      <p class="sheet-sub">Pin a spot and we'll bring petrol, super, or diesel to you.</p>

      <button v-if="activeOrder" class="banner" type="button" style="margin-bottom: 14px; width: 100%" @click="goTrack(activeOrder._id)">
        <div>
          <strong>{{ statusLabel(activeOrder.status) }}</strong>
          <span class="muted" style="color: rgba(245,240,232,0.7); font-size: 0.85rem">
            {{ fuelLabel(activeOrder.fuelType) }} · {{ formatGhs(activeOrder.totalAmount || activeOrder.amount) }}
          </span>
        </div>
        <span>→</span>
      </button>

      <button class="where-btn" type="button" @click="navigateTo('/request')">
        <span class="where-ico">📍</span>
        <span>
          <strong>Where to deliver?</strong>
          <small>Search or drop a pin on the map</small>
        </span>
      </button>

      <div v-if="stats" class="stats-row">
        <div>
          <div class="stat-n">{{ stats.activeOrders ?? 0 }}</div>
          <div class="stat-l">Active</div>
        </div>
        <div>
          <div class="stat-n">{{ formatGhs(stats.weekSpend || 0) }}</div>
          <div class="stat-l">This week</div>
        </div>
        <div>
          <div class="stat-n">{{ stats.totalDeliveries ?? 0 }}</div>
          <div class="stat-l">Deliveries</div>
        </div>
      </div>
    </BottomSheet>
  </div>
</template>

<script setup lang="ts">
import { fuelLabel, formatGhs, statusLabel, latLngFromCoords } from '~/utils/format'

definePageMeta({ layout: 'customer' })

const { get } = useApi()
const auth = useAuth()
const { position, locating, locate } = useGeolocation()
const { connect, on } = useSocket()

const mapRef = ref<any>(null)
const mapCenter = computed(() => position.value)
const orders = ref<any[]>([])
const stats = ref<any>(null)

const activeStatuses = ['pending', 'confirmed', 'assigned', 'en_route', 'arrived']
const activeOrder = computed(() =>
  orders.value.find((o) => activeStatuses.includes(o.status)),
)

const mapMarkers = computed(() => {
  const m = []
  if (position.value) {
    m.push({ id: 'me', lat: position.value.lat, lng: position.value.lng, color: '#0d0d0d', label: 'You' })
  }
  if (activeOrder.value) {
    const c = latLngFromCoords(activeOrder.value.deliveryLocation?.coordinates)
    if (c) m.push({ id: 'drop', ...c, color: '#e84b1a', label: 'Delivery' })
  }
  return m
})

const greeting = computed(() => {
  const name = auth.user.value?.name
  if (!name || name === 'Customer') return 'Welcome'
  return `Hi, ${String(name).split(' ')[0]}`
})

const load = async () => {
  try {
    const [ordRes, anRes] = await Promise.all([
      get('/orders'),
      get('/analytics/me').catch(() => null),
    ])
    orders.value = ordRes.data?.orders || ordRes.data || []
    stats.value = anRes?.data || anRes
  } catch {
    /* ignore */
  }
}

const recenter = async () => {
  const p = await locate()
  mapRef.value?.flyTo?.(p.lat, p.lng, 15)
}

const goTrack = (id: string) => navigateTo(`/tracking/${id}`)

const onMapReady = async () => {
  await locate()
  mapRef.value?.flyTo?.(position.value.lat, position.value.lng, 14)
}

onMounted(async () => {
  connect()
  await load()
  on('order:updated', () => load())
  on('order:cancelled', () => load())
})
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
.brand-pill {
  background: rgba(245, 240, 232, 0.95);
  padding: 10px 16px;
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow);
  font-size: 1.25rem;
}
.locate-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--paper);
  box-shadow: var(--shadow);
  font-size: 1.2rem;
}
.where-btn {
  width: 100%;
  display: flex;
  gap: 12px;
  align-items: center;
  text-align: left;
  padding: 16px;
  border-radius: 18px;
  background: var(--white);
  border: 1.5px solid var(--border);
  margin-bottom: 16px;
}
.where-btn strong {
  display: block;
  font-family: var(--font-ui);
  font-size: 1.05rem;
}
.where-btn small {
  color: var(--muted);
}
.where-ico {
  font-size: 1.3rem;
}
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  text-align: center;
}
.stat-n {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 0.95rem;
}
.stat-l {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin-top: 2px;
}
</style>
