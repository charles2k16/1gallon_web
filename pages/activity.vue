<template>
  <div class="page">
    <h1 class="page-h">{{ isDriver ? 'Earnings' : 'Activity' }}</h1>
    <p class="page-sub">
      {{ isDriver ? 'Track trips, fees and performance' : 'Your fuel deliveries and spend' }}
    </p>

    <div class="seg periods">
      <button
        v-for="p in periods"
        :key="p.key"
        type="button"
        :class="{ active: period === p.key }"
        @click="period = p.key"
      >
        {{ p.label }}
      </button>
    </div>

    <div v-if="loading" class="center-load"><div class="spinner" /></div>
    <template v-else>
      <div class="hero-card">
        <div class="eyebrow" style="color: rgba(245,240,232,0.65)">{{ periodLabel }}</div>
        <div class="hero-n">{{ formatGhs(heroAmount) }}</div>
        <div class="hero-meta">
          <span>{{ heroTrips }} {{ isDriver ? 'trips' : 'deliveries' }}</span>
          <span v-if="!isDriver && periodData.litres != null">
            · {{ Number(periodData.litres || 0).toFixed(0) }} L
          </span>
          <span v-else-if="isDriver"> · GMV {{ formatGhs(periodData.gmv || 0) }}</span>
        </div>
      </div>

      <div class="metric-grid">
        <div v-for="tile in metricTiles" :key="tile.label" class="metric">
          <span class="metric-ico" v-html="tile.icon" />
          <div class="metric-v">{{ tile.value }}</div>
          <div class="metric-l">{{ tile.label }}</div>
        </div>
      </div>

      <h2 class="section-h">Overview</h2>
      <div class="overview">
        <div v-for="(row, i) in overviewRows" :key="row.label" class="overview__row" :class="{ last: i === overviewRows.length - 1 }">
          <span>{{ row.label }}</span>
          <strong>{{ row.value }}</strong>
        </div>
      </div>

      <h2 class="section-h">{{ isDriver ? 'Recent trips' : 'Recent deliveries' }}</h2>
      <div v-if="!fares.length" class="empty-card">No completed {{ isDriver ? 'trips' : 'deliveries' }} yet</div>
      <div v-for="f in fares" :key="f._id || f.id || f.orderId" class="fare-card">
        <div class="fare-left">
          <strong>{{ f.stationName || f.address || fuelLabel(f.fuelType) || 'Delivery' }}</strong>
          <div class="muted tiny">
            {{ statusLabel(f.status || 'delivered') }}
            <span v-if="f.createdAt || f.deliveredAt">
              · {{ formatDate(f.createdAt || f.deliveredAt) }}
            </span>
          </div>
        </div>
        <strong class="fare-amt">{{ formatGhs(f.totalAmount ?? f.amount ?? f.fare ?? f.deliveryFee) }}</strong>
      </div>

      <template v-if="!isDriver && locations.length">
        <h2 class="section-h">Frequent locations</h2>
        <div v-for="(loc, i) in locations" :key="i" class="loc-card">
          <span class="loc-ico">📍</span>
          <div>
            <strong>{{ loc.address || '—' }}</strong>
            <div class="muted tiny">{{ loc.count || loc.orders || 1 }} orders</div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatGhs, fuelLabel, statusLabel } from '~/utils/format'

const auth = useAuth()
const isDriver = computed(() => auth.user.value?.role === 'driver')
const { get } = useApi()

definePageMeta({ layout: false })

setPageLayout(computed(() => (isDriver.value ? 'driver' : 'customer')))

const periods = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all' as const, label: 'All' },
]
type PeriodKey = 'week' | 'month' | 'all'
const period = ref<PeriodKey>('week')
const loading = ref(true)
const summary = ref<any>(null)
const fares = ref<any[]>([])
const locations = ref<any[]>([])

const periodLabel = computed(() => {
  if (period.value === 'week') return 'This week'
  if (period.value === 'month') return 'This month'
  return 'All time'
})

const periodData = computed(() => {
  const s = summary.value || {}
  if (period.value === 'week') return s.week || {}
  if (period.value === 'month') return s.month || {}
  return s.allTime || {}
})

const heroAmount = computed(() => {
  const d = periodData.value
  return isDriver.value ? d.earned || 0 : d.spent || 0
})

const heroTrips = computed(() => {
  const d = periodData.value
  return isDriver.value ? d.delivered || d.trips || 0 : d.deliveries || 0
})

const icons = {
  truck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v8H3z"/><path d="M14 10h4l3 3v2h-7"/><circle cx="7" cy="17.5" r="1.5"/><circle cx="17" cy="17.5" r="1.5"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3.5 2.2 4.6 5 .7-3.6 3.5.9 5.1L12 15l-4.5 2.4.9-5.1L4.8 8.8l5-.7L12 3.5Z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="m8.5 12.2 2.3 2.3 4.7-5"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3 6 13h5l-1 8 8-11h-5l0-7Z"/></svg>`,
  pump: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="9" height="14" rx="1.5"/><path d="M8 7h3M14 6h2.2a1.8 1.8 0 0 1 1.8 1.8V14a1.5 1.5 0 0 0 3 0V9"/><path d="M5 20h9"/></svg>`,
  pay: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg>`,
  cal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>`,
}

