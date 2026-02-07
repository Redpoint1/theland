<script setup lang="ts">
import ProgressBar from './ProgressBar.vue'
import type { Profession, ProfessionAction } from '../stores/game'

const props = defineProps<{
  profession: Profession
  action: ProfessionAction
  progressValue: number
  actionDurationMs: number
  getItemName: (itemId: string) => string
  onToggle: (action: ProfessionAction) => void
}>()
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
      <div class="item-hint">
        Rewards:
        <span v-for="reward in props.action.rewards" :key="reward.itemId" class="reward-chip">
          {{ props.getItemName(reward.itemId) }} x{{ reward.amount }}
        </span>
      </div>
      <ProgressBar
        v-if="props.action.active"
        :value="props.progressValue"
        :max="props.actionDurationMs"
        thin
      />
    </div>
    <button
      class="toggle"
      :class="{ active: props.action.active }"
      :disabled="props.profession.level < props.action.requiredLevel"
      @click="props.onToggle(props.action)"
    >
      {{ props.action.active ? 'Active' : 'Idle' }}
    </button>
  </div>
</template>
