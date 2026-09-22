<template>
  <div class="stars">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      class="star"
      :class="{ on: n <= model }"
      :disabled="readonly"
      @click="!readonly && emit('update:modelValue', n)"
    >
      ★
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{ modelValue?: number; readonly?: boolean }>(),
  { modelValue: 0, readonly: false },
)
const emit = defineEmits<{ 'update:modelValue': [n: number] }>()
const model = computed(() => props.modelValue || 0)
</script>

<style scoped>
.stars {
  display: flex;
  gap: 6px;
}
.star {
  font-size: 1.6rem;
  color: var(--border);
  line-height: 1;
}
.star.on {
  color: #e6a800;
}
</style>
