<template>
  <div class="map-stage track-page">
    <MapView
      ref="mapRef"
      :center="mapCenter"
      :show-pin="false"
      :markers="markers"
      :route="routePoints"
      :interactive="true"
    />

    <div class="map-float top-bar">
      <button class="locate-btn" type="button" @click="navigateTo('/home')">←</button>
    </div>

    <BottomSheet tall>
      <div v-if="loading && !order" class="center-load"><div class="spinner" /></div>
      <template v-else-if="order">
        <p class="eyebrow">{{ order.stationName || 'Delivery' }}</p>
        <h1 class="sheet-title">{{ statusLabel(order.status) }}</h1>
        <StatusPipeline :status="order.status" />

        <div class="quote-mini">
          <div>
            <div class="muted" style="font-size: 0.75rem">Fuel</div>
            <strong>{{ fuelLabel(order.fuelType) }} · {{ Number(order.litres || 0).toFixed(1) }} L</strong>
          </div>
          <div style="text-align: right">
            <div class="muted" style="font-size: 0.75rem">Total</div>
            <strong>{{ formatGhs(order.totalAmount) }}</strong>
          </div>
        </div>

        <div v-if="driver" class="driver-card">
          <div class="avatar">
            <img v-if="driver.photoUrl || driver.avatarUrl" :src="driver.photoUrl || driver.avatarUrl" alt="" />
            <span v-else>{{ initials(driver.name) }}</span>
          </div>
          <div style="flex: 1">
            <strong>{{ driver.name || 'Driver' }}</strong>
            <div class="muted" style="font-size: 0.85rem">
              {{ driver.vehiclePlate || driver.plateNumber || 'Bike' }}
              <span v-if="driver.rating"> · ★ {{ Number(driver.rating).toFixed(1) }}</span>
            </div>
          </div>
          <a v-if="driver.phone" class="btn btn-ghost btn-sm" :href="`tel:${driver.phone}`">Call</a>
        </div>

        <div v-if="needsPayment" class="pay-block">
          <p class="eyebrow">Payment due</p>
          <p class="sheet-sub" style="margin-bottom: 10px">
            Pay {{ formatGhs(order.totalAmount) }} via {{ paymentLabel(order.paymentMethod) }}
          </p>
          <button class="btn btn-accent btn-block" :disabled="paying" @click="startPay">
            {{ paying ? 'Opening Paystack…' : 'Pay now →' }}
          </button>
          <p v-if="payError" class="error-text" style="margin-top: 8px">{{ payError }}</p>
        </div>

        <div v-if="order.status === 'delivered' && !order.rating" class="rate-block">
          <p class="eyebrow">Rate your delivery</p>
          <StarRating v-model="rating" />
          <button class="btn btn-primary btn-block" style="margin-top: 12px" :disabled="!rating || ratingBusy" @click="submitRating">
            Submit rating
          </button>
        </div>
        <div v-else-if="order.rating" class="chip chip-success" style="margin-top: 12px">
          You rated ★ {{ order.rating }}
        </div>

        <button
          v-if="canCancel"
          class="btn btn-danger btn-block"
          style="margin-top: 16px"
          :disabled="busy"
          @click="cancelOrder"
        >
          Cancel order
        </button>
        <p v-if="actionError" class="error-text" style="margin-top: 8px">{{ actionError }}</p>
      </template>
      <div v-else class="empty">Order not found</div>
    </BottomSheet>
  </div>
</template>

<script setup lang="ts">
import {
  statusLabel,
  fuelLabel,
  formatGhs,
  paymentLabel,
  isPrepaid,
  latLngFromCoords,
  fetchDrivingRoute,
} from '~/utils/format'

definePageMeta({ layout: 'customer' })

const route = useRoute()
const orderId = computed(() => String(route.params.id))
const { get, post } = useApi()
const { connect, on, emit } = useSocket()

const mapRef = ref<any>(null)
const order = ref<any>(null)
const loading = ref(true)
const busy = ref(false)
const paying = ref(false)
const payError = ref('')
const actionError = ref('')
const rating = ref(0)
const ratingBusy = ref(false)
const driverPos = ref<{ lat: number; lng: number } | null>(null)
const routePoints = ref<{ lat: number; lng: number }[]>([])

