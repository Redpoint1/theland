<script setup lang="ts">
import type { ActionItem } from '../stores/game'
import ProgressBar from './ProgressBar.vue'

const props = defineProps<{
  action: ActionItem
  isActive: boolean
  disabled: boolean
  progressValue: number
  actionDurationMs: number
}>()

const emit = defineEmits<{
  (e: 'toggle', action: ActionItem): void
}>()
</script>

<template>
  <div class="action-card">
    <div>
      <div class="item-title">{{ props.action.name }}</div>
      <div class="item-desc">{{ props.action.description }}</div>
    </div>
    <div class="action-controls">
      <button
        class="toggle"
        :class="{ active: props.isActive }"
        :disabled="props.disabled"
        @click="emit('toggle', props.action)"
      >
        {{ props.isActive ? 'Active' : 'Idle' }}
      </button>
      <div class="action-hint">
        Completion: 5s · +{{ props.action.gains.exp ?? 0 }} XP
      </div>
      <div v-if="props.action.manaCost" class="action-hint">
        Mana cost: {{ props.action.manaCost }}
      </div>
      <ProgressBar
        v-if="props.isActive"
        :value="props.progressValue"
        :max="props.actionDurationMs"
        thin
      />
    </div>
  </div>
</template>
