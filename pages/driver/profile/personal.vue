<template>
  <div class="page">
    <button class="back" type="button" @click="$router.back()">← Back</button>
    <h1 class="sheet-title" style="margin: 12px 0 16px">Personal info</h1>
    <div class="card">
      <div class="row"><span class="muted">Name</span><strong>{{ user?.name || '—' }}</strong></div>
      <div class="row"><span class="muted">Phone</span><strong>{{ user?.phone || '—' }}</strong></div>
      <div class="row"><span class="muted">National ID</span><strong>{{ profile?.nationalId || '—' }}</strong></div>
      <div class="row"><span class="muted">License</span><strong>{{ profile?.licenseNumber || '—' }}</strong></div>
    </div>
    <p class="muted" style="margin-top: 12px; font-size: 0.85rem">Managed by your operations team.</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'driver' })
const auth = useAuth()
const user = computed(() => auth.user.value)
const profile = computed(() => user.value?.driverProfile || {})
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
