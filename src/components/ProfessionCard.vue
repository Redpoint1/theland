<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from './ProgressBar.vue'
import ProfessionActionCard from './ProfessionActionCard.vue'
import type { Profession, ProfessionAction } from '../stores/game'

const props = defineProps<{
  profession: Profession
  actions: ProfessionAction[]
  activeActionId?: string
  bonusPercent: number
  actionDurationMs: number
  progressValue: number
  getItemName: (itemId: string) => string
  getItemQuantity: (itemId: string) => number
  onToggle: (action: ProfessionAction) => void
}>()

const currentRank = computed(() => {
  return (
    props.profession.rankTiers
      .slice()
      .reverse()
      .find((rank) => props.profession.level >= rank.minLevel) ?? props.profession.rankTiers[0]
  )
})

const nextRank = computed(() =>
  props.profession.rankTiers.find((rank) => rank.minLevel > props.profession.level),
)

const rankBonusPercent = computed(() => Math.round((currentRank.value?.bonusMultiplier ?? 0) * 100))

const isMaxLevel = computed(() => props.profession.level >= props.profession.maxLevel)
</script>

<template>
  <div class="panel">
    <div class="profession-header">
      <div>
        <h2>{{ props.profession.name }}</h2>
        <div class="item-desc">{{ props.profession.description }}</div>
        <div class="item-hint">
          {{ props.profession.bonusLabel }}: +{{ props.bonusPercent }}%
        </div>
        <div class="item-hint">
          Rank: {{ currentRank?.name }} (+{{ rankBonusPercent }}% rank bonus)
        </div>
        <div v-if="nextRank" class="item-hint">
          Next rank: {{ nextRank.name }} at Lv {{ nextRank.minLevel }}
        </div>
      </div>
      <div class="profession-meta">
        <div class="label">Level</div>
        <div class="value">{{ props.profession.level }} / {{ props.profession.maxLevel }}</div>
      </div>
    </div>

    <div class="exp-block">
      <div class="label">Experience</div>
      <div v-if="isMaxLevel" class="value">MAX</div>
      <div v-else class="value">{{ props.profession.exp }} / {{ props.profession.expToNext }}</div>
      <ProgressBar :value="props.profession.exp" :max="props.profession.expToNext" />
    </div>

    <div class="profession-actions">
      <ProfessionActionCard
        v-for="action in props.actions"
        :key="action.id"
        :profession="props.profession"
        :action="action"
        :is-active="props.activeActionId === action.id"
        :progress-value="props.progressValue"
        :action-duration-ms="props.actionDurationMs"
        :get-item-name="props.getItemName"
        :get-item-quantity="props.getItemQuantity"
        :on-toggle="props.onToggle"
      />
    </div>
  </div>
</template>
