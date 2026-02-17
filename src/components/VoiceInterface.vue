///
<reference path="../types/speech.d.ts" />
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import QuantumOrb from '@/components/QuantumOrb.vue'
import { Volume2, VolumeX, Sparkles } from 'lucide-vue-next'

const isListening = ref(false)
const isProcessing = ref(false)
const transcript = ref('')
const response = ref('')
const isMuted = ref(false)
const recognition = ref<SpeechRecognition | null>(null)

const generateMockResponse = (text: string): string => {
    const lowerText = text.toLowerCase()

    if (lowerText.includes('portfolio') || lowerText.includes('investments')) {
        return 'Your portfolio is up 3.2% this month. Your AI sector holdings are performing particularly well, with a 12% gain. Would you like me to show you the detailed breakdown?'
    }
    if (lowerText.includes('budget') || lowerText.includes('spending')) {
        return "You're currently at 78% of your monthly budget with 5 days remaining. Your entertainment spending is slightly above average. Shall I suggest some adjustments?"
    }
    if (lowerText.includes('goal') || lowerText.includes('savings')) {
        return "You're on track to reach your vacation fund goal by June. At your current savings rate, you'll have $5,200 saved. Keep up the great work!"
    }
    if (lowerText.includes('market') || lowerText.includes('stock')) {
        return 'The market closed mixed today. Tech stocks led gains while energy sector pulled back. Your watchlist stocks NVDA and MSFT are both up over 2%.'
    }

    return `I understand you're asking about ${text}. Let me analyze that for you and provide personalized insights.`
}

const speakResponse = (text: string) => {
    if (!('speechSynthesis' in window)) return

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
}

const handleTranscript = (text: string) => {
    isProcessing.value = true

    setTimeout(() => {
        const mockResponse = generateMockResponse(text)
        response.value = mockResponse
        isProcessing.value = false

        if (!isMuted.value) {
            speakResponse(mockResponse)
        }
    }, 1500)
}

const toggleListening = () => {
    if (!recognition.value) return

    if (isListening.value) {
        recognition.value.stop()
        isListening.value = false
        return
    }

    transcript.value = ''
    response.value = ''
    recognition.value.start()
    isListening.value = true
}

onMounted(() => {
    const SpeechRecognitionCtor = window.webkitSpeechRecognition || window.SpeechRecognition
    if (!SpeechRecognitionCtor) return

    const instance = new SpeechRecognitionCtor()
    instance.continuous = false
    instance.interimResults = true
    instance.lang = 'en-US'

    instance.onresult = (event: SpeechRecognitionEvent) => {
        const current = event.results[event.results.length - 1]
        if (!current || !current[0]) return
        const transcriptText = current[0].transcript
        transcript.value = transcriptText

        if (current.isFinal) {
            handleTranscript(transcriptText)
        }
    }

    instance.onerror = () => {
        isListening.value = false
    }

    instance.onend = () => {
        isListening.value = false
    }

    recognition.value = instance
})

onBeforeUnmount(() => {
    recognition.value?.stop()
})
</script>

<template>
    <Card class="glass-card p-6 space-y-6">
        <div class="flex items-center justify-between">
            <h3 class="text-xl font-semibold text-white">Ask Finley</h3>
            <Button variant="ghost" size="icon" @click="isMuted = !isMuted"
                class="text-finley-silver hover:text-finley-teal">
                <VolumeX v-if="isMuted" class="w-5 h-5" />
                <Volume2 v-else class="w-5 h-5" />
            </Button>
        </div>

        <div class="flex flex-col items-center space-y-6">
            <QuantumOrb :is-listening="isListening" :is-processing="isProcessing" @click="toggleListening" />

            <transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 translate-y-2"
                leave-active-class="transition-all duration-300" leave-to-class="opacity-0 -translate-y-2">
                <div v-if="transcript" class="w-full">
                    <div class="bg-finley-indigo/50 rounded-lg p-4 border border-finley-teal/30">
                        <p class="text-sm text-finley-silver flex items-start gap-2">
                            <Sparkles class="w-4 h-4 text-finley-teal mt-0.5 flex-shrink-0" />
                            <span class="italic">"{{ transcript }}"</span>
                        </p>
                    </div>
                </div>
            </transition>

            <transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 translate-y-2"
                leave-active-class="transition-all duration-300" leave-to-class="opacity-0 -translate-y-2">
                <div v-if="response" class="w-full">
                    <div
                        class="bg-gradient-to-r from-finley-teal/10 to-cyan-500/10 rounded-lg p-4 border border-finley-teal/30">
                        <p class="text-white">{{ response }}</p>
                    </div>
                </div>
            </transition>
        </div>

        <div class="text-center">
            <p class="text-xs text-finley-silver/60">
                Powered by quantum intelligence • Voice-enabled AI assistant
            </p>
        </div>
    </Card>
</template>
