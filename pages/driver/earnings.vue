<template>
  <div class="earn">
    <div v-if="loading" class="earn-load"><div class="spinner" /></div>
    <div v-else-if="error" class="earn-load">
      <p>{{ error }}</p>
      <button class="retry" type="button" @click="load">Retry</button>
    </div>
    <template v-else>
      <h1>Earnings</h1>
      <p class="lede">Trip performance — pay is processed monthly (salary + bonus)</p>
      <p class="note">
        Delivery fees shown here are revenue from your trips, not your paycheck. 1Gallon pays drivers monthly: base salary plus a per-trip bonus for completed deliveries.
      </p>

      <div class="tabs">
        <button type="button" :class="{ on: tab === 'today' }" @click="tab = 'today'">Today</button>
        <button type="button" :class="{ on: tab === 'week' }" @click="tab = 'week'">This week</button>
      </div>

      <section class="hero">
        <div class="hero__top">
          <span>Delivery fees</span>
          <em>{{ tab === 'today' ? 'Today' : 'This week' }}</em>
        </div>
        <p class="hero__amount">{{ formatGhs(active.earned) }}</p>
        <p class="hero__meta">{{ active.delivered }} trips · GMV {{ formatGhsShort(active.gmv) }}</p>
      </section>

      <section class="minis">
        <div class="mini">
          <strong>{{ active.delivered }}</strong>
          <span>Trips</span>
        </div>
        <div class="mini">
          <strong>{{ formatGhsShort(tab === 'today' ? week.earned : today.earned) }}</strong>
          <span>{{ tab === 'today' ? 'Week so far' : 'Today' }}</span>
        </div>
        <div class="mini">
          <strong>{{ activeCount }}</strong>
          <span>Active</span>
        </div>
      </section>

      <h2>{{ tab === 'today' ? 'Last 7 days' : 'Last 8 weeks' }}</h2>
      <section class="chart">
        <div class="chart__head">
          <strong>{{ formatGhsShort(chartTotal) }}</strong>
          <span>{{ tab === 'today' ? '7 days' : '8 weeks' }}</span>
        </div>
        <div v-if="!chart.length" class="chart__empty">No earnings data yet</div>
        <div v-else class="bars">
          <div v-for="(point, i) in chart" :key="point.dayStart || point.weekStart || i" class="bar">
            <span
              class="bar__fill"
              :class="{ last: i === chart.length - 1 }"
              :style="{ height: barHeight(point.earned) }"
            />
            <span class="bar__label">{{ chartLabel(point) }}</span>
          </div>
        </div>
      </section>

      <h2>{{ tab === 'today' ? "Today's trips" : "This week's trips" }}</h2>
      <p v-if="!filteredFares.length" class="trips-empty">
        {{ tab === 'today' ? 'No completed trips today yet' : 'No completed trips this week yet' }}
      </p>
      <article v-for="fare in filteredFares" :key="fare.orderId || fare.orderNumber" class="trip">
        <span class="trip__ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="17" r="2.2"/><circle cx="17" cy="17" r="2.2"/><path d="M6 17h5l2-6h4.5M9 11h4M12 11l-1.5 6"/></svg>
        </span>
        <span class="trip__copy">
          <strong>{{ fare.address || 'Delivery' }}</strong>
          <span>{{ litresLabel(fare.litres) }} {{ String(fare.fuelType || '').toUpperCase() }}<template v-if="fare.date"> · {{ tripWhen(fare.date) }}</template></span>
        </span>
        <strong class="trip__fee">{{ formatGhs(fare.deliveryFee) }}</strong>
      </article>

      <template v-if="tab === 'today' && daily.length">
        <h2>Day by day</h2>
        <article
          v-for="row in [...daily].reverse()"
          :key="row.dayStart"
          class="row"
          :class="{ today: isToday(row.dayStart) }"
        >
          <div>
            <strong>{{ isToday(row.dayStart) ? `Today · ${dayFull(row.dayStart)}` : dayFull(row.dayStart) }}</strong>
            <span>{{ row.delivered }} {{ row.delivered === 1 ? 'trip' : 'trips' }}</span>
          </div>
          <strong>{{ formatGhs(row.earned) }}</strong>
        </article>
      </template>

      <template v-if="tab === 'week' && weekly.length">
        <h2>Week by week</h2>
        <article v-for="row in [...weekly].reverse()" :key="row.weekStart" class="row">
          <div>
            <strong>{{ weekRange(row.weekStart) }}</strong>
            <span>{{ row.delivered }} {{ row.delivered === 1 ? 'trip' : 'trips' }}</span>
          </div>
          <strong>{{ formatGhs(row.earned) }}</strong>
        </article>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatGhs } from '~/utils/format'

definePageMeta({ layout: 'driver' })

const { get } = useApi()
const tab = ref<'today' | 'week'>('today')
const loading = ref(true)
const error = ref('')
const data = ref<any>(null)
const fares = ref<any[]>([])

