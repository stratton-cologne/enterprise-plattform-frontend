<script setup lang="ts">
import { Mic, MicOff } from 'lucide-vue-next'

interface Props {
    isListening?: boolean
    isProcessing?: boolean
}

withDefaults(defineProps<Props>(), {
    isListening: false,
    isProcessing: false,
})

const emit = defineEmits<{
    click: []
}>()
</script>

<template>
    <div class="relative w-32 h-32 cursor-pointer transition-transform hover:scale-105 active:scale-95"
        @click="emit('click')">
        <template v-if="isListening">
            <div class="absolute inset-0 rounded-full bg-finley-teal/30 animate-ripple" style="animation-delay: 0s" />
            <div class="absolute inset-0 rounded-full bg-finley-teal/30 animate-ripple" style="animation-delay: 0.5s" />
        </template>

        <div class="relative w-full h-full rounded-full quantum-orb flex items-center justify-center"
            :class="{ 'animate-quantum-pulse': isProcessing }">
            <div class="absolute inset-4 rounded-full bg-finley-teal/20 blur-xl transition-opacity duration-500"
                :class="isListening ? 'opacity-100' : 'opacity-30'" />

            <div class="transition-transform duration-300" :class="{ 'scale-110': isListening }">
                <Mic v-if="isListening" class="w-8 h-8 text-finley-teal z-10 relative" />
                <MicOff v-else class="w-8 h-8 text-finley-silver/60 z-10 relative" />
            </div>
        </div>

        <p class="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-finley-silver whitespace-nowrap">
            {{ isProcessing ? 'Processing...' : isListening ? 'Listening...' : 'Click to speak' }}
        </p>
    </div>
</template>
