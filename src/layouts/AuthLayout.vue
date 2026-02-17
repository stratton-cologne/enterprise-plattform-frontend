<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import ThemeSwitcher from '@stratton-cologne/ui'
</script>

<template>
    <div class="relative min-h-screen bg-zinc-100 dark:bg-finley-dark-bg flex items-center justify-center p-4">
        <div
            class="fixed inset-0 pointer-events-none bg-gradient-to-br from-cyan-200/60 via-white to-emerald-100/40 dark:from-finley-indigo/20 dark:via-finley-dark-bg dark:to-finley-teal/10" />
        <ThemeSwitcher v-slot="{ isDark }"
            class="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-300 bg-white/80 text-zinc-700 backdrop-blur hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:bg-zinc-900">
            <Sun v-if="isDark" class="h-5 w-5" />
            <Moon v-else class="h-5 w-5" />
        </ThemeSwitcher>
        <div class="w-full max-w-md relative z-10">
            <slot />
        </div>
    </div>
</template>
