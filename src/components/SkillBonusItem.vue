<script setup lang="ts">
defineProps<{
  label: string
  value: string
}>()
</script>

<template>
  <div class="bonus-item">
    <div class="item-title">{{ label }}</div>
    <div class="bonus-value">{{ value }}</div>
  </div>
</template>
