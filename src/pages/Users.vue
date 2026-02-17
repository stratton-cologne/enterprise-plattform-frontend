<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useToast } from '@stratton-cologne/vue-smart-toast'
import api from '@/lib/api'

type Role = { id: number; name: string; slug: string }
type User = {
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
    roles: Role[]
}

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const { showToast } = useToast()
const users = ref<User[]>([])
const roles = ref<Role[]>([])
const selectedUserId = ref<number | null>(null)
const modalOpen = ref(false)
const searchTerm = ref('')
const perPage = ref(10)
const currentPage = ref(1)

const form = reactive({
    name: '',
    email: '',
    phone: '',
    street: '',
    postal_code: '',
    city: '',
    country: 'Deutschland',
    department: '',
    position: '',
    password: '',
    password_valid_days: 1 as 1 | 3 | 7,
    mfa_method: 'email' as 'email' | 'authenticator',
    roleIds: [] as number[],
})

const resetForm = () => {
    selectedUserId.value = null
    form.name = ''
    form.email = ''
    form.phone = ''
    form.street = ''
    form.postal_code = ''
    form.city = ''
    form.country = 'Deutschland'
    form.department = ''
    form.position = ''
    form.password = ''
    form.password_valid_days = 1
    form.mfa_method = 'email'
    form.roleIds = []
}

const openCreateModal = () => {
    resetForm()
    error.value = ''
    modalOpen.value = true
}

const closeModal = () => {
    modalOpen.value = false
}

const getApiError = (e: any, fallback: string) => {
    const data = e?.response?.data
    if (!data) return fallback
    if (typeof data.error === 'string' && typeof data.message === 'string') return `${data.error}: ${data.message}`
    if (typeof data.error === 'string') return data.error
    if (typeof data.message === 'string') return data.message
    if (data.errors && typeof data.errors === 'object') {
        const first = Object.values(data.errors)?.[0] as unknown
        if (Array.isArray(first) && first[0]) return String(first[0])
    }
    return fallback
}

const fillFromUser = (user: User) => {
    selectedUserId.value = Number(user.id)
    form.name = user.name
    form.email = user.email
    form.phone = user.phone || ''
    form.street = user.street || ''
    form.postal_code = user.postal_code || ''
    form.city = user.city || ''
    form.country = user.country || 'Deutschland'
    form.department = user.department || ''
    form.position = user.position || ''
    form.password = ''
    form.mfa_method = user.mfa_method || 'email'
    form.roleIds = user.roles.map((r) => Number(r.id))
    error.value = ''
    modalOpen.value = true
}

const loadData = async () => {
    loading.value = true
    error.value = ''
    try {
        const [usersRes, rolesRes] = await Promise.all([api.get('/rbac/users'), api.get('/rbac/roles')])
        users.value = usersRes.data
        roles.value = rolesRes.data
    } catch (e: any) {
        error.value = getApiError(e, 'Benutzer konnten nicht geladen werden')
        showToast({ key: 'users-load-error', message: error.value, type: 'danger', position: 'top-right' })
    } finally {
        loading.value = false
    }
}

const saveUser = async () => {
    saving.value = true
    error.value = ''
    const isEdit = selectedUserId.value !== null
    try {
        const payload = {
            name: form.name,
            email: form.email,
            phone: form.phone || null,
            street: form.street || null,
            postal_code: form.postal_code || null,
            city: form.city || null,
            country: form.country || null,
            department: form.department || null,
            position: form.position || null,
            password_valid_days: form.password_valid_days,
            password: form.password || undefined,
            mfa_method: form.mfa_method,
            roles: form.roleIds.map((id) => Number(id)),
        }

        if (selectedUserId.value) {
            await api.put(`/rbac/users/${selectedUserId.value}`, payload)
        } else {
            await api.post('/rbac/users', { ...payload, password: undefined })
        }

        await loadData()
        closeModal()
        resetForm()
        showToast({
            key: 'user-save-success',
            message: isEdit ? 'Benutzer erfolgreich aktualisiert.' : 'Benutzer erfolgreich erstellt.',
            type: 'success',
            position: 'top-right',
        })
    } catch (e: any) {
        error.value = getApiError(e, 'Benutzer konnte nicht gespeichert werden')
        showToast({ key: 'user-save-error', message: error.value, type: 'danger', position: 'top-right' })
    } finally {
        saving.value = false
    }
}

