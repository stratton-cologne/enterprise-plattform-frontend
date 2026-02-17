<script setup lang="ts">
import { computed, ref } from 'vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import {
    Brain,
    Lightbulb,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    Sparkles,
    Shield,
    Wallet,
    Clock,
} from 'lucide-vue-next'

type InsightCategory = 'opportunity' | 'optimization' | 'alert' | 'achievement'
type InsightPriority = 'high' | 'medium' | 'low'

interface Insight {
    id: string
    category: InsightCategory
    title: string
    description: string
    impact: string
    action?: string
    icon: typeof Brain
    color: string
    priority: InsightPriority
}

const selectedTab = ref<'all' | InsightCategory>('all')

const insights: Insight[] = [
    {
        id: '1',
        category: 'opportunity',
        title: 'AI Sector Momentum',
        description: 'NVIDIA and AI ETFs showing strong technical breakouts. Consider increasing allocation by 5%.',
        impact: 'Potential +12% returns over 6 months',
        action: 'Review AI holdings',
        icon: TrendingUp,
        color: 'text-finley-teal',
        priority: 'high',
    },
    {
        id: '2',
        category: 'optimization',
        title: 'Tax-Loss Harvesting Opportunity',
        description: 'Identified $2,300 in losses that could offset gains and reduce tax liability.',
        impact: 'Save ~$690 in taxes',
        action: 'Execute trades',
        icon: Wallet,
        color: 'text-green-400',
        priority: 'high',
    },
    {
        id: '3',
        category: 'alert',
        title: 'High Cash Balance',
        description: 'Cash allocation at 8% vs target 5%. Missing potential returns in current market.',
        impact: '$450/month opportunity cost',
        icon: AlertCircle,
        color: 'text-yellow-400',
        priority: 'medium',
    },
    {
        id: '4',
        category: 'achievement',
        title: 'Emergency Fund Complete!',
        description: "You've reached your 6-month emergency fund goal. Time to celebrate and plan next steps.",
        impact: 'Financial security achieved',
        icon: CheckCircle2,
        color: 'text-green-400',
        priority: 'low',
    },
    {
        id: '5',
        category: 'opportunity',
        title: 'High-Yield Savings Rates',
        description: 'New 5.5% APY savings accounts available. Move emergency fund for extra $825/year.',
        impact: '+$825 annual income',
        action: 'Compare rates',
        icon: Lightbulb,
        color: 'text-blue-400',
        priority: 'medium',
    },
    {
        id: '6',
        category: 'optimization',
        title: 'Rebalancing Recommended',
        description: 'Portfolio drift detected: Tech allocation 5% above target. Time to rebalance.',
        impact: 'Reduce risk, maintain strategy',
        action: 'Auto-rebalance',
        icon: Shield,
        color: 'text-purple-400',
        priority: 'medium',
    },
]

const filteredInsights = computed(() => {
    return insights.filter((insight) => selectedTab.value === 'all' || insight.category === selectedTab.value)
})

const tabCounts = {
    all: insights.length,
    opportunity: insights.filter((i) => i.category === 'opportunity').length,
    optimization: insights.filter((i) => i.category === 'optimization').length,
    alert: insights.filter((i) => i.category === 'alert').length,
    achievement: insights.filter((i) => i.category === 'achievement').length,
}

const categoryClass = (category: InsightCategory) => {
    if (category === 'opportunity') return 'bg-finley-teal/20 text-finley-teal border-finley-teal/30'
    if (category === 'optimization') return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    if (category === 'alert') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    return 'bg-green-500/20 text-green-400 border-green-500/30'
}

const categoryText = (category: InsightCategory) => {
    if (category === 'opportunity') return 'Opportunity'
    if (category === 'optimization') return 'Optimization'
    if (category === 'alert') return 'Alert'
    return 'Achievement'
}

const priorityDot = (priority: InsightPriority) => {
    if (priority === 'high') return 'bg-red-500'
    if (priority === 'medium') return 'bg-yellow-500'
    return 'bg-green-500'
}

