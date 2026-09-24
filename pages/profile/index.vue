<template>
  <div class="page profile-page">
    <h1 class="page-h">Profile</h1>
    <p class="page-sub">Your account and support</p>

    <div class="id-card">
      <div class="avatar-ring">
        <div class="avatar lg">
          <img v-if="photoUrl" :src="photoUrl" alt="" />
          <span v-else>{{ initials }}</span>
        </div>
      </div>
      <div class="id-meta">
        <strong>{{ user?.name || 'Customer' }}</strong>
        <div class="phone">{{ user?.phone || '—' }}</div>
      </div>
    </div>

    <h2 class="section-h">Account</h2>
    <div class="menu">
      <NuxtLink class="menu-tile" to="/home">
        <span class="menu-ico">☰</span>
        <span class="menu-copy">
          <strong>My orders</strong>
          <small>View your fuel deliveries</small>
        </span>
        <span class="chev">›</span>
      </NuxtLink>
      <NuxtLink class="menu-tile" to="/activity">
        <span class="menu-ico">▣</span>
        <span class="menu-copy">
          <strong>Activity</strong>
          <small>Spend and delivery history</small>
        </span>
        <span class="chev">›</span>
      </NuxtLink>
      <NuxtLink class="menu-tile" to="/profile/privacy">
        <span class="menu-ico">◐</span>
        <span class="menu-copy">
          <strong>Privacy policy</strong>
          <small>How we handle your data</small>
        </span>
        <span class="chev">›</span>
      </NuxtLink>
      <NuxtLink class="menu-tile" to="/profile/terms">
        <span class="menu-ico">≡</span>
        <span class="menu-copy">
          <strong>Terms of service</strong>
          <small>Rules for using 1Gallon</small>
        </span>
        <span class="chev">›</span>
      </NuxtLink>
      <NuxtLink class="menu-tile" to="/profile/help">
        <span class="menu-ico">?</span>
        <span class="menu-copy">
          <strong>Help & support</strong>
          <small>Call, WhatsApp, and social</small>
        </span>
        <span class="chev">›</span>
      </NuxtLink>
    </div>

    <button class="btn btn-ghost btn-block sign-out" @click="auth.logout()">Sign out</button>
  </div>
</template>

<script setup lang="ts">
import { initialsFromName, resolveMediaUrl } from '~/utils/media'

definePageMeta({ layout: 'customer' })
const auth = useAuth()
const user = computed(() => auth.user.value)
const initials = computed(() => initialsFromName(user.value?.name, 'C'))
const photoUrl = computed(() => resolveMediaUrl(user.value?.avatar || user.value?.photoUrl))

onMounted(() => {
  auth.fetchMe()
})
</script>

<style scoped>
.profile-page {
  padding-bottom: 24px;
}
.page-h {
  font-size: 1.65rem;
  font-weight: 700;
}
.page-sub {
  color: var(--muted);
  font-size: 0.9rem;
  margin: 4px 0 18px;
}
.id-card {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px;
  border-radius: 22px;
  background: var(--ink);
  color: var(--paper);
  margin-bottom: 22px;
}
.avatar-ring {
  padding: 3px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #fff3);
}
.avatar.lg {
  width: 64px;
  height: 64px;
  font-size: 1.15rem;
  background: var(--ink-2);
}
.id-meta strong {
  display: block;
  font-family: var(--font-ui);
  font-size: 1.15rem;
}
.phone {
  margin-top: 4px;
  font-size: 0.9rem;
  opacity: 0.7;
}
.section-h {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 10px;
}
.menu {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}
.menu-tile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-bottom: 1px solid var(--border);
}
.menu-tile:last-child {
  border-bottom: none;
}
.menu-ico {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--paper);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 1rem;
}
.menu-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.menu-copy strong {
  font-size: 0.95rem;
  font-weight: 600;
}
.menu-copy small {
  color: var(--muted);
  font-size: 0.78rem;
}
.chev {
  color: var(--muted);
  font-size: 1.4rem;
  line-height: 1;
}
.sign-out {
  margin-top: 24px;
}
</style>
