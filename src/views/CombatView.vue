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
  character,
  stats,
  skills,
  skillBonuses,
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

const formatCurrency = (copper: number) => game.formatCopperToCurrency(copper)

const formatPercent = (value: number) => `${Math.round(value * 10000) / 100}%`

interface ParsedCombatLog {
  before: string
  focus?: string
  after: string
  tooltipTitle?: string
  tooltipLines?: string[]
}

const parseCombatLog = (log: { message: string }): ParsedCombatLog => {
  const message = log.message

  const defeated = message.match(/^Defeated (.+) \(Lv\. (\d+)\)\. Rewards: \+(\d+) XP, \+(.+)\.$/)
  if (defeated) {
    const [, enemyName, levelText, xpText, currencyText] = defeated
    return {
      before: 'Defeated ',
      focus: enemyName,
      after: ` (Lv. ${levelText}). Rewards: +${xpText} XP, +${currencyText}.`,
      tooltipTitle: `${enemyName} Defeated`,
      tooltipLines: [
        `Enemy level: ${levelText}`,
        `Character XP reward: +${xpText}`,
        `Currency reward: +${currencyText}`,
        'Combat XP and stat XP are also awarded from zone scaling.',
      ],
    }
  }

  const playerHit = message.match(/^You hit (.+) for (\d+) damage\.$/)
  if (playerHit) {
    const [, enemyName, damageText] = playerHit
    const playerPower =
      character.value.level * 2 +
      stats.value.Strength.value * 1.4 +
      stats.value.Agility.value * 1.1 +
      skills.value.Combat.level * 2 +
      stats.value.Spirit.value * 0.4

    return {
      before: `You hit ${enemyName} for `,
      focus: `${damageText} damage`,
      after: '.',
      tooltipTitle: 'Outgoing Damage',
      tooltipLines: [
        'Formula: floor((PlayerPower - EnemyPower×0.5 + random[0..6]) × CombatDamageMultiplier)',
        `Current PlayerPower terms: Lv(${character.value.level}) Str(${stats.value.Strength.value}) Agi(${stats.value.Agility.value}) Combat(${skills.value.Combat.level}) Spirit(${stats.value.Spirit.value})`,
        `Current PlayerPower estimate: ${Math.floor(playerPower)}`,
        `Global combat damage bonus: +${formatPercent(skillBonuses.value.combatDamageMultiplier - 1)}`,
      ],
    }
  }

  const enemyHit = message.match(/^(.+) hits you for (\d+) damage \(received\)\.$/)
  if (enemyHit) {
    const [, enemyName, damageText] = enemyHit
    const mitigation = stats.value.Vitality.value * 0.8 + stats.value.Agility.value * 0.4
    return {
      before: `${enemyName} hits you for `,
      focus: `${damageText} damage`,
      after: ' (received).',
      tooltipTitle: 'Incoming Damage',
      tooltipLines: [
        'Formula: floor((EnemyPower - Mitigation + random[0..4]) × (1 - DamageReduction))',
        `Current mitigation: ${Math.floor(mitigation)} (Vitality ${stats.value.Vitality.value}, Agility ${stats.value.Agility.value})`,
        `Global damage reduction: +${formatPercent(skillBonuses.value.combatDamageReduction)}`,
      ],
    }
  }

  const encountered = message.match(/^Encountered (.+) \(Lv\. (\d+)\) in (.+)\.$/)
  if (encountered) {
    const [, enemyName, levelText, zoneName] = encountered
    return {
      before: 'Encountered ',
      focus: enemyName,
      after: ` (Lv. ${levelText}) in ${zoneName}.`,
      tooltipTitle: 'Encounter Target',
      tooltipLines: [`Enemy level: ${levelText}`, `Zone: ${zoneName}`],
    }
  }

  const arcaneBurst = message.match(/^Arcane Burst hits (.+) for (\d+) damage\.$/)
  if (arcaneBurst) {
    const [, enemyName, damageText] = arcaneBurst
    return {
      before: `Arcane Burst hits ${enemyName} for `,
      focus: `${damageText} damage`,
      after: '.',
      tooltipTitle: 'Arcane Burst Damage',
      tooltipLines: [
        'Formula: max(6, floor(Intelligence×1.6 + Arcana×3))',
        `Current Intelligence: ${stats.value.Intelligence.value}`,
        `Current Arcana: ${skills.value.Arcana.level}`,
      ],
    }
  }

  return {
    before: message,
    after: '',
  }
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
                <div class="info-tooltip-line">Base Reward Currency: {{ formatCurrency(zone.baseRewards.copper) }}</div>
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
                Rewards: +{{ combatRewards.exp }} XP, +{{ formatCurrency(combatRewards.copper) }},
                +{{ combatRewards.skillExp }} Combat XP / kill
              </div>
            </template>
            <template #content>
              <div class="info-tooltip-title">Current Enemy Rewards</div>
              <div class="info-tooltip-line">Character XP: +{{ combatRewards.exp }}</div>
              <div class="info-tooltip-line">Currency: +{{ formatCurrency(combatRewards.copper) }}</div>
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
        <template #row="{ log }">
          <span class="log-time">{{ new Date(log.timestamp).toLocaleTimeString() }}</span>
          <span class="log-type">{{ log.type }}</span>
          <div class="log-message">
            <template v-if="parseCombatLog(log).focus && parseCombatLog(log).tooltipLines">
              {{ parseCombatLog(log).before }}
              <InfoTooltip max-width="560px" placement="bottom" align="left" teleport>
                <template #trigger>
                  <span class="log-focus">{{ parseCombatLog(log).focus }}</span>
                </template>
                <template #content>
                  <div class="info-tooltip-title">{{ parseCombatLog(log).tooltipTitle }}</div>
                  <div
                    v-for="line in parseCombatLog(log).tooltipLines"
                    :key="line"
                    class="info-tooltip-line"
                  >
                    {{ line }}
                  </div>
                </template>
              </InfoTooltip>
              {{ parseCombatLog(log).after }}
            </template>
            <template v-else>
              {{ log.message }}
            </template>
          </div>
        </template>
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

<style scoped>
@import '../styles/view-shell.css';

.subtitle {
  max-width: 520px;
}

.combat-buttons {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.combat-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.zone-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.zone-card {
  border-radius: 14px;
  padding: 0.75rem;
  text-align: left;
  background: rgba(21, 30, 47, 0.8);
  border: 1px solid rgba(90, 110, 140, 0.3);
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.zone-card:hover {
  transform: translateY(-2px);
  border-color: rgba(240, 197, 102, 0.6);
}

.zone-card.selected {
  border-color: rgba(116, 210, 255, 0.9);
  box-shadow: 0 10px 18px rgba(116, 210, 255, 0.2);
}

.zone-level {
  margin-top: 0.4rem;
  font-size: 0.8rem;
  color: #9fb0d3;
}

.enemy-card {
  padding: 1rem;
  border-radius: 16px;
  background: rgba(21, 30, 47, 0.8);
  border: 1px solid rgba(90, 110, 140, 0.3);
  display: grid;
  gap: 0.75rem;
}

.enemy-stats {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.enemy-hp .value {
  font-size: 1.1rem;
}

.reward-hint {
  font-size: 0.85rem;
  color: #9fb0d3;
}

.item-title {
  font-weight: 600;
}

.item-desc {
  font-size: 0.85rem;
  color: #8fa2c6;
}

.label {
  color: #8fa2c6;
  font-size: 0.85rem;
}

.value {
  font-size: 1.6rem;
  font-weight: 600;
}

.toggle {
  background: rgba(69, 85, 110, 0.4);
  color: #e6e9f2;
  border: 1px solid rgba(121, 145, 180, 0.4);
  padding: 0.4rem 1.1rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

.toggle.active {
  background: linear-gradient(120deg, #74d2ff, #6ff2c5);
  color: #0b111b;
}

.toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ghost {
  background: transparent;
  color: #f0c566;
  border: 1px solid rgba(240, 197, 102, 0.5);
  border-radius: 999px;
  padding: 0.55rem 1.4rem;
  font-weight: 600;
  cursor: pointer;
}

.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.log-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: rgba(24, 34, 52, 0.8);
  border: 1px solid rgba(90, 110, 140, 0.3);
  color: #c7d4f2;
  cursor: pointer;
}

.filter-pill input {
  accent-color: #74d2ff;
}

.log-focus {
  color: #c8f0ff;
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

@media (max-width: 720px) {
  .combat-buttons {
    align-items: flex-start;
    justify-content: flex-start;
  }
}
</style>
