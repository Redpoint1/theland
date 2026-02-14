<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '../stores/game'
import InfoTooltip from '../components/InfoTooltip.vue'

const game = useGameStore()
const { character, stats, skills, professions, skillBonuses, professionBonuses } = storeToRefs(game)

const formatPercent = (value: number) => `${Math.round(value * 100)}%`
const formatFixed = (value: number, decimals = 2) => value.toFixed(decimals)

interface BonusContribution {
  source: string
  amount: string
}

interface BonusItem {
  label: string
  value: string
  contributions: BonusContribution[]
  formula?: string
}

const skillBonusItems = computed<BonusItem[]>(() => {
  const combatDamageFromCombat = skills.value.Combat.level * 0.05
  const damageReductionFromCombat = Math.min(0.8, skills.value.Combat.level * 0.05)
  const regenFromSurvival = skills.value.Survival.level * 0.02
  const xpFromArcana = skills.value.Arcana.level * 0.02
  const currencyFromCrafting = skills.value.Crafting.level * 0.01
  const currencyFromHarvesting = skills.value.Harvesting.level * 0.01

  return [
    {
      label: 'Combat damage multiplier',
      value: formatPercent(skillBonuses.value.combatDamageMultiplier - 1),
      formula: '1 + Combat level × 0.05',
      contributions: [
        {
          source: `Combat Lv ${skills.value.Combat.level}`,
          amount: `+${formatPercent(combatDamageFromCombat)}`,
        },
      ],
    },
    {
      label: 'Damage reduction',
      value: formatPercent(skillBonuses.value.combatDamageReduction),
      formula: 'min(80%, Combat level × 0.05)',
      contributions: [
        {
          source: `Combat Lv ${skills.value.Combat.level}`,
          amount: `${formatPercent(damageReductionFromCombat)}`,
        },
      ],
    },
    {
      label: 'HP regen multiplier',
      value: formatPercent(skillBonuses.value.regenMultiplier - 1),
      formula: '1 + Survival level × 0.02',
      contributions: [
        {
          source: `Survival Lv ${skills.value.Survival.level}`,
          amount: `+${formatPercent(regenFromSurvival)}`,
        },
      ],
    },
    {
      label: 'Global XP multiplier',
      value: formatPercent(skillBonuses.value.expMultiplier - 1),
      formula: '1 + Arcana level × 0.02',
      contributions: [
        {
          source: `Arcana Lv ${skills.value.Arcana.level}`,
          amount: `+${formatPercent(xpFromArcana)}`,
        },
      ],
    },
    {
      label: 'Currency multiplier',
      value: formatPercent(skillBonuses.value.currencyMultiplier - 1),
      formula: '1 + Crafting level × 0.01 + Harvesting level × 0.01',
      contributions: [
        {
          source: `Crafting Lv ${skills.value.Crafting.level}`,
          amount: `+${formatPercent(currencyFromCrafting)}`,
        },
        {
          source: `Harvesting Lv ${skills.value.Harvesting.level}`,
          amount: `+${formatPercent(currencyFromHarvesting)}`,
        },
      ],
    },
  ]
})

