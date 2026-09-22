<template>
  <div class="splash center-load">
    <div class="brand splash-brand">1GALLON</div>
    <div class="spinner" style="margin-top: 24px" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank' })

const auth = useAuth()
const token = useCookie('web_token')

onMounted(async () => {
  if (!token.value) {
    await navigateTo('/auth')
    return
  }
  auth.restoreUser()
  const me = await auth.fetchMe()
  if (!me) {
    await navigateTo('/auth')
    return
  }
  await navigateTo(me.role === 'driver' ? '/driver' : '/home')
})
</script>

<style scoped>
.splash {
  min-height: 100dvh;
  background: var(--ink);
  color: var(--paper);
  flex-direction: column;
}
.splash-brand {
  font-size: 3rem;
  letter-spacing: 0.08em;
}
</style>
