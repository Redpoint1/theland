<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '../stores/game'
import ProgressBar from '../components/ProgressBar.vue'

const game = useGameStore()
const {
  professionList,
  professionActions,
  professionBonuses,
  professionActionProgress,
  professionActionJustCompleted,
} = storeToRefs(game)
const { getItemDef, actionDurationMs } = game

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
      <div v-for="profession in professionList" :key="profession.name" class="panel">
        <div class="profession-header">
          <div>
            <h2>{{ profession.name }}</h2>
            <div class="item-desc">{{ profession.description }}</div>
            <div class="item-hint">
              {{ profession.bonusLabel }}: +{{ Math.round((professionBonuses[profession.name] - 1) * 100) }}%
            </div>
          </div>
          <div class="profession-meta">
            <div class="label">Level</div>
            <div class="value">{{ profession.level }}</div>
          </div>
        </div>

        <div class="exp-block">
          <div class="label">Experience</div>
          <div class="value">{{ profession.exp }} / {{ profession.expToNext }}</div>
          <ProgressBar :value="profession.exp" :max="profession.expToNext" />
        </div>

        <div class="profession-actions">
          <div
            v-for="action in actionsByProfession.get(profession.name) ?? []"
            :key="action.id"
            class="profession-action"
            :class="{ locked: profession.level < action.requiredLevel }"
          >
            <div>
              <div class="item-title">{{ action.name }}</div>
              <div class="item-desc">{{ action.description }}</div>
              <div class="item-hint">Requires level {{ action.requiredLevel }}</div>
              <div class="item-hint">
                Rewards:
                <span
                  v-for="reward in action.rewards"
                  :key="reward.itemId"
                  class="reward-chip"
                >
                  {{ getItemDef(reward.itemId)?.name ?? reward.itemId }} x{{ reward.amount }}
                </span>
              </div>
              <ProgressBar
                v-if="action.active"
                :value="professionProgressValue"
                :max="actionDurationMs"
                thin
              />
            </div>
            <button
              class="toggle"
              :class="{ active: action.active }"
              :disabled="profession.level < action.requiredLevel"
              @click="game.toggleProfessionAction(action)"
            >
              {{ action.active ? 'Active' : 'Idle' }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