const statDerivedItems = computed<BonusItem[]>(() => {
  const hpFromLevel = character.value.level * 8
  const hpFromVitality = stats.value.Vitality.value * 12
  const maxHp = Math.floor(character.value.level * 8 + stats.value.Vitality.value * 12)
  const manaBase = 30
  const manaFromInt = stats.value.Intelligence.value * 10
  const maxMana = Math.floor(manaBase + manaFromInt)
  const manaRegenBase = 1
  const manaRegenFromInt = stats.value.Intelligence.value * 0.25
  const manaRegen = (manaRegenBase + manaRegenFromInt).toFixed(2)
  const passiveHpRegenBase = Math.max(1, Math.floor(stats.value.Spirit.value * 0.6))
  const restHpRegenBase = Math.max(
    2,
    Math.floor(stats.value.Spirit.value * 1.2 + stats.value.Vitality.value * 0.4),
  )
  const passiveHpRegen = Math.floor(passiveHpRegenBase * skillBonuses.value.regenMultiplier)
  const restHpRegen = Math.floor(restHpRegenBase * skillBonuses.value.regenMultiplier)
  const regenMultiplierBonus = skillBonuses.value.regenMultiplier - 1

  const powerFromLevel = character.value.level * 2
  const powerFromStrength = stats.value.Strength.value * 1.4
  const powerFromAgility = stats.value.Agility.value * 1.1
  const powerFromCombat = skills.value.Combat.level * 2
  const powerFromSpirit = stats.value.Spirit.value * 0.4
  const playerPower = Math.floor(
    powerFromLevel + powerFromStrength + powerFromAgility + powerFromCombat + powerFromSpirit,
  )
  const mitigationFromVitality = stats.value.Vitality.value * 0.8
  const mitigationFromAgility = stats.value.Agility.value * 0.4
  const mitigation = Math.floor(mitigationFromVitality + mitigationFromAgility)

  return [
    {
      label: 'Max HP',
      value: `${maxHp}`,
      formula: 'Level × 8 + Vitality × 12',
      contributions: [
        { source: `Level ${character.value.level}`, amount: `+${hpFromLevel}` },
        { source: `Vitality ${stats.value.Vitality.value}`, amount: `+${hpFromVitality}` },
      ],
    },
    {
      label: 'Max Mana',
      value: `${maxMana}`,
      formula: '30 + Intelligence × 10',
      contributions: [
        { source: 'Base', amount: `${manaBase}` },
        { source: `Intelligence ${stats.value.Intelligence.value}`, amount: `+${manaFromInt}` },
      ],
    },
    {
      label: 'Mana regen/tick',
      value: `${manaRegen}`,
      formula: '1 + Intelligence × 0.25',
      contributions: [
        { source: 'Base', amount: `${manaRegenBase}` },
        {
          source: `Intelligence ${stats.value.Intelligence.value}`,
          amount: `+${formatFixed(manaRegenFromInt)}`,
        },
      ],
    },
    {
      label: 'Passive HP regen/tick',
      value: `${passiveHpRegen}`,
      formula: 'floor(max(1, Spirit × 0.6) × (1 + Survival bonus))',
      contributions: [
        { source: `Spirit ${stats.value.Spirit.value}`, amount: `Base ${passiveHpRegenBase}` },
        {
          source: `Survival bonus (${skills.value.Survival.level} lv)`,
          amount: `× ${formatFixed(skillBonuses.value.regenMultiplier)}`,
        },
        { source: 'Skill contribution', amount: `+${formatPercent(regenMultiplierBonus)}` },
      ],
    },
    {
      label: 'Rest HP regen/tick',
      value: `${restHpRegen}`,
      formula: 'floor(max(2, Spirit × 1.2 + Vitality × 0.4) × (1 + Survival bonus))',
      contributions: [
        {
          source: `Spirit ${stats.value.Spirit.value} + Vitality ${stats.value.Vitality.value}`,
          amount: `Base ${restHpRegenBase}`,
        },
        {
          source: `Survival bonus (${skills.value.Survival.level} lv)`,
          amount: `× ${formatFixed(skillBonuses.value.regenMultiplier)}`,
        },
        { source: 'Skill contribution', amount: `+${formatPercent(regenMultiplierBonus)}` },
      ],
    },
    {
      label: 'Player power estimate',
      value: `${playerPower}`,
      formula: 'Level×2 + Strength×1.4 + Agility×1.1 + Combat×2 + Spirit×0.4',
      contributions: [
        { source: `Level ${character.value.level}`, amount: `+${formatFixed(powerFromLevel, 0)}` },
        { source: `Strength ${stats.value.Strength.value}`, amount: `+${formatFixed(powerFromStrength)}` },
        { source: `Agility ${stats.value.Agility.value}`, amount: `+${formatFixed(powerFromAgility)}` },
        { source: `Combat ${skills.value.Combat.level}`, amount: `+${formatFixed(powerFromCombat, 0)}` },
        { source: `Spirit ${stats.value.Spirit.value}`, amount: `+${formatFixed(powerFromSpirit)}` },
      ],
    },
    {
      label: 'Mitigation estimate',
      value: `${mitigation}`,
      formula: 'Vitality × 0.8 + Agility × 0.4',
      contributions: [
        {
          source: `Vitality ${stats.value.Vitality.value}`,
          amount: `+${formatFixed(mitigationFromVitality)}`,
        },
        {
          source: `Agility ${stats.value.Agility.value}`,
          amount: `+${formatFixed(mitigationFromAgility)}`,
        },
      ],
    },
  ]
})

const professionBonusItems = computed<BonusItem[]>(() =>
  Object.entries(professionBonuses.value).map(([name, multiplier]) => {
    const profession = professions.value[name as keyof typeof professions.value]
    const activeRank =
      profession.rankTiers
        .slice()
        .reverse()
        .find((rank) => profession.level >= rank.minLevel) ?? profession.rankTiers[0]

    const perLevelContribution = profession.level * profession.bonusPerLevel
    const rankContribution = activeRank.bonusMultiplier

    return {
      label: `${name} output bonus`,
      value: formatPercent(multiplier - 1),
      formula: '1 + (level × bonusPerLevel) + rank bonus',
      contributions: [
        {
          source: `Level ${profession.level} × ${formatFixed(profession.bonusPerLevel, 3)}`,
          amount: `+${formatPercent(perLevelContribution)}`,
        },
        {
          source: `Rank: ${activeRank.name}`,
          amount: `+${formatPercent(rankContribution)}`,
        },
      ],
    }
  }),
)
</script>

