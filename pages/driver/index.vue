<template>
  <div class="jobs">
    <header class="hello">
      <div>
        <h1>Hi, {{ firstName }}</h1>
        <p>{{ isOnline ? "You're online — ready for deliveries" : 'Go online to receive offers' }}</p>
      </div>
      <button
        class="switch"
        type="button"
        :class="{ on: isOnline }"
        :disabled="toggling || pendingReview"
        :aria-pressed="isOnline"
        @click="toggleOnline"
      >
        <span class="switch__track"><span class="switch__knob" /></span>
        <span class="switch__label">{{ isOnline ? 'ONLINE' : 'OFFLINE' }}</span>
      </button>
    </header>

    <p v-if="pendingReview" class="review">
      Your application is with the team. You'll be able to go online once it's approved.
    </p>

    <section class="hero">
      <div>
        <p class="hero__kicker">Today's earnings</p>
        <p class="hero__amount">{{ formatGhs(todayEarned) }}</p>
        <p class="hero__meta">{{ todayTrips }} {{ todayTrips === 1 ? 'trip' : 'trips' }} completed</p>
        <p class="hero__note">Trip revenue — not take-home pay</p>
      </div>
      <span class="hero__pill" :class="{ on: isOnline }">
        <span class="hero__dot" />
        {{ isOnline ? 'ONLINE' : 'OFFLINE' }}
      </span>
    </section>

    <section class="minis">
      <div class="mini">
        <strong>{{ formatGhsShort(weekEarned) }}</strong>
        <span>This week</span>
      </div>
      <div class="mini">
        <strong>{{ ratingLabel }}</strong>
        <span>Rating</span>
      </div>
      <div class="mini">
        <strong>{{ available.length }}</strong>
        <span>Offers</span>
      </div>
    </section>

    <button v-if="activeJob" class="active" type="button" @click="navigateTo(`/driver/order/${activeJob._id}`)">
      <span class="active__ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"/><circle cx="12" cy="11" r="1.6"/></svg>
      </span>
      <span class="active__copy">
        <strong>Active delivery</strong>
        <span>{{ activeJobLine(activeJob) }}</span>
      </span>
      <span class="active__chev" aria-hidden="true">›</span>
    </button>

    <div class="tabs">
      <button type="button" :class="{ on: tab === 'available' }" @click="tab = 'available'">
        Available ({{ available.length }})
      </button>
      <button type="button" :class="{ on: tab === 'mine' }" @click="tab = 'mine'">
        My jobs ({{ mine.length }})
      </button>
    </div>

    <div v-if="loading" class="jobs-body"><div class="spinner" /></div>
    <div v-else-if="!shown.length" class="jobs-body">
      <div class="empty-jobs">
        <span class="empty-jobs__ico" aria-hidden="true">
          <svg v-if="tab === 'available' && !isOnline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 8.5h18M5 8.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5"/><path d="M2 5l4 8M22 5l-4 8"/><path d="M8 13h.01M16 13h.01"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5h16v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-11Z"/><path d="M4 7.5 8.2 4h7.6L20 7.5"/><path d="M9.5 12h5"/></svg>
        </span>
        <p>{{ emptyLabel }}</p>
        <p v-if="tab === 'available' && !isOnline" class="empty-jobs__hint">Toggle online to see nearby offers</p>
      </div>
    </div>
    <div v-else class="list">
      <article
        v-for="o in shown"
        :key="o._id"
        class="offer"
        :class="{ cancelled: o.status === 'cancelled', delivered: o.status === 'delivered' }"
      >
        <button class="offer__main" type="button" @click="navigateTo(`/driver/order/${o._id}`)">
          <div class="offer__top">
            <span class="offer__num">{{ o.orderNumber || 'Order' }}</span>
            <span v-if="tab === 'available'" class="offer__new">NEW REQUEST</span>
            <span v-else class="offer__status">{{ jobStatus(o.status) }}</span>
          </div>
          <div class="offer__fuel">
            <span>{{ fuelLabel(o.fuelType).toUpperCase() }}</span>
            <em v-if="o.stationName || o.brandName">{{ o.stationName || o.brandName }}</em>
          </div>
          <div class="offer__break">
            <div>
              <span>Fuel<small>{{ litresLabel(o.litres) }}<template v-if="o.pricePerLitre"> · {{ formatGhs(o.pricePerLitre) }}/L</template></small></span>
              <strong>{{ formatGhs(o.fuelAmount) }}</strong>
            </div>
            <div>
              <span>Delivery fee<small v-if="Number(o.deliveryDistanceKm) > 0">~{{ Number(o.deliveryDistanceKm).toFixed(1) }} km</small></span>
              <strong class="accent">{{ formatGhs(o.deliveryFee) }}</strong>
            </div>
            <div class="offer__total">
              <span>Order total</span>
              <strong>{{ formatGhs(o.totalAmount) }}</strong>
            </div>
          </div>
          <p class="offer__who">{{ customerName(o) }}</p>
          <p class="offer__where">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Zm0-8.2a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6Z"/></svg>
            <span>{{ o.deliveryLocation?.address || 'Delivery location' }}</span>
          </p>
        </button>
        <div v-if="tab === 'available' && isOnline" class="offer__actions">
          <button class="btn-decline" type="button" :disabled="busyId === o._id" @click="decline(o._id)">Decline</button>
          <button class="btn-accept" type="button" :disabled="busyId === o._id" @click="claim(o._id)">Accept</button>
        </div>
      </article>
    </div>
    <p v-if="error" class="error-text">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { formatGhs, fuelLabel, isPrepaid } from '~/utils/format'

