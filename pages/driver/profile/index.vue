<template>
  <div class="page">
    <div class="id-card">
      <div class="avatar lg">{{ initials }}</div>
      <div>
        <div class="chips">
          <span class="chip chip-success">Driver</span>
          <span class="chip" :class="{ 'chip-accent': online }">{{ online ? 'Online' : 'Offline' }}</span>
        </div>
        <strong>{{ user?.name || 'Driver' }}</strong>
        <div class="muted" style="font-size: 0.9rem">{{ user?.phone }}</div>
      </div>
    </div>

    <div class="menu">
      <NuxtLink class="menu-row" to="/driver/profile/personal">Personal info</NuxtLink>
      <NuxtLink class="menu-row" to="/driver/profile/vehicle">Vehicle</NuxtLink>
      <NuxtLink class="menu-row" to="/driver/profile/preferences">Preferences</NuxtLink>
      <NuxtLink class="menu-row" to="/profile/privacy">Privacy policy</NuxtLink>
      <NuxtLink class="menu-row" to="/profile/terms">Terms of service</NuxtLink>
    </div>

    <button class="btn btn-ghost btn-block" style="margin-top: 24px" @click="auth.logout()">
      Sign out
    </button>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'driver' })
const auth = useAuth()
const user = computed(() => auth.user.value)
const online = computed(() => !!(user.value?.driverProfile?.isAvailable ?? user.value?.isAvailable))
const initials = computed(() => {
  const n = user.value?.name || 'D'
  return String(n)
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
})
</script>

<style scoped>
.id-card {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 20px;
  border-radius: 20px;
  background: var(--ink);
  color: var(--paper);
  margin-bottom: 20px;
}
.avatar.lg {
  width: 56px;
  height: 56px;
}
.chips {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
.menu {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}
.menu-row {
  display: block;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
  font-weight: 500;
}
.menu-row:last-child {
  border-bottom: none;
}
</style>
