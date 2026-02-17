<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useToast } from '@stratton-cologne/vue-smart-toast'
import api from '@/lib/api'

type Permission = { id: number; name: string; slug: string }
type Role = {
    id: number
    name: string
    slug: string
    parent_id?: number | null
    permissions: Permission[]
}

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const { showToast } = useToast()
const roles = ref<Role[]>([])
const permissions = ref<Permission[]>([])
const selectedRoleId = ref<number | null>(null)
const modalOpen = ref(false)
const searchTerm = ref('')
const perPage = ref(10)
const currentPage = ref(1)

const form = reactive({
    name: '',
    slug: '',
    parent_id: '' as '' | number,
    permissionIds: [] as number[],
})

const resetForm = () => {
    selectedRoleId.value = null
    form.name = ''
    form.slug = ''
    form.parent_id = ''
    form.permissionIds = []
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

const fillFromRole = (role: Role) => {
    selectedRoleId.value = role.id
    form.name = role.name
    form.slug = role.slug
    form.parent_id = role.parent_id ?? ''
    form.permissionIds = role.permissions.map((p) => Number(p.id))
    error.value = ''
    modalOpen.value = true
}

const loadData = async () => {
    loading.value = true
    error.value = ''
    try {
        const [rolesRes, permissionsRes] = await Promise.all([api.get('/rbac/roles'), api.get('/rbac/permissions')])
        roles.value = rolesRes.data
        permissions.value = permissionsRes.data
    } catch (e: any) {
        error.value = getApiError(e, 'Rollen konnten nicht geladen werden')
        showToast({ key: 'roles-load-error', message: error.value, type: 'danger', position: 'top-right' })
    } finally {
        loading.value = false
    }
}

const saveRole = async () => {
    saving.value = true
    error.value = ''
    const isEdit = selectedRoleId.value !== null
    try {
        const payload = {
            name: form.name,
            slug: form.slug,
            parent_id: form.parent_id || null,
            permissions: form.permissionIds.map((id) => Number(id)),
        }
        if (selectedRoleId.value) {
            await api.put(`/rbac/roles/${selectedRoleId.value}`, payload)
        } else {
            await api.post('/rbac/roles', payload)
        }
        await loadData()
        closeModal()
        resetForm()
        showToast({
            key: 'role-save-success',
            message: isEdit ? 'Rolle erfolgreich aktualisiert.' : 'Rolle erfolgreich erstellt.',
            type: 'success',
            position: 'top-right',
        })
    } catch (e: any) {
        error.value = getApiError(e, 'Rolle konnte nicht gespeichert werden')
        showToast({ key: 'role-save-error', message: error.value, type: 'danger', position: 'top-right' })
    } finally {
        saving.value = false
    }
}

const deleteRole = async (id: number) => {
    if (!confirm('Rolle wirklich löschen?')) return
    error.value = ''
    try {
        await api.delete(`/rbac/roles/${id}`)
        await loadData()
        if (selectedRoleId.value === id) resetForm()
        showToast({ key: 'role-delete-success', message: 'Rolle wurde gelöscht.', type: 'success', position: 'top-right' })
    } catch (e: any) {
        error.value = getApiError(e, 'Rolle konnte nicht gelöscht werden')
        showToast({ key: 'role-delete-error', message: error.value, type: 'danger', position: 'top-right' })
    }
}

const roleNameById = computed(() => {
    const map = new Map<number, string>()
    roles.value.forEach((r) => map.set(Number(r.id), r.name))
    return map
})

const filteredRoles = computed(() => {
    const query = searchTerm.value.trim().toLowerCase()
    if (!query) return roles.value
    return roles.value.filter((role) => {
        const permissionsText = role.permissions.map((p) => p.slug).join(' ').toLowerCase()
        const parentName = role.parent_id ? (roleNameById.value.get(Number(role.parent_id)) || '') : ''
        return (
            role.name.toLowerCase().includes(query) ||
            role.slug.toLowerCase().includes(query) ||
            parentName.toLowerCase().includes(query) ||
            permissionsText.includes(query)
        )
    })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRoles.value.length / perPage.value)))
