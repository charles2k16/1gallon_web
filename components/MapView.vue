<template>
  <div class="map-wrap">
    <div ref="root" class="maplibre-map" />
  </div>
</template>

<script setup lang="ts">
import maplibregl, { type Map, type Marker, type LngLatLike, type StyleSpecification } from 'maplibre-gl'

const props = withDefaults(
  defineProps<{
    center?: { lat: number; lng: number }
    zoom?: number
    interactive?: boolean
    showPin?: boolean
    markers?: Array<{
      id: string
      lat: number
      lng: number
      color?: string
      label?: string
      kind?: 'driver' | 'drop' | 'pin'
    }>
    route?: Array<{ lat: number; lng: number }>
  }>(),
  {
    center: () => ({ lat: 5.6037, lng: -0.187 }),
    zoom: 15,
    interactive: true,
    showPin: false,
    markers: () => [],
    route: () => [],
  },
)

const emit = defineEmits<{
  moveend: [pos: { lat: number; lng: number }]
  ready: [map: Map]
}>()

const config = useRuntimeConfig()
const root = ref<HTMLElement | null>(null)
let map: Map | null = null
let pinMarker: Marker | null = null
const extraMarkers: Marker[] = []
let resizeObs: ResizeObserver | null = null
let programmatic = false

/**
 * Vector basemap (roads, parks, POIs, 3D buildings) — MapLibre-native.
 * OpenFreeMap Liberty reads closer to Google Maps than flat raster tiles.
 */
const VECTOR_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

