<template>
  <div class="map-stage">
    <MapView
      ref="mapRef"
      :center="pin"
      :show-pin="step === 'location'"
      :markers="markers"
      :interactive="true"
      @ready="onReady"
    />

    <div class="map-float top-bar">
      <button class="locate-btn" type="button" @click="goBack">←</button>
      <button v-if="step === 'location'" class="locate-btn" type="button" @click="recenter">◎</button>
    </div>

    <BottomSheet :tall="step !== 'location' || searchFocused">
      <!-- LOCATION -->
      <template v-if="step === 'location'">
        <p class="eyebrow">Step 1 of 3</p>
        <h1 class="sheet-title">Where to deliver?</h1>
        <p class="sheet-sub">Search for an address or use your current location</p>

        <div class="search-wrap">
          <div class="search-field">
            <span class="search-ico" aria-hidden="true">📍</span>
            <input
              ref="searchInput"
              v-model="searchQ"
              class="input search-input"
              type="search"
              autocomplete="off"
              placeholder="Enter pickup / delivery address"
              @input="onSearch"
              @focus="searchFocused = true"
            />
            <button
              v-if="searchQ"
              type="button"
              class="search-clear"
              aria-label="Clear"
              @click="clearSearch"
            >
              ×
            </button>
          </div>

          <div v-if="searchFocused && searchQ.trim().length >= 2" class="suggest-panel">
            <div v-if="searchLoading" class="suggest-status">
              <div class="spinner" style="width: 18px; height: 18px; border-width: 2px" />
              Searching…
            </div>
            <div v-else-if="!suggestions.length" class="suggest-status muted">
              No places found — try another spelling
            </div>
            <button
              v-for="s in suggestions"
              :key="s.id"
              type="button"
              class="suggest-item"
              @click="pickPlace(s)"
            >
              <span class="suggest-pin">📍</span>
              <span class="suggest-text">
                <strong>{{ s.name }}</strong>
                <small>{{ s.fullName }}</small>
              </span>
            </button>
          </div>
        </div>

        <div v-if="address && !suggestions.length" class="picked-addr">
          <span class="eyebrow">Selected</span>
          <p>{{ address }}</p>
        </div>

        <button class="btn btn-primary btn-block" style="margin-top: 16px" :disabled="geocoding" @click="confirmLocation">
          Confirm location →
        </button>
      </template>

      <!-- STATIONS -->
      <template v-else-if="step === 'stations'">
        <p class="eyebrow">Step 2 of 3</p>
        <h1 class="sheet-title">Pick a station</h1>
        <p class="sheet-sub">Nearby partners with live prices</p>

        <div v-if="stationsLoading" class="center-load"><div class="spinner" /></div>
        <div v-else-if="!stations.length" class="empty">No stations within range. Try another pin.</div>
        <button
          v-for="st in stations"
          :key="st._id || st.id"
          type="button"
          class="station-card"
          :class="{ selected: selectedStationId === (st._id || st.id) }"
          @click="selectStation(st)"
        >
          <div class="station-top">
            <strong>{{ st.name || st.stationName }}</strong>
            <span v-if="st.distanceKm != null" class="chip">{{ Number(st.distanceKm).toFixed(1) }} km</span>
          </div>
          <div class="price-row">
            <span v-for="ft in fuelTypes" :key="ft">
              {{ fuelLabel(ft) }}
              <b>{{ priceFor(st, ft) }}</b>
            </span>
          </div>
        </button>

        <button
          class="btn btn-primary btn-block"
          style="margin-top: 12px"
          :disabled="!selectedStationId"
          @click="step = 'checkout'"
        >
          Continue →
        </button>
      </template>

      <!-- CHECKOUT -->
      <template v-else>
        <p class="eyebrow">Step 3 of 3</p>
        <h1 class="sheet-title">Checkout</h1>
        <p class="sheet-sub">{{ selectedStation?.name || selectedStation?.stationName }}</p>

        <div class="seg fuel-seg" style="margin-bottom: 14px">
          <button
            v-for="ft in fuelTypes"
            :key="ft"
            type="button"
            :class="{ active: fuelType === ft }"
            @click="fuelType = ft; refreshQuote()"
          >
            {{ fuelLabel(ft) }}
          </button>
        </div>

        <div class="seg" style="margin-bottom: 14px">
          <button type="button" :class="{ active: inputMode === 'litres' }" @click="inputMode = 'litres'; refreshQuote()">
            By litres
          </button>
          <button type="button" :class="{ active: inputMode === 'amount' }" @click="inputMode = 'amount'; refreshQuote()">
            By amount
          </button>
        </div>

        <div class="field" style="margin-bottom: 14px">
          <label>{{ inputMode === 'litres' ? 'Litres' : 'Amount (GHS)' }}</label>
          <input
            v-model.number="qty"
            class="input input-lg"
            type="number"
            min="5"
            step="0.1"
            @change="refreshQuote"
          />
        </div>

        <div class="field" style="margin-bottom: 14px">
          <label>Payment</label>
          <div class="pay-opts">
            <button
              v-for="pm in paymentMethods"
              :key="pm"
              type="button"
              class="pay-opt"
              :class="{ active: paymentMethod === pm }"
              @click="paymentMethod = pm"
            >
              {{ paymentLabel(pm) }}
            </button>
          </div>
          <p class="muted" style="font-size: 0.8rem; margin-top: 8px">
            {{
              isPrepaid(paymentMethod)
                ? 'Pay after your driver accepts — you\'ll see them before you pay.'
                : 'Pay the driver when your fuel is delivered.'
            }}
          </p>
        </div>

        <div class="field" style="margin-bottom: 14px">
          <label>Notes (optional)</label>
          <input v-model="notes" class="input" maxlength="200" placeholder="Gate code, landmark…" />
        </div>

        <div v-if="quote" class="quote-box">
          <div class="quote-line"><span>Fuel</span><strong>{{ formatGhs(quote.fuelAmount) }}</strong></div>
          <div class="quote-line"><span>Delivery</span><strong>{{ formatGhs(quote.deliveryFee) }}</strong></div>
          <div class="quote-line total"><span>Total</span><strong>{{ formatGhs(quote.totalAmount) }}</strong></div>
          <p v-if="quote.litres" class="muted" style="font-size: 0.8rem; margin-top: 6px">
            {{ Number(quote.litres).toFixed(1) }} L · {{ formatGhs(quote.pricePerLitre) }}/L
            <span v-if="quote.deliveryDistanceKm"> · {{ Number(quote.deliveryDistanceKm).toFixed(1) }} km</span>
          </p>
        </div>
        <p v-if="quoteError" class="error-text">{{ quoteError }}</p>
        <p v-if="submitError" class="error-text">{{ submitError }}</p>

        <button
          class="btn btn-accent btn-block"
          style="margin-top: 16px"
          :disabled="submitting || !quote"
          @click="placeOrder"
        >
          {{ submitting ? 'Placing order…' : 'Place order →' }}
        </button>
      </template>
    </BottomSheet>
  </div>
