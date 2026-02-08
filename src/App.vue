<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, RouterView } from 'vue-router'
import { useGameStore, type ActionItem, type ProfessionAction } from './stores/game'

const game = useGameStore()
const {
  character,
  currencyBreakdown,
  playerHp,
  mana,
  maxMana,
  maxHp,
  actions,
  professionActions,
  activeTask,
} = storeToRefs(game)

const activeActionName = computed(() => {
  if (activeTask.value.type === 'idle') {
    const active = actions.value.find((action: ActionItem) => action.id === activeTask.value.actionId)
    return active ? active.name : 'None'
  }
  if (activeTask.value.type === 'profession') {
    const active = professionActions.value.find(
      (action: ProfessionAction) => action.id === activeTask.value.actionId,
    )
    return active ? active.name : 'None'
  }
  if (activeTask.value.type === 'combat') return 'Combat'
  if (activeTask.value.type === 'rest') return 'Resting'
  return 'None'
})

onMounted(() => {
  game.startTicker()
})

onBeforeUnmount(() => {
  game.stopTicker()
})
</script>

<template>
  <div class="shell">
    <nav class="top-nav">
      <div class="brand">The Land: Idle Seeds</div>
      <div class="nav-links">
        <RouterLink to="/" class="nav-link">Sanctum</RouterLink>
        <RouterLink to="/combat" class="nav-link">Fighting Grounds</RouterLink>
        <RouterLink to="/inventory" class="nav-link">Inventory</RouterLink>
        <RouterLink to="/professions" class="nav-link">Professions</RouterLink>
      </div>
    </nav>
    <section class="hud">
      <div class="hud-item">
        <span class="hud-label">Level</span>
        <span class="hud-value">{{ character.level }}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">XP</span>
        <span class="hud-value">{{ character.exp }} / {{ character.expToNext }}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Gold</span>
        <span class="hud-value">{{ currencyBreakdown.gold }}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Silver</span>
        <span class="hud-value">{{ currencyBreakdown.silver }}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Copper</span>
        <span class="hud-value">{{ currencyBreakdown.copper }}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">HP</span>
        <span class="hud-value">{{ playerHp }} / {{ maxHp }}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Mana</span>
        <span class="hud-value">{{ mana }} / {{ maxMana }}</span>
      </div>
      <div class="hud-item wide">
        <span class="hud-label">Action</span>
        <span class="hud-value">{{ activeActionName }}</span>
      </div>
    </section>
    <RouterView />
  </div>
</template>
