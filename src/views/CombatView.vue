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
  currentEnemyDropPreview,
  activeBuffs,
  availableSpells,
  spellbook,
  selectedSpellId,
  selectedSpell,
  selectedSpellManaCost,
  character,
  stats,
  skills,
  skillBonuses,
  playerHp,
  maxHp,
  mana,
  activeTask,
} = storeToRefs(game)

const { castSelectedSpell, setSelectedSpell, learnSpell } = game

const isFighting = computed(() => activeTask.value.type === 'combat')
const isResting = computed(() => activeTask.value.type === 'rest')
const canCastSelectedSpell = computed(() =>
  activeTask.value.type === 'combat' && mana.value >= selectedSpellManaCost.value,
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

const activeBuffCombatBonus = computed(() =>
  activeBuffs.value.reduce((total, buff) => total + buff.combatDamageBonus, 0),
)
const activeBuffSpellBonus = computed(() =>
  activeBuffs.value.reduce((total, buff) => total + buff.spellPowerBonus, 0),
)
const activeBuffReductionBonus = computed(() =>
  activeBuffs.value.reduce((total, buff) => total + buff.damageReductionBonus, 0),
)

type SpellTypeFilter = 'all' | 'damage' | 'healing' | 'buff'

const spellTypeFilter = ref<SpellTypeFilter>('all')

const spellTypeFilterOptions: Array<{ id: SpellTypeFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'damage', label: 'Damage' },
  { id: 'healing', label: 'Healing' },
  { id: 'buff', label: 'Buff' },
]

const filteredSpells = computed(() =>
  spellTypeFilter.value === 'all'
    ? availableSpells.value
    : availableSpells.value.filter((spell) => spell.effectType === spellTypeFilter.value),
)

interface ParsedCombatLog {
  before: string
  focus?: string
  after: string
  tooltipTitle?: string
  tooltipLines?: string[]
}

