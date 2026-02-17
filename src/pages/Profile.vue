<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useToast } from '@stratton-cologne/vue-smart-toast'
import api from '@/lib/api'
import QRCode from 'qrcode'

type Role = { id: number; name: string; slug: string }
type Me = {
    id: number
    name: string
    email: string
    phone?: string | null
    street?: string | null
    postal_code?: string | null
    city?: string | null
    country?: string | null
    department?: string | null
    position?: string | null
    mfa_method: 'email' | 'authenticator'
    mfa_app_confirmed_at?: string | null
    mfa_app_pending_expires_at?: string | null
    avatar_url?: string | null
    roles: Role[]
}

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const currentUser = ref<Me | null>(null)
const mfaSetupOpen = ref(false)
const mfaSetupToken = ref('')
const mfaSetupQr = ref('')
const mfaSetupQrDataUrl = ref('')
const mfaSetupMailSending = ref(false)
const mfaSetupCode = ref('')
const mfaSetupActivating = ref(false)
const { showToast } = useToast()

const form = reactive({
    name: '',
    email: '',
    phone: '',
    street: '',
    postal_code: '',
    city: '',
    country: '',
    department: '',
    position: '',
    mfa_method: 'email' as 'email' | 'authenticator',
    avatar_url: '',
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
})

const initials = computed(() => {
    const name = form.name.trim()
    if (!name) return 'U'
    const parts = name.split(/\s+/).slice(0, 2)
    return parts.map((p) => p.charAt(0).toUpperCase()).join('')
})

const mfaStatus = computed(() => {
    if (form.mfa_method === 'email') {
        return {
            label: 'MFA per E-Mail aktiv',
            detail: '',
            tone: 'success',
        } as const
    }

    const user = currentUser.value
    const confirmed = !!user?.mfa_app_confirmed_at
    if (confirmed) {
        return {
            label: 'Authenticator aktiv',
            detail: '',
            tone: 'success',
        } as const
    }

    const expiresRaw = user?.mfa_app_pending_expires_at
    const expiresAt = expiresRaw ? new Date(expiresRaw) : null
    const detail =
        expiresAt && !Number.isNaN(expiresAt.getTime())
            ? `Aktivierung ausstehend. Gültig bis ${expiresAt.toLocaleString('de-DE')}.`
            : 'Aktivierung ausstehend. Bitte Setup abschließen.'

    return {
        label: 'Authenticator ausstehend',
        detail,
        tone: 'warning',
    } as const
})

const fillForm = (user: Me) => {
    currentUser.value = user
    form.name = user.name || ''
    form.email = user.email || ''
    form.phone = user.phone || ''
    form.street = user.street || ''
    form.postal_code = user.postal_code || ''
    form.city = user.city || ''
    form.country = user.country || ''
    form.department = user.department || ''
    form.position = user.position || ''
    form.mfa_method = user.mfa_method || 'email'
    form.avatar_url = user.avatar_url || ''
    form.current_password = ''
    form.new_password = ''
    form.new_password_confirmation = ''
}

const getApiError = (e: any, fallback: string) => {
    const data = e?.response?.data
    if (!data) return fallback
    if (typeof data.error === 'string') return data.error
    if (typeof data.message === 'string') return data.message
    if (data.errors && typeof data.errors === 'object') {
        const first = Object.values(data.errors)?.[0] as unknown
        if (Array.isArray(first) && first[0]) return String(first[0])
    }
    return fallback
}

const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('read_failed'))
        reader.readAsDataURL(file)
    })

const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('image_load_failed'))
        img.src = src
    })

const downscaleImageToDataUrl = async (src: string, maxEdge = 640, quality = 0.82) => {
    const image = await loadImage(src)
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height

    if (!width || !height) return ''

    const ratio = Math.min(1, maxEdge / Math.max(width, height))
    const targetWidth = Math.max(1, Math.round(width * ratio))
    const targetHeight = Math.max(1, Math.round(height * ratio))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const context = canvas.getContext('2d')
    if (!context) return ''

    context.drawImage(image, 0, 0, targetWidth, targetHeight)

    const tryWebp = canvas.toDataURL('image/webp', quality)
    if (tryWebp && tryWebp.startsWith('data:image/webp')) return tryWebp

    return canvas.toDataURL('image/jpeg', quality)
}

