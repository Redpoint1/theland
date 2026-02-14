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
        <slot name="row" :log="log">
          <span class="log-time">{{ new Date(log.timestamp).toLocaleTimeString() }}</span>
          <span class="log-type">{{ log.type }}</span>
          <span class="log-message">{{ log.message }}</span>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: rgba(14, 20, 33, 0.9);
  border-radius: 20px;
  padding: 1.5rem;
  border: 1px solid rgba(80, 98, 130, 0.25);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.combat-log {
  max-height: 520px;
}

.combat-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

h2 {
  margin: 0 0 0.5rem;
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.item-desc {
  font-size: 0.85rem;
  color: #8fa2c6;
}

.ghost {
  background: transparent;
  color: #f0c566;
  border: 1px solid rgba(240, 197, 102, 0.5);
  border-radius: 999px;
  padding: 0.45rem 1rem;
  font-weight: 600;
  cursor: pointer;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 14px;
  background: rgba(12, 18, 30, 0.9);
  border: 1px solid rgba(60, 80, 110, 0.3);
  max-height: 320px;
  overflow: auto;
}

.log-row {
  display: grid;
  grid-template-columns: 90px 70px 1fr;
  gap: 0.75rem;
  align-items: baseline;
  font-size: 0.85rem;
  color: #c7d4f2;
}

.log-time {
  color: #7f92b6;
  font-variant-numeric: tabular-nums;
}

.log-type {
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: #9fb0d3;
}

.log-message {
  color: #d9e3ff;
}

.log-empty {
  color: #7f92b6;
  font-size: 0.85rem;
}

@media (max-width: 720px) {
  .log-row {
    grid-template-columns: 1fr;
  }

  .combat-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