const tabButtonClass = (tab: 'all' | InsightCategory) => {
    return selectedTab.value === tab
        ? 'bg-finley-teal/20 text-white'
        : 'text-finley-silver hover:text-white hover:bg-finley-indigo/40'
}
</script>

<template>
    <Card class="glass-card p-6 space-y-6">
        <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                <Brain class="w-6 h-6 text-finley-teal" />
                AI Insights & Actions
            </h2>
            <div class="flex items-center gap-2">
                <Sparkles class="w-5 h-5 text-finley-teal animate-pulse" />
                <span class="text-sm text-finley-silver">Updated 2 min ago</span>
            </div>
        </div>

        <div class="space-y-6">
            <div class="grid grid-cols-5 bg-finley-indigo/30 rounded-lg p-1 gap-1">
                <button class="rounded-md px-2 py-2 text-sm transition-colors" :class="tabButtonClass('all')"
                    @click="selectedTab = 'all'">
                    All ({{ tabCounts.all }})
                </button>
                <button class="rounded-md px-2 py-2 text-sm transition-colors" :class="tabButtonClass('opportunity')"
                    @click="selectedTab = 'opportunity'">
                    Opportunities ({{ tabCounts.opportunity }})
                </button>
                <button class="rounded-md px-2 py-2 text-sm transition-colors" :class="tabButtonClass('optimization')"
                    @click="selectedTab = 'optimization'">
                    Optimize ({{ tabCounts.optimization }})
                </button>
                <button class="rounded-md px-2 py-2 text-sm transition-colors" :class="tabButtonClass('alert')"
                    @click="selectedTab = 'alert'">
                    Alerts ({{ tabCounts.alert }})
                </button>
                <button class="rounded-md px-2 py-2 text-sm transition-colors" :class="tabButtonClass('achievement')"
                    @click="selectedTab = 'achievement'">
                    Achievements ({{ tabCounts.achievement }})
                </button>
            </div>

            <div class="space-y-4">
                <div v-for="insight in filteredInsights" :key="insight.id"
                    class="bg-finley-indigo/30 rounded-lg p-5 hover:bg-finley-indigo/40 transition-colors cursor-pointer">
                    <div class="flex items-start gap-4">
                        <div class="p-3 rounded-lg bg-finley-indigo/50" :class="insight.color">
                            <component :is="insight.icon" class="w-6 h-6" />
                        </div>

                        <div class="flex-1 space-y-2">
                            <div class="flex items-start justify-between gap-4">
                                <div>
                                    <h3 class="text-lg font-semibold text-white">{{ insight.title }}</h3>
                                    <p class="text-sm text-finley-silver mt-1">{{ insight.description }}</p>
                                </div>
                                <div class="flex items-center gap-2 shrink-0">
                                    <div class="w-2 h-2 rounded-full" :class="priorityDot(insight.priority)" />
                                    <Badge :class="categoryClass(insight.category)">{{ categoryText(insight.category) }}
                                    </Badge>
                                </div>
                            </div>

                            <div class="flex items-center justify-between pt-3 border-t border-white/10">
                                <div class="flex items-center gap-2">
                                    <Clock class="w-4 h-4 text-finley-silver" />
                                    <span class="text-sm text-finley-silver">Impact: {{ insight.impact }}</span>
                                </div>

                                <button v-if="insight.action"
                                    class="flex items-center gap-2 text-sm text-finley-teal hover:text-finley-teal/80 transition-colors">
                                    {{ insight.action }}
                                    <ArrowRight class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-gradient-to-r from-finley-teal/10 to-cyan-500/10 rounded-lg p-4 border border-finley-teal/30">
            <div class="flex items-center gap-3">
                <Brain class="w-5 h-5 text-finley-teal" />
                <p class="text-sm text-white">
                    <span class="font-medium">Quantum Analysis:</span> Your portfolio efficiency score is 92/100.
                    Acting on these insights could improve returns by ~15% annually.
                </p>
            </div>
        </div>
    </Card>
</template>
