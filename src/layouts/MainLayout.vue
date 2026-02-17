<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
    Award,
    Bell,
    ChevronLeft,
    ClipboardList,
    FileText,
    LayoutDashboard,
    Lock,
    LogOut,
    Menu,
    Moon,
    PenTool,
    Puzzle,
    Search,
    Settings,
    Shield,
    Sun,
    TimerReset,
    User,
    Users,
    X,
} from 'lucide-vue-next'
import api from '@/lib/api'
import { writeFeatureAccessSnapshot } from '@/lib/featureAccess'
import { clearSession, formatRemaining, getRemainingSeconds, getToken, setSession } from '@/lib/session'
import ThemeSwitcher from '@stratton-cologne/ui'

interface NavItem {
    label: string
    icon: unknown
    to?: string
    toPath?: string
    requiredModule?: string
}

interface NavSection {
    title: string
    items: NavItem[]
}

interface CurrentUser {
    id: number
    name: string
    email: string
    position?: string | null
    avatar_url?: string | null
}

interface ActivePluginEntry {
    plugin_id: string
    name: string
    frontend_entry?: string | null
}

const sidebarOpen = ref(false)
const collapsed = ref(false)
const router = useRouter()
const route = useRoute()
const sessionSeconds = ref(0)
const confirmLogoutOpen = ref(false)
const refreshing = ref(false)
const currentUser = ref<CurrentUser | null>(null)
const entitlementsByModule = ref<Record<string, boolean>>({})
const entitlementsLoaded = ref(false)
const activePlugins = ref<ActivePluginEntry[]>([])
let sessionInterval: number | null = null

const sessionText = computed(() => formatRemaining(sessionSeconds.value))
const sessionCritical = computed(() => sessionSeconds.value > 0 && sessionSeconds.value <= 120)
const userInitials = computed(() => {
    const name = (currentUser.value?.name || '').trim()
    if (!name) return 'U'
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join('')
})
const userShortName = computed(() => (currentUser.value?.name || 'User').split(' ')[0])
const userRoleLabel = computed(() => currentUser.value?.position || 'Mitarbeiter')

const stopSessionTimer = () => {
    if (sessionInterval !== null) {
        window.clearInterval(sessionInterval)
        sessionInterval = null
    }
}

const tickSession = () => {
    sessionSeconds.value = getRemainingSeconds()
    if (sessionSeconds.value <= 0 && getToken()) {
        clearSession()
        router.push('/login')
    }
}

const startSessionTimer = () => {
    tickSession()
    stopSessionTimer()
    sessionInterval = window.setInterval(tickSession, 1000)
}

const logout = async () => {
    try {
        await api.post('/auth/logout')
    } catch {
        // Ignore API errors and clear local session anyway.
    } finally {
        clearSession()
        router.push('/login')
    }
}

const requestLogout = () => {
    confirmLogoutOpen.value = true
}

const cancelLogout = () => {
    confirmLogoutOpen.value = false
}

const confirmLogout = async () => {
    confirmLogoutOpen.value = false
    await logout()
}

const refreshSession = async () => {
    if (refreshing.value) return
    refreshing.value = true
    try {
        const response = await api.post('/auth/refresh')
        setSession(response.data.access_token, response.data.expires_in)
        tickSession()
    } catch {
        clearSession()
        router.push('/login')
    } finally {
        refreshing.value = false
    }
}

const loadCurrentUser = async () => {
    try {
        const response = await api.post('/auth/me')
        currentUser.value = response.data
    } catch {
        // Keep UI fallback values if user endpoint fails.
    }
}

const loadEntitlements = async () => {
    try {
        const response = await api.get('/auth/entitlements/me')
        const modules = Array.isArray(response?.data?.modules) ? response.data.modules : []
        const mapped: Record<string, boolean> = {}
        for (const entry of modules) {
            const key = String(entry?.module_key || '')
            if (!key) continue
            mapped[key] = Boolean(entry?.entitled)
        }
        entitlementsByModule.value = mapped
        entitlementsLoaded.value = true
        writeFeatureAccessSnapshot({
            fetchedAt: Date.now(),
            modules: mapped,
            activePluginIds: activePlugins.value.map((entry) => entry.plugin_id),
        })
    } catch {
        entitlementsLoaded.value = false
    }
}

