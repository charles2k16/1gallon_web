<template>
  <div class="auth-page">
    <div class="auth-hero">
      <div class="brand">1GALLON</div>
      <p class="auth-tag">Fuel delivered to your door</p>
    </div>

    <!-- Step: role -->
    <div v-if="step === 'role'" class="auth-card">
      <h1 class="sheet-title">How are you signing in?</h1>
      <p class="sheet-sub">Choose your role to continue</p>
      <button class="role-card" type="button" @click="pickRole('customer')">
        <strong>Customer</strong>
        <span>Order fuel to your location</span>
      </button>
      <button class="role-card" type="button" @click="pickRole('driver')">
        <strong>Driver</strong>
        <span>Accept jobs and deliver fuel</span>
      </button>
    </div>

    <!-- Step: phone -->
    <div v-else-if="step === 'phone'" class="auth-card">
      <button class="back" type="button" @click="step = 'role'">← Back</button>
      <p class="eyebrow">{{ intent === 'driver' ? 'Driver' : 'Customer' }}</p>
      <h1 class="sheet-title">Enter your phone</h1>
      <p class="sheet-sub">We'll send a 6-digit code via SMS</p>
      <div class="field">
        <label>Ghana mobile number</label>
        <input
          v-model="phone"
          class="input input-lg"
          type="tel"
          inputmode="tel"
          placeholder="054 123 4567"
          autocomplete="tel"
        />
      </div>
      <p v-if="error" class="error-text" style="margin-top: 10px">{{ error }}</p>
      <button
        class="btn btn-primary btn-block"
        style="margin-top: 20px"
        :disabled="loading"
        @click="sendCode"
      >
        {{ loading ? 'Sending…' : 'Send code →' }}
      </button>
    </div>

    <!-- Step: otp -->
    <div v-else class="auth-card">
      <button class="back" type="button" @click="step = 'phone'">← Back</button>
      <p class="eyebrow">Verify</p>
      <h1 class="sheet-title">Enter the code</h1>
      <p class="sheet-sub">Sent to {{ displayPhone }}</p>
      <div class="field">
        <label>6-digit code</label>
        <input
          v-model="otp"
          class="input otp-input"
          type="text"
          inputmode="numeric"
          maxlength="6"
          autocomplete="one-time-code"
          placeholder="••••••"
        />
      </div>
      <p v-if="error" class="error-text" style="margin-top: 10px">{{ error }}</p>
      <button
        class="btn btn-primary btn-block"
        style="margin-top: 20px"
        :disabled="loading || otp.length < 6"
        @click="verify"
      >
        {{ loading ? 'Checking…' : 'Continue →' }}
      </button>
      <button class="btn btn-ghost btn-block" style="margin-top: 10px" :disabled="loading" @click="sendCode">
        Resend code
      </button>
    </div>
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
const otp = ref('')
const canonical = ref('')
const loading = computed(() => auth.loading.value)
const error = computed(() => auth.error.value)
const displayPhone = computed(() => canonical.value || phone.value)

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
    step.value = 'otp'
  } catch {
    /* error on auth */
  }
}

const verify = async () => {
  try {
    const user = await auth.verifyOtp(canonical.value, otp.value.trim())
    await navigateTo(user?.role === 'driver' ? '/driver' : '/home')
  } catch {
    /* error on auth */
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(232, 75, 26, 0.18), transparent 50%),
    linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 45%, var(--paper) 45%);
  padding: 48px 20px 32px;
}
.auth-hero {
  color: var(--paper);
  margin-bottom: 36px;
}
.auth-hero .brand {
  font-size: 3.2rem;
}
.auth-tag {
  margin-top: 6px;
  opacity: 0.75;
  font-size: 1rem;
}
.auth-card {
  background: var(--paper);
  border-radius: var(--radius-lg);
  padding: 24px 20px 28px;
  box-shadow: var(--shadow);
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
}
.role-card {
  width: 100%;
  text-align: left;
  padding: 18px 16px;
  border-radius: 16px;
  border: 1.5px solid var(--border);
  background: var(--white);
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.role-card strong {
  font-family: var(--font-ui);
  font-size: 1.05rem;
}
.role-card span {
  color: var(--muted);
  font-size: 0.9rem;
}
.role-card:hover {
  border-color: var(--ink);
}
.back {
  color: var(--muted);
  font-size: 0.9rem;
  margin-bottom: 12px;
}
</style>
