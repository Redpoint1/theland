<script setup lang="ts">
import InfoTooltip from './InfoTooltip.vue'

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
        <InfoTooltip placement="bottom" align="left" teleport>
          <template #trigger>
            <span class="log-time">{{ new Date(log.timestamp).toLocaleTimeString() }}</span>
          </template>
          <template #content>
            <div class="info-tooltip-title">Log Time</div>
            <div class="info-tooltip-line">{{ new Date(log.timestamp).toLocaleString() }}</div>
          </template>
        </InfoTooltip>
        <InfoTooltip placement="bottom" align="left" teleport>
          <template #trigger>
            <span class="log-type">{{ log.type }}</span>
          </template>
          <template #content>
            <div class="info-tooltip-title">Log Type</div>
            <div class="info-tooltip-line">{{ log.type }}</div>
          </template>
        </InfoTooltip>
        <InfoTooltip max-width="560px" placement="bottom" align="left" teleport>
          <template #trigger>
            <span class="log-message">{{ log.message }}</span>
          </template>
          <template #content>
            <div class="info-tooltip-title">Log Entry #{{ log.id }}</div>
            <div class="info-tooltip-line">{{ log.message }}</div>
            <div class="info-tooltip-line info-tooltip-muted">Type: {{ log.type }}</div>
            <div class="info-tooltip-line info-tooltip-muted">At: {{ new Date(log.timestamp).toLocaleString() }}</div>
          </template>
        </InfoTooltip>
      </div>
    </div>
  </div>
</template>
