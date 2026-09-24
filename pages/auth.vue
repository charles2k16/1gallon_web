<template>
  <div class="signin">
    <h1 class="wordmark">
      <img src="/icons/icon-192.png" alt="" width="48" height="48" />
      1GALLON
    </h1>
    <h2 class="headline">{{ headline }}</h2>
    <p class="lede">{{ subtitle }}</p>

    <div v-if="step === 'role'" class="roles">
      <button class="role role--customer" type="button" @click="pickRole('customer')">
        <span class="role__ico role__ico--light" v-html="icons.pump" />
        <span class="role__copy">
          <strong>Customer</strong>
          <span>Order fuel delivered to you</span>
        </span>
        <span class="role__chev">›</span>
      </button>
      <button class="role role--driver" type="button" @click="pickRole('driver')">
        <span class="role__ico role__ico--dark" v-html="icons.bike" />
        <span class="role__copy">
          <strong>Driver</strong>
          <span>Accept and deliver fuel orders</span>
        </span>
        <span class="role__chev">›</span>
      </button>
    </div>

    <div v-else-if="step === 'phone'" class="form">
      <div class="chip" :class="{ 'chip--dark': intent === 'driver' }">
        <span class="chip__ico" v-html="intent === 'driver' ? icons.bikeSm : icons.pumpSm" />
        {{ intent === 'driver' ? 'Signing in as driver' : 'Signing in as customer' }}
      </div>
      <label class="lbl" for="phone">PHONE NUMBER</label>
      <input
        id="phone"
        v-model="phone"
        class="phone"
        type="tel"
        inputmode="tel"
        placeholder="0541234567"
        autocomplete="tel"
        autofocus
      />
      <p class="hint">
        {{
          intent === 'customer'
            ? 'New numbers are signed up automatically'
            : 'Use the phone number on your driver account'
        }}
      </p>
      <p v-if="error" class="error-text">{{ error }}</p>
      <button class="send" type="button" :disabled="loading" @click="sendCode">
        <span v-if="loading" class="spinner spinner--light" />
        <span v-else>SEND CODE →</span>
      </button>
      <button class="link" type="button" @click="step = 'role'">← Choose a different role</button>
    </div>

    <div v-else class="form">
      <div class="chip" :class="{ 'chip--dark': intent === 'driver' }">
        <span class="chip__ico" v-html="intent === 'driver' ? icons.bikeSm : icons.pumpSm" />
        {{ intent === 'driver' ? 'Signing in as driver' : 'Signing in as customer' }}
      </div>
      <div class="otp" @paste.prevent="onPaste">
        <input
          v-for="i in 6"
          :key="i"
          :ref="(el) => setOtpRef(el, i - 1)"
          class="otp__box"
          inputmode="numeric"
          maxlength="1"
          autocomplete="one-time-code"
          :value="digits[i - 1]"
          @input="onDigit(i - 1, $event)"
          @keydown="onKey(i - 1, $event)"
        />
      </div>
      <p v-if="error" class="error-text">{{ error }}</p>
      <div v-if="loading" class="otp-wait"><span class="spinner" /></div>
      <button class="resend" type="button" :disabled="loading" @click="sendCode">Resend code</button>
      <button class="link" type="button" @click="step = 'phone'">← Change number</button>
    </div>

    <p class="legal">
      By continuing you agree to our
      <NuxtLink to="/profile/terms">Terms</NuxtLink>
      &amp;
      <NuxtLink to="/profile/privacy">Privacy Policy</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { toLocalGhanaPhone } from '~/utils/phone'
import type { AppRole } from '~/composables/useAuth'

definePageMeta({ layout: 'blank' })

const auth = useAuth()
const step = ref<'role' | 'phone' | 'otp'>('role')
const intent = ref<AppRole>('customer')
const phone = ref('')
const digits = ref<string[]>(['', '', '', '', '', ''])
const otpRefs = ref<(HTMLInputElement | null)[]>([])
const canonical = ref('')
const loading = computed(() => auth.loading.value)
const error = computed(() => auth.error.value)

const icons = {
  pump: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="10" height="16" rx="1.5"/><path d="M7 7h4M7 11h4"/><path d="M14 6h2.2a1.8 1.8 0 0 1 1.8 1.8V14a1.6 1.6 0 0 0 3.2 0V9"/><path d="M4 19h10"/></svg>`,
  bike: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17h6l3-7h3M9 10h5M12 10l-2 7"/></svg>`,
  pumpSm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="4" width="9" height="14" rx="1"/><path d="M14 7h2v6"/></svg>`,
  bikeSm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="16" r="2.2"/><circle cx="17" cy="16" r="2.2"/><path d="M7 16h5l2.5-6H18"/></svg>`,
}

const headline = computed(() => {
  if (step.value === 'role') return 'SIGN IN'
  if (step.value === 'phone') return 'YOUR NUMBER'
  return 'ENTER CODE'
})

const subtitle = computed(() => {
  if (step.value === 'role') return 'Choose how you use 1Gallon, then verify with SMS.'
  if (step.value === 'phone') {
    return intent.value === 'driver'
      ? "We'll text a code to verify your driver account."
      : "We'll text a code to sign you in or create your account."
  }
  return `We sent a 6-digit code to ${canonical.value || phone.value}`
})

const otpCode = computed(() => digits.value.join(''))

