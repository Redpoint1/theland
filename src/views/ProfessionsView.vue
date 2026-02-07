<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '../stores/game'
import ProfessionCard from '../components/ProfessionCard.vue'
import LogPanel from '../components/LogPanel.vue'

const game = useGameStore()
const {
  professionList,
  professionActions,
  professionBonuses,
  professionActionProgress,
  professionActionJustCompleted,
  professionLogs,
} = storeToRefs(game)
const { getItemDef, getItemQuantity, actionDurationMs } = game

const actionsByProfession = computed(() => {
  const map = new Map<string, typeof professionActions.value>()
  professionActions.value.forEach((action) => {
    if (!map.has(action.profession)) {
      map.set(action.profession, [])
    }
    map.get(action.profession)?.push(action)
  })
  return map
})

const professionProgressValue = computed(() =>
  professionActionJustCompleted.value ? actionDurationMs : professionActionProgress.value,
)

const logEntries = computed(() => professionLogs.value.slice().reverse())

const getItemName = (itemId: string) => getItemDef(itemId)?.name ?? itemId
</script>

<template>
  <main class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">The Land: Professions</p>
        <h1>Professions</h1>
        <p class="subtitle">Train gathering and crafting disciplines for bonuses and unlocks.</p>
      </div>
      <div class="hero-actions">
        <div class="tick">Active actions run while not fighting.</div>
      </div>
    </header>

    <section class="grid">
      <ProfessionCard
        v-for="profession in professionList"
        :key="profession.name"
        :profession="profession"
        :actions="actionsByProfession.get(profession.name) ?? []"
        :bonus-percent="Math.round((professionBonuses[profession.name] - 1) * 100)"
        :action-duration-ms="actionDurationMs"
        :progress-value="professionProgressValue"
        :get-item-name="getItemName"
        :get-item-quantity="getItemQuantity"
        :on-toggle="game.toggleProfessionAction"
      />

      <LogPanel
        title="Profession Log"
        subtitle="Latest 500 events retained."
        :entries="logEntries"
        :on-clear="game.clearProfessionLogs"
      />
    </section>
  </main>
</template>
