<script setup lang="ts">
import { ArrowRight, ClipboardList, FileText, ShieldCheck, TrendingUp, Users } from 'lucide-vue-next'

const stats = [
  {
    title: 'Aktive Benutzer',
    value: '142',
    suffix: '/ 156',
    trend: '+8.2%',
    trendUp: true,
    icon: Users,
    iconClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    title: 'Seiten veröffentlicht',
    value: '48',
    suffix: '',
    trend: '+3.1%',
    trendUp: true,
    icon: FileText,
    iconClass: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    title: 'Compliance-Checks',
    value: '12',
    suffix: '/ 12',
    trend: '100%',
    trendUp: true,
    icon: ShieldCheck,
    iconClass: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  },
  {
    title: 'Audit-Einträge (24h)',
    value: '326',
    suffix: '',
    trend: '+11.4%',
    trendUp: true,
    icon: ClipboardList,
    iconClass: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  },
]

const activities = [
  { id: 1, title: 'Rolle "Manager" aktualisiert', time: 'vor 6 Minuten' },
  { id: 2, title: 'Neuer Benutzer angelegt', time: 'vor 17 Minuten' },
  { id: 3, title: 'Profiländerung bestätigt', time: 'vor 43 Minuten' },
  { id: 4, title: 'Compliance-Bericht exportiert', time: 'heute, 09:12' },
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Guten Tag!</h1>
        <p class="mt-1 text-zinc-500 dark:text-zinc-400">Hier ist die aktuelle Übersicht Ihrer Plattform</p>
      </div>
      <button
        class="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl">
        Aktivität anzeigen
      </button>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="card in stats"
        :key="card.title"
        class="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">{{ card.title }}</p>
            <p class="mt-2 flex items-baseline gap-1">
              <span class="text-3xl font-bold text-zinc-900 dark:text-white">{{ card.value }}</span>
              <span class="text-sm text-zinc-400">{{ card.suffix }}</span>
            </p>
          </div>
          <div
            class="mt-0.5 flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
            :class="card.iconClass">
            <component :is="card.icon" class="h-6 w-6" />
          </div>
        </div>
        <div class="mt-4 flex items-center gap-2">
          <span
            class="flex items-center gap-1 text-sm font-medium"
            :class="card.trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
            <TrendingUp class="h-4 w-4" />
            {{ card.trend }}
          </span>
          <span class="text-sm text-zinc-400">vs. letzter Zeitraum</span>
        </div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <div class="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div class="flex items-center justify-between border-b border-zinc-200 p-6 dark:border-zinc-800">
            <h2 class="text-lg font-semibold text-zinc-900 dark:text-white">Letzte Aktivitäten</h2>
            <button
              class="flex items-center gap-1 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400">
              Verlauf öffnen
              <ArrowRight class="h-4 w-4" />
            </button>
          </div>

          <div class="divide-y divide-zinc-100 dark:divide-zinc-800">
            <div
              v-for="activity in activities"
              :key="activity.id"
              class="flex items-center justify-between p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <p class="font-medium text-zinc-900 dark:text-white">{{ activity.title }}</p>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ activity.time }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 class="text-lg font-semibold text-zinc-900 dark:text-white">Status</h2>
          <div class="mt-4 space-y-3 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-zinc-500 dark:text-zinc-400">System</span>
              <span class="font-semibold text-emerald-600 dark:text-emerald-400">Online</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-zinc-500 dark:text-zinc-400">Sitzungen aktiv</span>
              <span class="font-semibold text-zinc-900 dark:text-white">34</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-zinc-500 dark:text-zinc-400">Letzte Synchronisation</span>
              <span class="font-semibold text-zinc-900 dark:text-white">vor 2 Min.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

