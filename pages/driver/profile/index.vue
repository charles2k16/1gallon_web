<template>
  <div class="profile">
    <h1>Profile</h1>
    <p class="lede">Manage your information and account</p>

    <section class="hero">
      <div class="avatar">
        <img v-if="photo" :src="photo" alt="" />
        <span v-else>{{ initials }}</span>
      </div>
      <div class="hero__copy">
        <div class="hero__name">
          <strong>{{ user?.name || 'Driver' }}</strong>
          <span v-if="rating > 0" class="rate">★ {{ rating.toFixed(1) }}</span>
        </div>
        <p>{{ driverId }}</p>
        <p>{{ user?.phone || '—' }}</p>
        <div class="pills">
          <span class="pill">
            <i :class="verified ? 'ok' : 'wait'" />
            {{ verified ? 'Verified' : 'Pending' }}
          </span>
          <span class="pill">
            <i class="dot" :class="{ on: online }" />
            {{ online ? 'Online' : 'Offline' }}
          </span>
        </div>
      </div>
    </section>

    <section class="stats">
      <div class="stat">
        <span class="stat__ico" v-html="icons.truck" />
        <strong>{{ loadingStats ? '…' : trips }}</strong>
        <span>Trips</span>
      </div>
      <div class="stat">
        <span class="stat__ico" v-html="icons.star" />
        <strong>{{ loadingStats ? '…' : rating > 0 ? rating.toFixed(1) : 'New' }}</strong>
        <span>Rating</span>
      </div>
      <div class="stat">
        <span class="stat__ico" v-html="icons.wallet" />
        <strong>{{ loadingStats ? '…' : earnedLabel }}</strong>
        <span>Earned</span>
      </div>
    </section>

    <h2>Account</h2>
    <nav class="menu">
      <button
        v-for="item in sheets"
        :key="item.panel"
        type="button"
        @click="openPanel(item.panel)"
      >
        <span class="menu__ico" v-html="item.icon" />
        <span>
          <strong>{{ item.title }}</strong>
          <small>{{ item.subtitle }}</small>
        </span>
        <em>›</em>
      </button>
      <NuxtLink class="last" to="/driver/profile/preferences">
        <span class="menu__ico" v-html="icons.sliders" />
        <span>
          <strong>Preferences</strong>
          <small>Work status, alerts and navigation</small>
        </span>
        <em>›</em>
      </NuxtLink>
    </nav>

    <h2>Legal & help</h2>
    <nav class="menu">
      <NuxtLink v-for="(item, i) in legal" :key="item.to" :to="item.to" :class="{ last: i === legal.length - 1 }">
        <span class="menu__ico" v-html="item.icon" />
        <span>
          <strong>{{ item.title }}</strong>
          <small>{{ item.subtitle }}</small>
        </span>
        <em>›</em>
      </NuxtLink>
    </nav>

    <div class="version">
      <span>App version</span>
      <strong>1.0.4</strong>
    </div>

    <button class="logout" type="button" @click="auth.logout()">
      <span v-html="icons.logout" />
      Log out
    </button>

    <div v-if="panel" class="sheet" role="dialog" aria-modal="true">
      <header class="sheet__bar">
        <button type="button" aria-label="Close" @click="closePanel">‹</button>
        <h2>{{ panelTitle }}</h2>
      </header>

      <div v-if="panel === 'personal'" class="sheet__body">
        <p class="sheet__lede">Your account details. Contact support to update these.</p>
        <div class="rows">
          <div><span>Full name</span><strong>{{ user?.name || '—' }}</strong></div>
          <div><span>Phone</span><strong>{{ user?.phone || '—' }}</strong></div>
          <div><span>Email</span><strong>{{ user?.email || '—' }}</strong></div>
          <div class="last"><span>Date of birth</span><strong>{{ profile?.dateOfBirth || '—' }}</strong></div>
        </div>
      </div>

      <div v-else-if="panel === 'vehicle'" class="sheet__body">
        <p class="sheet__lede">Details used for deliveries and customer identification.</p>
        <div class="rows">
          <div><span>Type</span><strong>{{ vehicleType }}</strong></div>
          <div><span>Make / model</span><strong>{{ makeModel }}</strong></div>
          <div><span>Color</span><strong>{{ cap(profile?.vehicleColor) }}</strong></div>
          <div><span>Plate number</span><strong>{{ plate }}</strong></div>
          <div class="last"><span>Year</span><strong>{{ profile?.vehicleYear || '—' }}</strong></div>
        </div>
        <p class="sheet__foot">To update vehicle details, contact Fuelr support.</p>
      </div>

      <div v-else class="sheet__body">
        <p class="sheet__lede">Your KYC documents. Upload and renewals will be available soon.</p>
        <article v-for="doc in docs" :key="doc.title" class="doc">
          <span class="doc__ico" v-html="icons.doc" />
          <span>
            <strong>{{ doc.title }}</strong>
            <small>{{ doc.subtitle }}</small>
            <small v-if="doc.meta">{{ doc.meta }}</small>
          </span>
          <em :class="{ ok: doc.ok }">{{ doc.ok ? 'On file' : 'Needed' }}</em>
        </article>
        <p class="verify" :class="{ ok: verified }">
          {{ verified ? 'Account verified — documents approved' : `Onboarding status: ${statusLabel}` }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { resolveMediaUrl, initialsFromName } from '~/utils/media'

definePageMeta({ layout: 'driver' })

const auth = useAuth()
const { get } = useApi()
const user = computed(() => auth.user.value)
const summary = ref<any>(null)
const loadingStats = ref(true)

const profile = computed(() => user.value?.driverProfile || {})
const online = computed(() => !!(profile.value?.isAvailable ?? user.value?.isAvailable))
const photo = computed(() => resolveMediaUrl(profile.value?.photoUrl || user.value?.avatar))
const initials = computed(() => initialsFromName(user.value?.name, 'D'))
const rating = computed(() => Number(profile.value?.rating || summary.value?.rating || 0))
const trips = computed(() =>
  Number(profile.value?.totalDeliveries ?? summary.value?.allTime?.delivered ?? 0),
)
const earnedLabel = computed(() => `GHS ${Math.round(Number(summary.value?.allTime?.earned || 0))}`)
const verified = computed(() => {
  const status = profile.value?.onboardingStatus
  return status === 'approved' || status == null
})
const driverId = computed(() => {
  const id = String(user.value?._id || '').toUpperCase()
  if (!id) return 'DRV——————'
  return id.length > 8 ? `DRV${id.slice(-6)}` : `DRV${id}`
})

const icons = {
  truck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v8H3z"/><path d="M14 10h4l3 3v2h-7"/><circle cx="7" cy="17.5" r="1.5"/><circle cx="17" cy="17.5" r="1.5"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3.5 2.2 4.6 5 .7-3.6 3.5.9 5.1L12 15l-4.5 2.4.9-5.1L4.8 8.8l5-.7L12 3.5Z"/></svg>`,
  wallet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M16 14h.01"/></svg>`,
  person: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19.5c1.3-3 3.6-4.4 6.5-4.4s5.2 1.4 6.5 4.4"/></svg>`,
  bike: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="6.5" cy="16.5" r="2.4"/><circle cx="17.5" cy="16.5" r="2.4"/><path d="M6.5 16.5h5l2.2-6H17M9.5 10.5h4"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5h6l2 2H21v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-11Z"/></svg>`,
  sliders: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8h16M4 16h16"/><circle cx="9" cy="8" r="2" fill="var(--paper)"/><circle cx="15" cy="16" r="2" fill="var(--paper)"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 19 6.5v5.2c0 4.2-2.8 7.2-7 8.8-4.2-1.6-7-4.6-7-8.8V6.5L12 3.5Z"/><path d="M12 11v.01"/></svg>`,
  doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z"/><path d="M14 3.5V9h5.5M8 13h8M8 17h6"/></svg>`,
  help: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.7.3-1.2.9-1.2 1.6V14"/><path d="M12 17h.01"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4H18a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 18 20h-6.5A1.5 1.5 0 0 1 10 18.5V17"/><path d="M4 12h11M12 8l4 4-4 4"/></svg>`,
}

type Panel = 'personal' | 'vehicle' | 'documents'
const panel = ref<Panel | null>(null)
const panelTitle = computed(() => {
  if (panel.value === 'personal') return 'Personal information'
  if (panel.value === 'vehicle') return 'Vehicle information'
  return 'Documents'
})

const openPanel = (next: Panel) => {
  panel.value = next
}
const closePanel = () => {
  panel.value = null
}

const cap = (value: unknown) => {
  const text = String(value || '').trim()
  if (!text) return '—'
  return text.charAt(0).toUpperCase() + text.slice(1)
}
const vehicleType = computed(() => cap(profile.value?.vehicleType || 'motorbike'))
const makeModel = computed(() => {
  const text = [profile.value?.vehicleMake, profile.value?.vehicleModel]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
  return text || '—'
})
const plate = computed(() => {
  const text = String(profile.value?.vehiclePlate || '').trim()
  return text ? text.toUpperCase() : '—'
})
const statusLabel = computed(() => String(profile.value?.onboardingStatus || 'approved').replaceAll('_', ' '))
const tail = (value: unknown) => {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.length <= 4 ? text : text.slice(-4)
}
const docs = computed(() => {
  const p = profile.value || {}
  const license = String(p.licenseNumber || '').trim()
  const nationalId = String(p.nationalId || '').trim()
  const photoUrl = String(p.photoUrl || '').trim()
  return [
    {
      title: 'Driver license',
      subtitle: license ? `No. ${license}` : 'Not submitted',
      meta: p.licenseExpiry ? `Expires ${p.licenseExpiry}` : '',
      ok: !!license,
    },
    {
      title: 'National ID',
      subtitle: nationalId ? `ID ending ···${tail(nationalId)}` : 'Not submitted',
      meta: '',
      ok: !!nationalId,
    },
    {
      title: 'Profile photo',
      subtitle: photoUrl ? 'Photo on file' : 'Not uploaded',
      meta: '',
      ok: !!photoUrl,
    },
  ]
})

const sheets = [
  { panel: 'personal' as Panel, title: 'Personal information', subtitle: 'Name, phone and contact details', icon: icons.person },
  { panel: 'vehicle' as Panel, title: 'Vehicle information', subtitle: 'Manage your vehicle details', icon: icons.bike },
  { panel: 'documents' as Panel, title: 'Documents', subtitle: 'License and ID documents', icon: icons.folder },
]

const legal = [
  { to: '/profile/privacy', title: 'Privacy policy', subtitle: 'How we handle your data', icon: icons.shield },
  { to: '/profile/terms', title: 'Terms & conditions', subtitle: 'Rules for using 1Gallon', icon: icons.doc },
  { to: '/profile/help', title: 'Help & support', subtitle: 'Get help with deliveries', icon: icons.help },
]

onMounted(async () => {
  await auth.fetchMe()
  try {
    const res = await get('/analytics/me')
    summary.value = res.data || res
  } catch {
    summary.value = null
  } finally {
    loadingStats.value = false
  }
})
</script>

<style scoped>
.profile {
  min-height: 100dvh;
  padding: 16px 20px calc(108px + var(--safe-bottom));
  background: var(--paper);
}

h1 {
  font-family: var(--font-ui);
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.lede {
  margin-top: 4px;
  color: var(--muted);
  font-size: 0.82rem;
}

.hero {
  margin-top: 18px;
  padding: 18px;
  border-radius: 22px;
  background: var(--ink);
  color: #fff;
  display: flex;
  gap: 14px;
  align-items: center;
}

.avatar {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: #2a2a2a;
  border: 2px solid rgba(255, 255, 255, 0.16);
  display: grid;
  place-items: center;
  font-weight: 700;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero__copy {
  min-width: 0;
}

.hero__name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hero__name strong {
  font-size: 1.12rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.rate {
  background: var(--accent);
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 0.72rem;
  font-weight: 700;
}

.hero__copy p {
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.75rem;
  line-height: 1.35;
}

.pills {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 0.7rem;
  font-weight: 600;
}

.pill i {
  width: 12px;
  height: 12px;
  display: inline-block;
}

.pill .ok,
.pill .wait,
.pill .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.pill .ok,
.pill .dot.on {
  background: #3dbe78;
}

.pill .wait {
  background: var(--accent);
}

.pill .dot {
  background: #9a9388;
}

.stats {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

.stat__ico {
  width: 18px;
  height: 18px;
  color: var(--accent);
  margin-bottom: 10px;
}

.stat__ico :deep(svg) {
  width: 18px;
  height: 18px;
  display: block;
}

.stat strong {
  font-family: var(--font-ui);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat span {
  color: var(--muted);
  font-size: 0.7rem;
}

h2 {
  margin: 22px 0 10px;
  font-family: var(--font-ui);
  font-size: 0.95rem;
  font-weight: 600;
}

.menu {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}

.menu a,
.menu button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  color: inherit;
  text-align: left;
  background: transparent;
}

.menu a:not(.last),
.menu button:not(.last) {
  border-bottom: 1px solid var(--border);
  margin: 0 14px;
  padding-left: 0;
  padding-right: 0;
}

.menu__ico {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--paper);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.menu__ico :deep(svg) {
  width: 20px;
  height: 20px;
}

.menu a span:nth-child(2),
.menu button span:nth-child(2) {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu strong {
  font-size: 0.95rem;
  font-weight: 600;
}

.menu small {
  color: var(--muted);
  font-size: 0.75rem;
}

.menu em {
  color: var(--muted);
  font-style: normal;
  font-size: 1.25rem;
  line-height: 1;
}

.version {
  margin-top: 16px;
  padding: 14px 16px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.version span {
  color: var(--muted);
  font-size: 0.82rem;
}

.version strong {
  font-size: 0.82rem;
  font-weight: 600;
}

.logout {
  margin-top: 16px;
  width: 100%;
  height: 52px;
  border-radius: 999px;
  border: 1.5px solid var(--accent);
  background: var(--white);
  color: var(--accent);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.logout :deep(svg) {
  width: 18px;
  height: 18px;
}

.sheet {
  position: fixed;
  z-index: 70;
  top: 0;
  bottom: 0;
  left: max(0px, calc(50vw - (var(--app-max-w) / 2)));
  width: min(100vw, var(--app-max-w));
  background: var(--paper);
  overflow: auto;
  padding: 8px 20px calc(28px + var(--safe-bottom));
}

.sheet__bar {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  min-height: 52px;
}

.sheet__bar button {
  width: 44px;
  height: 44px;
  font-size: 1.8rem;
  line-height: 1;
  color: var(--ink);
}

.sheet__bar h2 {
  margin: 0;
  text-align: center;
  font-size: 1.05rem;
}

.sheet__lede {
  margin: 8px 0 20px;
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.4;
}

.rows {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 4px 16px;
}

.rows div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}

.rows div.last {
  border-bottom: 0;
}

.rows span {
  color: var(--muted);
  font-size: 0.82rem;
}

.rows strong {
  font-size: 0.9rem;
  font-weight: 500;
  text-align: right;
}

.sheet__foot {
  margin-top: 16px;
  color: var(--muted);
  font-size: 0.78rem;
}

.doc {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 16px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.doc__ico {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--paper);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.doc__ico :deep(svg) {
  width: 20px;
  height: 20px;
}

.doc span:nth-child(2) {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.doc strong {
  font-size: 0.95rem;
}

.doc small {
  color: var(--muted);
  font-size: 0.75rem;
}

.doc em {
  font-style: normal;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-dim);
  border-radius: 8px;
  padding: 4px 8px;
  white-space: nowrap;
}

.doc em.ok {
  color: var(--success);
  background: var(--success-bg);
}

.verify {
  margin-top: 4px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--white);
  font-size: 0.85rem;
  font-weight: 600;
}

.verify.ok {
  color: var(--success);
}
</style>
