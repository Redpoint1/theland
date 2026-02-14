<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from './ProgressBar.vue'
import ProfessionActionCard from './ProfessionActionCard.vue'
import type { Profession, ProfessionAction } from '../stores/game'
import InfoTooltip from './InfoTooltip.vue'

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
        <InfoTooltip>
          <template #trigger>
            <h2>{{ props.profession.name }}</h2>
          </template>
          <template #content>
            <div class="info-tooltip-title">{{ props.profession.name }}</div>
            <div class="info-tooltip-line">{{ props.profession.description }}</div>
            <div class="info-tooltip-line">Level: {{ props.profession.level }} / {{ props.profession.maxLevel }}</div>
            <div class="info-tooltip-line">{{ props.profession.bonusLabel }}: +{{ props.bonusPercent }}%</div>
            <div class="info-tooltip-line">Current rank: {{ currentRank?.name }} (+{{ rankBonusPercent }}%)</div>
            <div class="info-tooltip-line" v-if="nextRank">Next rank: {{ nextRank.name }} at Lv {{ nextRank.minLevel }}</div>
            <div class="info-tooltip-line info-tooltip-muted">Rank ladder:</div>
            <div
              v-for="rank in props.profession.rankTiers"
              :key="rank.name"
              class="info-tooltip-line info-tooltip-muted"
            >
              {{ rank.name }} · Lv {{ rank.minLevel }} · +{{ Math.round(rank.bonusMultiplier * 100) }}%
            </div>
          </template>
        </InfoTooltip>
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

<style scoped>
.panel {
  background: rgba(14, 20, 33, 0.9);
  border-radius: 20px;
  padding: 1.5rem;
  border: 1px solid rgba(80, 98, 130, 0.25);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.profession-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

h2 {
  margin: 0 0 0.5rem;
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.profession-meta {
  text-align: right;
}

.label {
  color: #8fa2c6;
  font-size: 0.85rem;
}

.value {
  font-size: 1.6rem;
  font-weight: 600;
}

.exp-block {
  min-width: 200px;
  flex: 1;
}

.profession-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.item-desc {
  font-size: 0.85rem;
  color: #8fa2c6;
}

.item-hint {
  font-size: 0.75rem;
  color: #7d90b8;
}

@media (max-width: 720px) {
  .profession-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .profession-meta {
    text-align: left;
  }
}
</style>
