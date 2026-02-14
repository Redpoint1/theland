<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore, type CombatLogEntry, type CombatLogType } from '../stores/game'
import ProgressBar from '../components/ProgressBar.vue'
import LogPanel from '../components/LogPanel.vue'
import InfoTooltip from '../components/InfoTooltip.vue'

const game = useGameStore()
const {
  zones,
  combat,
  combatRewards,
  combatLogs,
  currentZone,
  playerHp,
  maxHp,
  mana,
  activeTask,
} = storeToRefs(game)

const { castArcaneBurst, arcaneBurstCost } = game

const isFighting = computed(() => activeTask.value.type === 'combat')
const isResting = computed(() => activeTask.value.type === 'rest')
const canCastArcaneBurst = computed(() =>
  activeTask.value.type === 'combat' && mana.value >= arcaneBurstCost,
)

const filters = ref<Record<CombatLogType, boolean>>({
  combat: true,
  damage: true,
  kill: true,
  rest: true,
  system: true,
})

const filterOptions: Array<{ id: CombatLogType; label: string }> = [
  { id: 'combat', label: 'Combat' },
  { id: 'damage', label: 'Damage' },
  { id: 'kill', label: 'Kills' },
  { id: 'rest', label: 'Rest' },
  { id: 'system', label: 'System' },
]

const filteredLogs = computed(() =>
  combatLogs.value
    .filter((log: CombatLogEntry) => filters.value[log.type])
    .slice()
    .reverse(),
)

const zoneEnemySummary = (zoneId: string) => {
  const zone = zones.value.find((entry) => entry.id === zoneId)
  if (!zone) return []
  return zone.enemies.map((enemy) => enemy.name)
}
</script>

<template>
  <main class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">The Land: Combat Grounds</p>
        <h1>Fighting Grounds</h1>
        <p class="subtitle">
          Choose a zone and toggle combat. Idle actions pause while fighting.
        </p>
      </div>
      <div class="hero-actions">
        <div class="combat-buttons">
          <button class="toggle" :class="{ active: isFighting }" @click="game.toggleCombat">
            {{ isFighting ? 'Fighting' : 'Start Combat' }}
          </button>
          <button
            class="toggle"
            :class="{ active: isResting }"
            @click="game.toggleResting"
          >
            {{ isResting ? 'Resting' : 'Rest' }}
          </button>
        </div>
        <div class="tick">Health: {{ playerHp }} / {{ maxHp }}</div>
        <ProgressBar :value="playerHp" :max="maxHp" variant="hp" />
        <button class="ghost" :disabled="!canCastArcaneBurst" @click="castArcaneBurst">
          Arcane Burst ({{ arcaneBurstCost }} Mana)
        </button>
      </div>
    </header>

    <section class="grid">
      <div class="panel combat">
        <div class="combat-header">
          <div>
            <h2>Zones</h2>
            <div class="item-desc">Recommended levels and difficulty reflect the Land.</div>
          </div>
        </div>

        <div class="zone-grid">
          <button
            v-for="zone in zones"
            :key="zone.id"
            class="zone-card"
            :class="{ selected: zone.id === combat.zoneId }"
            @click="game.setZone(zone.id)"
          >
            <InfoTooltip>
              <template #trigger>
                <div class="item-title">{{ zone.name }}</div>
              </template>
              <template #content>
                <div class="info-tooltip-title">{{ zone.name }}</div>
                <div class="info-tooltip-line">{{ zone.description }}</div>
                <div class="info-tooltip-line">Level Range: {{ zone.levelMin }}-{{ zone.levelMax }}</div>
                <div class="info-tooltip-line">Base Power: {{ zone.basePower }}</div>
                <div class="info-tooltip-line">Base Reward XP: {{ zone.baseRewards.exp }}</div>
                <div class="info-tooltip-line">Base Reward Copper: {{ zone.baseRewards.copper }}c</div>
                <div class="info-tooltip-line">Base Combat XP: {{ zone.baseRewards.skillExp }}</div>
                <div class="info-tooltip-line info-tooltip-muted">Enemies:</div>
                <div
                  v-for="enemyName in zoneEnemySummary(zone.id)"
                  :key="`${zone.id}-${enemyName}`"
                  class="info-tooltip-line info-tooltip-muted"
                >
                  {{ enemyName }}
                </div>
              </template>
            </InfoTooltip>
            <div class="item-desc">{{ zone.description }}</div>
            <div class="zone-level">Lv. {{ zone.levelMin }}-{{ zone.levelMax }}</div>
          </button>
        </div>

        <div class="enemy-card">
          <div>
            <InfoTooltip>
              <template #trigger>
                <div class="item-title">{{ combat.enemyName }}</div>
              </template>
              <template #content>
                <div class="info-tooltip-title">{{ combat.enemyName }}</div>
                <div class="info-tooltip-line">Current Zone: {{ currentZone.name }}</div>
                <div class="info-tooltip-line">Enemy Level: {{ combat.enemyLevel }}</div>
                <div class="info-tooltip-line">Enemy Power: {{ Math.floor(combat.enemyPower) }}</div>
                <div class="info-tooltip-line">Enemy HP: {{ combat.enemyHp }} / {{ combat.enemyMaxHp }}</div>
                <div class="info-tooltip-line info-tooltip-muted">Defeat rewards are scaled by enemy level and type.</div>
              </template>
            </InfoTooltip>
            <div class="item-desc">Zone: {{ currentZone.name }}</div>
          </div>
          <div class="enemy-stats">
            <div class="label">Enemy Level</div>
            <div class="value">{{ combat.enemyLevel }}</div>
          </div>
          <div class="enemy-hp">
            <div class="label">Enemy Health</div>
            <div class="value">{{ combat.enemyHp }} / {{ combat.enemyMaxHp }}</div>
            <ProgressBar :value="combat.enemyHp" :max="combat.enemyMaxHp" variant="enemy" />
          </div>
          <InfoTooltip>
            <template #trigger>
              <div class="reward-hint">
                Rewards: +{{ combatRewards.exp }} XP, +{{ combatRewards.copper }}c,
                +{{ combatRewards.skillExp }} Combat XP / kill
              </div>
            </template>
            <template #content>
              <div class="info-tooltip-title">Current Enemy Rewards</div>
              <div class="info-tooltip-line">Character XP: +{{ combatRewards.exp }}</div>
              <div class="info-tooltip-line">Currency: +{{ combatRewards.copper }}c</div>
              <div class="info-tooltip-line">Combat Skill XP: +{{ combatRewards.skillExp }}</div>
              <div class="info-tooltip-line">Stat XP per stat: +{{ combatRewards.statExp }}</div>
            </template>
          </InfoTooltip>
        </div>
      </div>

      <LogPanel
        title="Combat Log"
        subtitle="Latest 1000 events retained."
        :entries="filteredLogs"
        :on-clear="game.clearCombatLogs"
      >
        <template #filters>
          <div class="log-filters">
            <label v-for="option in filterOptions" :key="option.id" class="filter-pill">
              <input v-model="filters[option.id]" type="checkbox" />
              <span>{{ option.label }}</span>
            </label>
          </div>
        </template>
      </LogPanel>
    </section>
  </main>
</template>
