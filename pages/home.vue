<template>
  <div class="home">
    <header>
      <h1>Hi, {{ firstName }}</h1>
      <p>Fuel delivered to your door</p>
    </header>

    <div class="stats">
      <div class="stat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h11v8H3z"/><path d="M14 10h4l3 3v2h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/></svg>
        <strong>{{ activeCount }}</strong>
        <span>Active</span>
      </div>
      <div class="stat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></svg>
        <strong>{{ weekSpend }}</strong>
        <span>This week</span>
      </div>
      <div class="stat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V9l4-2V4h6v5l2 1v10"/><path d="M14 11h3.2a2 2 0 0 1 2 2.2V16"/><path d="M7 20v-4h4v4"/></svg>
        <strong>{{ deliveries }}</strong>
        <span>Deliveries</span>
      </div>
    </div>

    <button v-if="primaryActive" class="live" type="button" @click="goTrack(primaryActive)">
      <span class="live__ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M8 17h6l2-5H10M4 8h6l1 3"/></svg>
      </span>
      <span>
        <strong>{{ liveLabel(primaryActive.status) }}</strong>
        <small>
          {{ litresOf(primaryActive) }}L {{ String(primaryActive.fuelType || '').toUpperCase() }}
          <template v-if="driverName(primaryActive)"> · {{ driverName(primaryActive) }}</template>
        </small>
        <small>{{ primaryActive.deliveryLocation?.address || 'Your delivery location' }}</small>
      </span>
      <em>›</em>
    </button>

    <button class="order" type="button" @click="navigateTo('/request')">
      <span class="order__ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h7v18H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 4h2.2A2.8 2.8 0 0 1 19 9.8V16a2 2 0 1 0 4 0v-4.2L20.2 9H14V7Z"/></svg>
      </span>
      <span>
        <strong>Order fuel</strong>
        <small>Pick a station · pay · track delivery</small>
      </span>
      <em>›</em>
    </button>

    <button v-if="lastDelivered" class="reorder" type="button" @click="navigateTo('/request')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.2-5.5"/><path d="M4 4v5h5"/></svg>
      Reorder {{ litresOf(lastDelivered) }}L {{ String(lastDelivered.fuelType || '').toUpperCase() }}
    </button>

    <div class="tabs" role="tablist">
      <button type="button" :class="{ on: tab === 'active' }" @click="tab = 'active'">
        Active<template v-if="activeOrders.length"> ({{ activeOrders.length }})</template>
      </button>
      <button type="button" :class="{ on: tab === 'history' }" @click="tab = 'history'">History</button>
    </div>

    <div v-if="loading && !orders.length" class="empty">
      <div class="spinner" />
    </div>
    <div v-else-if="error && !orders.length" class="empty">
      <p class="empty__title">{{ error }}</p>
      <button class="btn btn-primary" type="button" @click="load">Retry</button>
    </div>
    <div v-else-if="!shown.length" class="empty">
      <svg v-if="tab === 'active'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h11v8H3z"/><path d="M14 10h4l3 3v2h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/></svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.2-5.5"/><path d="M4 4v5h5"/><path d="M12 8v4l2.5 1.5"/></svg>
      <p class="empty__title">{{ tab === 'active' ? 'No active deliveries' : 'No past orders yet' }}</p>
      <p>{{ tab === 'active' ? 'Use the Order tab to request fuel' : 'Completed orders appear here' }}</p>
    </div>
    <div v-else class="list">
      <button
        v-for="o in shown"
        :key="o._id"
        class="card"
        :class="{ cancelled: o.status === 'cancelled' }"
        type="button"
        @click="goTrack(o)"
      >
        <div class="card__top">
          <span>{{ o.orderNumber || 'Order' }}</span>
          <em :class="statusTone(o.status)">{{ statusText(o.status) }}</em>
        </div>
        <strong>
          {{ litresOf(o) }}L {{ String(o.fuelType || '').toUpperCase() }}
          <template v-if="o.stationName || o.brandName"> · {{ o.stationName || o.brandName }}</template>
        </strong>
        <p v-if="o.deliveryLocation?.address" class="card__where">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Zm0-8.2a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6Z"/></svg>
          <span>{{ o.deliveryLocation.address }}</span>
        </p>
        <div class="card__foot">
          <b>{{ formatGhs(o.totalAmount) }}</b>
          <span v-if="driverName(o)" class="who">{{ driverName(o) }}</span>
          <time v-if="when(o)">{{ when(o) }}</time>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatGhs } from '~/utils/format'