/** Mapbox Streets as colorful raster fallback if vector style fails to load. */
const mapboxRasterStyle = (token: string): StyleSpecification => ({
  version: 8,
  sources: {
    mapbox: {
      type: 'raster',
      tiles: [
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`,
      ],
      tileSize: 256,
      attribution: '© Mapbox © OpenStreetMap',
    },
  },
  layers: [{ id: 'mapbox', type: 'raster', source: 'mapbox' }],
})

const flyTo = (lat: number, lng: number, zoom?: number) => {
  if (!map) return
  programmatic = true
  map.flyTo({ center: [lng, lat], zoom: zoom ?? map.getZoom(), essential: true })
}

const setCenter = (lat: number, lng: number) => {
  if (!map) return
  programmatic = true
  map.setCenter([lng, lat])
}

const fitBounds = (
  points: Array<{ lat: number; lng: number }>,
  padding: number | { top: number; bottom: number; left: number; right: number } = 56,
) => {
  if (!map || !points.length) return
  if (points.length === 1) {
    programmatic = true
    map.flyTo({ center: [points[0].lng, points[0].lat], zoom: 15, essential: true })
    return
  }
  const bounds = new maplibregl.LngLatBounds(
    [points[0].lng, points[0].lat],
    [points[0].lng, points[0].lat],
  )
  for (const p of points) bounds.extend([p.lng, p.lat])
  programmatic = true
  map.easeTo({ pitch: 0, duration: 200 })
  map.fitBounds(bounds, {
    padding:
      typeof padding === 'number'
        ? padding
        : padding,
    maxZoom: 16,
    duration: 700,
  })
}

const forceResize = () => {
  map?.resize()
}

const syncPin = () => {
  if (!map) return
  if (!props.showPin) {
    pinMarker?.remove()
    pinMarker = null
    return
  }
  const { lat, lng } = props.center
  if (!pinMarker) {
    const el = document.createElement('div')
    el.className = 'map-pin'
    el.innerHTML = '<div class="map-pin-dot"></div><div class="map-pin-shadow"></div>'
    pinMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .addTo(map)
  } else {
    pinMarker.setLngLat([lng, lat])
  }
}

const syncMarkers = () => {
  if (!map) return
  while (extraMarkers.length) {
    extraMarkers.pop()?.remove()
  }
  for (const m of props.markers) {
    const el = document.createElement('div')
    const kind = m.kind || 'pin'
    el.className = `map-marker map-marker--${kind}`
    if (kind === 'drop') {
      el.innerHTML = `<div class="map-drop-pin" style="--c:${m.color || '#e84b1a'}"></div>`
    } else if (kind === 'driver') {
      el.innerHTML = `<div class="map-driver-dot" style="--c:${m.color || '#0d0d0d'}"><span></span></div>`
    } else {
      el.style.background = m.color || '#e84b1a'
    }
    if (m.label) el.title = m.label
    const marker = new maplibregl.Marker({
      element: el,
      anchor: kind === 'drop' ? 'bottom' : 'center',
    })
      .setLngLat([m.lng, m.lat])
      .addTo(map)
    extraMarkers.push(marker)
  }
}

const syncRoute = () => {
  if (!map || !map.isStyleLoaded()) return
  const srcId = 'route'
  const layerId = 'route-line'
  const coords = props.route.map((p) => [p.lng, p.lat])

  if (!coords.length) {
    if (map.getLayer(layerId)) map.removeLayer(layerId)
    if (map.getSource(srcId)) map.removeSource(srcId)
    return
  }

  const geojson = {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: coords },
  }

  if (!map.getSource(srcId)) {
    map.addSource(srcId, { type: 'geojson', data: geojson })
    map.addLayer({
      id: layerId,
      type: 'line',
      source: srcId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#1a73e8',
        'line-width': 5,
        'line-opacity': 0.92,
      },
    })
  } else {
    const src = map.getSource(srcId) as any
    src.setData(geojson)
  }
}

const applyInteractive = (v: boolean) => {
  if (!map) return
  const handlers = [
    'dragPan',
    'scrollZoom',
    'boxZoom',
    'dragRotate',
    'keyboard',
    'doubleClickZoom',
    'touchZoomRotate',
    'touchPitch',
  ] as const
  for (const h of handlers) {
    if (v) (map as any)[h]?.enable?.()
    else (map as any)[h]?.disable?.()
  }
}

const onStyleReady = () => {
  if (!map) return
  forceResize()
  // Keep flat for trip tracking unless user tilts manually
  syncPin()
  syncMarkers()
  if (props.route.length) syncRoute()
  applyInteractive(props.interactive)
  emit('ready', map)
  requestAnimationFrame(forceResize)
  setTimeout(forceResize, 120)
  setTimeout(forceResize, 400)
}

onMounted(() => {
  if (!root.value) return

  const token = String(config.public.mapboxToken || '').trim()
  let styleFailed = false

  map = new maplibregl.Map({
    container: root.value,
    style: VECTOR_STYLE,
    center: [props.center.lng, props.center.lat] as LngLatLike,
    zoom: props.zoom,
    interactive: props.interactive,
    attributionControl: false,
    failIfMajorPerformanceCaveat: false,
    maxPitch: 60,
    pitchWithRotate: true,
  })

  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
  map.addControl(
    new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }),
    'top-right',
  )

  map.on('error', (e) => {
    const msg = String(e?.error?.message || e || '')
    console.warn('[MapView]', msg)
    // Fallback to Mapbox Streets raster if vector tiles fail
    if (!styleFailed && token && map && /failed|error|404|tile/i.test(msg)) {
      styleFailed = true
      map.setStyle(mapboxRasterStyle(token))
    }
  })

  map.on('load', onStyleReady)
  map.on('style.load', () => {
    syncPin()
    syncMarkers()
    if (props.route.length) syncRoute()
  })

  map.on('moveend', () => {
    if (!map) return
    if (programmatic) {
      programmatic = false
      return
    }
    const c = map.getCenter()
    emit('moveend', { lat: c.lat, lng: c.lng })
  })

  if (typeof ResizeObserver !== 'undefined' && root.value.parentElement) {
    resizeObs = new ResizeObserver(() => forceResize())
    resizeObs.observe(root.value.parentElement)
  }
})

watch(
  () => props.center,
  (c) => {
    if (!map || !c) return
    syncPin()
    const cur = map.getCenter()
    if (Math.abs(cur.lat - c.lat) > 0.00005 || Math.abs(cur.lng - c.lng) > 0.00005) {
      setCenter(c.lat, c.lng)
    }
  },
  { deep: true },
)

watch(
  () => props.showPin,
  () => syncPin(),
)

watch(
  () => props.markers,
  () => syncMarkers(),
  { deep: true },
)

watch(
  () => props.route,
  () => {
    if (map?.isStyleLoaded()) syncRoute()
  },
  { deep: true },
)

watch(
  () => props.interactive,
  (v) => applyInteractive(!!v),
)

onBeforeUnmount(() => {
  resizeObs?.disconnect()
  resizeObs = null
  pinMarker?.remove()
  pinMarker = null
  while (extraMarkers.length) extraMarkers.pop()?.remove()
  map?.remove()
  map = null
})

defineExpose({ flyTo, setCenter, fitBounds, getMap: () => map, resize: forceResize })
</script>

<style>
.map-wrap {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.maplibre-map {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 240px;
}

.maplibre-map .maplibregl-map,
.maplibre-map .maplibregl-canvas-container,
.maplibre-map .maplibregl-canvas {
  width: 100% !important;
  height: 100% !important;
}

.map-pin {
  position: relative;
  width: 28px;
  height: 40px;
  transform: translateY(8px);
  pointer-events: none;
}
.map-pin-dot {
  width: 22px;
  height: 22px;
  border-radius: 50% 50% 50% 0;
  background: #e84b1a;
  transform: rotate(-45deg);
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  margin: 0 auto;
}
.map-pin-shadow {
  width: 12px;
  height: 4px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 50%;
  margin: 6px auto 0;
}
.map-marker {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
.map-marker--drop {
  width: 28px;
  height: 36px;
  border: none;
  background: transparent;
  box-shadow: none;
}
.map-drop-pin {
  width: 22px;
  height: 22px;
  border-radius: 50% 50% 50% 0;
  background: var(--c, #e84b1a);
  transform: rotate(-45deg);
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
  margin: 0 auto;
}
.map-marker--driver {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  box-shadow: none;
}
.map-driver-dot {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--c, #0d0d0d);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.28);
  display: grid;
  place-items: center;
}
.map-driver-dot span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--c, #0d0d0d);
}

.maplibre-map .maplibregl-ctrl-group {
  border-radius: 10px !important;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12) !important;
}
</style>
