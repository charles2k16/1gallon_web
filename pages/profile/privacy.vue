<template>
  <div class="page">
    <button class="back" type="button" @click="$router.back()">← Back</button>
    <h1 class="sheet-title" style="margin: 12px 0 16px">Privacy policy</h1>
    <div class="legal">
      <p>
        1Gallon (“we”, “us”) collects the phone number you use to sign in, delivery locations you
        provide, and order history needed to fulfill fuel deliveries.
      </p>
      <p>
        Location data is used to match you with nearby partner stations and drivers, estimate
        delivery fees, and show live tracking during an active order.
      </p>
      <p>
        Payment card and mobile money details are processed by Paystack; we do not store full card
        numbers on our servers.
      </p>
      <p>
        We retain account and order records as required for operations, settlements, and legal
        compliance. You may request account deletion by contacting support.
      </p>
      <p>For privacy questions, contact your 1Gallon operations manager.</p>
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
