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

<style scoped>
.progress {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: rgba(77, 90, 117, 0.3);
  overflow: hidden;
  margin-top: 0.4rem;
}

.progress.thin {
  height: 6px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(120deg, #f0c566, #e6a93c);
  border-radius: inherit;
  transition: width 0.3s ease;
}

.progress-fill.hp {
  background: linear-gradient(120deg, #71f4b5, #37c98c);
}

.progress-fill.enemy {
  background: linear-gradient(120deg, #ff8a88, #ff4d5d);
}
</style>
