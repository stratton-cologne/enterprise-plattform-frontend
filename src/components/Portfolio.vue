<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import { Briefcase, TrendingUp, Brain } from 'lucide-vue-next'

interface PortfolioSlice {
    name: string
    value: number
    color: string
}

interface PerformancePoint {
    month: string
    value: number
}

interface Holding {
    name: string
    symbol: string
    value: string
    change: number
    allocation: number
}

const portfolioData: PortfolioSlice[] = [
    { name: 'AI & Tech', value: 35, color: '#00FFC3' },
    { name: 'ETFs', value: 25, color: '#00D9FF' },
    { name: 'Bonds', value: 20, color: '#C0C0C0' },
    { name: 'Real Estate', value: 15, color: '#7C3AED' },
    { name: 'Cash', value: 5, color: '#1B1F3A' },
]

const performanceData: PerformancePoint[] = [
    { month: 'Jan', value: 100000 },
    { month: 'Feb', value: 102000 },
    { month: 'Mar', value: 104500 },
    { month: 'Apr', value: 103800 },
    { month: 'May', value: 107200 },
    { month: 'Jun', value: 110500 },
    { month: 'Jul', value: 113000 },
    { month: 'Aug', value: 115800 },
    { month: 'Sep', value: 118200 },
    { month: 'Oct', value: 121000 },
    { month: 'Nov', value: 123500 },
    { month: 'Dec', value: 125430 },
]

const holdings: Holding[] = [
    { name: 'NVIDIA Corp', symbol: 'NVDA', value: '$15,230', change: 5.2, allocation: 12 },
    { name: 'AI Innovation ETF', symbol: 'AIIQ', value: '$12,450', change: 3.8, allocation: 10 },
    { name: 'Microsoft Corp', symbol: 'MSFT', value: '$10,320', change: 2.1, allocation: 8 },
    { name: 'Vanguard S&P 500', symbol: 'VOO', value: '$8,750', change: 1.5, allocation: 7 },
]

const pieGradient = computed(() => {
    let start = 0
    const slices = portfolioData.map((item) => {
        const end = start + item.value * 3.6
        const segment = `${item.color} ${start}deg ${end}deg`
        start = end
        return segment
    })
    return `conic-gradient(${slices.join(', ')})`
})

const chart = {
    width: 460,
    height: 220,
    left: 34,
    right: 14,
    top: 12,
    bottom: 34,
}

const minValue = Math.min(...performanceData.map((p) => p.value))
const maxValue = Math.max(...performanceData.map((p) => p.value))
const innerWidth = chart.width - chart.left - chart.right
const innerHeight = chart.height - chart.top - chart.bottom

const linePoints = computed(() => {
    return performanceData
        .map((point, index) => {
            const x = chart.left + (index / (performanceData.length - 1)) * innerWidth
            const y = chart.top + (1 - (point.value - minValue) / (maxValue - minValue)) * innerHeight
            return `${x},${y}`
        })
        .join(' ')
})

const dots = computed(() => {
    return performanceData.map((point, index) => {
        const x = chart.left + (index / (performanceData.length - 1)) * innerWidth
        const y = chart.top + (1 - (point.value - minValue) / (maxValue - minValue)) * innerHeight
        return { x, y, month: point.month }
    })
})

const yTicks = [100000, 110000, 120000]
const formatTick = (value: number) => `$${Math.round(value / 1000)}k`
</script>

