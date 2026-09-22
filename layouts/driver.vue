<template>
  <div class="app-shell" :class="{ 'map-shell': isMapPage }">
    <slot />
    <FloatingNav variant="driver" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const isMapPage = computed(() => route.path.startsWith('/driver/order'))
</script>
