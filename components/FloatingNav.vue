<template>
  <nav class="float-nav" :class="`float-nav--${variant}`" aria-label="Main">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="float-nav__item"
      :class="{ active: isActive(item) }"
      :aria-label="item.label"
    >
      <span class="float-nav__ico" v-html="item.icon" />
      <span class="float-nav__label">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
/** Same tabs as Flutter — floating pill, not a full footer bar. */
type NavItem = {
  to: string
  icon: string
  label: string
  match?: string[]
  exact?: boolean
}

const props = defineProps<{
  variant: 'customer' | 'driver'
}>()

const route = useRoute()

const svg = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"/></svg>`,
  order: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="9" height="16" rx="1.5"/><path d="M8 8h3M8 12h3"/><path d="M14 7h2.2a2 2 0 0 1 2 2v5.5a1.5 1.5 0 0 0 3 0V10"/><path d="M5 20h9"/></svg>`,
  activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 20V11M12 20V5M19 20v-6"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="3.25"/><path d="M5.5 20c1.4-3.2 3.8-4.7 6.5-4.7s5.1 1.5 6.5 4.7"/></svg>`,
  jobs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-10Z"/><path d="M8 8.5V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5"/><path d="M3 13h18"/></svg>`,
  earnings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M12 14.5v0"/></svg>`,
}

const items = computed<NavItem[]>(() => {
  if (props.variant === 'driver') {
    return [
      { to: '/driver', label: 'Jobs', icon: svg.jobs, exact: true, match: ['/driver'] },
      {
        to: '/driver/earnings',
        label: 'Earnings',
        icon: svg.earnings,
        match: ['/driver/earnings'],
      },
      { to: '/activity', label: 'Activity', icon: svg.activity, match: ['/activity'] },
      {
        to: '/driver/profile',
        label: 'Profile',
        icon: svg.profile,
        match: ['/driver/profile', '/profile'],
      },
    ]
  }
  return [
    { to: '/home', label: 'Home', icon: svg.home, match: ['/home'] },
    {
      to: '/request',
      label: 'Order',
      icon: svg.order,
      match: ['/request', '/tracking'],
    },
    { to: '/activity', label: 'Activity', icon: svg.activity, match: ['/activity'] },
    { to: '/profile', label: 'Profile', icon: svg.profile, match: ['/profile'] },
  ]
})

const isActive = (item: NavItem) => {
  const path = route.path
  if (item.exact) {
    return path === item.to || (item.to === '/driver' && path.startsWith('/driver/order'))
  }
  if (item.match?.some((m) => path === m || path.startsWith(`${m}/`))) return true
  return path === item.to
}
</script>