const setOtpRef = (el: Element | null, i: number) => {
  otpRefs.value[i] = el as HTMLInputElement | null
}

const pickRole = (role: AppRole) => {
  intent.value = role
  auth.error.value = null
  step.value = 'phone'
}

const sendCode = async () => {
  auth.error.value = null
  try {
    canonical.value = toLocalGhanaPhone(phone.value)
    await auth.requestOtp(canonical.value, intent.value)
    digits.value = ['', '', '', '', '', '']
    step.value = 'otp'
    await nextTick()
    otpRefs.value[0]?.focus()
  } catch {
    /* error on auth */
  }
}

const verifying = ref(false)

const verify = async () => {
  if (otpCode.value.length < 6 || loading.value || verifying.value) return
  verifying.value = true
  try {
    const user = await auth.verifyOtp(canonical.value, otpCode.value)
    await navigateTo(user?.role === 'driver' ? '/driver' : '/home')
  } catch {
    verifying.value = false
  }
}

const onDigit = (i: number, ev: Event) => {
  const input = ev.target as HTMLInputElement
  const v = input.value.replace(/\D/g, '').slice(-1)
  digits.value[i] = v
  input.value = v
  if (v && i < 5) otpRefs.value[i + 1]?.focus()
  if (otpCode.value.length === 6) verify()
}

const onKey = (i: number, ev: KeyboardEvent) => {
  if (ev.key === 'Backspace' && !digits.value[i] && i > 0) {
    digits.value[i - 1] = ''
    otpRefs.value[i - 1]?.focus()
  }
}

const onPaste = (ev: ClipboardEvent) => {
  const text = (ev.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6)
  if (!text) return
  digits.value = Array.from({ length: 6 }, (_, i) => text[i] || '')
  const next = Math.min(text.length, 5)
  otpRefs.value[next]?.focus()
  if (text.length === 6) verify()
}
</script>

<style scoped>
.signin {
  min-height: 100dvh;
  padding: 48px 24px 32px;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

.wordmark {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 2.6rem;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--ink);
}

.wordmark img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.headline {
  margin-top: 30px;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 1.2rem;
  letter-spacing: 0.01em;
  color: var(--accent);
  line-height: 1.1;
}

.lede {
  margin-top: 8px;
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.4;
  max-width: 22rem;
}

.roles {
  margin-top: 36px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 16px;
  border-radius: 16px;
  text-align: left;
}

.role--customer {
  background: var(--white);
  border: 1.5px solid var(--accent);
  color: var(--ink);
}

.role--driver {
  background: var(--ink);
  border: 1.5px solid var(--ink);
  color: var(--white);
}

.role__ico {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--accent);
}

.role__ico--light {
  background: var(--paper);
}

.role__ico--dark {
  background: rgba(232, 75, 26, 0.2);
}

.role__ico :deep(svg) {
  width: 22px;
  height: 22px;
}

.role__copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.role__copy strong {
  font-family: var(--font-ui);
  font-size: 1rem;
  font-weight: 700;
}

.role__copy span {
  font-size: 0.78rem;
  color: var(--muted);
}

.role__chev {
  font-size: 1.35rem;
  line-height: 1;
  opacity: 0.45;
}

.form {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--white);
  border: 1px solid var(--border);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ink);
}

.chip--dark {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--white);
}

.chip__ico {
  width: 14px;
  height: 14px;
  display: grid;
  color: var(--accent);
}

.chip--dark .chip__ico {
  color: var(--white);
}

.chip__ico :deep(svg) {
  width: 14px;
  height: 14px;
}

.lbl {
  margin-top: 20px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--muted);
}

.phone {
  width: 100%;
  margin-top: 6px;
  background: var(--white);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 14px 14px;
  font-size: 1rem;
  outline: none;
}

.phone:focus {
  border-color: var(--ink);
}

.hint {
  margin-top: 6px;
  font-size: 0.72rem;
  color: var(--muted);
}

.send {
  width: 100%;
  margin-top: 28px;
  height: 52px;
  border-radius: 14px;
  background: var(--accent);
  color: var(--white);
  font-weight: 700;
  letter-spacing: 0.04em;
  display: grid;
  place-items: center;
}

.send:disabled {
  opacity: 0.55;
}

.link {
  margin-top: 16px;
  color: var(--muted);
  font-size: 0.82rem;
}

.otp {
  margin-top: 20px;
  display: flex;
  gap: 8px;
  width: 100%;
}

.otp__box {
  flex: 1;
  min-width: 0;
  height: 52px;
  text-align: center;
  font-family: var(--font-ui);
  font-size: 1.35rem;
  font-weight: 700;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--white);
  outline: none;
}

.otp__box:focus {
  border-color: var(--accent);
}

.otp-wait {
  margin-top: 16px;
  width: 100%;
  display: grid;
  place-items: center;
}

.resend {
  margin-top: 16px;
  color: var(--accent);
  font-size: 0.85rem;
  font-weight: 600;
}

.resend:disabled {
  opacity: 0.5;
}

.legal {
  margin-top: auto;
  padding-top: 40px;
  text-align: center;
  font-size: 0.72rem;
  color: var(--muted);
  width: 100%;
}

.legal a {
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.spinner--light {
  border-color: rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  width: 20px;
  height: 20px;
}
</style>
