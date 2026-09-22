<template>
  <div class="page">
    <div class="head-row">
      <div>
        <p class="eyebrow">Driver</p>
        <h1 class="sheet-title">Jobs</h1>
      </div>
      <button
        class="online-toggle"
        type="button"
        :class="{ on: isOnline }"
        :disabled="toggling"
        @click="toggleOnline"
      >
        {{ isOnline ? 'Online' : 'Offline' }}
      </button>
    </div>

    <div v-if="stats" class="stats-row" style="margin: 12px 0 18px">
      <div>
        <div class="stat-n">{{ stats.todayTrips ?? stats.todayDeliveries ?? 0 }}</div>
        <div class="stat-l">Today</div>
      </div>
      <div>
        <div class="stat-n">{{ formatGhs(stats.todayEarned ?? 0) }}</div>
        <div class="stat-l">Stats</div>
      </div>
      <div>
        <div class="stat-n">{{ Number(stats.rating || 0).toFixed(1) }}</div>
        <div class="stat-l">Rating</div>
      </div>
    </div>

    <div class="seg" style="margin-bottom: 14px">
      <button type="button" :class="{ active: tab === 'available' }" @click="tab = 'available'">Available</button>
      <button type="button" :class="{ active: tab === 'mine' }" @click="tab = 'mine'">My jobs</button>
    </div>

    <div v-if="loading" class="center-load"><div class="spinner" /></div>
    <template v-else-if="tab === 'available'">
      <div v-if="!isOnline" class="empty">Go online to see delivery offers.</div>
      <div v-else-if="!available.length" class="empty">No open jobs nearby.</div>
      <div v-for="o in available" :key="o._id" class="job-card">
        <div class="job-top">
          <strong>{{ formatGhs(o.totalAmount) }}</strong>
          <span class="chip">{{ Number(o.deliveryDistanceKm || 0).toFixed(1) }} km</span>
        </div>
        <div class="muted" style="font-size: 0.88rem; margin: 6px 0 10px">
          {{ fuelLabel(o.fuelType) }} · {{ Number(o.litres || 0).toFixed(1) }} L
          · Fee {{ formatGhs(o.deliveryFee) }}
        </div>
        <div style="font-size: 0.9rem; margin-bottom: 12px">
          {{ o.deliveryLocation?.address || 'Customer location' }}
        </div>
        <div class="job-actions">
          <button class="btn btn-ghost btn-sm" :disabled="busyId === o._id" @click="decline(o._id)">Decline</button>
          <button class="btn btn-primary btn-sm" :disabled="busyId === o._id" @click="claim(o._id)">Accept →</button>
        </div>
      </div>
    </template>
    <template v-else>
      <div v-if="!mine.length" class="empty">No active jobs.</div>
      <button
        v-for="o in mine"
        :key="o._id"
        type="button"
        class="job-card"
        style="width: 100%; text-align: left"
        @click="navigateTo(`/driver/order/${o._id}`)"
      >
        <div class="job-top">
          <strong>{{ statusLabel(o.status) }}</strong>
          <span class="chip chip-accent">{{ formatGhs(o.totalAmount) }}</span>
        </div>
        <div class="muted" style="font-size: 0.88rem; margin-top: 6px">
          {{ fuelLabel(o.fuelType) }} · {{ o.deliveryLocation?.address || 'Delivery' }}
        </div>
      </button>
    </template>
    <p v-if="error" class="error-text" style="margin-top: 12px">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { formatGhs, fuelLabel, statusLabel } from '~/utils/format'

definePageMeta({ layout: 'driver' })

const { get, post, patch } = useApi()
const auth = useAuth()
const { connect, on, emit } = useSocket()
const { position, locate } = useGeolocation()

const tab = ref<'available' | 'mine'>('available')
const available = ref<any[]>([])
const mine = ref<any[]>([])
const stats = ref<any>(null)
const loading = ref(true)
const toggling = ref(false)
const busyId = ref('')
const error = ref('')
let pingTimer: any

const isOnline = computed(() => {
  const u = auth.user.value
  return !!(u?.driverProfile?.isAvailable ?? u?.isAvailable)
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [av, my, an] = await Promise.all([
      get('/orders/driver/available').catch(() => ({ data: [] })),
      get('/orders/driver/my-orders').catch(() => ({ data: [] })),
      get('/analytics/me').catch(() => null),
    ])
    available.value = av.data?.orders || av.data || []
    mine.value = (my.data?.orders || my.data || []).filter((o: any) =>
      ['assigned', 'en_route', 'arrived'].includes(o.status),
    )
    stats.value = an?.data || an
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const toggleOnline = async () => {
  toggling.value = true
  try {
    const next = !isOnline.value
    await patch('/users/me/driver-profile', { isAvailable: next })
    if (auth.user.value) {
      auth.user.value = {
        ...auth.user.value,
        driverProfile: { ...(auth.user.value.driverProfile || {}), isAvailable: next },
        isAvailable: next,
      }
    }
    emit('driver:available', { isAvailable: next })
    await load()
  } catch (e: any) {
    error.value = e.message
  } finally {
    toggling.value = false
  }
}

const claim = async (id: string) => {
  busyId.value = id
  try {
    await post(`/orders/${id}/claim`)
    await navigateTo(`/driver/order/${id}`)
  } catch (e: any) {
    error.value = e.message
  } finally {
    busyId.value = ''
  }
}

const decline = async (id: string) => {
  busyId.value = id
  try {
    await post(`/orders/${id}/decline`)
    available.value = available.value.filter((o) => o._id !== id)
  } catch (e: any) {
    error.value = e.message
  } finally {
    busyId.value = ''
  }
}

const pingLocation = async () => {
  if (!isOnline.value) return
  const p = await locate()
  emit('driver:location', { lat: p.lat, lng: p.lng })
  try {
    await patch('/users/me/driver-profile', { lat: p.lat, lng: p.lng })
  } catch {
    /* best effort */
  }
}

onMounted(async () => {
  connect()
  await auth.fetchMe()
  await load()
  await pingLocation()
  pingTimer = setInterval(pingLocation, 20000)
  on('order:new', () => load())
  on('order:offer', () => load())
  on('order:taken', () => load())
  on('order:updated', () => load())
  on('order:cancelled', () => load())
})

onBeforeUnmount(() => {
  clearInterval(pingTimer)
})
</script>

<style scoped>
.head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.online-toggle {
  min-height: 40px;
  padding: 0 16px;
  border-radius: var(--radius-pill);
  font-weight: 600;
  background: var(--paper-2);
  border: 1.5px solid var(--border);
}
.online-toggle.on {
  background: var(--success-bg);
  color: var(--success);
  border-color: var(--success);
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
}
.stat-l {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.job-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 10px;
}
.job-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.job-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