const renderMfaQrCode = async (otpauthUrl: string) => {
    if (!otpauthUrl) {
        mfaSetupQrDataUrl.value = ''
        return
    }
    try {
        mfaSetupQrDataUrl.value = await QRCode.toDataURL(otpauthUrl, {
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
}

const openMfaSetupModal = async (token: string, qrCodeUrl: string) => {
    mfaSetupToken.value = token
    mfaSetupQr.value = qrCodeUrl
    mfaSetupCode.value = ''
    await renderMfaQrCode(qrCodeUrl)
    mfaSetupOpen.value = true
}

const closeMfaSetupModal = () => {
    mfaSetupCode.value = ''
    mfaSetupOpen.value = false
}

const activateAuthenticatorNow = async () => {
    if (!mfaSetupToken.value || !mfaSetupCode.value.trim()) {
        showToast({
            key: 'profile-mfa-activate-missing',
            message: 'Bitte zuerst den Authenticator-Code eingeben.',
            type: 'warning',
            position: 'top-right',
        })
        return
    }
    if (mfaSetupActivating.value) return
    mfaSetupActivating.value = true
    try {
        const response = await api.post('/auth/mfa/activate', {
            token: mfaSetupToken.value,
            code: mfaSetupCode.value.trim(),
        })
        await loadProfile()
        showToast({
            key: 'profile-mfa-activate-success',
            message: response?.data?.message || 'Authenticator MFA aktiviert.',
            type: 'success',
            position: 'top-right',
        })
        closeMfaSetupModal()
    } catch (e: any) {
        showToast({
            key: 'profile-mfa-activate-error',
            message: getApiError(e, 'Authenticator konnte nicht aktiviert werden.'),
            type: 'danger',
            position: 'top-right',
        })
    } finally {
        mfaSetupActivating.value = false
    }
}

const resendMfaActivationEmail = async () => {
    if (mfaSetupMailSending.value) return
    mfaSetupMailSending.value = true
    try {
        const response = await api.post('/auth/mfa/resend-activation-email')
        const token = String(response?.data?.mfa_setup_token || '')
        const qr = String(response?.data?.mfa_qr_code_url || '')
        if (token && qr) {
            await openMfaSetupModal(token, qr)
        }
        showToast({
            key: 'profile-mfa-resend-success',
            message: response?.data?.message || 'Aktivierungs-E-Mail wurde erneut gesendet.',
            type: 'success',
            position: 'top-right',
        })
    } catch (e: any) {
        showToast({
            key: 'profile-mfa-resend-error',
            message: getApiError(e, 'Aktivierungs-E-Mail konnte nicht gesendet werden.'),
            type: 'danger',
            position: 'top-right',
        })
    } finally {
        mfaSetupMailSending.value = false
    }
}

const loadProfile = async () => {
    loading.value = true
    error.value = ''
    try {
        const response = await api.post('/auth/me')
        fillForm(response.data)
    } catch (e: any) {
        error.value = getApiError(e, 'Profil konnte nicht geladen werden')
        showToast({ key: 'profile-load-error', message: error.value, type: 'danger', position: 'top-right' })
    } finally {
        loading.value = false
    }
}

const onAvatarChange = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
        showToast({ key: 'profile-avatar-type', message: 'Bitte ein Bild auswählen.', type: 'warning', position: 'top-right' })
        input.value = ''
        return
    }
    if (file.size > 10 * 1024 * 1024) {
        showToast({ key: 'profile-avatar-size', message: 'Profilbild max. 10MB.', type: 'warning', position: 'top-right' })
        input.value = ''
        return
    }

    const asDataUrl = await readFileAsDataUrl(file).catch(() => '')

    if (!asDataUrl) {
        showToast({ key: 'profile-avatar-read', message: 'Profilbild konnte nicht gelesen werden.', type: 'danger', position: 'top-right' })
        input.value = ''
        return
    }

    const optimized = await downscaleImageToDataUrl(asDataUrl).catch(() => '')
    if (!optimized) {
        showToast({ key: 'profile-avatar-process', message: 'Profilbild konnte nicht verarbeitet werden.', type: 'danger', position: 'top-right' })
        input.value = ''
        return
    }

    form.avatar_url = optimized
    input.value = ''
}

const clearAvatar = () => {
    form.avatar_url = ''
}

const saveProfile = async () => {
    saving.value = true
    error.value = ''
    try {
        const response = await api.put('/auth/me', {
            name: form.name,
            email: form.email,
            phone: form.phone || null,
            street: form.street || null,
            postal_code: form.postal_code || null,
            city: form.city || null,
            country: form.country || null,
            department: form.department || null,
            position: form.position || null,
            mfa_method: form.mfa_method,
            avatar_url: form.avatar_url || null,
            current_password: form.current_password || undefined,
            new_password: form.new_password || undefined,
            new_password_confirmation: form.new_password_confirmation || undefined,
        })

        fillForm(response.data.user)
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: response.data.user }))
        const mfaSetupTokenFromResponse = String(response?.data?.mfa_setup_token || '')
        const mfaQrFromResponse = String(response?.data?.mfa_qr_code_url || '')
        if (response?.data?.mfa_activation_pending && mfaSetupTokenFromResponse && mfaQrFromResponse) {
            await openMfaSetupModal(mfaSetupTokenFromResponse, mfaQrFromResponse)
        }
        showToast({
            key: 'profile-save-success',
            message: response.data?.message || 'Profil gespeichert.',
            type: response.data?.mfa_activation_pending ? 'warning' : 'success',
            duration: 4500,
            position: 'top-right',
        })
    } catch (e: any) {
        error.value = getApiError(e, 'Profil konnte nicht gespeichert werden')
        showToast({ key: 'profile-save-error', message: error.value, type: 'danger', position: 'top-right' })
    } finally {
        saving.value = false
    }
}