const parseCombatLog = (log: { message: string }): ParsedCombatLog => {
  const message = log.message

  const defeated = message.match(/^Defeated (.+) \(Lv\. (\d+)\)\. Rewards: \+(\d+) XP, Drops: (.+)\.$/)
  if (defeated) {
    const [, enemyName, levelText, xpText, dropsText] = defeated
    return {
      before: 'Defeated ',
      focus: enemyName,
      after: ` (Lv. ${levelText}). Rewards: +${xpText} XP, Drops: ${dropsText}.`,
      tooltipTitle: `${enemyName} Defeated`,
      tooltipLines: [
        `Enemy level: ${levelText}`,
        `Character XP reward: +${xpText}`,
        `Drop outcome: ${dropsText}`,
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

  const spellHit = message.match(/^(.+) hits (.+) for (\d+) spell damage\.$/)
  if (spellHit) {
    const [, spellName, enemyName, damageText] = spellHit
    return {
      before: `${spellName} hits ${enemyName} for `,
      focus: `${damageText} damage`,
      after: '.',
      tooltipTitle: `${spellName} Damage`,
      tooltipLines: [
        'Formula: floor((base + level scaling + stat scaling + skill scaling + random) × CombatDamageMultiplier)',
        `Current Intelligence: ${stats.value.Intelligence.value}`,
        `Current Arcana: ${skills.value.Arcana.level}`,
        `Combat multiplier: +${formatPercent(skillBonuses.value.combatDamageMultiplier - 1)}`,
      ],
    }
  }

  const spellHeal = message.match(/^(.+) restores (\d+) HP\.$/)
  if (spellHeal) {
    const [, spellName, healText] = spellHeal
    return {
      before: `${spellName} restores `,
      focus: `${healText} HP`,
      after: '.',
      tooltipTitle: `${spellName} Healing`,
      tooltipLines: [
        'Formula: floor((base + level scaling + stat scaling + skill scaling + random) × RegenMultiplier)',
        `Current Spirit: ${stats.value.Spirit.value}`,
        `Current Arcana: ${skills.value.Arcana.level}`,
        `Regen multiplier bonus: +${formatPercent(skillBonuses.value.regenMultiplier - 1)}`,
      ],
    }
  }

  const buffApplied = message.match(/^(.+) empowers you for (\d+) ticks \(\+(\d+)% combat, \+(\d+)% spell, \+(\d+)% reduction\)\.$/)
  if (buffApplied) {
    const [, spellName, tickText, combatText, spellText, reductionText] = buffApplied
    return {
      before: `${spellName} empowers you for `,
      focus: `${tickText} ticks`,
      after: ` (+${combatText}% combat, +${spellText}% spell, +${reductionText}% reduction).`,
      tooltipTitle: `${spellName} Buff`,
      tooltipLines: [
        `Duration: ${tickText} combat ticks`,
        `Combat damage bonus: +${combatText}%`,
        `Spell power bonus: +${spellText}%`,
        `Damage reduction bonus: +${reductionText}%`,
      ],
    }
  }

  const buffFaded = message.match(/^(.+) has faded\.$/)
  if (buffFaded) {
    const [, buffName] = buffFaded
    return {
      before: '',
      focus: buffName,
      after: ' has faded.',
      tooltipTitle: 'Buff Expired',
      tooltipLines: ['The effect is no longer active and its bonuses no longer apply.'],
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
        <button class="ghost" :disabled="!canCastSelectedSpell" @click="castSelectedSpell">
          Cast {{ selectedSpell?.name }} ({{ selectedSpellManaCost }} Mana)
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
                <div class="info-tooltip-line">Drop Table: Enemy-specific (chance based)</div>
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
          <div class="npc-column">
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
                  <div class="info-tooltip-line info-tooltip-muted">Drop table:</div>
                  <div
                    v-for="entry in currentEnemyDropPreview"
                    :key="`enemy-drop-${entry}`"
                    class="info-tooltip-line info-tooltip-muted"
                  >
                    {{ entry }}
                  </div>
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
                  Rewards: +{{ combatRewards.exp }} XP, Drops: {{ currentEnemyDropPreview.join(', ') || 'none' }},
                  +{{ combatRewards.skillExp }} Combat XP / kill
                </div>
              </template>
              <template #content>
                <div class="info-tooltip-title">Current Enemy Rewards</div>
                <div class="info-tooltip-line">Character XP: +{{ combatRewards.exp }}</div>
                <div class="info-tooltip-line">Guaranteed currency floor: {{ formatCurrency(combatRewards.copper) }}</div>
                <div class="info-tooltip-line info-tooltip-muted">Drop table entries:</div>
                <div
                  v-for="entry in currentEnemyDropPreview"
                  :key="`reward-drop-${entry}`"
                  class="info-tooltip-line info-tooltip-muted"
                >
                  {{ entry }}
                </div>
                <div class="info-tooltip-line">Combat Skill XP: +{{ combatRewards.skillExp }}</div>
                <div class="info-tooltip-line">Stat XP per stat: +{{ combatRewards.statExp }}</div>
              </template>
            </InfoTooltip>
          </div>

        </div>
      </div>

      <div class="panel spellbook-panel">
        <div class="spellbook">
          <div class="combat-header">
            <div>
              <h2>Spellbook</h2>
              <div class="item-desc">Learn, select, and monitor spell effects.</div>
            </div>
            <div class="spell-filters">
              <label
                v-for="option in spellTypeFilterOptions"
                :key="`spell-filter-${option.id}`"
                class="filter-pill"
              >
                <input v-model="spellTypeFilter" type="radio" :value="option.id" name="spell-type" />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>
          <div class="spell-grid">
            <div
              v-for="spell in filteredSpells"
              :key="spell.id"
              class="spell-card"
              :class="{ selected: selectedSpellId === spell.id }"
            >
              <div>
                <InfoTooltip>
                  <template #trigger>
                    <div class="item-title">{{ spell.name }}</div>
                  </template>
                  <template #content>
                    <div class="info-tooltip-title">{{ spell.name }}</div>
                    <div class="info-tooltip-line">{{ spell.description }}</div>
                    <div class="info-tooltip-line">Required Arcana: {{ spell.requiredArcanaLevel }}</div>
                    <div class="info-tooltip-line">Mana cost: {{ spell.manaCost }}</div>
                    <div class="info-tooltip-line">Level: {{ spellbook[spell.id]?.level ?? 0 }} / {{ spell.maxLevel }}</div>
                    <div class="info-tooltip-line" v-if="spell.effectType === 'damage'">
                      Base damage: {{ spell.baseDamage }} + {{ spell.damagePerLevel }} per level
                    </div>
                    <div class="info-tooltip-line" v-if="spell.effectType === 'damage'">
                      Scaling: Int {{ spell.statScaling.intelligence }}, Spirit {{ spell.statScaling.spirit }}, Arcana {{ spell.skillScaling.arcana }}, Combat {{ spell.skillScaling.combat }}
                    </div>
                    <div class="info-tooltip-line" v-if="spell.effectType === 'healing'">
                      Healing scales from spell power and regen bonuses.
                    </div>
                    <div class="info-tooltip-line" v-if="spell.effectType === 'buff' && spell.buffProfile">
                      Duration: {{ spell.buffProfile.durationTicks }} ticks base
                    </div>
                    <div class="info-tooltip-line" v-if="spell.effectType === 'buff' && spell.buffProfile">
                      Buffs: +{{ formatPercent(spell.buffProfile.combatDamageBonus ?? 0) }} combat, +{{ formatPercent(spell.buffProfile.spellPowerBonus ?? 0) }} spell, +{{ formatPercent(spell.buffProfile.damageReductionBonus ?? 0) }} reduction
                    </div>
                  </template>
                </InfoTooltip>
                <div class="item-desc">{{ spell.description }}</div>
                <div class="item-desc">
                  Type:
                  {{
                    spell.effectType === 'healing'
                      ? 'Healing'
                      : spell.effectType === 'buff'
                        ? 'Buff'
                        : 'Damage'
                  }}
                </div>
                <div class="item-desc">Arcana required: {{ spell.requiredArcanaLevel }}</div>
                <div class="item-desc">Mana: {{ spell.manaCost }}</div>
                <div class="item-desc">
                  Level: {{ spellbook[spell.id]?.level ?? 0 }} / {{ spell.maxLevel }}
                </div>
              </div>
              <div class="spell-actions">
                <button
                  class="toggle"
                  :disabled="spellbook[spell.id]?.learned || skills.Arcana.level < spell.requiredArcanaLevel"
                  @click="learnSpell(spell.id)"
                >
                  {{ spellbook[spell.id]?.learned ? 'Learned' : 'Learn' }}
                </button>
                <button
                  class="toggle"
                  :disabled="!spellbook[spell.id]?.learned"
                  @click="setSelectedSpell(spell.id)"
                >
                  {{ selectedSpellId === spell.id ? 'Selected' : 'Select' }}
                </button>
              </div>
            </div>
          </div>
          <div class="active-buffs">
            <div class="label">Active Buffs</div>
            <div v-if="activeBuffs.length === 0" class="item-desc">None</div>
            <div v-else class="buff-grid">
              <div v-for="buff in activeBuffs" :key="buff.id" class="buff-card">
                <div class="item-title">{{ buff.name }}</div>
                <div class="item-desc">Duration: {{ buff.remainingTicks }} ticks</div>
                <div class="item-desc" v-if="buff.combatDamageBonus > 0">
                  Combat damage: +{{ formatPercent(buff.combatDamageBonus) }}
                </div>
                <div class="item-desc" v-if="buff.spellPowerBonus > 0">
                  Spell power: +{{ formatPercent(buff.spellPowerBonus) }}
                </div>
                <div class="item-desc" v-if="buff.damageReductionBonus > 0">
                  Damage reduction: +{{ formatPercent(buff.damageReductionBonus) }}
                </div>
              </div>
            </div>
            <div class="item-desc" v-if="activeBuffs.length > 0">
              Totals: +{{ formatPercent(activeBuffCombatBonus) }} combat, +{{ formatPercent(activeBuffSpellBonus) }} spell, +{{ formatPercent(activeBuffReductionBonus) }} reduction
            </div>
          </div>
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
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.npc-column {
  display: flex;
  flex-direction: column;
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

.spellbook {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.spell-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.6rem;
}

.spell-filters {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.spell-card {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.65rem;
  border-radius: 12px;
  background: rgba(13, 20, 33, 0.8);
  border: 1px solid rgba(90, 110, 140, 0.3);
}

.spell-card.selected {
  border-color: rgba(116, 210, 255, 0.75);
}

.spell-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.active-buffs {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.buff-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.6rem;
}

.buff-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.6rem;
  border-radius: 12px;
  background: rgba(13, 20, 33, 0.8);
  border: 1px solid rgba(90, 110, 140, 0.3);
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
