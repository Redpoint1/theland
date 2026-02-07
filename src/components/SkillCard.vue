<script setup lang="ts">
import type { Skill } from '../stores/game'
import ProgressBar from './ProgressBar.vue'

defineProps<{
  skill: Skill
}>()
</script>

<template>
  <div class="list-item">
    <div>
      <div class="item-title">{{ skill.name }}</div>
      <div class="item-desc">{{ skill.description }}</div>
    </div>
    <div class="item-value">
      <div class="value">Lv. {{ skill.level }}</div>
      <ProgressBar :value="skill.exp" :max="skill.expToNext" thin />
      <div class="item-hint">{{ skill.exp }} / {{ skill.expToNext }}</div>
    </div>
  </div>
</template>
