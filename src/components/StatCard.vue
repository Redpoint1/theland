<script setup lang="ts">
import type { Stat } from '../stores/game'
import ProgressBar from './ProgressBar.vue'

defineProps<{
  stat: Stat
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
      <ProgressBar :value="stat.exp" :max="stat.expToNext" thin />
      <div class="item-hint">{{ stat.exp }} / {{ stat.expToNext }}</div>
    </div>
  </div>
</template>