onMounted(loadProfile)
</script>

<template>
    <div class="space-y-6">
        <section class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div class="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 class="text-xl font-semibold text-zinc-900 dark:text-white">Mein Profil</h2>
                    <p class="text-sm text-zinc-500 dark:text-zinc-400">Persönliche Daten, Profilbild und MFA verwalten.
                    </p>
                </div>
            </div>

            <div v-if="loading" class="text-sm text-zinc-500 dark:text-zinc-400">Lade Profil...</div>

            <form v-else class="grid gap-4 md:grid-cols-2" @submit.prevent="saveProfile">
                <div
                    class="md:col-span-2 flex items-center gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
                    <div v-if="form.avatar_url"
                        class="h-16 w-16 overflow-hidden rounded-full border border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                        <img :src="form.avatar_url" alt="Profilbild" class="h-full w-full object-cover" />
                    </div>
                    <div v-else
                        class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white">
                        {{ initials }}
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <label
                            class="cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                            Profilbild wählen
                            <input type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
                        </label>
                        <button type="button"
                            class="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            @click="clearAvatar">
                            Entfernen
                        </button>
                    </div>
                </div>

                <input v-model="form.name" required placeholder="Name"
                    class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />
                <input v-model="form.email" required type="email" placeholder="E-Mail"
                    class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />
                <input v-model="form.phone" placeholder="Telefon"
                    class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />
                <input v-model="form.department" placeholder="Abteilung"
                    class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />
                <input v-model="form.position" placeholder="Position"
                    class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />
                <div class="grid gap-3 md:grid-cols-10">
                    <select v-model="form.mfa_method"
                        class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white md:col-span-7">
                        <option value="email">MFA via E-Mail</option>
                        <option value="authenticator">MFA via Authenticator App</option>
                    </select>
                    <div class="rounded-lg border px-3 py-2 text-sm md:col-span-3"
                        :class="mfaStatus.tone === 'success'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300'">
                        <p class="font-semibold">{{ mfaStatus.label }}</p>
                        <p v-if="mfaStatus.detail" class="mt-1 text-xs">{{ mfaStatus.detail }}</p>
                    </div>
                </div>
                <input v-model="form.street" placeholder="Straße + Hausnummer"
                    class="md:col-span-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />
                <input v-model="form.postal_code" placeholder="PLZ"
                    class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />
                <input v-model="form.city" placeholder="Stadt"
                    class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />
                <input v-model="form.country" placeholder="Land"
                    class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />

                <div
                    class="md:col-span-2 mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
                    <p class="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">Passwort ändern (optional)
                    </p>
                    <div class="grid gap-3 md:grid-cols-3">
                        <input v-model="form.current_password" type="password" autocomplete="current-password"
                            placeholder="Aktuelles Passwort"
                            class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500" />
                        <input v-model="form.new_password" type="password" autocomplete="new-password"
                            placeholder="Neues Passwort"
                            class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500" />
                        <input v-model="form.new_password_confirmation" type="password" autocomplete="new-password"
                            placeholder="Neues Passwort bestätigen"
                            class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500" />
                    </div>
                </div>

                <div
                    class="md:col-span-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-950">
                    <p class="mb-2 font-semibold text-zinc-800 dark:text-zinc-100">Rollen (nur Lesen)</p>
                    <div class="flex flex-wrap gap-2">
                        <span v-for="role in currentUser?.roles || []" :key="role.id"
                            class="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                            {{ role.name }}
                        </span>
                        <span v-if="!(currentUser?.roles || []).length" class="text-zinc-500 dark:text-zinc-400">Keine
                            Rolle gesetzt</span>
                    </div>
                </div>

                <div class="md:col-span-2 flex items-center justify-between">
                    <p v-if="error" class="text-sm text-red-500 dark:text-red-400">{{ error }}</p>
                    <button :disabled="saving"
                        class="ml-auto rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-60">
                        {{ saving ? 'Speichert...' : 'Profil speichern' }}
                    </button>
                </div>
            </form>
        </section>

        <div v-if="mfaSetupOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            @click.self="closeMfaSetupModal">
            <div
                class="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                <div class="mb-4">
                    <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">Authenticator einrichten</h3>
                    <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Scanne den QR-Code mit deiner Authenticator-App. Du kannst den Link zusätzlich erneut per E-Mail
                        versenden.
                    </p>
                </div>

                <div
                    class="mb-4 flex justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
                    <img v-if="mfaSetupQrDataUrl" :src="mfaSetupQrDataUrl" alt="Authenticator QR-Code"
                        class="h-64 w-64 rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-700" />
                    <p v-else class="text-sm text-zinc-500 dark:text-zinc-400">QR-Code konnte nicht gerendert werden.
                    </p>
                </div>

                <details
                    class="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
                    <summary class="cursor-pointer text-sm text-zinc-700 dark:text-zinc-300">Manuelle otpauth URL
                        anzeigen</summary>
                    <div class="mt-2 break-all text-xs text-zinc-600 dark:text-zinc-400">{{ mfaSetupQr }}</div>
                </details>

                <div class="mb-4 grid gap-2">
                    <label for="mfa-setup-code" class="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        Authenticator-Code
                    </label>
                    <input id="mfa-setup-code" v-model="mfaSetupCode" type="text" inputmode="numeric" maxlength="8"
                        placeholder="z. B. 123456"
                        class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500" />
                    <p class="text-xs text-zinc-500 dark:text-zinc-400">
                        Nach dem Scannen kannst du den aktuellen App-Code hier eingeben und sofort aktivieren.
                    </p>
                </div>

                <div class="flex flex-wrap justify-end gap-2">
                    <button type="button"
                        class="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-emerald-400 disabled:opacity-60"
                        :disabled="mfaSetupActivating" @click="activateAuthenticatorNow">
                        {{ mfaSetupActivating ? 'Aktiviere...' : 'Jetzt aktivieren' }}
                    </button>
                    <button type="button"
                        class="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        :disabled="mfaSetupMailSending" @click="resendMfaActivationEmail">
                        {{ mfaSetupMailSending ? 'Sende...' : 'Per E-Mail erneut senden' }}
                    </button>
                    <button type="button"
                        class="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-emerald-400"
                        @click="closeMfaSetupModal">
                        Schließen
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
