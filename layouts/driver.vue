<template>
  <div class="app-shell" :class="{ 'map-shell': isMapPage }">
    <slot />
    <button
      v-if="paymentNotice"
      class="pay-notice"
      type="button"
      @click="openPayment"
    >
      <strong>{{ paymentNotice.title }}</strong>
      <span>{{ paymentNotice.message }}</span>
      <em>View →</em>
    </button>
    <FloatingNav variant="driver" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const isMapPage = computed(() => route.path.startsWith('/driver/order'))
const alert = useDriverOfferAlert()
const { connect, on } = useSocket()

const paymentNotice = ref<{ title: string; message: string; orderId: string } | null>(null)
let hideTimer: ReturnType<typeof setTimeout> | undefined

const openPayment = () => {
  const id = paymentNotice.value?.orderId
  paymentNotice.value = null
  if (id) navigateTo(`/driver/order/${id}`)
}

const showPayment = (payload: any) => {
  const orderId = String(payload?.orderId || '')
  if (!orderId) return
  paymentNotice.value = {
    orderId,
    title: payload?.title || 'Payment received',
    message: payload?.message || 'Customer paid successfully. You can start the trip.',
  }
  try {
    const tone = new Audio('/sounds/ringtone-notify.mp3')
    tone.play().catch(() => {})
    setTimeout(() => {
      tone.pause()
      tone.currentTime = 0
    }, 2200)
  } catch {
    /* autoplay may be blocked */
  }
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    paymentNotice.value = null
  }, 8000)
}

onMounted(() => {
  alert.bind()
  connect()
  on('order:payment', showPayment)
})

onBeforeUnmount(() => clearTimeout(hideTimer))
</script>

<style scoped>
.pay-notice {
  position: fixed;
  z-index: 40;
  top: 12px;
  left: 16px;
  right: 16px;
  max-width: 448px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  background: var(--white);
  border-left: 4px solid var(--success);
  box-shadow: var(--shadow);
  padding: 12px 14px;
}
.pay-notice strong {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.pay-notice span {
  font-size: 0.9rem;
  color: var(--ink);
}
.pay-notice em {
  font-style: normal;
  color: var(--accent);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
}
</style>