</template>

<script setup lang="ts">
import {
  FUEL_TYPES,
  PAYMENT_METHODS,
  fuelLabel,
  paymentLabel,
  isPrepaid,
  formatGhs,
} from '~/utils/format'
import { searchPlaces, reverseGeocode, type PlaceSuggestion } from '~/utils/places'

definePageMeta({ layout: 'customer' })

const config = useRuntimeConfig()
const { get, post } = useApi()
const { position, locate } = useGeolocation()
const { fetchQuote, quote, error: quoteError } = useQuote()

const mapRef = ref<any>(null)
const step = ref<'location' | 'stations' | 'checkout'>('location')
const pin = ref({ ...position.value })
const address = ref('')
const geocoding = ref(false)
const searchQ = ref('')
const suggestions = ref<PlaceSuggestion[]>([])
const searchLoading = ref(false)
const searchFocused = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
let searchTimer: any
let searchSeq = 0

const stations = ref<any[]>([])
const stationsLoading = ref(false)
const selectedStationId = ref('')
const selectedStation = computed(() =>
  stations.value.find((s) => (s._id || s.id) === selectedStationId.value),
)

const fuelTypes = FUEL_TYPES
const paymentMethods = PAYMENT_METHODS
const fuelType = ref('petrol')
const inputMode = ref<'litres' | 'amount'>('litres')
const qty = ref(10)
const paymentMethod = ref('cash_on_delivery')
const notes = ref('')
const submitting = ref(false)
const submitError = ref('')

