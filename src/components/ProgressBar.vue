<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    max: number
    thin?: boolean
    variant?: 'default' | 'hp' | 'enemy'
  }>(),
  {
    thin: false,
    variant: 'default',
  },
)

const percent = computed(() => {
  const safeMax = Math.max(1, props.max)
  return Math.min(100, Math.floor((props.value / safeMax) * 100))
})
</script>

<template>
  <div class="progress" :class="{ thin }">
    <div class="progress-fill" :class="variant" :style="{ width: percent + '%' }"></div>
  </div>
</template>