<template>
  <main class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">The Land: Bonuses</p>
        <h1>All Bonuses</h1>
        <p class="subtitle">Unified view of active effects from skills, stats, professions, and derived formulas.</p>
      </div>
    </header>

    <section class="grid bonuses-grid">
      <div class="panel">
        <h2>Skill Bonuses</h2>
        <div class="list">
          <div v-for="item in skillBonusItems" :key="item.label" class="bonus-row">
            <div>
              <InfoTooltip max-width="560px" placement="bottom" align="left" teleport>
                <template #trigger>
                  <div class="item-title with-tooltip">{{ item.label }}</div>
                </template>
                <template #content>
                  <div class="info-tooltip-title">{{ item.label }}</div>
                  <div v-if="item.formula" class="info-tooltip-line">Formula: {{ item.formula }}</div>
                  <div class="info-tooltip-line info-tooltip-muted">Source contributions:</div>
                  <div
                    v-for="entry in item.contributions"
                    :key="`${item.label}-${entry.source}`"
                    class="info-tooltip-line info-tooltip-muted"
                  >
                    {{ entry.source }} → {{ entry.amount }}
                  </div>
                </template>
              </InfoTooltip>
              <div class="contrib-list">
                <div
                  v-for="entry in item.contributions"
                  :key="`${item.label}-inline-${entry.source}`"
                  class="item-desc"
                >
                  {{ entry.source }}: {{ entry.amount }}
                </div>
              </div>
            </div>
            <div class="bonus-value">{{ item.value }}</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <h2>Stat-Derived Effects</h2>
        <div class="list">
          <div v-for="item in statDerivedItems" :key="item.label" class="bonus-row">
            <div>
              <InfoTooltip max-width="560px" placement="bottom" align="left" teleport>
                <template #trigger>
                  <div class="item-title with-tooltip">{{ item.label }}</div>
                </template>
                <template #content>
                  <div class="info-tooltip-title">{{ item.label }}</div>
                  <div v-if="item.formula" class="info-tooltip-line">Formula: {{ item.formula }}</div>
                  <div class="info-tooltip-line info-tooltip-muted">Source contributions:</div>
                  <div
                    v-for="entry in item.contributions"
                    :key="`${item.label}-${entry.source}`"
                    class="info-tooltip-line info-tooltip-muted"
                  >
                    {{ entry.source }} → {{ entry.amount }}
                  </div>
                </template>
              </InfoTooltip>
              <div class="contrib-list">
                <div
                  v-for="entry in item.contributions"
                  :key="`${item.label}-inline-${entry.source}`"
                  class="item-desc"
                >
                  {{ entry.source }}: {{ entry.amount }}
                </div>
              </div>
            </div>
            <div class="bonus-value">{{ item.value }}</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <h2>Profession Bonuses</h2>
        <div class="list">
          <div v-for="item in professionBonusItems" :key="item.label" class="bonus-row">
            <div>
              <InfoTooltip max-width="560px" placement="bottom" align="left" teleport>
                <template #trigger>
                  <div class="item-title with-tooltip">{{ item.label }}</div>
                </template>
                <template #content>
                  <div class="info-tooltip-title">{{ item.label }}</div>
                  <div v-if="item.formula" class="info-tooltip-line">Formula: {{ item.formula }}</div>
                  <div class="info-tooltip-line info-tooltip-muted">Source contributions:</div>
                  <div
                    v-for="entry in item.contributions"
                    :key="`${item.label}-${entry.source}`"
                    class="info-tooltip-line info-tooltip-muted"
                  >
                    {{ entry.source }} → {{ entry.amount }}
                  </div>
                </template>
              </InfoTooltip>
              <div class="contrib-list">
                <div
                  v-for="entry in item.contributions"
                  :key="`${item.label}-inline-${entry.source}`"
                  class="item-desc"
                >
                  {{ entry.source }}: {{ entry.amount }}
                </div>
              </div>
            </div>
            <div class="bonus-value">{{ item.value }}</div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
@import '../styles/view-shell.css';

.subtitle {
  max-width: 620px;
}

.bonuses-grid {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bonus-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  background: rgba(21, 30, 47, 0.75);
  border: 1px solid rgba(90, 110, 140, 0.3);
}

.item-title {
  font-weight: 600;
}

.with-tooltip {
  display: inline-flex;
  border-bottom: 1px dotted rgba(116, 210, 255, 0.6);
  cursor: help;
}

.item-desc {
  font-size: 0.8rem;
  color: #8fa2c6;
}

.contrib-list {
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.bonus-value {
  font-weight: 700;
  color: #c8f0ff;
}

@media (max-width: 720px) {
  .bonus-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>