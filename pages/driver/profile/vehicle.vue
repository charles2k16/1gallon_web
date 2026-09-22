<template>
  <div class="page">
    <button class="back" type="button" @click="$router.back()">← Back</button>
    <h1 class="sheet-title" style="margin: 12px 0 16px">Vehicle</h1>
    <div class="card">
      <div class="row"><span class="muted">Make</span><strong>{{ profile?.vehicleMake || profile?.bikeMake || '—' }}</strong></div>
      <div class="row"><span class="muted">Plate</span><strong>{{ profile?.vehiclePlate || profile?.plateNumber || '—' }}</strong></div>
      <div class="row"><span class="muted">Color</span><strong>{{ profile?.vehicleColor || '—' }}</strong></div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'driver' })
const auth = useAuth()
const profile = computed(() => auth.user.value?.driverProfile || {})
</script>

<style scoped>
.back { color: var(--muted); }
.row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.row:last-child { border-bottom: none; }
</style>
