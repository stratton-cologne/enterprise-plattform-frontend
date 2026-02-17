<script setup lang="ts">
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import { TrendingUp, TrendingDown, Activity, DollarSign, Target, Zap } from 'lucide-vue-next'

interface MarketData {
    name: string
    value: string
    change: number
    trend: 'up' | 'down'
}

const marketData: MarketData[] = [
    { name: 'S&P 500', value: '5,234.18', change: 0.82, trend: 'up' },
    { name: 'NASDAQ', value: '16,392.45', change: 1.24, trend: 'up' },
    { name: 'AI Sector ETF', value: '142.67', change: 3.15, trend: 'up' },
    { name: 'Your Portfolio', value: '$125,430', change: 2.1, trend: 'up' },
]

const insights = [
    { icon: Target, text: 'On track for retirement goal', color: 'text-finley-teal' },
    { icon: DollarSign, text: '90% budget pacing this month', color: 'text-green-400' },
    { icon: Zap, text: '3 opportunities identified', color: 'text-yellow-400' },
]
</script>

<template>
    <Card class="glass-card p-6 space-y-6">
        <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-white">Today's Brief</h2>
            <Badge class="bg-finley-teal/20 text-finley-teal border-finley-teal/30">
                Live
            </Badge>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="item in marketData" :key="item.name"
                class="bg-finley-indigo/50 rounded-lg p-4 border border-white/10 transition-all duration-300 hover:border-finley-teal/30">
                <p class="text-xs text-finley-silver mb-1">{{ item.name }}</p>
                <p class="text-lg font-semibold text-white">{{ item.value }}</p>
                <div class="flex items-center gap-1 mt-2">
                    <TrendingUp v-if="item.trend === 'up'" class="w-4 h-4 text-finley-teal" />
                    <TrendingDown v-else class="w-4 h-4 text-red-400" />
                    <span :class="item.trend === 'up' ? 'text-finley-teal' : 'text-red-400'" class="text-sm">
                        {{ item.trend === 'up' ? '+' : '' }}{{ item.change }}%
                    </span>
                </div>
            </div>
        </div>

        <div class="space-y-3">
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                <Activity class="w-5 h-5 text-finley-teal" />
                Quick Insights
            </h3>
            <div class="space-y-2">
                <div v-for="insight in insights" :key="insight.text"
                    class="flex items-center gap-3 bg-finley-indigo/30 rounded-lg p-3 transition-all duration-300 hover:bg-finley-indigo/50">
                    <component :is="insight.icon" :class="insight.color" class="w-5 h-5" />
                    <p class="text-sm text-white">{{ insight.text }}</p>
                </div>
            </div>
        </div>

        <div class="pt-4 border-t border-white/10">
            <p class="text-sm text-finley-silver">
                Good morning! Markets are showing strength today, particularly in the tech sector.
                Your AI holdings are outperforming the broader market.
            </p>
        </div>
    </Card>
</template>