<template>
    <Card class="glass-card p-6 space-y-6">
        <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                <Briefcase class="w-6 h-6 text-finley-teal" />
                Your Portfolio
            </h2>
            <Badge class="bg-green-500/20 text-green-400 border-green-500/30">
                +25.4% YTD
            </Badge>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-finley-indigo/30 rounded-lg p-4">
                <h3 class="text-lg font-semibold text-white mb-4">Asset Allocation</h3>
                <div class="h-[200px] flex items-center justify-center">
                    <div class="relative w-40 h-40 rounded-full" :style="{ background: pieGradient }">
                        <div class="absolute inset-6 rounded-full bg-finley-indigo" />
                    </div>
                </div>
                <div class="space-y-2 mt-4">
                    <div v-for="item in portfolioData" :key="item.name"
                        class="flex items-center justify-between text-sm">
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: item.color }" />
                            <span class="text-finley-silver">{{ item.name }}</span>
                        </div>
                        <span class="text-white font-medium">{{ item.value }}%</span>
                    </div>
                </div>
            </div>

            <div class="bg-finley-indigo/30 rounded-lg p-4">
                <h3 class="text-lg font-semibold text-white mb-4">Performance</h3>
                <div class="h-[200px]">
                    <svg :viewBox="`0 0 ${chart.width} ${chart.height}`" class="w-full h-full">
                        <line v-for="tick in yTicks" :key="tick" :x1="chart.left" :x2="chart.width - chart.right"
                            :y1="chart.top + (1 - (tick - minValue) / (maxValue - minValue)) * innerHeight"
                            :y2="chart.top + (1 - (tick - minValue) / (maxValue - minValue)) * innerHeight"
                            stroke="#2D3348" stroke-dasharray="4 4" />

                        <polyline fill="none" stroke="#00FFC3" stroke-width="3" :points="linePoints" />

                        <circle v-for="point in dots" :key="point.month" :cx="point.x" :cy="point.y" r="3.5"
                            fill="#00FFC3" />

                        <text v-for="tick in yTicks" :key="`y-${tick}`" :x="4"
                            :y="chart.top + (1 - (tick - minValue) / (maxValue - minValue)) * innerHeight + 4"
                            fill="#C0C0C0" font-size="11">
                            {{ formatTick(tick) }}
                        </text>

                        <text v-for="point in dots" :key="`x-${point.month}`" :x="point.x" :y="chart.height - 6"
                            text-anchor="middle" fill="#C0C0C0" font-size="10">
                            {{ point.month }}
                        </text>
                    </svg>
                </div>

                <div class="grid grid-cols-3 gap-4 mt-4">
                    <div class="text-center">
                        <p class="text-xs text-finley-silver">Total Value</p>
                        <p class="text-lg font-semibold text-white">$125,430</p>
                    </div>
                    <div class="text-center">
                        <p class="text-xs text-finley-silver">Total Gain</p>
                        <p class="text-lg font-semibold text-finley-teal">+$25,430</p>
                    </div>
                    <div class="text-center">
                        <p class="text-xs text-finley-silver">Risk Score</p>
                        <p class="text-lg font-semibold text-yellow-400">Medium</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="space-y-4">
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp class="w-5 h-5 text-finley-teal" />
                Top Holdings
            </h3>
            <div class="space-y-3">
                <div v-for="holding in holdings" :key="holding.symbol" class="bg-finley-indigo/30 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                        <div>
                            <p class="text-white font-medium">{{ holding.name }}</p>
                            <p class="text-sm text-finley-silver">{{ holding.symbol }}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-white font-medium">{{ holding.value }}</p>
                            <p class="text-sm" :class="holding.change > 0 ? 'text-finley-teal' : 'text-red-400'">
                                {{ holding.change > 0 ? '+' : '' }}{{ holding.change }}%
                            </p>
                        </div>
                    </div>
                    <div class="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div class="h-full bg-finley-teal rounded-full" :style="{ width: `${holding.allocation}%` }" />
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-gradient-to-r from-finley-teal/10 to-cyan-500/10 rounded-lg p-4 border border-finley-teal/30">
            <div class="flex items-start gap-3">
                <Brain class="w-5 h-5 text-finley-teal mt-1" />
                <div>
                    <p class="text-white font-medium">AI Portfolio Analysis</p>
                    <p class="text-sm text-finley-silver mt-1">
                        Your portfolio shows strong diversification with a healthy tech allocation.
                        Consider rebalancing bonds to capture current high yields.
                        AI sector exposure aligns well with your growth objectives.
                    </p>
                </div>
            </div>
        </div>
    </Card>
</template>
