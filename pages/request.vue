<template>
  <div class="map-stage">
    <MapView
      ref="mapRef"
      :center="pin"
      :show-pin="step === 'location'"
      :markers="markers"
      :route="step === 'location' ? [] : routePoints"
      :interactive="true"
      @ready="onReady"
    />

    <div class="map-float top-bar">
      <button class="locate-btn" type="button" @click="goBack">←</button>
      <button v-if="step === 'location'" class="locate-btn" type="button" @click="recenter">◎</button>
    </div>

    <div v-if="step !== 'location' && selectedStation" class="eta-float">
      <div class="eta-pills">
        <span>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Zm0-8.2a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6Z"/></svg>
          {{ overlayDistance }}
        </span>
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 1.5"/></svg>
          {{ overlayDuration }}
        </span>
      </div>
      <p>{{ placeShort }}</p>
    </div>

    <BottomSheet
      class="request-sheet"
      :class="{ 'is-stations': step === 'stations' }"
      :tall="step === 'checkout' || (step === 'location' && searchFocused)"
    >
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

          <div v-if="showRecent" class="suggest-panel">
            <p class="suggest-head">Recent</p>
            <div v-for="s in recent" :key="s.id + s.lat" class="suggest-item">
              <button type="button" class="suggest-main" @click="pickPlace(s)">
                <span class="suggest-pin recent-pin" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.2-5.5"/><path d="M4 4v5h5"/><path d="M12 8v4l2.5 1.5"/></svg>
                </span>
                <span class="suggest-text">
                  <strong>{{ s.name }}</strong>
                  <small v-if="secondary(s)">{{ secondary(s) }}</small>
                </span>
              </button>
              <button type="button" class="suggest-remove" aria-label="Remove" @click="dropRecent(s)">×</button>
            </div>
          </div>

          <div v-else-if="searchFocused && searchQ.trim().length >= 2" class="suggest-panel">
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
            <span class="station-logo">
              <img
                v-if="logoOf(st) && !brokenLogos[st._id || st.id]"
                :src="logoOf(st)!"
                alt=""
                @error="brokenLogos[st._id || st.id] = true"
              />
              <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 3h7v18H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 4h2.2A2.8 2.8 0 0 1 19 9.8V16a2 2 0 1 0 4 0v-4.2L20.2 9H14V7Z"/></svg>
            </span>
            <div class="station-copy">
              <strong>{{ st.name || st.stationName }}</strong>
              <div class="price-row">
                <span v-for="ft in fuelTypes" :key="ft">
                  {{ fuelLabel(ft) }}
                  <b>{{ priceFor(st, ft) }}</b>
                </span>
              </div>
            </div>
            <span class="station-meta">
              <span class="chip">{{ cardDistance(st) }}</span>
              <span class="chip chip-time">{{ cardDuration(st) }}</span>
            </span>
          </div>
        </button>

        <button
          class="btn btn-accent btn-block"
          style="margin-top: 12px"
          :disabled="!selectedStationId"
          @click="step = 'checkout'"
        >
          Continue →
        </button>
      </template>

      <!-- CHECKOUT -->
      <template v-else>
        <h1 class="checkout-title">Checkout</h1>

        <div class="checkout-place">
          <span class="checkout-pin" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Zm0-8.2a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6Z"/></svg>
          </span>
          <span>
            <strong>{{ address || 'Delivery location' }}</strong>
            <small>{{ selectedStation?.name || selectedStation?.stationName }}</small>
          </span>
        </div>

        <h2 class="section-gap">Select your fuel type!</h2>
        <div class="fuel-cards">
          <button
            v-for="ft in checkoutFuels"
            :key="ft"
            type="button"
            class="fuel-card"
            :class="{ on: fuelType === ft }"
            @click="fuelType = ft; refreshQuote()"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 3h7v18H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 4h2.2A2.8 2.8 0 0 1 19 9.8V16a2 2 0 1 0 4 0v-4.2L20.2 9H14V7Z"/></svg>
            <strong>{{ fuelCardLabel(ft) }}</strong>
            <span>{{ priceFor(selectedStation, ft) }}/L</span>
          </button>
        </div>

        <h2 class="section-gap">How much?</h2>
        <div class="qty-toggle">
          <button type="button" :class="{ on: inputMode === 'litres' }" @click="inputMode = 'litres'; refreshQuote()">
            By litres
          </button>
          <button type="button" :class="{ on: inputMode === 'amount' }" @click="inputMode = 'amount'; refreshQuote()">
            By amount (GHS)
          </button>
        </div>
        <label class="qty-label">{{ inputMode === 'litres' ? 'Litres' : 'Budget (GHS)' }}</label>
        <input
          v-model.number="qty"
          class="qty-input"
          type="number"
          min="5"
          step="0.1"
          @change="refreshQuote"
        />

        <div v-if="quote" class="checkout-line" style="margin-top: 12px">
          <span class="checkout-pin" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h7v18H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 4h2.2A2.8 2.8 0 0 1 19 9.8V16a2 2 0 1 0 4 0v-4.2L20.2 9H14V7Z"/></svg>
          </span>
          <span>
            <strong>{{ fuelDescription(fuelType) }} · {{ Number(quote.litres).toFixed(0) }} L</strong>
            <small>{{ formatGhs(quote.pricePerLitre) }}/L</small>
          </span>
          <em>{{ Number(quote.litres).toFixed(0) }} L</em>
        </div>

        <p class="arrival">
          Arrival in
          <span>{{ overlayDuration }}</span>
        </p>

        <h2>Payment method</h2>
        <div class="pay-row">
          <button
            v-for="pm in paymentMethods"
            :key="pm"
            type="button"
            class="pay-tile"
            :class="{ on: paymentMethod === pm }"
            @click="paymentMethod = pm"
          >
            <svg v-if="pm === 'cash_on_delivery'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></svg>
            <svg v-else-if="pm === 'card'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="3" width="8" height="18" rx="2"/><path d="M11 18h2"/></svg>
            {{ paymentLabel(pm) }}
          </button>
        </div>

        <p class="pay-hint">
          {{
            isPrepaid(paymentMethod)
              ? 'Pay after your driver accepts — you\'ll see them before you pay.'
              : 'Pay the driver when your fuel is delivered.'
          }}
        </p>

        <label class="qty-label" for="order-notes">Notes</label>
        <textarea
          id="order-notes"
          v-model="notes"
          class="qty-input notes"
          maxlength="200"
          rows="2"
          placeholder="Gate code, landmark, or anything the rider should know"
        />

        <div v-if="quote" class="summary">
          <div><span>Fuel</span><strong>{{ formatGhs(quote.fuelAmount) }}</strong></div>
          <div><span>Delivery</span><strong>{{ formatGhs(quote.deliveryFee) }}</strong></div>
          <div class="total"><span>Total</span><strong>{{ formatGhs(quote.totalAmount) }}</strong></div>
          <p>
            {{ Number(quote.litres).toFixed(1) }} L · {{ formatGhs(quote.pricePerLitre) }}/L
            <template v-if="quote.deliveryDistanceKm"> · {{ Number(quote.deliveryDistanceKm).toFixed(1) }} km</template>
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
          {{ submitting ? 'Requesting fuel…' : 'Request fuel' }}
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
  fetchDrivingRoute,
} from '~/utils/format'
import { searchPlaces, reverseGeocode, type PlaceSuggestion } from '~/utils/places'
import { resolveMediaUrl } from '~/utils/media'
import {
  loadRecentLocations,
  saveRecentLocation,
  removeRecentLocation,
  placeFromAddress,
} from '~/utils/recentLocations'

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
const recent = ref<PlaceSuggestion[]>(loadRecentLocations())
const showRecent = computed(
  () => step.value === 'location' && !searchQ.value.trim() && !suggestions.value.length && recent.value.length > 0,
)
const secondary = (s: PlaceSuggestion) => {
  const full = s.fullName.trim()
  if (!full || full === s.name) return ''
  return full.startsWith(`${s.name},`) ? full.slice(s.name.length + 1).trim() : full
}
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
const brokenLogos = reactive<Record<string, boolean>>({})
const routePoints = ref<{ lat: number; lng: number }[]>([])
const routeMeta = ref<{ distanceMeters: number; durationSeconds: number } | null>(null)
let routeSeq = 0

