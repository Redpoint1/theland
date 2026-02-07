<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, RouterView } from 'vue-router'
import { useGameStore } from './stores/game'

const game = useGameStore()
const { character, currency, playerHp, maxHp, combat, actions } = storeToRefs(game)

const activeActionName = computed(() => {
  const active = actions.value.find((action) => action.active)
  return active ? active.name : 'None'
})

const combatStatus = computed(() => {
  if (combat.value.active) return 'Fighting'
  if (combat.value.resting) return 'Resting'
  return 'Idle'
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
        <span class="hud-value">{{ currency.gold }}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Silver</span>
        <span class="hud-value">{{ currency.silver }}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Copper</span>
        <span class="hud-value">{{ currency.copper }}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">HP</span>
        <span class="hud-value">{{ playerHp }} / {{ maxHp }}</span>
      </div>
      <div class="hud-item wide">
        <span class="hud-label">Idle Action</span>
        <span class="hud-value">{{ activeActionName }}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Combat</span>
        <span class="hud-value">{{ combatStatus }}</span>
      </div>
    </section>
    <RouterView />
  </div>
</template>
