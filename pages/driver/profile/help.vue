<template>
  <div class="page">
    <button class="back" type="button" @click="$router.back()">← Back</button>
    <h1 class="sheet-title" style="margin: 12px 0 8px">Help & support</h1>
    <p class="muted" style="font-size: 0.95rem; line-height: 1.45">
      For help with deliveries, contact Fuelr support through your operations manager.
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'driver' })
</script>

<style scoped>
.back { color: var(--muted); }
</style>