definePageMeta({ layout: 'customer' })

const { get } = useApi()
const auth = useAuth()
const { connect, on } = useSocket()

const orders = ref<any[]>([])
const stats = ref<any>(null)
const loading = ref(true)
const error = ref('')
const tab = ref<'active' | 'history'>('active')

const activeStatuses = ['pending', 'confirmed', 'assigned', 'en_route', 'arrived']

const firstName = computed(() => {
  const name = String(auth.user.value?.name || '').trim()
  if (!name || name === 'Customer') return 'there'
  return name.split(' ')[0]
})

const activeOrders = computed(() => orders.value.filter((o) => activeStatuses.includes(o.status)))
const historyOrders = computed(() => orders.value.filter((o) => !activeStatuses.includes(o.status)))
const shown = computed(() => (tab.value === 'active' ? activeOrders.value : historyOrders.value))
const primaryActive = computed(() => activeOrders.value[0] || null)
const lastDelivered = computed(() => orders.value.find((o) => o.status === 'delivered') || null)

const activeCount = computed(() => {
  const n = stats.value?.active
  if (n != null && n !== '') return Number(n)
  return activeOrders.value.length
})

const weekSpend = computed(() => {
  const n = Number(stats.value?.week?.spent ?? stats.value?.weekSpend ?? 0)
  return `GHS ${Math.round(n).toLocaleString('en-US')}`
})

const deliveries = computed(() => {
  const all = stats.value?.allTime || {}
  if (all.deliveries != null) return Number(all.deliveries)
  if (all.delivered != null) return Number(all.delivered)
  return orders.value.filter((o) => o.status === 'delivered').length
})

const litresOf = (order: any) => {
  const n = Number(order?.litres)
  if (!Number.isFinite(n)) return '0'
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

const driverName = (order: any) => {
  const driver = order?.driverId
  return driver && typeof driver === 'object' ? driver.name || '' : ''
}

const liveLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: 'Finding a driver',
    confirmed: 'Confirmed',
    assigned: 'Driver assigned',
    en_route: 'On the way',
    arrived: 'Driver arrived',
  }
  return map[status] || String(status || '').replaceAll('_', ' ')
}

const statusText = (status: string) => String(status || '').replaceAll('_', ' ').toUpperCase()

const statusTone = (status: string) => {
  if (status === 'delivered') return 'ok'
  if (status === 'cancelled' || status === 'assigned') return 'hot'
  if (status === 'en_route' || status === 'arrived') return 'ink'
  return 'muted'
}

const when = (order: any) => {
  const raw = order?.createdAt
  if (!raw) return ''
  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return ''
  const mon = dt.toLocaleString('en-GB', { month: 'short' })
  const hh = String(dt.getHours()).padStart(2, '0')
  const mm = String(dt.getMinutes()).padStart(2, '0')
  return `${dt.getDate()} ${mon} · ${hh}:${mm}`
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [ordRes, anRes] = await Promise.all([
      get('/orders'),
      get('/analytics/me').catch(() => null),
    ])
    orders.value = ordRes.data?.orders || ordRes.data || []
    stats.value = anRes?.data || anRes
  } catch (e: any) {
    error.value = e.message || 'Could not load orders'
  } finally {
    loading.value = false
  }
}

const goTrack = (order: any) => navigateTo(`/tracking/${order._id}`)

