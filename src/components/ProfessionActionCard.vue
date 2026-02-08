<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from './ProgressBar.vue'
import type { Profession, ProfessionAction } from '../stores/game'

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
</script>

<template>
  <div
    class="profession-action"
    :class="{ locked: props.profession.level < props.action.requiredLevel }"
  >
    <div>
      <div class="item-title">{{ props.action.name }}</div>
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
