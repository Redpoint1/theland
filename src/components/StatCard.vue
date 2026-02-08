<script setup lang="ts">
import type { Stat } from '../stores/game'
import ProgressBar from './ProgressBar.vue'

const props = defineProps<{
  stat: Stat
  pending: number
  canIncrease: boolean
  canDecrease: boolean
  onIncrease: () => void
  onDecrease: () => void
}>()
</script>

<template>
  <div class="list-item">
    <div>
      <div class="item-title">{{ stat.name }}</div>
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