definePageMeta({ layout: 'driver' })

const { get, post, patch } = useApi()
const offerAlert = useDriverOfferAlert()
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

const pendingReview = computed(() => {
  const status = auth.user.value?.driverProfile?.onboardingStatus
  return !!status && status !== 'approved'
})

const isOnline = computed(() => {
  const u = auth.user.value
  return !!(u?.driverProfile?.isAvailable ?? u?.isAvailable)
})

const firstName = computed(() => {
  const name = String(auth.user.value?.name || '').trim()
  return name ? name.split(' ')[0] : 'Driver'
})

const todayEarned = computed(() => stats.value?.today?.earned ?? stats.value?.todayEarned ?? 0)
const todayTrips = computed(() => Number(stats.value?.today?.delivered ?? stats.value?.todayDeliveries ?? 0))
const weekEarned = computed(() => stats.value?.week?.earned ?? stats.value?.weekEarned ?? 0)
const ratingLabel = computed(() => {
  const rating = Number(stats.value?.rating || auth.user.value?.driverProfile?.rating || 0)
  return rating > 0 ? rating.toFixed(1) : '—'
})

const liveStatuses = ['assigned', 'en_route', 'arrived']
const activeJobLine = (job: any) => {
  if (job?.status === 'assigned' && isPrepaid(job?.paymentMethod)) {
    return job.paymentStatus === 'paid'
      ? 'Paid — start the trip'
      : 'Waiting for customer payment'
  }
  return `${litresLabel(job?.litres)} · ${job?.deliveryLocation?.address || 'Delivery location'}`
}
const activeJob = computed(() => mine.value.find((o) => liveStatuses.includes(o.status)) || null)
const shown = computed(() => (tab.value === 'available' ? available.value : mine.value))
const emptyLabel = computed(() => {
  if (tab.value === 'mine') return 'No assigned jobs yet'
  return isOnline.value ? 'No delivery offers right now' : "You're offline"
})

const formatGhsShort = (n: number | string | undefined | null) => `GHS ${Math.round(Number(n || 0))}`