const today = computed(() => data.value?.today || {})
const week = computed(() => data.value?.week || {})
const active = computed(() => (tab.value === 'today' ? today.value : week.value))
const activeCount = computed(() => Number(data.value?.active || 0))
const daily = computed(() => data.value?.dailyEarnings || [])
const weekly = computed(() => data.value?.weeklyEarnings || [])
const chart = computed(() => (tab.value === 'today' ? daily.value : weekly.value))
const chartTotal = computed(() =>
  chart.value.reduce((sum: number, point: any) => sum + Number(point.earned || 0), 0),
)

const formatGhsShort = (n: number | string | undefined | null) => `GHS ${Math.round(Number(n || 0))}`

const weekStart = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

const filteredFares = computed(() => {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const from = tab.value === 'today' ? todayStart : weekStart()
  return fares.value.filter((fare) => {
    const d = fare.date ? new Date(fare.date) : null
    return d && !Number.isNaN(d.getTime()) && d >= from
  })
})

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const asDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

const chartLabel = (point: any) => {
  const d = asDate(point.dayStart || point.weekStart)
  if (!d) return ''
  return point.dayStart ? days[d.getDay()] : `${d.getDate()} ${months[d.getMonth()]}`
}

const dayFull = (iso: string) => {
  const d = asDate(iso)
  if (!d) return '—'
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
}

const isToday = (iso: string) => {
  const d = asDate(iso)
  if (!d) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

const weekRange = (iso: string) => {
  const start = asDate(iso)
  if (!start) return '—'
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const label = (d: Date) => `${d.getDate()} ${months[d.getMonth()]}`
  return `${label(start)} – ${label(end)}`
}

const tripWhen = (iso: string) => {
  const d = asDate(iso)
  if (!d) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${months[d.getMonth()]} · ${hh}:${mm}`
}

const litresLabel = (v: unknown) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—L'
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}L`
}

const barHeight = (earned: number) => {
  const values = chart.value.map((point: any) => Number(point.earned || 0))
  const max = Math.max(0, ...values)
  if (max <= 0) return '6px'
  const px = Math.min(88, Math.max(6, 10 + (Number(earned || 0) / max) * 78))
  return `${px}px`
}

const load = async () => {
  loading.value = data.value == null
  error.value = ''
  try {
    const [an, fr] = await Promise.all([
      get('/analytics/me'),
      get('/analytics/me/fares', { page: 1, limit: 30 }),
    ])
    data.value = an.data || an
    const rows = fr?.data
    fares.value = Array.isArray(rows) ? rows : rows?.fares || []
  } catch (e: any) {
    error.value = e.message || 'Could not load earnings'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.earn {
  min-height: 100dvh;
  padding: 16px 20px calc(108px + var(--safe-bottom));
  background: var(--paper);
}

.earn-load {
  min-height: 60dvh;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 12px;
  color: var(--ink);
}

.retry {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-weight: 600;
}

h1 {
  font-family: var(--font-ui);
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.lede {
  margin-top: 4px;
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.35;
}

.note {
  margin-top: 8px;
  padding: 12px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

.tabs {
  margin-top: 18px;
  display: flex;
  padding: 4px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.tabs button {
  flex: 1;
  min-height: 42px;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--muted);
}

.tabs button.on {
  background: var(--ink);
  color: #fff;
}

.hero {
  margin-top: 16px;
  padding: 22px 20px;
  border-radius: 22px;
  background: var(--ink);
  color: #fff;
}

.hero__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.82rem;
}

.hero__top em {
  font-style: normal;
  font-weight: 600;
  font-size: 0.75rem;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 4px 10px;
}

.hero__amount {
  margin-top: 10px;
  font-family: var(--font-ui);
  font-size: 2.1rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
}

.hero__meta {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.82rem;
}

.minis {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.mini {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mini strong {
  font-family: var(--font-ui);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.mini span {
  font-size: 0.7rem;
  color: var(--muted);
}

h2 {
  margin: 22px 0 12px;
  font-family: var(--font-ui);
  font-size: 0.95rem;
  font-weight: 600;
}

.chart {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px 16px 12px;
}

.chart__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.chart__head strong {
  font-family: var(--font-ui);
  font-size: 1rem;
}

.chart__head span,
.chart__empty {
  color: var(--muted);
  font-size: 0.75rem;
}

.bars {
  margin-top: 16px;
  height: 110px;
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.bar {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.bar__fill {
  width: 100%;
  border-radius: 8px;
  background: rgba(13, 13, 13, 0.12);
}

.bar__fill.last {
  background: var(--accent);
}

.bar__label {
  font-size: 0.62rem;
  color: var(--muted);
}

.trips-empty {
  padding: 24px;
  text-align: center;
  color: var(--muted);
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.trip {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  padding: 14px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.trip__ico {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--paper);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.trip__ico svg {
  width: 20px;
  height: 20px;
}

.trip__copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.trip__copy strong,
.trip__fee {
  font-size: 0.88rem;
  font-weight: 700;
}

.trip__copy strong {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trip__copy span {
  color: var(--muted);
  font-size: 0.75rem;
}

.trip__fee {
  flex-shrink: 0;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding: 14px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.row div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.row strong {
  font-size: 0.88rem;
  font-weight: 700;
}

.row span {
  color: var(--muted);
  font-size: 0.75rem;
}

.row.today {
  background: rgba(232, 75, 26, 0.08);
  border-color: rgba(232, 75, 26, 0.3);
}
</style>