const deleteUser = async (id: number) => {
    if (!confirm('Benutzer wirklich löschen?')) return
    error.value = ''
    try {
        await api.delete(`/rbac/users/${id}`)
        await loadData()
        if (selectedUserId.value === id) resetForm()
        showToast({ key: 'user-delete-success', message: 'Benutzer wurde gelöscht.', type: 'success', position: 'top-right' })
    } catch (e: any) {
        error.value = getApiError(e, 'Benutzer konnte nicht gelöscht werden')
        showToast({ key: 'user-delete-error', message: error.value, type: 'danger', position: 'top-right' })
    }
}

const filteredUsers = computed(() => {
    const query = searchTerm.value.trim().toLowerCase()
    if (!query) return users.value
    return users.value.filter((user) => {
        const rolesText = user.roles.map((r) => r.name).join(' ').toLowerCase()
        return (
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            (user.department || '').toLowerCase().includes(query) ||
            (user.position || '').toLowerCase().includes(query) ||
            (user.city || '').toLowerCase().includes(query) ||
            rolesText.includes(query)
        )
    })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / perPage.value)))
const pagedUsers = computed(() => {
    const start = (currentPage.value - 1) * perPage.value
    return filteredUsers.value.slice(start, start + perPage.value)
})
const pageStart = computed(() => (filteredUsers.value.length === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1))
const pageEnd = computed(() => Math.min(currentPage.value * perPage.value, filteredUsers.value.length))

watch([searchTerm, perPage], () => {
    currentPage.value = 1
})

watch(totalPages, (pages) => {
    if (currentPage.value > pages) currentPage.value = pages
})

onMounted(loadData)
</script>

