<template>
  <nav class="float-nav" :class="`float-nav--${variant}`" aria-label="Main">
    <template v-for="(item, i) in items" :key="item.to + i">
      <NuxtLink
        v-if="item.center"
        :to="item.to"
        class="float-nav__center"
        :class="{ active: isActive(item) }"
        :aria-label="item.label"
      >
        <span class="float-nav__center-inner" v-html="item.icon" />
      </NuxtLink>
      <NuxtLink
        v-else
        :to="item.to"
        class="float-nav__item"
        :class="{ active: isActive(item) }"
        :aria-label="item.label"
      >
        <span class="float-nav__ico" v-html="item.icon" />
      </NuxtLink>
    </template>
  </nav>
</template>

<script setup lang="ts">
type NavItem = {
  to: string
  icon: string
  label: string
  center?: boolean
  match?: string[]
}

const props = defineProps<{
  variant: 'customer' | 'driver'
}>()

const route = useRoute()

const svg = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"/></svg>`,
  bars: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 20V11M12 20V5M19 20v-6"/></svg>`,
  // Clean fuel-pump icon, centered in 24×24 — fits the white circle without clipping
  fuel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="9" height="16" rx="1.5"/><path d="M8 8h3M8 12h3"/><path d="M14 7h2.2a2 2 0 0 1 2 2v5.5a1.5 1.5 0 0 0 3 0V10"/><path d="M5 20h9"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="3.25"/><path d="M5.5 20c1.4-3.2 3.8-4.7 6.5-4.7s5.1 1.5 6.5 4.7"/></svg>`,
  jobs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.75"/></svg>`,
  cash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M13 2 5 13h6l-1 9 9-12h-6l0-8Z"/></svg>`,
}

const items = computed<NavItem[]>(() => {
  if (props.variant === 'driver') {
    return [
      { to: '/driver', label: 'Jobs', icon: svg.jobs, match: ['/driver'] },
      { to: '/driver/earnings', label: 'Earnings', icon: svg.cash, match: ['/driver/earnings'] },
      { to: '/driver', label: 'Order', icon: svg.fuel, center: true, match: ['/driver/order'] },
      { to: '/activity', label: 'Activity', icon: svg.bars, match: ['/activity'] },
      { to: '/driver/profile', label: 'Profile', icon: svg.user, match: ['/driver/profile'] },
    ]
  }
  return [
    { to: '/home', label: 'Home', icon: svg.home, match: ['/home'] },
    { to: '/activity', label: 'Activity', icon: svg.bars, match: ['/activity'] },
    { to: '/request', label: 'Order', icon: svg.fuel, center: true, match: ['/request', '/tracking'] },
    { to: '/profile', label: 'Profile', icon: svg.user, match: ['/profile'] },
    // Visual balance to match floating 5-slot look — reuse home as “menu” alternative? 
    // Use a 4-item flex instead by omitting 5th. Image has 5; we'll use 4 with even space.
  ]
})

const isActive = (item: NavItem) => {
  const path = route.path
  // Prefer exact / more specific matches; avoid /driver matching everything
  if (item.to === '/driver' && !item.center) {
    return path === '/driver'
  }
  if (item.match?.some((m) => path === m || path.startsWith(`${m}/`))) return true
  return path === item.to
}
</script>
