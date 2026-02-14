<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore, type Stat } from '../stores/game'
import ProgressBar from './ProgressBar.vue'
import InfoTooltip from './InfoTooltip.vue'

const props = defineProps<{
  stat: Stat
  pending: number
  canIncrease: boolean
  canDecrease: boolean
  onIncrease: () => void
  onDecrease: () => void
}>()

const game = useGameStore()
const { maxHp, maxMana, maxInventorySlots } = storeToRefs(game)

const derivedLines = computed(() => {
  if (props.stat.name === 'Strength') {
    return [
      'Combat power contribution: +1.4 per level',
      `Inventory slots from Strength: +${Math.floor(props.stat.value / 5)} (global: ${maxInventorySlots.value})`,
    ]
  }
  if (props.stat.name === 'Agility') {
    return [
      'Combat power contribution: +1.1 per level',
      'Damage mitigation contribution: +0.4 per level',
    ]
  }
  if (props.stat.name === 'Vitality') {
    return [
      'Damage mitigation contribution: +0.8 per level',
      `Max HP contribution: +12 per level (global max HP: ${maxHp.value})`,
    ]
  }
  if (props.stat.name === 'Spirit') {
    return ['Combat power contribution: +0.4 per level']
  }
  return [
    'Max Mana contribution: +10 per level',
    'Mana regen contribution: +0.25 per level',
    `Global max mana: ${maxMana.value}`,
  ]
})
</script>

<template>
  <div class="list-item">
    <div>
      <InfoTooltip>
        <template #trigger>
          <div class="item-title">{{ stat.name }}</div>
        </template>
        <template #content>
          <div class="info-tooltip-title">{{ stat.name }}</div>
          <div class="info-tooltip-line">{{ stat.description }}</div>
          <div class="info-tooltip-line">Current level: {{ stat.value }}</div>
          <div class="info-tooltip-line">Progress: {{ stat.exp }} / {{ stat.expToNext }}</div>
          <div class="info-tooltip-line" v-if="props.pending">Pending allocation: +{{ props.pending }}</div>
          <div
            v-for="line in derivedLines"
            :key="line"
            class="info-tooltip-line info-tooltip-muted"
          >
            {{ line }}
          </div>
        </template>
      </InfoTooltip>
      <div class="item-desc">{{ stat.description }}</div>
    </div>
    <div class="item-value">
      <div class="value">+{{ stat.value }}</div>
      <div class="item-hint" v-if="props.pending">Pending: +{{ props.pending }}</div>
      <div class="stat-controls">
        <button class="ghost" :disabled="!props.canDecrease" @click="props.onDecrease">-</button>
        <button class="ghost" :disabled="!props.canIncrease" @click="props.onIncrease">+</button>
      </div>
      <ProgressBar :value="stat.exp" :max="stat.expToNext" thin />
      <div class="item-hint">{{ stat.exp }} / {{ stat.expToNext }}</div>
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

.stat-controls {
  display: flex;
  gap: 0.35rem;
  justify-content: flex-end;
}

.ghost {
  background: transparent;
  color: #f0c566;
  border: 1px solid rgba(240, 197, 102, 0.5);
  border-radius: 10px;
  padding: 0.2rem 0.55rem;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
}

.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .list-item,
  .item-value {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .stat-controls {
    justify-content: flex-start;
  }
}
</style>
