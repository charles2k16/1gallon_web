<template>
  <div class="app-shell" :class="{ 'map-shell': isMapPage }">
    <slot />
    <FloatingNav variant="customer" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const isMapPage = computed(() => {
  const p = route.path
  return p === '/home' || p === '/request' || p.startsWith('/tracking')
})
</script>