const markers = computed(() => {
  const m = [{ id: 'pin', ...pin.value, color: '#e84b1a', label: 'Delivery' }]
  if (selectedStation.value) {
    const c = selectedStation.value.location?.coordinates
    if (Array.isArray(c) && c.length >= 2) {
      m.push({
        id: 'station',
        lat: c[1],
        lng: c[0],
        color: '#0d0d0d',
        label: selectedStation.value.name,
      })
    }
  }
  return step.value === 'location' ? [] : m
})

const priceFor = (st: any, ft: string) => {
  const inv = st.inventory || st.fuels || []
  const item = Array.isArray(inv)
    ? inv.find((i: any) => i.fuelType === ft || i.type === ft)
    : null
  const p = item?.pricePerLitre ?? st.prices?.[ft]
  return p != null ? formatGhs(p) : '—'
}

const onReady = async () => {
  const p = await locate()
  pin.value = p
  mapRef.value?.flyTo?.(p.lat, p.lng, 15)
  address.value = await reverseGeocode(p.lat, p.lng, {
    apiBase: config.public.apiBase,
    token: config.public.mapboxToken,
  })
}

const recenter = async () => {
  const p = await locate()
  pin.value = p
  mapRef.value?.flyTo?.(p.lat, p.lng, 15)
  address.value = await reverseGeocode(p.lat, p.lng, {
    apiBase: config.public.apiBase,
    token: config.public.mapboxToken,
  })
}

const onSearch = () => {
  clearTimeout(searchTimer)
  const q = searchQ.value.trim()
  if (q.length < 2) {
    suggestions.value = []
    searchLoading.value = false
    return
  }
  searchLoading.value = true
  const seq = ++searchSeq
  searchTimer = setTimeout(async () => {
    try {
      const results = await searchPlaces(q, {
        apiBase: config.public.apiBase,
        token: config.public.mapboxToken,
        proximity: pin.value,
      })
      if (seq !== searchSeq) return
      suggestions.value = results
    } catch {
      if (seq === searchSeq) suggestions.value = []
    } finally {
      if (seq === searchSeq) searchLoading.value = false
    }
  }, 220)
}

const clearSearch = () => {
  searchQ.value = ''
  suggestions.value = []
  searchLoading.value = false
  searchInput.value?.focus()
}

const pickPlace = (s: PlaceSuggestion) => {
  pin.value = { lat: s.lat, lng: s.lng }
  address.value = s.fullName
  searchQ.value = s.fullName
  suggestions.value = []
  searchFocused.value = false
  mapRef.value?.flyTo?.(s.lat, s.lng, 16)
}

const confirmLocation = async () => {
  geocoding.value = true
  try {
    if (!address.value) {
      address.value = await reverseGeocode(pin.value.lat, pin.value.lng, {
        apiBase: config.public.apiBase,
        token: config.public.mapboxToken,
      })
    }
    step.value = 'stations'
    await loadStations()
  } finally {
    geocoding.value = false
  }
}

const loadStations = async () => {
  stationsLoading.value = true
  try {
    const res = await get('/stations/nearby', {
      lat: pin.value.lat,
      lng: pin.value.lng,
      radiusKm: 10,
      limit: 20,
    })
    stations.value = res.data?.stations || res.data || []
  } catch {
    stations.value = []
  } finally {
    stationsLoading.value = false
  }
}

const selectStation = (st: any) => {
  selectedStationId.value = st._id || st.id
}

