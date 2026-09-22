<template>
  <div class="page">
    <div class="center-load" style="min-height: 60vh; flex-direction: column; gap: 16px">
      <div class="spinner" />
      <p class="muted">{{ message }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>
      <button v-if="done" class="btn btn-primary" @click="goBack">Continue</button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank' })

const route = useRoute()
const { get } = useApi()
const message = ref('Confirming payment…')
const error = ref('')
const done = ref(false)
const orderId = ref('')

const goBack = () => {
  if (orderId.value) navigateTo(`/tracking/${orderId.value}`)
  else navigateTo('/home')
}

onMounted(async () => {
  const reference =
    String(route.query.reference || route.query.trxref || '') ||
    (import.meta.client ? sessionStorage.getItem('pay_ref') || '' : '')
  orderId.value =
    String(route.query.orderId || '') ||
    (import.meta.client ? sessionStorage.getItem('pay_order') || '' : '')

  if (!reference) {
    error.value = 'Missing payment reference'
    done.value = true
    message.value = 'Could not verify payment'
    return
  }

  try {
    await get(`/payments/verify/${encodeURIComponent(reference)}`)
    message.value = 'Payment confirmed'
    done.value = true
    setTimeout(goBack, 1200)
  } catch (e: any) {
    error.value = e.message || 'Verification failed'
    message.value = 'Payment not confirmed yet'
    done.value = true
  }
})
</script>
