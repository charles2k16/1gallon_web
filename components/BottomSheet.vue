<template>
  <div class="bottom-sheet" :class="{ 'sheet-tall': tall }">
    <div class="sheet-grabber" />
    <div class="sheet-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ tall?: boolean }>(), { tall: false })
</script>
