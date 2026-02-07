<script setup lang="ts">
interface LogEntry {
  id: number
  timestamp: number
  type: string
  message: string
}

const props = defineProps<{
  title: string
  subtitle?: string
  entries: LogEntry[]
  emptyText?: string
  onClear?: () => void
}>()
</script>

<template>
  <div class="panel combat-log">
    <div class="combat-header">
      <div>
        <h2>{{ props.title }}</h2>
        <div v-if="props.subtitle" class="item-desc">{{ props.subtitle }}</div>
      </div>
      <button v-if="props.onClear" class="ghost" @click="props.onClear">Clear Log</button>
    </div>

    <slot name="filters"></slot>

    <div class="log-list">
      <div v-if="!props.entries.length" class="log-empty">
        {{ props.emptyText ?? 'No entries yet.' }}
      </div>
      <div v-for="log in props.entries" :key="log.id" class="log-row">
        <span class="log-time">{{ new Date(log.timestamp).toLocaleTimeString() }}</span>
        <span class="log-type">{{ log.type }}</span>
        <span class="log-message">{{ log.message }}</span>
      </div>
    </div>
  </div>
</template>