const loadActivePlugins = async () => {
    try {
        const response = await api.get('/plugins/active')
        const rows = Array.isArray(response?.data) ? response.data : []
        activePlugins.value = rows
            .map((row: any) => ({
                plugin_id: String(row?.plugin_id || ''),
                name: String(row?.name || row?.plugin_id || ''),
                frontend_entry: row?.frontend_entry ? String(row.frontend_entry) : null,
            }))
            .filter((entry: ActivePluginEntry) => entry.plugin_id.length > 0)
        writeFeatureAccessSnapshot({
            fetchedAt: Date.now(),
            modules: entitlementsByModule.value,
            activePluginIds: activePlugins.value.map((entry) => entry.plugin_id),
        })
    } catch {
        activePlugins.value = []
    }
}

const handleProfileUpdated = (event: Event) => {
    const customEvent = event as CustomEvent<CurrentUser>
    if (customEvent.detail) {
        currentUser.value = customEvent.detail
    }
}

onMounted(() => {
    startSessionTimer()
    loadCurrentUser()
    loadEntitlements()
    loadActivePlugins()
    window.addEventListener('profile-updated', handleProfileUpdated as EventListener)
})

onBeforeUnmount(() => {
    stopSessionTimer()
    window.removeEventListener('profile-updated', handleProfileUpdated as EventListener)
})

const navSections: NavSection[] = [
    { title: 'Übersicht', items: [{ label: 'Dashboard', icon: LayoutDashboard, to: 'Dashboard' }] },
    { title: 'Verwaltung', items: [{ label: 'Benutzer', icon: Users, to: 'Users' }, { label: 'Rollen', icon: Shield, to: 'Roles' }] },
    { title: 'Content', items: [{ label: 'Seiten', icon: FileText, requiredModule: 'cms' }, { label: 'Blog', icon: PenTool, requiredModule: 'cms' }] },
    { title: 'Compliance', items: [{ label: 'Audit-Logs', icon: ClipboardList, requiredModule: 'security' }, { label: 'Datenschutz', icon: Lock, requiredModule: 'security' }] },
    { title: 'Einstellungen', items: [{ label: 'Lizenzen', icon: Award, to: 'SettingsLicenses' }] },
]

const desktopSidebarWidth = computed(() => (collapsed.value ? 'lg:pl-20' : 'lg:pl-64'))
const desktopSidebarClass = computed(() => (collapsed.value ? 'w-20' : 'w-64'))
const headerTitle = computed(() => (route.meta.title as string) || 'Dashboard')
const hasEntitlement = (moduleKey?: string) => {
    if (!moduleKey) return true
    if (!entitlementsLoaded.value) return true
    return entitlementsByModule.value[moduleKey] === true
}
const visibleNavSections = computed(() =>
    ([
        ...navSections,
        {
            title: 'Plugins',
            items: activePlugins.value.map((plugin) => ({
                label: plugin.name,
                icon: Puzzle,
                toPath: plugin.frontend_entry && plugin.frontend_entry.startsWith('/') ? plugin.frontend_entry : undefined,
            })),
        },
    ] as NavSection[])
        .map((section) => ({
            ...section,
            items: section.items.filter((item) => hasEntitlement(item.requiredModule)),
        }))
        .filter((section) => section.items.length > 0)
)

const isItemActive = (item: NavItem) => {
    if (item.to) return route.name === item.to
    if (item.toPath) return route.path === item.toPath || route.path.startsWith(item.toPath + '/')
    return false
}
const navigateTo = (item: NavItem) => {
    if (item.to) {
        router.push({ name: item.to })
        sidebarOpen.value = false
        return
    }
    if (item.toPath) {
        router.push(item.toPath)
    }
    sidebarOpen.value = false
}

const openProfile = () => {
    router.push({ name: 'Profile' })
    sidebarOpen.value = false
}

