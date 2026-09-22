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
        <div class="metric">
          <div class="metric-l">{{ isDriver ? 'Trips' : 'Deliveries' }}</div>
          <div class="metric-v">{{ heroTrips }}</div>
        </div>
        <div class="metric">
          <div class="metric-l">{{ isDriver ? 'Rating' : 'Avg fare' }}</div>
          <div class="metric-v">
            {{ isDriver ? Number(summary?.rating || 0).toFixed(1) : formatGhs(periodData.avgFare || 0) }}
          </div>
        </div>
        <div class="metric">
          <div class="metric-l">{{ isDriver ? 'This week' : 'This month' }}</div>
          <div class="metric-v">
            {{
              formatGhs(
                isDriver
                  ? summary?.week?.earned || 0
                  : summary?.month?.spent || 0,
              )
            }}
          </div>
        </div>
        <div class="metric">
          <div class="metric-l">Active</div>
          <div class="metric-v">{{ summary?.active ?? 0 }}</div>
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
  setPageLayout(isDriver.value ? 'driver' : 'customer')
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
  border-radius: 14px;
  padding: 14px;
}
.metric-l {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin-bottom: 6px;
}
.metric-v {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 1.05rem;
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
