<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Sparkles } from 'lucide-vue-next'
import { useToast } from '@stratton-cologne/vue-smart-toast'
import api from '@/lib/api'
import { setSession } from '@/lib/session'
import QRCode from 'qrcode'

const route = useRoute()
const router = useRouter()
const { showToast } = useToast()

const email = ref('')
const password = ref('')
const mfaMethod = ref<'email' | 'authenticator'>('email')
const mfaCode = ref('')
const mfaStep = ref(false)
const tempToken = ref('')

const passwordChangeStep = ref(false)
const newPassword = ref('')
const newPasswordConfirmation = ref('')

const mfaSetupStep = ref(false)
const mfaSetupToken = ref('')
const mfaSetupQr = ref('')
const mfaSetupCode = ref('')
const mfaSetupQrDataUrl = ref('')

const info = ref('')
const loading = ref(false)
const error = ref('')

const getApiError = (e: any, fallback: string) => e?.response?.data?.error || fallback

const persistLogin = (token: string, expiresIn?: number) => {
  setSession(token, expiresIn ?? 900)
  router.push('/')
}

watch(mfaSetupQr, async (value) => {
  if (!value) {
    mfaSetupQrDataUrl.value = ''
    return
  }
  try {
    mfaSetupQrDataUrl.value = await QRCode.toDataURL(value, {
      width: 280,
      margin: 1,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })
  } catch {
    mfaSetupQrDataUrl.value = ''
  }
})

const requestEmailChallenge = async () => {
  await api.post('/auth/mfa/challenge', {}, { headers: { Authorization: `Bearer ${tempToken.value}` } })
}

const resetLoginFlow = () => {
  mfaStep.value = false
  tempToken.value = ''
  mfaCode.value = ''
  passwordChangeStep.value = false
  newPassword.value = ''
  newPasswordConfirmation.value = ''
}

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  info.value = ''
  try {
    const response = await api.post('/auth/login', { email: email.value, password: password.value })

    if (response.data?.password_change_required) {
      passwordChangeStep.value = true
      info.value = 'Temporäres Passwort erkannt. Bitte neues Passwort setzen.'
      showToast({ key: 'auth-password-change', message: info.value, type: 'warning', position: 'top-right' })
      return
    }

    if (response.data?.mfa_required) {
      tempToken.value = response.data.access_token
      mfaStep.value = true
      mfaMethod.value = response.data.mfa_method || 'email'
      if (mfaMethod.value === 'email') {
        await requestEmailChallenge()
        info.value = 'Ein Code wurde per E-Mail gesendet.'
        showToast({ key: 'auth-mfa-code', message: info.value, type: 'info', position: 'top-right' })
      } else {
        info.value = 'Bitte Code aus deiner Authenticator-App eingeben.'
        showToast({ key: 'auth-mfa-app', message: info.value, type: 'info', position: 'top-right' })
      }
      return
    }

    persistLogin(response.data.access_token, response.data.expires_in)
  } catch (e: any) {
    error.value = getApiError(e, 'Anmeldung fehlgeschlagen')
    showToast({ key: 'auth-login-error', message: error.value, type: 'danger', position: 'top-right' })
  } finally {
    loading.value = false
  }
}

const completeFirstLoginPassword = async () => {
  loading.value = true
  error.value = ''
  info.value = ''
  try {
    await api.post('/auth/password/complete-first-login', {
      email: email.value,
      password: password.value,
      new_password: newPassword.value,
      new_password_confirmation: newPasswordConfirmation.value,
    })
    passwordChangeStep.value = false
    info.value = 'Passwort geändert. Bitte normal einloggen.'
    showToast({ key: 'auth-password-changed', message: info.value, type: 'success', position: 'top-right' })
    password.value = ''
    newPassword.value = ''
    newPasswordConfirmation.value = ''
  } catch (e: any) {
    error.value = getApiError(e, 'Passwortänderung fehlgeschlagen')
    showToast({ key: 'auth-password-error', message: error.value, type: 'danger', position: 'top-right' })
  } finally {
    loading.value = false
  }
}