<template>
    <div class="space-y-6">
        <section class="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div class="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
                <h3 class="font-semibold text-zinc-900 dark:text-white">Benutzer</h3>
                <button
                    class="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-emerald-400"
                    @click="openCreateModal">
                    Benutzer erstellen
                </button>
            </div>
            <div
                class="flex flex-col gap-3 border-b border-zinc-200 px-5 py-3 md:flex-row md:items-center md:justify-between dark:border-zinc-800">
                <div class="relative w-full md:max-w-sm">
                    <input v-model="searchTerm" type="text" placeholder="Suche nach Name, E-Mail, Rolle, Abteilung ..."
                        class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />
                </div>
                <div class="flex items-center gap-2 text-sm">
                    <label class="text-zinc-500 dark:text-zinc-400">Einträge pro Seite</label>
                    <select v-model.number="perPage"
                        class="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white">
                        <option :value="10">10</option>
                        <option :value="25">25</option>
                        <option :value="50">50</option>
                    </select>
                </div>
            </div>
            <div v-if="loading" class="px-5 py-4 text-sm text-zinc-500 dark:text-zinc-400">Lade Benutzer...</div>
            <div v-else class="overflow-x-auto">
                <table class="min-w-full text-left text-sm">
                    <thead
                        class="border-b border-zinc-200 bg-zinc-100 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
                        <tr>
                            <th class="px-4 py-3">Name</th>
                            <th class="px-4 py-3">Kontakt</th>
                            <th class="px-4 py-3">Abteilung / Position</th>
                            <th class="px-4 py-3">Rollen</th>
                            <th class="px-4 py-3">MFA</th>
                            <th class="px-4 py-3 text-right">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                        <tr v-if="pagedUsers.length === 0">
                            <td colspan="6" class="px-4 py-6 text-center text-zinc-500">Keine Benutzer gefunden.</td>
                        </tr>
                        <tr v-for="user in pagedUsers" :key="user.id"
                            class="hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40">
                            <td class="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                                <div class="font-semibold">{{ user.name }}</div>
                                <div class="text-xs text-zinc-500">#{{ user.id }}</div>
                            </td>
                            <td class="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                                <div>{{ user.email }}</div>
                                <div class="text-xs text-zinc-500">{{ user.phone || '-' }}</div>
                                <div class="text-xs text-zinc-500">
                                    {{ user.street || '-' }}, {{ user.postal_code || '-' }} {{ user.city || '-' }}, {{
                                    user.country || '-' }}
                                </div>
                            </td>
                            <td class="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                                <div>{{ user.department || '-' }}</div>
                                <div class="text-xs text-zinc-500">{{ user.position || '-' }}</div>
                            </td>
                            <td class="px-4 py-3 text-zinc-700 dark:text-zinc-300">{{user.roles.map((r) =>
                                r.name).join(', ') || 'keine' }}</td>
                            <td class="px-4 py-3">
                                <span
                                    class="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">{{
                                    user.mfa_method || 'email' }}</span>
                            </td>
                            <td class="px-4 py-3 text-right">
                                <div class="inline-flex gap-2">
                                    <button
                                        class="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                        @click="fillFromUser(user)">
                                        Bearbeiten
                                    </button>
                                    <button
                                        class="rounded-md border border-red-800 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20"
                                        @click="deleteUser(user.id)">
                                        Löschen
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div
                    class="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600 md:flex-row md:items-center md:justify-between dark:border-zinc-800 dark:text-zinc-400">
                    <div>
                        Zeige {{ pageStart }}-{{ pageEnd }} von {{ filteredUsers.length }} Einträgen
                    </div>
                    <div class="flex items-center gap-2">
                        <button
                            class="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            :disabled="currentPage <= 1" @click="currentPage -= 1">
                            Zurück
                        </button>
                        <span
                            class="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">Seite
                            {{ currentPage }} / {{ totalPages }}</span>
                        <button
                            class="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            :disabled="currentPage >= totalPages" @click="currentPage += 1">
                            Weiter
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <p v-if="error && !modalOpen" class="text-sm text-red-400">{{ error }}</p>

        <div v-if="modalOpen" class="fixed inset-0 z-[90] flex items-center justify-center px-4">
            <div class="absolute inset-0 bg-black/70" @click="closeModal" />
            <div
                class="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-300 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
                <div class="mb-4 flex items-center justify-between">
                    <h2 class="text-xl font-semibold text-zinc-900 dark:text-white">
                        {{ selectedUserId ? `Benutzer bearbeiten #${selectedUserId}` : 'Benutzer erstellen' }}
                    </h2>
                    <button class="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white" @click="closeModal">
                        <X class="h-5 w-5" />
                    </button>
                </div>

                <form class="grid gap-3 md:grid-cols-2" @submit.prevent="saveUser">
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
                    <template v-if="selectedUserId">
                        <input v-model="form.password" type="password" placeholder="Neues Passwort (optional)"
                            class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />
                    </template>
                    <template v-else>
                        <select v-model="form.password_valid_days"
                            class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white">
                            <option :value="1">Temporäres Passwort: 1 Tag gültig</option>
                            <option :value="3">Temporäres Passwort: 3 Tage gültig</option>
                            <option :value="7">Temporäres Passwort: 7 Tage gültig</option>
                        </select>
                    </template>

                    <input v-model="form.street" placeholder="Straße + Hausnummer"
                        class="md:col-span-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />
                    <input v-model="form.postal_code" placeholder="PLZ"
                        class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />
                    <input v-model="form.city" placeholder="Stadt"
                        class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />
                    <input v-model="form.country" placeholder="Land"
                        class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />

                    <select v-model="form.mfa_method"
                        class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white">
                        <option value="email">MFA via E-Mail</option>
                        <option value="authenticator">MFA via Authenticator</option>
                    </select>

                    <div class="md:col-span-2">
                        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Rollen / Gruppen</p>
                        <div class="flex flex-wrap gap-2">
                            <label v-for="role in roles" :key="role.id"
                                class="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                                <input v-model="form.roleIds" type="checkbox" :value="role.id" />
                                <span>{{ role.name }}</span>
                            </label>
                        </div>
                    </div>

                    <div class="md:col-span-2 flex items-center justify-between">
                        <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
                        <div class="ml-auto flex gap-2">
                            <button type="button"
                                class="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                @click="closeModal">
                                Abbrechen
                            </button>
                            <button :disabled="saving"
                                class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-60">
                                {{ saving ? 'Speichert...' : selectedUserId ? 'Speichern' : 'Erstellen' }}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>