const amountShort = (n: number | string | undefined | null) => `GHS ${Math.round(Number(n || 0))}`

const litresLabel = (n: unknown) => {
  const v = Number(n || 0)
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)} L`
}

const metricTiles = computed(() => {
  if (isDriver.value) {
    const rating = Number(summary.value?.rating || 0)
    const completion = Number(summary.value?.completionRate || 0)
    return [
      { icon: icons.truck, label: 'Trips', value: String(heroTrips.value) },
      { icon: icons.star, label: 'Rating', value: rating > 0 ? rating.toFixed(1) : 'New' },
      { icon: icons.check, label: 'Completion', value: `${Math.round(completion * 100)}%` },
      { icon: icons.bolt, label: 'Active jobs', value: String(summary.value?.active ?? 0) },
    ]
  }
  return [
    { icon: icons.pump, label: 'Deliveries', value: String(heroTrips.value) },
    { icon: icons.pay, label: 'Avg fare', value: amountShort(periodData.value.avgFare || 0) },
    { icon: icons.cal, label: 'This month', value: amountShort(summary.value?.month?.spent || 0) },
    { icon: icons.bolt, label: 'Active', value: String(summary.value?.active ?? 0) },
  ]
})

const overviewRows = computed(() => {
  const all = summary.value?.allTime || {}
  if (isDriver.value) {
    return [
      { label: 'This week earned', value: formatGhs(summary.value?.week?.earned || 0) },
      { label: 'All-time trips', value: String(all.delivered || 0) },
      { label: 'All-time earned', value: formatGhs(all.earned || 0) },
      { label: 'Litres delivered', value: litresLabel(all.litres) },
      { label: 'Cancelled', value: String(all.cancelled || 0) },
    ]
  }
  return [
    { label: 'All-time deliveries', value: String(all.deliveries || 0) },
    { label: 'All-time spend', value: formatGhs(all.spent || 0) },
    { label: 'Cancelled this week', value: String(summary.value?.week?.cancelled || 0) },
  ]
})

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

const load = async () => {
  loading.value = true
  try {
    const [an, fr, loc] = await Promise.all([
      get('/analytics/me'),
      get('/analytics/me/fares', { page: 1, limit: 20 }).catch(() => null),
      isDriver.value
        ? Promise.resolve(null)
        : get('/analytics/me/locations', { page: 1, limit: 10 }).catch(() => null),
    ])
    summary.value = an.data || an
    const farePayload = fr?.data
    fares.value = Array.isArray(farePayload)
      ? farePayload
      : farePayload?.fares || farePayload?.items || []
    const locPayload = loc?.data
    locations.value = Array.isArray(locPayload)
      ? locPayload
      : locPayload?.locations || []
  } catch {
    summary.value = null
    fares.value = []
    locations.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
})
</script>

<style scoped>
.page-h {
  font-size: 1.65rem;
  font-weight: 700;
}
.page-sub {
  color: var(--muted);
  font-size: 0.9rem;
  margin: 4px 0 16px;
}
.periods {
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 16px;
}
.hero-card {
  background: var(--ink);
  color: var(--paper);
  border-radius: 22px;
  padding: 22px 20px;
}
.hero-n {
  font-family: var(--font-ui);
  font-size: 2rem;
  font-weight: 700;
  margin: 6px 0 8px;
}
.hero-meta {
  opacity: 0.75;
  font-size: 0.9rem;
}
.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 14px 0 8px;
}
.metric {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.metric-ico {
  width: 18px;
  height: 18px;
  color: var(--accent);
  margin-bottom: 10px;
}
.metric-ico :deep(svg) {
  width: 18px;
  height: 18px;
  display: block;
}
.metric-l {
  font-size: 0.75rem;
  color: var(--muted);
}
.metric-v {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 1.25rem;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.overview {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 6px 16px;
}
.overview__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.overview__row.last {
  border-bottom: 0;
}
.overview__row span {
  color: var(--muted);
  font-size: 0.82rem;
}
.overview__row strong {
  font-size: 0.88rem;
  font-weight: 600;
}
.section-h {
  font-size: 1rem;
  font-weight: 600;
  margin: 22px 0 12px;
}
.empty-card,
.fare-card,
.loc-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
}
.empty-card {
  text-align: center;
  color: var(--muted);
}
.fare-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.fare-left strong {
  display: block;
  font-size: 0.92rem;
}
.tiny {
  font-size: 0.78rem;
  margin-top: 3px;
}
.fare-amt {
  white-space: nowrap;
}
.loc-card {
  display: flex;
  gap: 12px;
  align-items: center;
}
.loc-ico {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--accent-dim);
  display: grid;
  place-items: center;
}
</style>