const litresLabel = (v: unknown) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '— L'
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} L`
}

const jobStatus = (status: string) => {
  const map: Record<string, string> = {
    assigned: 'Assigned',
    en_route: 'En route',
    arrived: 'Arrived',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }
  return map[status] || String(status || '').replaceAll('_', ' ')
}

const customerName = (order: any) => {
  const customer = order?.customerId
  if (customer && typeof customer === 'object' && customer.name) return customer.name
  return 'Customer'
}

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
    offerAlert.sync(available.value)
    mine.value = my.data?.orders || my.data || []
    stats.value = an?.data || an
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const toggleOnline = async () => {
  if (pendingReview.value) return
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
  offerAlert.dismiss(id)
  try {
    await post(`/orders/${id}/claim`)
    await navigateTo(`/driver/order/${id}`)
  } catch (e: any) {
    error.value = e.message
    await offerAlert.refresh()
  } finally {
    busyId.value = ''
  }
}

const decline = async (id: string) => {
  busyId.value = id
  offerAlert.dismiss(id)
  available.value = available.value.filter((o) => o._id !== id)
  try {
    await post(`/orders/${id}/decline`)
  } catch (e: any) {
    error.value = e.message
    await offerAlert.refresh()
    await load()
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
  on('order:payment', () => load())
  on('order:cancelled', () => load())
})

onBeforeUnmount(() => {
  clearInterval(pingTimer)
})
</script>

<style scoped>
.jobs {
  min-height: 100dvh;
  padding: 16px 20px calc(108px + var(--safe-bottom));
  display: flex;
  flex-direction: column;
  background: var(--paper);
}

.review {
  margin: 0 0 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #fff6e8;
  border: 1px solid rgba(232, 75, 26, 0.25);
  color: var(--ink);
  font-size: 13px;
  line-height: 1.4;
}
.hello {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.hello h1 {
  font-family: var(--font-ui);
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.hello p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 0.82rem;
}

.switch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.switch:disabled {
  opacity: 0.6;
}

.switch__track {
  width: 52px;
  height: 32px;
  border-radius: 999px;
  background: #d5cfc4;
  padding: 2px;
  display: flex;
  align-items: center;
  transition: background 0.18s ease;
}

.switch.on .switch__track {
  background: #1f8a4c;
}

.switch__knob {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  transition: transform 0.18s ease;
}

.switch.on .switch__knob {
  transform: translateX(20px);
}

.switch__label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.switch.on .switch__label {
  color: #1f8a4c;
}

.hero {
  margin-top: 14px;
  padding: 18px;
  border-radius: 22px;
  background: var(--ink);
  color: #fff;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.hero__kicker,
.hero__meta,
.hero__note {
  color: #9a9388;
}

.hero__kicker {
  font-size: 0.78rem;
}

.hero__amount {
  margin-top: 2px;
  font-family: var(--font-ui);
  font-size: 1.85rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.hero__meta {
  margin-top: 6px;
  font-size: 0.78rem;
}

.hero__note {
  font-size: 0.68rem;
}

.hero__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(155, 147, 136, 0.22);
  color: #9a9388;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.hero__pill.on {
  background: rgba(31, 138, 76, 0.22);
  color: #3dbe78;
}

.hero__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.minis {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.mini {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

.mini strong {
  font-family: var(--font-ui);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.mini span {
  font-size: 0.68rem;
  color: var(--muted);
}

.active {
  margin-top: 14px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  padding: 14px;
  border-radius: 16px;
  background: rgba(232, 75, 26, 0.1);
  border: 1px solid rgba(232, 75, 26, 0.35);
  color: var(--ink);
}

.active__ico {
  width: 22px;
  height: 22px;
  color: var(--accent);
  flex-shrink: 0;
}

.active__ico svg {
  width: 22px;
  height: 22px;
}

.active__copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.active__copy strong {
  font-size: 0.82rem;
}

.active__copy span {
  color: var(--muted);
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.active__chev {
  color: var(--accent);
  font-size: 1.4rem;
  line-height: 1;
}

.tabs {
  margin-top: 16px;
  display: flex;
  padding: 4px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 999px;
}

.tabs button {
  flex: 1;
  min-height: 40px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted);
}

.tabs button.on {
  background: var(--ink);
  color: #fff;
}

.jobs-body {
  flex: 1;
  min-height: 220px;
  display: grid;
  place-items: center;
}

.empty-jobs {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: var(--muted);
  gap: 12px;
  padding: 24px;
}

.empty-jobs__ico {
  width: 44px;
  height: 44px;
  color: rgba(107, 100, 89, 0.45);
}

.empty-jobs__ico svg {
  width: 44px;
  height: 44px;
}

.empty-jobs p {
  font-size: 0.95rem;
}

.empty-jobs__hint {
  font-size: 0.78rem;
}

.list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.offer {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
}

.offer.cancelled {
  background: rgba(232, 75, 26, 0.08);
  border-color: rgba(232, 75, 26, 0.35);
}

.offer.delivered {
  background: #f8fffb;
  border-color: rgba(3, 45, 12, 0.18);
}

.offer.delivered .offer__status {
  color: #032d0c;
}

.offer__main {
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.offer__top,
.offer__fuel,
.offer__break div,
.offer__where {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.offer__num {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.offer__new {
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--accent-dim);
  color: var(--accent);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.offer__status {
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 600;
}

.offer__fuel {
  justify-content: flex-start;
}

.offer__fuel span {
  padding: 4px 8px;
  border-radius: 8px;
  background: var(--paper);
  border: 1px solid var(--border);
  font-size: 0.68rem;
  font-weight: 700;
}

.offer__fuel em {
  font-style: normal;
  color: var(--muted);
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.offer__break {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.offer__break div + div {
  border-top: 1px solid var(--border);
  padding-top: 8px;
}

.offer__break span {
  display: flex;
  flex-direction: column;
  color: var(--muted);
  font-size: 0.75rem;
}

.offer__break small {
  font-size: 0.68rem;
}

.offer__break strong {
  font-size: 0.9rem;
}

.offer__break strong.accent {
  color: var(--accent);
}

.offer__total strong {
  font-size: 0.98rem;
}

.offer__who {
  font-size: 0.82rem;
  font-weight: 500;
}

.offer__where {
  justify-content: flex-start;
  align-items: flex-start;
  font-size: 0.82rem;
}

.offer__where svg {
  width: 16px;
  height: 16px;
  color: var(--accent);
  flex-shrink: 0;
  margin-top: 2px;
}

.offer__actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

.offer__actions button {
  flex: 1;
  min-height: 44px;
  border-radius: 12px;
  font-weight: 600;
}

.btn-decline {
  border: 1px solid var(--border);
  color: var(--muted);
  background: transparent;
}

.btn-accept {
  background: var(--accent);
  color: #fff;
}

.offer__actions button:disabled {
  opacity: 0.55;
}

.error-text {
  margin-top: 12px;
}
</style>