const handleVerifyMfa = async () => {
  loading.value = true
  error.value = ''
  info.value = ''
  try {
    const response = await api.post(
      '/auth/mfa/verify-login',
      { code: mfaCode.value },
      { headers: { Authorization: `Bearer ${tempToken.value}` } },
    )
    showToast({ key: 'auth-login-success', message: 'Anmeldung erfolgreich.', type: 'success', position: 'top-right' })
    persistLogin(response.data.access_token, response.data.expires_in)
  } catch (e: any) {
    error.value = getApiError(e, 'MFA-Verifizierung fehlgeschlagen')
    showToast({ key: 'auth-mfa-verify-error', message: error.value, type: 'danger', position: 'top-right' })
  } finally {
    loading.value = false
  }
}

const resendEmailCode = async () => {
  loading.value = true
  error.value = ''
  info.value = ''
  try {
    await requestEmailChallenge()
    info.value = 'Neuer Code wurde per E-Mail gesendet.'
    showToast({ key: 'auth-mfa-resend', message: info.value, type: 'info', position: 'top-right' })
  } catch (e: any) {
    error.value = getApiError(e, 'Code konnte nicht gesendet werden')
    showToast({ key: 'auth-mfa-resend-error', message: error.value, type: 'danger', position: 'top-right' })
  } finally {
    loading.value = false
  }
}

const loadMfaActivation = async (token: string) => {
  loading.value = true
  error.value = ''
  info.value = ''
  try {
    const response = await api.get(`/auth/mfa/activation/${token}`)
    mfaSetupStep.value = true
    mfaSetupToken.value = token
    mfaSetupQr.value = response.data.qr_code_url || ''
    info.value = 'Authenticator-Setup geladen. Bitte App koppeln und Code eingeben.'
    showToast({ key: 'auth-mfa-setup-loaded', message: info.value, type: 'info', position: 'top-right' })
  } catch (e: any) {
    error.value = getApiError(e, 'MFA-Aktivierungslink ungültig')
    showToast({ key: 'auth-mfa-setup-error', message: error.value, type: 'danger', position: 'top-right' })
  } finally {
    loading.value = false
  }
}