const pagedRoles = computed(() => {
    const start = (currentPage.value - 1) * perPage.value
    return filteredRoles.value.slice(start, start + perPage.value)
})
const pageStart = computed(() => (filteredRoles.value.length === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1))
const pageEnd = computed(() => Math.min(currentPage.value * perPage.value, filteredRoles.value.length))

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
                <h3 class="font-semibold text-zinc-900 dark:text-white">Rollen / Gruppen</h3>
                <button
                    class="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-emerald-400"
                    @click="openCreateModal">
                    Rolle erstellen
                </button>
            </div>
            <div
                class="flex flex-col gap-3 border-b border-zinc-200 px-5 py-3 md:flex-row md:items-center md:justify-between dark:border-zinc-800">
                <div class="relative w-full md:max-w-sm">
                    <input v-model="searchTerm" type="text" placeholder="Suche nach Rolle, Slug, Parent oder Recht ..."
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
            <div v-if="loading" class="px-5 py-4 text-sm text-zinc-500 dark:text-zinc-400">Lade Rollen...</div>
            <div v-else class="overflow-x-auto">
                <table class="min-w-full text-left text-sm">
                    <thead
                        class="border-b border-zinc-200 bg-zinc-100 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
                        <tr>
                            <th class="px-4 py-3">Name</th>
                            <th class="px-4 py-3">Slug</th>
                            <th class="px-4 py-3">Übergeordnet</th>
                            <th class="px-4 py-3">Rechte</th>
                            <th class="px-4 py-3 text-right">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                        <tr v-if="pagedRoles.length === 0">
                            <td colspan="5" class="px-4 py-6 text-center text-zinc-500">Keine Rollen gefunden.</td>
                        </tr>
                        <tr v-for="role in pagedRoles" :key="role.id"
                            class="hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40">
                            <td class="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                                <div class="font-semibold">{{ role.name }}</div>
                                <div class="text-xs text-zinc-500">#{{ role.id }}</div>
                            </td>
                            <td class="px-4 py-3 text-zinc-700 dark:text-zinc-300">{{ role.slug }}</td>
                            <td class="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                                {{ role.parent_id ? (roleNameById.get(Number(role.parent_id)) || '-') : '-' }}
                            </td>
                            <td class="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                                {{role.permissions.map((p) => p.slug).join(', ') || 'keine'}}
                            </td>
                            <td class="px-4 py-3 text-right">
                                <div class="inline-flex gap-2">
                                    <button
                                        class="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                        @click="fillFromRole(role)">
                                        Bearbeiten
                                    </button>
                                    <button
                                        class="rounded-md border border-red-800 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20"
                                        @click="deleteRole(role.id)">
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
                        Zeige {{ pageStart }}-{{ pageEnd }} von {{ filteredRoles.length }} Einträgen
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
                class="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-300 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
                <div class="mb-4 flex items-center justify-between">
                    <h2 class="text-xl font-semibold text-zinc-900 dark:text-white">
                        {{ selectedRoleId ? `Rolle bearbeiten #${selectedRoleId}` : 'Rolle erstellen' }}
                    </h2>
                    <button class="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white" @click="closeModal">
                        <X class="h-5 w-5" />
                    </button>
                </div>

                <form class="grid gap-3 md:grid-cols-2" @submit.prevent="saveRole">
                    <input v-model="form.name" required placeholder="Rollenname"
                        class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />
                    <input v-model="form.slug" required placeholder="Slug z. B. support-admin"
                        class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500" />

                    <select v-model="form.parent_id"
                        class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white">
                        <option value="">Keine übergeordnete Rolle</option>
                        <option v-for="role in roles.filter((r) => r.id !== selectedRoleId)" :key="role.id"
                            :value="role.id">
                            {{ role.name }}
                        </option>
                    </select>

                    <div class="md:col-span-2">
                        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Rechte</p>
                        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            <label v-for="permission in permissions" :key="permission.id"
                                class="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                                <input v-model="form.permissionIds" type="checkbox" :value="permission.id" />
                                <span>{{ permission.slug }}</span>
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
                                {{ saving ? 'Speichert...' : selectedRoleId ? 'Speichern' : 'Erstellen' }}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>
