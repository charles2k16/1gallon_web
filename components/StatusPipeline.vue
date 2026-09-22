<template>
  <div class="status-row" aria-label="Order status">
    <div
      v-for="(s, i) in steps"
      :key="s"
      class="status-dot"
      :class="{ done: i < currentIdx, current: i === currentIdx }"
    />
  </div>
</template>

<script setup lang="ts">
import { ORDER_PIPELINE } from '~/utils/format'

const props = defineProps<{ status: string }>()

const steps = ORDER_PIPELINE.filter((s) => s !== 'confirmed')
const currentIdx = computed(() => {
  if (props.status === 'cancelled') return -1
  if (props.status === 'confirmed') return 0
  const i = steps.indexOf(props.status as any)
  return i < 0 ? 0 : i
})
</script>
