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

<style scoped>
.bonus-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 0.45rem 0.6rem;
  border-radius: 12px;
  background: rgba(21, 30, 47, 0.6);
  border: 1px solid rgba(90, 110, 140, 0.2);
}

.item-title {
  font-weight: 600;
}

.bonus-value {
  font-weight: 600;
  color: #e9f2ff;
}
</style>
