<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from './ProgressBar.vue'
import type { Profession, ProfessionAction } from '../stores/game'
import InfoTooltip from './InfoTooltip.vue'

const props = defineProps<{
  profession: Profession
  action: ProfessionAction
  isActive: boolean
  progressValue: number
  actionDurationMs: number
  getItemName: (itemId: string) => string
  getItemQuantity: (itemId: string) => number
  onToggle: (action: ProfessionAction) => void
}>()

const hasMissingInputs = computed(() =>
  (props.action.inputs ?? []).some(
    (input) => props.getItemQuantity(input.itemId) < input.amount,
  ),
)

const inputSummary = computed(() =>
  (props.action.inputs ?? []).map((input) => {
    const current = props.getItemQuantity(input.itemId)
    return `${props.getItemName(input.itemId)} x${input.amount} (have ${current})`
  }),
)

const rewardSummary = computed(() =>
  props.action.rewards.map((reward) => `${props.getItemName(reward.itemId)} x${reward.amount}`),
)
</script>

<template>
  <div
    class="profession-action"
    :class="{ locked: props.profession.level < props.action.requiredLevel }"
  >
    <div>
      <InfoTooltip>
        <template #trigger>
          <div class="item-title">{{ props.action.name }}</div>
        </template>
        <template #content>
          <div class="info-tooltip-title">{{ props.action.name }}</div>
          <div class="info-tooltip-line">{{ props.action.description }}</div>
          <div class="info-tooltip-line">Required level: {{ props.action.requiredLevel }}</div>
          <div class="info-tooltip-line">Profession XP per completion: +{{ props.action.expGain }}</div>
          <div v-if="inputSummary.length" class="info-tooltip-line info-tooltip-muted">Inputs:</div>
          <div v-for="entry in inputSummary" :key="entry" class="info-tooltip-line info-tooltip-muted">{{ entry }}</div>
          <div class="info-tooltip-line info-tooltip-muted">Rewards:</div>
          <div v-for="entry in rewardSummary" :key="entry" class="info-tooltip-line info-tooltip-muted">{{ entry }}</div>
        </template>
      </InfoTooltip>
      <div class="item-desc">{{ props.action.description }}</div>
      <div class="item-hint">Requires level {{ props.action.requiredLevel }}</div>
      <div v-if="props.action.inputs?.length" class="item-hint">
        Inputs:
        <span
          v-for="input in props.action.inputs"
          :key="input.itemId"
          class="reward-chip"
          :class="{ missing: props.getItemQuantity(input.itemId) < input.amount }"
        >
          {{ props.getItemName(input.itemId) }} x{{ input.amount }}
          ({{ props.getItemQuantity(input.itemId) }})
        </span>
      </div>
      <div class="item-hint">
        Rewards:
        <span v-for="reward in props.action.rewards" :key="reward.itemId" class="reward-chip">
          {{ props.getItemName(reward.itemId) }} x{{ reward.amount }}
          ({{ props.getItemQuantity(reward.itemId) }})
        </span>
      </div>
      <ProgressBar
        v-if="props.isActive"
        :value="props.progressValue"
        :max="props.actionDurationMs"
        thin
      />
    </div>
    <button
      class="toggle"
      :class="{ active: props.isActive }"
      :disabled="props.profession.level < props.action.requiredLevel || hasMissingInputs"
      @click="props.onToggle(props.action)"
    >
      {{ props.isActive ? 'Active' : 'Idle' }}
    </button>
  </div>
</template>

<style scoped>
.profession-action {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  background: rgba(21, 30, 47, 0.75);
  border: 1px solid rgba(90, 110, 140, 0.3);
}

.profession-action.locked {
  opacity: 0.55;
}

.item-title {
  font-weight: 600;
}

.item-desc {
  font-size: 0.85rem;
  color: #8fa2c6;
}

.item-hint {
  font-size: 0.75rem;
  color: #7d90b8;
}

.reward-chip {
  display: inline-flex;
  align-items: center;
  margin-left: 0.35rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: rgba(24, 34, 52, 0.8);
  border: 1px solid rgba(90, 110, 140, 0.3);
  font-size: 0.7rem;
  color: #c7d4f2;
  white-space: nowrap;
}

.reward-chip.missing {
  border-color: rgba(255, 140, 140, 0.7);
  color: #ffb3b3;
  background: rgba(80, 20, 20, 0.3);
}

.profession-action :deep(.progress) {
  width: 100%;
  margin-top: 0.4rem;
}

.toggle {
  background: rgba(69, 85, 110, 0.4);
  color: #e6e9f2;
  border: 1px solid rgba(121, 145, 180, 0.4);
  padding: 0.4rem 1.1rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

.toggle.active {
  background: linear-gradient(120deg, #74d2ff, #6ff2c5);
  color: #0b111b;
}

.toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .profession-action {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