const activateAuthenticator = async () => {
  loading.value = true
  error.value = ''
  info.value = ''
  try {
    await api.post('/auth/mfa/activate', {
      token: mfaSetupToken.value,
      code: mfaSetupCode.value,
    })
    info.value = 'Authenticator aktiviert. Du kannst dich jetzt einloggen.'
    showToast({ key: 'auth-mfa-activated', message: info.value, type: 'success', position: 'top-right' })
    mfaSetupStep.value = false
    mfaSetupCode.value = ''
  } catch (e: any) {
    error.value = getApiError(e, 'Aktivierung fehlgeschlagen')
    showToast({ key: 'auth-mfa-activate-error', message: error.value, type: 'danger', position: 'top-right' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const token = String(route.query.mfa_setup_token || '')
  if (token) {
    loadMfaActivation(token)
  }
})
</script>

<template>
  <div class="glass-card w-full max-w-md rounded-2xl p-8">
    <div class="mb-8 flex flex-col items-center">
      <div class="mb-4 h-16 w-16 rounded-full bg-gradient-to-r from-finley-teal to-cyan-400 p-[2px]">
        <div class="flex h-full w-full items-center justify-center rounded-full bg-finley-dark-bg">
          <Sparkles class="h-8 w-8 text-finley-teal" />
        </div>
      </div>
      <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Welcome Back</h1>
      <p class="text-zinc-500 dark:text-finley-silver">
        {{
          mfaSetupStep
            ? 'Authenticator aktivieren'
            : passwordChangeStep
              ? 'Erstpasswort ändern'
              : mfaStep
                ? 'Multi-Faktor-Verifizierung'
                : 'Enter your credentials to access'
        }}
      </p>
    </div>

    <form v-if="mfaSetupStep" class="space-y-5" @submit.prevent="activateAuthenticator">
      <p class="text-sm text-zinc-500 dark:text-finley-silver">QR-Code mit deiner Authenticator-App scannen:</p>
      <div class="flex justify-center rounded-lg border border-zinc-200 bg-white/70 p-4 dark:border-white/10 dark:bg-black/20">
        <img
          :src="mfaSetupQrDataUrl"
          alt="MFA QR-Code"
          class="h-56 w-56 rounded-lg border border-white/10 bg-white p-2"
        />
      </div>
      <details class="rounded-lg border border-zinc-200 bg-white/70 p-3 dark:border-white/10 dark:bg-black/20">
        <summary class="cursor-pointer text-sm text-zinc-500 dark:text-finley-silver">Alternativ manuelle otpauth URL anzeigen</summary>
        <div class="mt-2 break-all text-xs text-cyan-300">{{ mfaSetupQr }}</div>
      </details>
      <input
        v-model="mfaSetupCode"
        type="text"
        inputmode="numeric"
        maxlength="8"
        placeholder="Authenticator-Code"
        class="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-finley-teal/50 focus:ring-1 focus:ring-finley-teal/50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder-gray-500"
        required
      />
      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-gradient-to-r from-finley-teal to-cyan-400 py-3 font-bold text-finley-dark-bg disabled:opacity-50">
        {{ loading ? 'Aktiviere...' : 'Authenticator aktivieren' }}
      </button>
    </form>

    <form v-else-if="passwordChangeStep" class="space-y-5" @submit.prevent="completeFirstLoginPassword">
      <input
        v-model="newPassword"
        type="password"
        placeholder="Neues Passwort"
        class="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-finley-teal/50 focus:ring-1 focus:ring-finley-teal/50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder-gray-500"
        required
      />
      <input
        v-model="newPasswordConfirmation"
        type="password"
        placeholder="Neues Passwort bestätigen"
        class="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-finley-teal/50 focus:ring-1 focus:ring-finley-teal/50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder-gray-500"
        required
      />
      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-gradient-to-r from-finley-teal to-cyan-400 py-3 font-bold text-finley-dark-bg disabled:opacity-50">
        {{ loading ? 'Speichere...' : 'Passwort setzen' }}
      </button>
      <button
        type="button"
        class="w-full rounded-lg border border-zinc-300 py-3 font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
        @click="resetLoginFlow">
        Zurück
      </button>
    </form>

    <form v-else-if="!mfaStep" class="space-y-5" @submit.prevent="handleLogin">
      <input
        v-model="email"
        type="email"
        placeholder="admin@example.com"
        autocomplete="username"
        class="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-finley-teal/50 focus:ring-1 focus:ring-finley-teal/50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder-gray-500"
        required
      />
      <input
        v-model="password"
        type="password"
        placeholder="••••••••"
        autocomplete="current-password"
        class="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-finley-teal/50 focus:ring-1 focus:ring-finley-teal/50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder-gray-500"
        required
      />
      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-gradient-to-r from-finley-teal to-cyan-400 py-3 font-bold text-finley-dark-bg disabled:opacity-50">
        {{ loading ? 'Signing in...' : 'Sign In' }}
      </button>
    </form>

    <form v-else class="space-y-5" @submit.prevent="handleVerifyMfa">
      <input
        v-model="mfaCode"
        type="text"
        inputmode="numeric"
        maxlength="8"
        placeholder="123456"
        class="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-finley-teal/50 focus:ring-1 focus:ring-finley-teal/50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder-gray-500"
        required
      />
      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-gradient-to-r from-finley-teal to-cyan-400 py-3 font-bold text-finley-dark-bg disabled:opacity-50">
        {{ loading ? 'Prüfe...' : 'MFA verifizieren' }}
      </button>
      <button
        v-if="mfaMethod === 'email'"
        type="button"
        :disabled="loading"
        class="w-full rounded-lg border border-finley-teal/40 py-3 font-semibold text-finley-teal hover:bg-finley-teal/10"
        @click="resendEmailCode">
        Code erneut senden
      </button>
      <button
        type="button"
        :disabled="loading"
        class="w-full rounded-lg border border-zinc-300 py-3 font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
        @click="resetLoginFlow">
        Zurück
      </button>
    </form>

    <div v-if="error" class="mt-4 text-center text-sm text-red-400">{{ error }}</div>
    <div v-if="info" class="mt-2 text-center text-sm text-finley-teal">{{ info }}</div>
  </div>
</template>
