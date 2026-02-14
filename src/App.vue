<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, RouterView } from 'vue-router'
import { useGameStore, type ActionItem, type ProfessionAction } from './stores/game'
import InfoTooltip from './components/InfoTooltip.vue'

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

const totalCopper = computed(
  () => currencyBreakdown.value.gold * 10000 + currencyBreakdown.value.silver * 100 + currencyBreakdown.value.copper,
)

const hpPercent = computed(() => Math.floor((playerHp.value / Math.max(1, maxHp.value)) * 100))
const manaPercent = computed(() => Math.floor((mana.value / Math.max(1, maxMana.value)) * 100))

const activeActionType = computed(() => {
  if (activeTask.value.type === 'idle') return 'Idle Action'
  if (activeTask.value.type === 'profession') return 'Profession Action'
  if (activeTask.value.type === 'combat') return 'Combat'
  if (activeTask.value.type === 'rest') return 'Rest'
  return 'None'
})

const activeActionDescription = computed(() => {
  if (activeTask.value.type === 'idle') {
    const active = actions.value.find((action: ActionItem) => action.id === activeTask.value.actionId)
    return active?.description ?? 'No idle action active.'
  }
  if (activeTask.value.type === 'profession') {
    const active = professionActions.value.find(
      (action: ProfessionAction) => action.id === activeTask.value.actionId,
    )
    return active?.description ?? 'No profession action active.'
  }
  if (activeTask.value.type === 'combat') return 'Fighting in the currently selected combat zone.'
  if (activeTask.value.type === 'rest') return 'Recovering health and mana while inactive.'
  return 'No active task.'
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
        <RouterLink to="/mist-village" class="nav-link">Mist Village</RouterLink>
        <RouterLink to="/combat" class="nav-link">Fighting Grounds</RouterLink>
        <RouterLink to="/inventory" class="nav-link">Inventory</RouterLink>
        <RouterLink to="/professions" class="nav-link">Professions</RouterLink>
      </div>
    </nav>
    <section class="hud">
      <InfoTooltip align="left">
        <template #trigger>
          <div class="hud-item">
            <span class="hud-label">Level</span>
            <span class="hud-value">{{ character.level }}</span>
          </div>
        </template>
        <template #content>
          <div class="info-tooltip-title">Character Level</div>
          <div class="info-tooltip-line">Current Level: {{ character.level }}</div>
          <div class="info-tooltip-line info-tooltip-muted">Gain levels by earning character XP.</div>
        </template>
      </InfoTooltip>

      <InfoTooltip>
        <template #trigger>
          <div class="hud-item">
            <span class="hud-label">XP</span>
            <span class="hud-value">{{ character.exp }} / {{ character.expToNext }}</span>
          </div>
        </template>
        <template #content>
          <div class="info-tooltip-title">Character Experience</div>
          <div class="info-tooltip-line">Progress: {{ character.exp }} / {{ character.expToNext }}</div>
          <div class="info-tooltip-line">Remaining: {{ Math.max(0, character.expToNext - character.exp) }}</div>
          <div class="info-tooltip-line info-tooltip-muted">Arcana increases XP gains globally.</div>
        </template>
      </InfoTooltip>

      <InfoTooltip>
        <template #trigger>
          <div class="hud-item">
            <span class="hud-label">Gold</span>
            <span class="hud-value">{{ currencyBreakdown.gold }}</span>
          </div>
        </template>
        <template #content>
          <div class="info-tooltip-title">Currency: Gold</div>
          <div class="info-tooltip-line">Gold: {{ currencyBreakdown.gold }}</div>
          <div class="info-tooltip-line info-tooltip-muted">1 Gold = 100 Silver = 10,000 Copper.</div>
          <div class="info-tooltip-line info-tooltip-muted">Total Copper: {{ totalCopper }}</div>
        </template>
      </InfoTooltip>

      <InfoTooltip>
        <template #trigger>
          <div class="hud-item">
            <span class="hud-label">Silver</span>
            <span class="hud-value">{{ currencyBreakdown.silver }}</span>
          </div>
        </template>
        <template #content>
          <div class="info-tooltip-title">Currency: Silver</div>
          <div class="info-tooltip-line">Silver: {{ currencyBreakdown.silver }}</div>
          <div class="info-tooltip-line info-tooltip-muted">1 Silver = 100 Copper.</div>
          <div class="info-tooltip-line info-tooltip-muted">Total Copper: {{ totalCopper }}</div>
        </template>
      </InfoTooltip>

      <InfoTooltip>
        <template #trigger>
          <div class="hud-item">
            <span class="hud-label">Copper</span>
            <span class="hud-value">{{ currencyBreakdown.copper }}</span>
          </div>
        </template>
        <template #content>
          <div class="info-tooltip-title">Currency: Copper</div>
          <div class="info-tooltip-line">Copper: {{ currencyBreakdown.copper }}</div>
          <div class="info-tooltip-line info-tooltip-muted">Smallest currency denomination.</div>
          <div class="info-tooltip-line info-tooltip-muted">Total Copper: {{ totalCopper }}</div>
        </template>
      </InfoTooltip>

      <InfoTooltip>
        <template #trigger>
          <div class="hud-item">
            <span class="hud-label">HP</span>
            <span class="hud-value">{{ playerHp }} / {{ maxHp }}</span>
          </div>
        </template>
        <template #content>
          <div class="info-tooltip-title">Health (HP)</div>
          <div class="info-tooltip-line">Current: {{ playerHp }} / {{ maxHp }}</div>
          <div class="info-tooltip-line">Percent: {{ hpPercent }}%</div>
          <div class="info-tooltip-line info-tooltip-muted">Vitality increases max HP.</div>
        </template>
      </InfoTooltip>

      <InfoTooltip>
        <template #trigger>
          <div class="hud-item">
            <span class="hud-label">Mana</span>
            <span class="hud-value">{{ mana }} / {{ maxMana }}</span>
          </div>
        </template>
        <template #content>
          <div class="info-tooltip-title">Mana</div>
          <div class="info-tooltip-line">Current: {{ mana }} / {{ maxMana }}</div>
          <div class="info-tooltip-line">Percent: {{ manaPercent }}%</div>
          <div class="info-tooltip-line info-tooltip-muted">Intelligence increases max mana and regen.</div>
        </template>
      </InfoTooltip>

      <InfoTooltip max-width="420px" align="right">
        <template #trigger>
          <div class="hud-item wide">
            <span class="hud-label">Action</span>
            <span class="hud-value">{{ activeActionName }}</span>
          </div>
        </template>
        <template #content>
          <div class="info-tooltip-title">Active Task</div>
          <div class="info-tooltip-line">Type: {{ activeActionType }}</div>
          <div class="info-tooltip-line">Name: {{ activeActionName }}</div>
          <div class="info-tooltip-line info-tooltip-muted">{{ activeActionDescription }}</div>
        </template>
      </InfoTooltip>
    </section>
    <RouterView />
  </div>
</template>
