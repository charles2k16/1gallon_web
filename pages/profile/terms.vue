<template>
  <div class="page">
    <button class="back" type="button" @click="$router.back()">← Back</button>
    <h1 class="sheet-title" style="margin: 12px 0 16px">Terms of service</h1>
    <div class="legal">
      <p>
        By using 1Gallon you agree to order fuel for lawful personal or business use and to provide
        accurate delivery details.
      </p>
      <p>
        Delivery fees are distance-based and shown before you confirm. Fuel prices are set by
        partner stations and locked when you place an order.
      </p>
      <p>
        You may cancel an order until the driver marks arrived. Prepaid payments may be refunded via
        Paystack when an order is cancelled after payment.
      </p>
      <p>
        Drivers are employees of 1Gallon operations; accepting an offer assigns the delivery.
        Declining removes that offer for the driver.
      </p>
      <p>Service availability depends on partner stations, drivers online, and local conditions.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank' })
</script>

<style scoped>
.back {
  color: var(--muted);
}
.legal {
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: var(--ink-2);
  line-height: 1.55;
}
</style>