const fuelTypes = FUEL_TYPES
const fuelOrder = ['diesel', 'petrol', 'super']
const checkoutFuels = computed(() => {
  const available = new Set(
    (selectedStation.value?.fuels || selectedStation.value?.inventory || [])
      .filter((i: any) => i.isAvailable !== false)
      .map((i: any) => i.fuelType || i.type),
  )
  const list = fuelOrder.filter((ft) => !available.size || available.has(ft))
  return list.length ? list : [...fuelOrder]
})
const fuelCardLabel = (ft: string) => ({ diesel: 'DIESEL', petrol: 'REGULAR', super: 'SUPER' }[ft] || ft.toUpperCase())
const fuelDescription = (ft: string) =>
  ({
    petrol: 'Regular Petrol (PMS)',
    super: 'Super Petrol',
    diesel: 'Automotive Gas Oil (Diesel)',
  }[ft] || fuelLabel(ft))
const paymentMethods = PAYMENT_METHODS
const fuelType = ref('petrol')
const inputMode = ref<'litres' | 'amount'>('litres')
const qty = ref(10)
const paymentMethod = ref('cash_on_delivery')
const notes = ref('')
const submitting = ref(false)
const submitError = ref('')

const stationPoint = (st: any) => {
  const c = st?.location?.coordinates
  if (!Array.isArray(c) || c.length < 2) return null
  const lng = Number(c[0])
  const lat = Number(c[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

const markers = computed(() => {
  if (step.value === 'location') return []
  const m: any[] = [{ id: 'pin', ...pin.value, color: '#e84b1a', label: placeShort.value, kind: 'drop' }]
  for (const st of stations.value) {
    const point = stationPoint(st)
    if (!point) continue
    const selected = (st._id || st.id) === selectedStationId.value
    m.push({
      id: `st-${st._id || st.id}`,
      ...point,
      color: selected ? '#e84b1a' : '#0d0d0d',
      label: st.name || st.stationName,
    })
  }
  return m
})

const placeShort = computed(() => {
  const name = address.value.trim()
  return name ? name.split(',')[0] : 'Delivery'
})

const distanceLabel = (meters: number) => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}

const durationLabel = (seconds: number) => {
  const mins = Math.min(999, Math.max(1, Math.ceil(seconds / 60)))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

const overlayDistance = computed(() => {
  if (routeMeta.value) return distanceLabel(routeMeta.value.distanceMeters)
  const km = selectedStation.value?.distanceKm
  return km == null ? '— km' : `${Number(km).toFixed(1)} km`
})

const overlayDuration = computed(() => {
  if (routeMeta.value) return durationLabel(routeMeta.value.durationSeconds)
  const mins = selectedStation.value?.etaMinutes
  return mins == null ? '— min' : `${mins} min`
})

const isSelected = (st: any) => (st._id || st.id) === selectedStationId.value

const cardDistance = (st: any) => {
  if (isSelected(st) && routeMeta.value) return distanceLabel(routeMeta.value.distanceMeters)
  return st.distanceKm == null ? '— km' : `${Number(st.distanceKm).toFixed(1)} km`
}

const cardDuration = (st: any) => {
  if (isSelected(st) && routeMeta.value) return durationLabel(routeMeta.value.durationSeconds)
  return st.etaMinutes == null ? '— min' : `${st.etaMinutes} min`
}

const logoOf = (st: any) => resolveMediaUrl(st.imageUrl || st.logoUrl)

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

const loadRoute = async (st: any) => {
  const from = stationPoint(st)
  if (!from) {
    routePoints.value = []
    routeMeta.value = null
    return
  }
  const seq = ++routeSeq
  const road = await fetchDrivingRoute(from, pin.value)
  if (seq !== routeSeq) return
  const km = haversineKm(from, pin.value)
  const info = road || {
    points: [from, pin.value],
    distanceMeters: km * 1000,
    durationSeconds: Math.max(60, Math.round((km / 25) * 3600)),
  }
  routePoints.value = info.points
  routeMeta.value = {
    distanceMeters: info.distanceMeters,
    durationSeconds: info.durationSeconds,
  }
  nextTick(() => {
    mapRef.value?.fitBounds?.([from, pin.value, ...info.points], {
      top: 96,
      bottom: Math.round(window.innerHeight * 0.5),
      left: 48,
      right: 48,
    })
  })
}

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

const rememberPlace = (place: PlaceSuggestion | null) => {
  if (!place) return
  recent.value = saveRecentLocation(place)
}

const dropRecent = (place: PlaceSuggestion) => {
  recent.value = removeRecentLocation(place)
}

const pickPlace = (s: PlaceSuggestion) => {
  pin.value = { lat: s.lat, lng: s.lng }
  address.value = s.fullName
  searchQ.value = ''
  suggestions.value = []
  searchFocused.value = false
  rememberPlace(s)
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
    rememberPlace(placeFromAddress(pin.value.lat, pin.value.lng, address.value))
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
    const first = stations.value[0]
    selectedStationId.value = first ? first._id || first.id : ''
    if (first) await loadRoute(first)
    else {
      routePoints.value = []
      routeMeta.value = null
    }
  } catch {
    stations.value = []
  } finally {
    stationsLoading.value = false
  }
}

const selectStation = (st: any) => {
  selectedStationId.value = st._id || st.id
  loadRoute(st)
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
  if (s === 'location') {
    routePoints.value = []
    routeMeta.value = null
  }
  if (s === 'stations' && selectedStation.value) loadRoute(selectedStation.value)
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
.suggest-head {
  padding: 12px 14px 4px;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 500;
}
.suggest-item {
  align-items: center;
}
.suggest-main {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  text-align: left;
  background: transparent;
}
.suggest-remove {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  color: var(--muted);
  font-size: 1.1rem;
  background: transparent;
}
.recent-pin {
  color: var(--accent);
}
.recent-pin svg {
  width: 16px;
  height: 16px;
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
.request-sheet.is-stations {
  max-height: 58dvh;
}
.eta-float {
  position: absolute;
  z-index: 6;
  top: 76px;
  left: 16px;
  right: 16px;
  pointer-events: none;
}
.eta-pills {
  display: flex;
  gap: 6px;
}
.eta-pills span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: 8px;
  background: rgba(232, 75, 26, 0.1);
  border: 1px solid rgba(232, 75, 26, 0.28);
  color: var(--accent);
  font-size: 0.75rem;
  font-weight: 600;
}
.eta-pills svg {
  width: 13px;
  height: 13px;
}
.eta-float p {
  margin-top: 6px;
  font-weight: 600;
  font-size: 0.95rem;
}
.station-card {
  width: 100%;
  text-align: left;
  padding: 12px;
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
  align-items: flex-start;
  gap: 12px;
}
.station-logo {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--paper);
  color: var(--accent);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.station-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.station-logo svg {
  width: 24px;
  height: 24px;
}
.station-copy {
  flex: 1;
  min-width: 0;
}
.station-copy strong {
  display: block;
  margin-bottom: 6px;
}
.station-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}
.chip-time {
  background: rgba(232, 75, 26, 0.1);
  color: var(--accent);
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
.checkout-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 12px;
}
.checkout-place,
.checkout-line {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  background-color: #fff;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
}
.checkout-place strong,
.checkout-line strong {
  display: block;
  font-size: 0.92rem;
  font-weight: 600;
}
.checkout-place small,
.checkout-line small {
  display: block;
  color: var(--muted);
  font-size: 0.78rem;
}
.checkout-pin {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(232, 75, 26, 0.1);
  color: var(--accent);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.checkout-pin svg {
  width: 20px;
  height: 20px;
}
.checkout-line em {
  margin-left: auto;
  font-style: normal;
  color: var(--accent);
  font-weight: 600;
  font-size: 0.85rem;
}
h2 {
  margin: 0 0 10px;
  font-size: 0.95rem;
  font-weight: 600;
}
.section-gap {
  margin-top: 22px;
}
.fuel-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.fuel-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--white);
  color: var(--ink);
  box-shadow: 0 1px 2px rgba(13, 13, 13, 0.04);
}
.fuel-card svg {
  width: 22px;
  height: 22px;
}
.fuel-card strong {
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}
.fuel-card span {
  font-size: 0.68rem;
  color: var(--muted);
}
.fuel-card.on {
  background: rgba(232, 75, 26, 0.1);
  border: 1.5px solid rgba(232, 75, 26, 0.45);
  color: var(--accent);
}
.fuel-card.on span {
  color: var(--accent);
}
.qty-toggle {
  display: flex;
  padding: 4px;
  border-radius: 16px;
  background: var(--white);
  border: 1px solid var(--border);
}
.qty-toggle button {
  flex: 1;
  padding: 10px 8px;
  border-radius: 12px;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 500;
}
.qty-toggle button.on {
  background: var(--ink);
  color: #fff;
  font-weight: 700;
}
.qty-label {
  display: block;
  margin: 14px 0 6px;
  color: var(--ink);
  font-size: 0.78rem;
  font-weight: 600;
}
.qty-input {
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  background: var(--white);
  color: var(--ink);
  font-size: 1rem;
  font-weight: 600;
}
.qty-input:focus {
  outline: none;
  border-color: var(--ink);
}
.qty-input.notes {
  margin-top: 0;
  min-height: 72px;
  resize: vertical;
  font-weight: 500;
  font-family: inherit;
}
.arrival {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 0.82rem;
  margin: 4px 0 8px;
}
.arrival span {
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(232, 75, 26, 0.12);
  color: var(--accent);
  font-weight: 500;
}
.pay-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.pay-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 6px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--white);
  color: var(--ink);
  font-size: 0.68rem;
  font-weight: 600;
  text-align: center;
  box-shadow: 0 1px 2px rgba(13, 13, 13, 0.04);
}
.pay-tile svg {
  width: 20px;
  height: 20px;
}
.pay-tile.on {
  background: var(--ink);
  border-color: var(--ink);
  color: #fff;
}
.summary {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 16px;
  background: var(--ink);
  color: #fff;
}
.summary div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.95rem;
}
.summary .total {
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-weight: 700;
}
.summary .total strong {
  font-size: 1.05rem;
}
.summary p {
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.75rem;
}
.pay-hint {
  margin-top: 8px;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.4;
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