const driver = computed(() => {
  const d = order.value?.driverId
  if (!d) return null
  if (typeof d === 'object') return d
  return order.value?.driver || null
})

const deliveryPos = computed(() => latLngFromCoords(order.value?.deliveryLocation?.coordinates))

const mapCenter = computed(() => {
  if (driverPos.value) return driverPos.value
  if (deliveryPos.value) return deliveryPos.value
  return { lat: 5.6037, lng: -0.187 }
})

const markers = computed(() => {
  const m: any[] = []
  if (deliveryPos.value) {
    m.push({ id: 'drop', ...deliveryPos.value, color: '#e84b1a', label: 'You' })
  }
  if (driverPos.value) {
    m.push({ id: 'driver', ...driverPos.value, color: '#0d0d0d', label: 'Driver' })
  }
  return m
})

const needsPayment = computed(() => {
  if (!order.value) return false
  if (!isPrepaid(order.value.paymentMethod)) return false
  if (order.value.paymentStatus === 'paid') return false
  const assigned = ['assigned', 'en_route', 'arrived'].includes(order.value.status)
  return assigned
})

const canCancel = computed(() => {
  if (!order.value) return false
  return !['arrived', 'delivered', 'cancelled'].includes(order.value.status)
})

const initials = (name?: string) => {
  if (!name) return 'D'
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const load = async () => {
  loading.value = true
  try {
    const res = await get(`/orders/${orderId.value}`)
    order.value = res.data?.order || res.data
    emit('order:subscribe', { orderId: orderId.value })
    await updateRoute()
  } catch {
    order.value = null
  } finally {
    loading.value = false
  }
}

const updateRoute = async () => {
  if (!driverPos.value || !deliveryPos.value) {
    routePoints.value = []
    return
  }
  const info = await fetchDrivingRoute(driverPos.value, deliveryPos.value)
  routePoints.value = info?.points || [driverPos.value, deliveryPos.value]
}

const startPay = async () => {
  paying.value = true
  payError.value = ''
  try {
    const res = await post('/payments/initialize', { orderId: orderId.value })
    const data = res.data || res
    const url = data.authorizationUrl || data.authorization_url
    if (!url) throw new Error('No payment URL returned')
    // Store reference for return page
    if (import.meta.client && data.reference) {
      sessionStorage.setItem('pay_ref', data.reference)
      sessionStorage.setItem('pay_order', orderId.value)
    }
    window.location.href = url
  } catch (e: any) {
    payError.value = e.message || 'Payment failed to start'
  } finally {
    paying.value = false
  }
}

const cancelOrder = async () => {
  if (!confirm('Cancel this order?')) return
  busy.value = true
  actionError.value = ''
  try {
    await post(`/orders/${orderId.value}/cancel`)
    await load()
  } catch (e: any) {
    actionError.value = e.message
  } finally {
    busy.value = false
  }
}

const submitRating = async () => {
  ratingBusy.value = true
  try {
    await post(`/orders/${orderId.value}/rate`, { rating: rating.value })
    await load()
  } catch (e: any) {
    actionError.value = e.message
  } finally {
    ratingBusy.value = false
  }
}

onMounted(async () => {
  connect()
  await load()
  on('order:updated', (payload: any) => {
    const id = payload?.orderId || payload?._id || payload?.order?._id
    if (!id || String(id) === orderId.value) load()
  })
  on('order:cancelled', () => load())
  on('driver:location', (payload: any) => {
    if (payload?.orderId && String(payload.orderId) !== orderId.value) return
    if (payload?.lat != null && payload?.lng != null) {
      driverPos.value = { lat: Number(payload.lat), lng: Number(payload.lng) }
      updateRoute()
    }
  })
})
</script>

<style scoped>
.track-page {
  /* fill shell */
}
.top-bar {
  top: 16px;
  left: 16px;
}
.locate-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--paper);
  box-shadow: var(--shadow);
  font-size: 1.1rem;
  font-weight: 600;
}
.quote-mini {
  display: flex;
  justify-content: space-between;
  padding: 14px;
  background: var(--paper-2);
  border-radius: 14px;
  margin: 12px 0;
}
.driver-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin: 8px 0 14px;
}
.pay-block,
.rate-block {
  margin-top: 14px;
  padding: 14px;
  border-radius: 14px;
  background: var(--white);
  border: 1px solid var(--border);
}
</style>
