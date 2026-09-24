<template>
  <Teleport to="body">
    <div v-if="open" class="pay-modal" role="dialog" aria-modal="true" aria-label="Complete payment">
      <div class="pay-modal__backdrop" @click="onClose" />
      <div class="pay-modal__sheet">
        <header class="pay-modal__head">
          <button type="button" class="pay-modal__icon-btn" :disabled="busy" @click="onClose" aria-label="Close">
            ✕
          </button>
          <strong class="pay-modal__title">Complete payment</strong>
          <button type="button" class="pay-modal__done" :disabled="busy" @click="onDone">
            <span v-if="busy" class="spinner" style="width: 16px; height: 16px; border-width: 2px" />
            <span v-else>Done</span>
          </button>
        </header>
        <div class="pay-modal__body">
          <iframe
            v-if="authorizationUrl"
            class="pay-modal__frame"
            :src="authorizationUrl"
            title="Paystack checkout"
            allow="payment *"
          />
          <div v-if="frameLoading" class="pay-modal__loading">
            <div class="spinner" />
            <p class="muted">Loading checkout…</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Fallback sheet (Flutter-style) when Paystack Inline popup is unavailable.
 * Loads authorization URL in an iframe; parent verifies via Done / polling.
 */
const props = defineProps<{
  open: boolean
  authorizationUrl: string
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  done: []
}>()

const frameLoading = ref(true)

watch(
  () => props.open && props.authorizationUrl,
  () => {
    frameLoading.value = true
    // iframe onload is cross-origin opaque; hide spinner after a short delay
    if (props.open) {
      setTimeout(() => {
        frameLoading.value = false
      }, 1800)
    }
  },
)

const onClose = () => {
  if (!props.busy) emit('close')
}

const onDone = () => emit('done')
</script>

<style scoped>
.pay-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: end center;
  pointer-events: auto;
}

.pay-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(13, 13, 13, 0.45);
}

.pay-modal__sheet {
  position: relative;
  z-index: 1;
  width: min(100vw, var(--app-max-w, 480px));
  height: min(92dvh, 820px);
  background: var(--white, #fff);
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.pay-modal__head {
  display: grid;
  grid-template-columns: 44px 1fr 64px;
  align-items: center;
  gap: 4px;
  padding: 8px 8px 8px 4px;
  border-bottom: 1px solid var(--border, #d9d2c5);
  flex-shrink: 0;
}

.pay-modal__title {
  text-align: center;
  font-size: 0.95rem;
  font-weight: 600;
}

.pay-modal__icon-btn,
.pay-modal__done {
  min-height: 40px;
  padding: 0 8px;
  font-weight: 600;
  color: var(--accent, #e84b1a);
  display: grid;
  place-items: center;
}

.pay-modal__icon-btn {
  font-size: 1rem;
  color: var(--ink, #0d0d0d);
}

.pay-modal__body {
  flex: 1;
  position: relative;
  min-height: 0;
  background: #f7f7f7;
}

.pay-modal__frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  background: #fff;
}

.pay-modal__loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.85);
}
</style>
