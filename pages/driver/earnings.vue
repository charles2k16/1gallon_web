<template>
  <div class="page">
    <p class="eyebrow">Earnings</p>
    <h1 class="sheet-title" style="margin-bottom: 8px">Trip stats</h1>
    <p class="sheet-sub">
      App figures are operational stats. Paycheck = monthly salary + trip bonuses.
    </p>

    <div class="seg" style="margin-bottom: 16px">
      <button type="button" :class="{ active: tab === 'today' }" @click="tab = 'today'">Today</button>
      <button type="button" :class="{ active: tab === 'week' }" @click="tab = 'week'">This week</button>
    </div>

    <div v-if="loading" class="center-load"><div class="spinner" /></div>
    <template v-else>
      <div class="hero-card">
        <div class="eyebrow" style="color: rgba(245,240,232,0.65)">Recorded</div>
        <div class="hero-n">{{ formatGhs(heroAmount) }}</div>
        <div class="hero-meta">{{ heroTrips }} trips</div>
      </div>

      <h2 style="margin: 22px 0 10px; font-size: 1.05rem">Recent fares</h2>
      <div v-if="!fares.length" class="empty">No trips yet</div>
      <div v-for="f in fares" :key="f._id || f.id" class="list-item">
        <div style="flex: 1">
          <strong>{{ formatGhs(f.deliveryFee ?? f.totalAmount ?? f.amount) }}</strong>
          <div class="muted" style="font-size: 0.82rem">
            {{ fuelLabel(f.fuelType) }} · {{ statusLabel(f.status || 'delivered') }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatGhs, fuelLabel, statusLabel } from '~/utils/format'

definePageMeta({ layout: 'driver' })

const { get } = useApi()
const tab = ref<'today' | 'week'>('today')
const loading = ref(true)
const data = ref<any>(null)
const fares = ref<any[]>([])

const heroAmount = computed(() => {
  if (tab.value === 'today') return data.value?.todayEarned ?? data.value?.earned ?? 0
  return data.value?.weekEarned ?? data.value?.earned ?? 0
})

const heroTrips = computed(() => {
  if (tab.value === 'today') return data.value?.todayTrips ?? data.value?.trips ?? 0
  return data.value?.weekTrips ?? data.value?.trips ?? 0
})

const load = async () => {
  loading.value = true
  try {
    const period = tab.value === 'today' ? 'week' : 'week'
    const [an, fr] = await Promise.all([
      get('/analytics/me', { period }),
      get('/analytics/me/fares', { period }).catch(() => null),
    ])
    data.value = an.data || an
    fares.value = fr?.data?.fares || fr?.data || []
  } finally {
    loading.value = false
  }
}

watch(tab, load)
onMounted(load)
</script>

<style scoped>
.hero-card {
  background: var(--ink);
  color: var(--paper);
  border-radius: 20px;
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
}
</style>
