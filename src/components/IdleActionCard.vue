<script setup lang="ts">
import type { ActionItem } from '../stores/game'
import ProgressBar from './ProgressBar.vue'
import InfoTooltip from './InfoTooltip.vue'

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

const describeEntries = (entries?: Record<string, number>) =>
  Object.entries(entries ?? {}).map(([key, value]) => `${key}: +${value}`)
</script>

<template>
  <div class="action-card">
    <div>
      <InfoTooltip>
        <template #trigger>
          <div class="item-title">{{ props.action.name }}</div>
        </template>
        <template #content>
          <div class="info-tooltip-title">{{ props.action.name }}</div>
          <div class="info-tooltip-line">{{ props.action.description }}</div>
          <div class="info-tooltip-line">Cycle duration: 5s</div>
          <div class="info-tooltip-line">Character XP: +{{ props.action.gains.exp ?? 0 }}</div>
          <div
            v-for="entry in describeEntries(props.action.gains.stats as Record<string, number> | undefined)"
            :key="entry"
            class="info-tooltip-line info-tooltip-muted"
          >
            Stat XP · {{ entry }}
          </div>
          <div
            v-for="entry in describeEntries(props.action.gains.skills as Record<string, number> | undefined)"
            :key="entry"
            class="info-tooltip-line info-tooltip-muted"
          >
            Skill XP · {{ entry }}
          </div>
          <div v-if="props.action.gains.currency" class="info-tooltip-line info-tooltip-muted">
            Currency reward: +{{ props.action.gains.currency }}c (before multipliers)
          </div>
          <div v-if="props.action.manaCost" class="info-tooltip-line info-tooltip-muted">
            Mana cost: {{ props.action.manaCost }} per completion
          </div>
        </template>
      </InfoTooltip>
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
