<template>
  <button v-if="canInstall" class="install" type="button" @click="install">
    Install 1Gallon
  </button>
</template>

<script setup lang="ts">
const deferred = useState<any>('pwa_install', () => null)
const canInstall = computed(() => Boolean(deferred.value))

const install = async () => {
  const prompt = deferred.value
  if (!prompt?.prompt) return
  prompt.prompt()
  await prompt.userChoice
  deferred.value = null
}
</script>

<style scoped>
.install {
  position: fixed;
  z-index: 60;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--nav-h, 64px) + var(--safe-bottom, 0px) + 12px);
  background: var(--ink);
  color: var(--paper);
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 0.82rem;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
</style>