onMounted(async () => {
  auth.fetchMe()
  connect()
  await load()
  on('order:updated', () => load())
  on('order:cancelled', () => load())
})
</script>

<style scoped>
.home {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 16px 20px 28px;
  background: var(--paper);
}

header h1 {
  font-family: var(--font-ui);
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

header p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 0.82rem;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 16px 0 14px;
}

.stat {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 12px;
  min-width: 0;
}

.stat svg {
  width: 16px;
  height: 16px;
  color: var(--accent);
}

.stat strong {
  display: block;
  margin-top: 8px;
  font-family: var(--font-ui);
  font-size: 0.88rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat span {
  display: block;
  color: var(--muted);
  font-size: 0.68rem;
}

.live {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(232, 75, 26, 0.15), rgba(232, 75, 26, 0.05));
  border: 1px solid rgba(232, 75, 26, 0.35);
}

.live__ico {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(232, 75, 26, 0.15);
  color: var(--accent);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.live__ico svg {
  width: 22px;
  height: 22px;
}

.live strong {
  display: block;
  font-size: 0.9rem;
}

.live small {
  display: block;
  color: var(--muted);
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.live span:nth-child(2) {
  flex: 1;
  min-width: 0;
}

.live em,
.order em {
  font-style: normal;
  color: var(--accent);
  font-size: 1.3rem;
}

.order {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  padding: 18px;
  border-radius: 24px;
  background: var(--ink);
  color: #fff;
}

.order__ico {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: rgba(232, 75, 26, 0.2);
  color: var(--accent);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.order__ico svg {
  width: 24px;
  height: 24px;
}

.order strong {
  display: block;
  font-family: var(--font-ui);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.order small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 0.75rem;
}

.order span:nth-child(2) {
  flex: 1;
  min-width: 0;
}

.order em {
  color: var(--muted);
  font-size: 1.4rem;
}

.reorder {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: var(--white);
  border: 1px solid var(--border);
  font-size: 0.78rem;
  font-weight: 600;
}

.reorder svg {
  width: 16px;
  height: 16px;
  color: var(--accent);
}

.tabs {
  display: flex;
  gap: 0;
  margin-top: 20px;
  padding: 4px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 999px;
}

.tabs button {
  flex: 1;
  padding: 10px 8px;
  border-radius: 999px;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.tabs button.on {
  background: var(--ink);
  color: #fff;
}

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4px;
  padding: 48px 16px;
  color: var(--muted);
  font-size: 0.82rem;
}

.empty svg {
  width: 44px;
  height: 44px;
  color: rgba(107, 100, 89, 0.45);
  margin-bottom: 8px;
}

.empty__title {
  color: var(--ink);
  font-weight: 600;
  font-size: 0.95rem;
}

.list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card {
  width: 100%;
  text-align: left;
  padding: 14px;
  border-radius: 16px;
  background: var(--white);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card.cancelled {
  background: rgba(232, 75, 26, 0.06);
  border-color: rgba(232, 75, 26, 0.3);
}

.card__top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.card__top span {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--muted);
}

.card__top em {
  font-style: normal;
  font-size: 0.62rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 8px;
}

.card__top em.ok { color: var(--success); background: var(--success-bg); }
.card__top em.hot { color: var(--accent); background: var(--accent-dim); }
.card__top em.ink { color: var(--ink); background: var(--paper-2); }
.card__top em.muted { color: var(--muted); background: var(--paper); }

.card > strong {
  font-size: 0.9rem;
  font-weight: 600;
}

.card__where {
  display: flex;
  gap: 4px;
  align-items: flex-start;
  color: var(--muted);
  font-size: 0.75rem;
}

.card__where svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 1px;
}

.card__foot {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.78rem;
}

.card__foot b {
  font-weight: 600;
}

.card__foot .who,
.card__foot time {
  color: var(--muted);
  font-size: 0.72rem;
}

.card__foot time {
  margin-left: auto;
}
</style>
