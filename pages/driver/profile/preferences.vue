<template>
  <div class="page">
    <button class="back" type="button" @click="$router.back()">← Back</button>
    <h1 class="sheet-title" style="margin: 12px 0 16px">Preferences</h1>

    <div class="card">
      <div class="row">
        <div>
          <strong>Available for jobs</strong>
          <div class="muted" style="font-size: 0.85rem">Go online to receive offers</div>
        </div>
        <button
          class="btn btn-sm"
          :class="online ? 'btn-accent' : 'btn-ghost'"
          :disabled="busy"
          @click="toggle"
        >
          {{ online ? 'Online' : 'Offline' }}
        </button>
      </div>
      <div class="row">
        <div>
          <strong>Navigation</strong>
          <div class="muted" style="font-size: 0.85rem">Google Maps</div>
        </div>
      </div>
    </div>
    <p v-if="error" class="error-text" style="margin-top: 10px">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'driver' })
const auth = useAuth()
const { patch } = useApi()
const { emit } = useSocket()
const busy = ref(false)
const error = ref('')

const online = computed(() => !!(auth.user.value?.driverProfile?.isAvailable ?? auth.user.value?.isAvailable))

const toggle = async () => {
  busy.value = true
  error.value = ''
  try {
    const next = !online.value
    await patch('/users/me/driver-profile', { isAvailable: next })
    if (auth.user.value) {
      auth.user.value = {
        ...auth.user.value,
        driverProfile: { ...(auth.user.value.driverProfile || {}), isAvailable: next },
        isAvailable: next,
      }
    }
    emit('driver:available', { isAvailable: next })
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.back { color: var(--muted); }
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}
.row:last-child { border-bottom: none; }
</style>
