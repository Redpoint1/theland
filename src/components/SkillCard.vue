<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore, type Skill } from '../stores/game'
import ProgressBar from './ProgressBar.vue'
import InfoTooltip from './InfoTooltip.vue'

const props = defineProps<{
  skill: Skill
}>()

const game = useGameStore()
const { skillBonuses, skills } = storeToRefs(game)

const toPercent = (value: number) => `${Math.round(value * 10000) / 100}%`

const details = computed(() => {
  if (props.skill.name === 'Combat') {
    const perLevel = 0.05
    const contribution = props.skill.level * perLevel
    const reductionContribution = Math.min(0.8, contribution)
    return [
      `Per level: +${toPercent(perLevel)} combat damage`,
      `Current from Combat: +${toPercent(contribution)} damage`,
      `Global combat damage bonus: +${toPercent(skillBonuses.value.combatDamageMultiplier - 1)}`,
      `Per level: +${toPercent(perLevel)} damage reduction (cap 80%)`,
      `Current from Combat: +${toPercent(reductionContribution)} damage reduction`,
      `Global damage reduction: +${toPercent(skillBonuses.value.combatDamageReduction)}`,
    ]
  }

  if (props.skill.name === 'Survival') {
    const perLevel = 0.02
    const contribution = props.skill.level * perLevel
    return [
      `Per level: +${toPercent(perLevel)} regen multiplier`,
      `Current from Survival: +${toPercent(contribution)}`,
      `Global regen multiplier bonus: +${toPercent(skillBonuses.value.regenMultiplier - 1)}`,
    ]
  }

  if (props.skill.name === 'Arcana') {
    const perLevel = 0.02
    const contribution = props.skill.level * perLevel
    return [
      `Per level: +${toPercent(perLevel)} character XP multiplier`,
      `Current from Arcana: +${toPercent(contribution)}`,
      `Global XP multiplier bonus: +${toPercent(skillBonuses.value.expMultiplier - 1)}`,
    ]
  }

  if (props.skill.name === 'Crafting') {
    const perLevel = 0.01
    const contribution = props.skill.level * perLevel
    const harvestingContribution = skills.value.Harvesting.level * 0.01
    return [
      `Per level: +${toPercent(perLevel)} currency multiplier`,
      `Current from Crafting: +${toPercent(contribution)}`,
      `Shared bonus from Harvesting: +${toPercent(harvestingContribution)}`,
      `Global currency multiplier bonus: +${toPercent(skillBonuses.value.currencyMultiplier - 1)}`,
    ]
  }

  const perLevel = 0.01
  const contribution = props.skill.level * perLevel
  const craftingContribution = skills.value.Crafting.level * 0.01
  return [
    `Per level: +${toPercent(perLevel)} currency multiplier`,
    `Current from Harvesting: +${toPercent(contribution)}`,
    `Shared bonus from Crafting: +${toPercent(craftingContribution)}`,
    `Global currency multiplier bonus: +${toPercent(skillBonuses.value.currencyMultiplier - 1)}`,
  ]
})
</script>

<template>
  <div class="list-item">
    <div>
      <InfoTooltip>
        <template #trigger>
          <div class="item-title">{{ skill.name }}</div>
        </template>
        <template #content>
          <div class="info-tooltip-title">{{ skill.name }}</div>
          <div class="info-tooltip-line">{{ skill.description }}</div>
          <div class="info-tooltip-line">Level: {{ skill.level }}</div>
          <div class="info-tooltip-line">Progress: {{ skill.exp }} / {{ skill.expToNext }}</div>
          <div
            v-for="line in details"
            :key="line"
            class="info-tooltip-line info-tooltip-muted"
          >
            {{ line }}
          </div>
        </template>
      </InfoTooltip>
      <div class="item-desc">{{ skill.description }}</div>
    </div>
    <div class="item-value">
      <div class="value">Lv. {{ skill.level }}</div>
      <ProgressBar :value="skill.exp" :max="skill.expToNext" thin />
      <div class="item-hint">{{ skill.exp }} / {{ skill.expToNext }}</div>
    </div>
  </div>
</template>

<style scoped>
.list-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.item-title {
  font-weight: 600;
}

.item-desc {
  font-size: 0.85rem;
  color: #8fa2c6;
}

.item-value {
  text-align: right;
  min-width: 120px;
}

.value {
  font-size: 1.6rem;
  font-weight: 600;
}

.item-hint {
  font-size: 0.75rem;
  color: #7d90b8;
}

@media (max-width: 720px) {
  .list-item,
  .item-value {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
}
</style>
