<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore, type ProfessionKey } from '../stores/game'
import ProfessionCard from '../components/ProfessionCard.vue'

const game = useGameStore()
const {
  professionList,
  professionActions,
  professionBonuses,
  professionActionProgress,
  professionActionJustCompleted,
  activeTask,
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

const selectedProfessionKey = ref<ProfessionKey | null>(
  professionList.value[0]?.name ?? null,
)

watch(
  professionList,
  (list) => {
    if (!selectedProfessionKey.value && list.length > 0) {
      const first = list[0]
      if (first) selectedProfessionKey.value = first.name
    }
  },
  { immediate: true },
)

const selectedProfession = computed(() =>
  professionList.value.find((profession) => profession.name === selectedProfessionKey.value) ??
  professionList.value[0],
)

const selectedActions = computed(() => {
  if (!selectedProfession.value) return []
  return actionsByProfession.value.get(selectedProfession.value.name) ?? []
})

const activeProfessionActionId = computed(() =>
  activeTask.value.type === 'profession' ? activeTask.value.actionId : undefined,
)

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
      <div class="panel">
        <h2>Choose Profession</h2>
        <div class="list">
          <button
            v-for="profession in professionList"
            :key="profession.name"
            class="toggle"
            :class="{ active: profession.name === selectedProfessionKey }"
            @click="selectedProfessionKey = profession.name"
          >
            {{ profession.name }}
          </button>
        </div>
      </div>

      <ProfessionCard
        v-if="selectedProfession"
        :profession="selectedProfession"
        :actions="selectedActions"
        :active-action-id="activeProfessionActionId"
        :bonus-percent="Math.round((professionBonuses[selectedProfession.name] - 1) * 100)"
        :action-duration-ms="actionDurationMs"
        :progress-value="professionProgressValue"
        :get-item-name="getItemName"
        :get-item-quantity="getItemQuantity"
        :on-toggle="game.toggleProfessionAction"
      />
    </section>
  </main>
</template>

<style scoped>
@import '../styles/view-shell.css';

.subtitle {
  max-width: 520px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.toggle {
  background: rgba(69, 85, 110, 0.4);
  color: #e6e9f2;
  border: 1px solid rgba(121, 145, 180, 0.4);
  padding: 0.4rem 1.1rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.toggle.active {
  background: linear-gradient(120deg, #74d2ff, #6ff2c5);
  color: #0b111b;
}

</style>