const refreshQuote = async () => {
  if (!selectedStationId.value || step.value !== 'checkout') return
  try {
    await fetchQuote({
      stationId: selectedStationId.value,
      fuelType: fuelType.value,
      litres: inputMode.value === 'litres' ? qty.value : undefined,
      amount: inputMode.value === 'amount' ? qty.value : undefined,
      deliveryLat: pin.value.lat,
      deliveryLng: pin.value.lng,
    })
  } catch {
    /* shown via quoteError */
  }
}

watch(step, (s) => {
  if (s === 'checkout') refreshQuote()
})

watch([fuelType, qty, inputMode, selectedStationId], () => refreshQuote())

const placeOrder = async () => {
  submitError.value = ''
  submitting.value = true
  try {
    const body: any = {
      stationId: selectedStationId.value,
      fuelType: fuelType.value,
      inputMode: inputMode.value,
      deliveryLocation: {
        type: 'Point',
        coordinates: [pin.value.lng, pin.value.lat],
        address: address.value,
      },
      paymentMethod: paymentMethod.value,
      notes: notes.value || undefined,
    }
    if (inputMode.value === 'litres') body.litres = qty.value
    else body.amount = qty.value

    const res = await post('/orders', body)
    const order = res.data?.order || res.data
    await navigateTo(`/tracking/${order._id || order.id}`)
  } catch (e: any) {
    submitError.value = e.message || 'Could not place order'
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  if (step.value === 'checkout') step.value = 'stations'
  else if (step.value === 'stations') step.value = 'location'
  else navigateTo('/home')
}
</script>

<style scoped>
.top-bar {
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
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
.search-wrap {
  position: relative;
  margin-bottom: 4px;
}
.search-field {
  position: relative;
  display: flex;
  align-items: center;
}
.search-ico {
  position: absolute;
  left: 14px;
  z-index: 1;
  font-size: 0.95rem;
  pointer-events: none;
}
.search-input {
  padding-left: 40px;
  padding-right: 40px;
  background: var(--white);
  font-weight: 500;
}
.search-clear {
  position: absolute;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--paper-2);
  color: var(--muted);
  font-size: 1.1rem;
  line-height: 1;
}
.suggest-panel {
  margin-top: 8px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  max-height: 240px;
  overflow-y: auto;
  box-shadow: var(--shadow);
}
.suggest-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  font-size: 0.9rem;
}
.suggest-item {
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: transparent;
}
.suggest-item:last-child {
  border-bottom: none;
}
.suggest-item:active,
.suggest-item:hover {
  background: var(--paper-2);
}
.suggest-pin {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--accent-dim);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.suggest-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.suggest-text strong {
  font-family: var(--font-ui);
  font-size: 0.95rem;
}
.suggest-text small {
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.35;
}
.picked-addr {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--paper-2);
}
.picked-addr p {
  margin-top: 4px;
  font-size: 0.92rem;
  font-weight: 500;
}
.station-card {
  width: 100%;
  text-align: left;
  padding: 14px;
  border-radius: 14px;
  border: 1.5px solid var(--border);
  background: var(--white);
  margin-bottom: 10px;
}
.station-card.selected {
  border-color: var(--ink);
  box-shadow: inset 0 0 0 1px var(--ink);
}
.station-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.price-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 0.8rem;
  color: var(--muted);
}
.price-row b {
  color: var(--ink);
  margin-left: 4px;
}
.pay-opts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pay-opt {
  text-align: left;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--white);
  font-weight: 500;
}
.pay-opt.active {
  border-color: var(--ink);
  background: var(--paper-2);
}
.quote-box {
  background: var(--ink);
  color: var(--paper);
  border-radius: 16px;
  padding: 16px;
}
.quote-line {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.92rem;
}
.quote-line.total {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid rgba(245, 240, 232, 0.2);
  font-size: 1.1rem;
}
.seg.fuel-seg {
  grid-template-columns: repeat(3, 1fr);
}
</style>
