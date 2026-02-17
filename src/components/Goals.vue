<script setup lang="ts">
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import { Target, TrendingUp, Rocket, Home, GraduationCap, Plane } from 'lucide-vue-next'

interface Goal {
    id: string
    name: string
    icon: typeof Rocket
    target: number
    current: number
    deadline: string
    monthlyContribution: number
    status: 'on-track' | 'ahead' | 'behind'
    color: string
}

const goals: Goal[] = [
    {
        id: '1',
        name: 'Retirement Fund',
        icon: Rocket,
        target: 1000000,
        current: 125430,
        deadline: '2054',
        monthlyContribution: 2000,
        status: 'on-track',
        color: 'text-finley-teal',
    },
    {
        id: '2',
        name: 'Dream Home',
        icon: Home,
        target: 150000,
        current: 45000,
        deadline: '2028',
        monthlyContribution: 1500,
        status: 'ahead',
        color: 'text-green-400',
    },
    {
        id: '3',
        name: 'Kids Education',
        icon: GraduationCap,
        target: 80000,
        current: 15000,
        deadline: '2035',
        monthlyContribution: 500,
        status: 'on-track',
        color: 'text-blue-400',
    },
    {
        id: '4',
        name: 'Vacation Fund',
        icon: Plane,
        target: 10000,
        current: 5200,
        deadline: '2025',
        monthlyContribution: 400,
        status: 'ahead',
        color: 'text-yellow-400',
    },
]

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

const progress = (current: number, target: number) => Math.round((current / target) * 100)

const statusClass = (status: Goal['status']) => {
    if (status === 'on-track') {
        return 'bg-finley-teal/20 text-finley-teal border-finley-teal/30'
    }
    if (status === 'ahead') {
        return 'bg-green-500/20 text-green-400 border-green-500/30'
    }
    return 'bg-red-500/20 text-red-400 border-red-500/30'
}

const statusText = (status: Goal['status']) => {
    if (status === 'on-track') return 'On Track'
    if (status === 'ahead') return 'Ahead'
    return 'Behind'
}
</script>

<template>
    <Card class="glass-card p-6 space-y-6">
        <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                <Target class="w-6 h-6 text-finley-teal" />
                Goals & Progress
            </h2>
            <Button class="bg-finley-teal/20 text-finley-teal border border-finley-teal/30 hover:bg-finley-teal/30">
                Add Goal
            </Button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="goal in goals" :key="goal.id" class="bg-finley-indigo/30 rounded-lg p-5 space-y-4">
                <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded-lg bg-finley-indigo/50" :class="goal.color">
                            <component :is="goal.icon" class="w-5 h-5" />
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-white">{{ goal.name }}</h3>
                            <p class="text-sm text-finley-silver">Target by {{ goal.deadline }}</p>
                        </div>
                    </div>
                    <Badge :class="statusClass(goal.status)">{{ statusText(goal.status) }}</Badge>
                </div>

                <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                        <span class="text-finley-silver">Progress</span>
                        <span class="text-white font-medium">{{ progress(goal.current, goal.target) }}%</span>
                    </div>
                    <div class="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div class="h-full bg-finley-teal rounded-full"
                            :style="{ width: `${progress(goal.current, goal.target)}%` }" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <p class="text-xs text-finley-silver">Current</p>
                        <p class="text-white font-semibold">{{ formatCurrency(goal.current) }}</p>
                    </div>
                    <div>
                        <p class="text-xs text-finley-silver">Target</p>
                        <p class="text-white font-semibold">{{ formatCurrency(goal.target) }}</p>
                    </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-white/10">
                    <div class="flex items-center gap-2">
                        <TrendingUp class="w-4 h-4 text-finley-teal" />
                        <span class="text-sm text-finley-silver">Monthly</span>
                    </div>
                    <span class="text-sm text-white font-medium">
                        {{ formatCurrency(goal.monthlyContribution) }}
                    </span>
                </div>
            </div>
        </div>

        <div class="bg-gradient-to-r from-finley-teal/10 to-cyan-500/10 rounded-lg p-4 border border-finley-teal/30">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-white font-medium">Total Monthly Contributions</p>
                    <p class="text-2xl font-bold text-finley-teal mt-1">
                        {{formatCurrency(goals.reduce((sum, goal) => sum + goal.monthlyContribution, 0))}}
                    </p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-finley-silver">Projected Total by 2030</p>
                    <p class="text-xl font-semibold text-white">$425,000</p>
                </div>
            </div>
        </div>
    </Card>
</template>
