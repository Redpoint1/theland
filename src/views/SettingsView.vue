<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const {
  hasSavedProgress,
  lastSavedAt,
  saveError,
  character,
  activeTask,
  combatLogs,
  professionLogs,
  actionLogs,
} = storeToRefs(game)

const actionStatus = ref<string | null>(null)
const autosaveSeconds = Math.floor(game.autosaveIntervalMs / 1000)

const lastSavedLabel = computed(() =>
  lastSavedAt.value ? new Date(lastSavedAt.value).toLocaleString() : 'No local snapshot written yet.',
)

const currentTaskLabel = computed(() => {
  if (activeTask.value.type === 'idle') return 'Idle action'
  if (activeTask.value.type === 'profession') return 'Profession action'
  if (activeTask.value.type === 'combat') return 'Combat'
  if (activeTask.value.type === 'rest') return 'Rest'
  return 'None'
})

const totalSavedLogCount = computed(
  () => combatLogs.value.length + professionLogs.value.length + actionLogs.value.length,
)

const handleSaveNow = () => {
  actionStatus.value = game.saveNow() ? 'Progress saved locally.' : 'Manual save failed.'
}

const handleHardReset = () => {
  const confirmed = window.confirm(
    'Hard reset all progress? This clears the local save and restores a fresh run in this tab.',
  )
  if (!confirmed) return

  game.hardResetGame()
  actionStatus.value = 'Progress reset. Fresh state restored.'
}
</script>

<template>
  <main class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">The Land: Settings</p>
        <h1>Save & Reset</h1>
        <p class="subtitle">
          Progress is stored locally in this browser. Autosave runs every {{ autosaveSeconds }} seconds,
          and the app also flushes one last save when you reload or close the page.
        </p>
      </div>
      <div class="hero-actions">
        <div class="tick">Autosave: {{ autosaveSeconds }}s</div>
        <div class="tick">Character level: {{ character.level }}</div>
      </div>
    </header>

    <section class="grid">
      <div class="panel">
        <div>
          <h2>Snapshot Status</h2>
          <p class="panel-copy">Current local save information for this run.</p>
        </div>

        <div class="status-grid">
          <div class="status-row">
            <span class="status-label">Saved snapshot</span>
            <span :class="['value-pill', hasSavedProgress ? 'ok' : 'muted']">
              {{ hasSavedProgress ? 'Present' : 'Not written yet' }}
            </span>
          </div>
          <div class="status-row">
            <span class="status-label">Last saved</span>
            <span class="status-value">{{ lastSavedLabel }}</span>
          </div>
          <div class="status-row">
            <span class="status-label">Current task</span>
            <span class="status-value">{{ currentTaskLabel }}</span>
          </div>
          <div class="status-row">
            <span class="status-label">Saved log entries</span>
            <span class="status-value">{{ totalSavedLogCount }}</span>
          </div>
        </div>

        <p v-if="actionStatus" class="status-note">{{ actionStatus }}</p>
        <p v-if="saveError" class="status-note error">{{ saveError }}</p>
      </div>

      <div class="panel">
        <div>
          <h2>Controls</h2>
          <p class="panel-copy">Use manual save when you do not want to wait for the next timed snapshot.</p>
        </div>

        <div class="action-row">
          <button class="ghost" @click="handleSaveNow">Save Now</button>
          <button class="danger" @click="handleHardReset">Hard Reset Progress</button>
        </div>

        <p class="panel-copy muted-copy">
          Hard reset wipes local progress, restores a fresh run immediately, and keeps the app open.
        </p>
      </div>

      <div class="panel">
        <div>
          <h2>What Gets Saved</h2>
          <p class="panel-copy">Everything needed to resume this tab accurately after a reload.</p>
        </div>

        <ul class="save-list">
          <li>Character progression, currency, stat allocations, and inventory.</li>
          <li>Current activity, action progress bars, combat state, buffs, HP, and mana.</li>
          <li>Combat, profession, and action log history.</li>
        </ul>
      </div>
    </section>
  </main>
</template>

<style scoped>
@import '../styles/view-shell.css';

.subtitle {
  max-width: 640px;
}

.panel-copy {
  color: #9fb0d3;
}

.muted-copy {
  font-size: 0.92rem;
}

.status-grid {
  display: grid;
  gap: 0.85rem;
}

.status-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(70, 88, 118, 0.22);
}

.status-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.status-label {
  color: #8fa2c6;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.status-value {
  color: #e6efff;
  text-align: right;
}

.value-pill {
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  font-size: 0.82rem;
  font-weight: 600;
  border: 1px solid transparent;
}

.value-pill.ok {
  background: rgba(79, 201, 129, 0.16);
  border-color: rgba(79, 201, 129, 0.32);
  color: #c8f7d8;
}

.value-pill.muted {
  background: rgba(120, 138, 168, 0.16);
  border-color: rgba(120, 138, 168, 0.28);
  color: #cfd9ec;
}

.action-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.ghost,
.danger {
  border-radius: 999px;
  padding: 0.65rem 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ghost {
  background: transparent;
  color: #f0c566;
  border: 1px solid rgba(240, 197, 102, 0.5);
}

.ghost:hover {
  border-color: rgba(240, 197, 102, 0.8);
}

.danger {
  background: rgba(167, 46, 58, 0.18);
  color: #ffd5d9;
  border: 1px solid rgba(228, 98, 112, 0.45);
}

.danger:hover {
  background: rgba(167, 46, 58, 0.28);
}

.status-note {
  margin-top: 0.25rem;
  color: #9fb0d3;
}

.status-note.error {
  color: #ffb8c0;
}

.save-list {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.65rem;
  color: #d4def5;
}

.save-list li::marker {
  color: #f0c566;
}

@media (max-width: 720px) {
  .status-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .status-value {
    text-align: left;
  }
}
</style>