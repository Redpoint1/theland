<script setup lang="ts">
import type { ActionItem } from '../stores/game'
import ProgressBar from './ProgressBar.vue'
import InfoTooltip from './InfoTooltip.vue'
import { formatCopperToCurrency } from '../stores/game/progression'

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
            Currency reward: +{{ formatCopperToCurrency(props.action.gains.currency) }} (before multipliers)
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

<style scoped>
.action-card {
  display: flex;
  justify-content: space-between;
  gap: 0.85rem;
  padding: 0.85rem 0.95rem;
  border-radius: 14px;
  background: rgba(21, 30, 47, 0.8);
  border: 1px solid rgba(90, 110, 140, 0.3);
}

.item-title {
  font-weight: 600;
}

.item-desc {
  font-size: 0.82rem;
  color: #8fa2c6;
}

.action-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
}

.toggle {
  background: rgba(69, 85, 110, 0.4);
  color: #e6e9f2;
  border: 1px solid rgba(121, 145, 180, 0.4);
  padding: 0.32rem 0.9rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.82rem;
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

.action-hint {
  font-size: 0.72rem;
  color: #8fa2c6;
}

@media (max-width: 720px) {
  .action-card,
  .action-controls {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
}
</style>