const openSettingsLicenses = () => {
    router.push({ name: 'SettingsLicenses' })
    sidebarOpen.value = false
}
</script>

<template>
    <div class="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <aside
            class="fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-zinc-200 bg-white transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900 lg:flex"
            :class="desktopSidebarClass">
            <div class="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div
                        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 font-bold text-white">
                        EP
                    </div>
                    <span v-if="!collapsed" class="font-semibold text-zinc-900 dark:text-white">Enterprise</span>
                </div>
                <button
                    class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                    @click="collapsed = !collapsed">
                    <ChevronLeft class="h-5 w-5" :class="collapsed ? 'rotate-180' : ''" />
                </button>
            </div>

            <nav class="flex-1 overflow-y-auto px-3 py-2.5">
                <div v-for="section in visibleNavSections" :key="section.title" class="mb-5">
                    <h3 v-if="!collapsed"
                        class="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        {{ section.title }}
                    </h3>
                    <ul class="space-y-1">
                        <li v-for="item in section.items" :key="item.label">
                            <button
                                class="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
                                :class="[
                                    collapsed ? 'justify-center' : 'gap-3',
                                    isItemActive(item)
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
                                ]"
                                @click="navigateTo(item)">
                                <component :is="item.icon" class="h-5 w-5 shrink-0"
                                    :class="isItemActive(item) ? 'text-emerald-600 dark:text-emerald-400' : ''" />
                                <span v-if="!collapsed">{{ item.label }}</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </nav>

            <div class="border-t border-zinc-200 p-3 dark:border-zinc-800">
                <button
                    class="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                    :class="collapsed ? 'justify-center' : 'gap-3'"
                    @click="openSettingsLicenses">
                    <Settings class="h-5 w-5" />
                    <span v-if="!collapsed">Einstellungen</span>
                </button>

                <button
                    class="mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-all duration-200 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    :class="collapsed ? 'justify-center' : 'gap-3'"
                    @click="requestLogout">
                    <LogOut class="h-5 w-5" />
                    <span v-if="!collapsed">Abmelden</span>
                </button>

                <button
                    v-if="!collapsed"
                    class="mt-3 flex w-full items-center gap-3 rounded-xl bg-zinc-50 p-3 text-left transition-colors hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                    @click="openProfile">
                    <div
                        v-if="currentUser?.avatar_url"
                        class="h-10 w-10 overflow-hidden rounded-full border border-zinc-300 dark:border-zinc-700">
                        <img :src="currentUser.avatar_url" alt="Profilbild" class="h-full w-full object-cover" />
                    </div>
                    <div
                        v-else
                        class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600 text-sm font-semibold text-white">
                        {{ userInitials }}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-zinc-900 dark:text-white">{{ currentUser?.name || 'Benutzerprofil' }}</p>
                        <p class="truncate text-xs text-zinc-500 dark:text-zinc-400">{{ userRoleLabel }}</p>
                    </div>
                </button>
            </div>
        </aside>

        <div class="flex min-h-screen flex-col transition-all duration-300" :class="desktopSidebarWidth">
            <header
                class="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/80 md:px-6">
                <div class="flex items-center gap-4">
                    <button
                        class="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white lg:hidden"
                        @click="sidebarOpen = true">
                        <Menu class="h-6 w-6" />
                    </button>
                    <h1 class="text-xl font-semibold text-zinc-900 dark:text-white">{{ headerTitle }}</h1>
                </div>

                <div class="hidden flex-1 justify-center px-8 md:flex">
                    <div class="relative w-full max-w-md">
                        <Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                        <input type="text" placeholder="Suchen..."
                            class="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-emerald-500" />
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <div
                        class="hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold md:flex"
                        :class="sessionCritical
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                            : 'border-zinc-700 bg-zinc-800/50 text-zinc-300'">
                        <span>Session {{ sessionText }}</span>
                        <button
                            class="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 px-2 py-1 text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
                            :disabled="refreshing"
                            @click="refreshSession">
                            <TimerReset class="h-3.5 w-3.5" />
                            <span>{{ refreshing ? '...' : 'Refresh' }}</span>
                        </button>
                    </div>

                    <ThemeSwitcher
                        v-slot="{ isDark }"
                        class="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white">
                        <Sun v-if="isDark" class="h-5 w-5" />
                        <Moon v-else class="h-5 w-5" />
                    </ThemeSwitcher>

                    <div class="relative">
                        <button
                            class="relative flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white">
                            <Bell class="h-5 w-5" />
                            <span
                                class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
                                2
                            </span>
                        </button>
                    </div>

                    <button
                        class="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        @click="openProfile">
                        <div
                            v-if="currentUser?.avatar_url"
                            class="h-8 w-8 overflow-hidden rounded-full border border-zinc-300 dark:border-zinc-700">
                            <img :src="currentUser.avatar_url" alt="Profilbild" class="h-full w-full object-cover" />
                        </div>
                        <div
                            v-else
                            class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-semibold text-white">
                            {{ userInitials.charAt(0) }}
                        </div>
                        <span class="hidden text-sm font-medium text-zinc-700 dark:text-zinc-300 md:block">{{ userShortName }}</span>
                    </button>
                </div>
            </header>

            <main class="flex-1 p-4 md:p-6 lg:p-8">
                <slot />
            </main>

            <footer class="border-t border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div
                    class="flex flex-col items-center justify-between gap-2 text-sm text-zinc-500 sm:flex-row dark:text-zinc-400">
                    <p>Enterprise Platform v1.0.0</p>
                    <p>2026 Alle Rechte vorbehalten</p>
                </div>
            </footer>
        </div>

        <div v-if="sidebarOpen" class="fixed inset-0 z-[60] lg:hidden">
            <div class="absolute inset-0 bg-black/60" @click="sidebarOpen = false" />
            <aside class="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-zinc-800 bg-zinc-900">
                <div class="flex h-16 items-center justify-between border-b border-zinc-800 px-4">
                    <div class="flex items-center gap-3">
                        <div
                            class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 font-bold text-white">
                            EP</div>
                        <span class="font-semibold text-white">Enterprise</span>
                    </div>
                    <button class="text-zinc-400" @click="sidebarOpen = false">
                        <ChevronLeft class="h-5 w-5" />
                    </button>
                </div>
                <nav class="flex-1 overflow-y-auto px-3 py-2.5">
                    <div v-for="section in visibleNavSections" :key="section.title" class="mb-5">
                        <h3 class="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            {{ section.title }}
                        </h3>
                        <ul class="space-y-1">
                            <li v-for="item in section.items" :key="item.label">
                                <button
                                    class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
                                    :class="isItemActive(item)
                                        ? 'bg-emerald-900/30 text-emerald-400'
                                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'"
                                    @click="navigateTo(item)">
                                    <component :is="item.icon" class="h-5 w-5 shrink-0" />
                                    <span>{{ item.label }}</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </nav>
                <div class="p-3">
                    <button
                        class="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-300 transition-all duration-200 hover:bg-zinc-800 hover:text-white"
                        @click="openProfile">
                        <User class="h-5 w-5" />
                        <span>Profil</span>
                    </button>
                    <button
                        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 transition-all duration-200 hover:bg-red-900/20"
                        @click="requestLogout">
                        <LogOut class="h-5 w-5" />
                        <span>Abmelden</span>
                    </button>
                </div>
            </aside>
        </div>

        <div v-if="confirmLogoutOpen" class="fixed inset-0 z-[80] flex items-center justify-center px-4">
            <div class="absolute inset-0 bg-black/70" @click="cancelLogout" />
            <div class="relative w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
                <div class="mb-3 flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-white">Abmelden?</h3>
                    <button
                        class="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                        @click="cancelLogout">
                        <X class="h-4 w-4" />
                    </button>
                </div>
                <p class="text-sm text-zinc-400">Möchtest du die Sitzung wirklich beenden?</p>
                <div class="mt-5 flex items-center justify-end gap-2">
                    <button
                        class="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800"
                        @click="cancelLogout">
                        Nein
                    </button>
                    <button
                        class="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
                        @click="confirmLogout">
                        Ja, abmelden
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
