<template>
  <div class="blank-layout">
    <slot />
  </div>
</template>

<style scoped>
.blank-layout {
  min-height: 100dvh;
  background: var(--paper);
  width: 100%;
}
</style>
