<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const {
  tickMs,
  paused,
  character,
  currency,
  playerHp,
  maxHp,
  statList,
  skillList,
  actions,
  combat,
  skillBonuses,
} = storeToRefs(game)
const { progressPercent } = game

const formatPercent = (value: number) => `${Math.round(value * 100)}%`

const bonusItems = computed(() => [
  {
    label: 'Combat damage bonus',
    value: formatPercent(skillBonuses.value.combatDamageMultiplier - 1),
  },
  {
    label: 'Damage reduction',
    value: formatPercent(skillBonuses.value.combatDamageReduction),
  },
  {
    label: 'Regen bonus',
    value: formatPercent(skillBonuses.value.regenMultiplier - 1),
  },
  {
    label: 'XP bonus',
    value: formatPercent(skillBonuses.value.expMultiplier - 1),
  },
  {
    label: 'Currency bonus',
    value: formatPercent(skillBonuses.value.currencyMultiplier - 1),
  },
])
</script>

<template>
  <main class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">The Land: Idle Seeds</p>
        <h1>Rise in the Land</h1>
        <p class="subtitle">
          Idle actions grow your stats, skills, and coin. Toggle actions to focus your
          progression.
        </p>
      </div>
      <div class="hero-actions">
        <button class="ghost" @click="game.paused = !game.paused">
          {{ paused ? 'Resume' : 'Pause' }}
        </button>
        <div class="tick">Tick: {{ tickMs / 1000 }}s</div>
      </div>
    </header>

    <section class="grid">
      <div class="panel">
        <h2>Adventurer</h2>
        <div class="row">
          <div>
            <div class="label">Level</div>
            <div class="value">{{ character.level }}</div>
          </div>
          <div class="exp-block">
            <div class="label">Experience</div>
            <div class="value">{{ character.exp }} / {{ character.expToNext }}</div>
            <div class="progress">
              <div
                class="progress-fill"
                :style="{ width: progressPercent(character.exp, character.expToNext) + '%' }"
              ></div>
            </div>
          </div>
        </div>
        <div class="hp-block">
          <div class="label">Health</div>
          <div class="value">{{ playerHp }} / {{ maxHp }}</div>
          <div class="progress">
            <div
              class="progress-fill hp"
              :style="{ width: progressPercent(playerHp, maxHp) + '%' }"
            ></div>
          </div>
        </div>
        <div class="currency">
          <div>
            <span class="currency-label">Gold</span>
            <span class="currency-value">{{ currency.gold }}</span>
          </div>
          <div>
            <span class="currency-label">Silver</span>
            <span class="currency-value">{{ currency.silver }}</span>
          </div>
          <div>
            <span class="currency-label">Copper</span>
            <span class="currency-value">{{ currency.copper }}</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <h2>Stats</h2>
        <div class="list">
          <div v-for="stat in statList" :key="stat.name" class="list-item">
            <div>
              <div class="item-title">{{ stat.name }}</div>
              <div class="item-desc">{{ stat.description }}</div>
            </div>
            <div class="item-value">
              <div class="value">{{ stat.value }}</div>
              <div class="progress thin">
                <div
                  class="progress-fill"
                  :style="{ width: progressPercent(stat.exp, stat.expToNext) + '%' }"
                ></div>
              </div>
              <div class="item-hint">{{ stat.exp }} / {{ stat.expToNext }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <h2>Skills</h2>
        <div class="list">
          <div v-for="skill in skillList" :key="skill.name" class="list-item">
            <div>
              <div class="item-title">{{ skill.name }}</div>
              <div class="item-desc">{{ skill.description }}</div>
            </div>
            <div class="item-value">
              <div class="value">Lv. {{ skill.level }}</div>
              <div class="progress thin">
                <div
                  class="progress-fill"
                  :style="{ width: progressPercent(skill.exp, skill.expToNext) + '%' }"
                ></div>
              </div>
              <div class="item-hint">{{ skill.exp }} / {{ skill.expToNext }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <h2>Skill Bonuses</h2>
        <div class="list">
          <div v-for="bonus in bonusItems" :key="bonus.label" class="bonus-item">
            <div class="item-title">{{ bonus.label }}</div>
            <div class="bonus-value">{{ bonus.value }}</div>
          </div>
        </div>
      </div>

      <div class="panel actions">
        <h2>Idle Actions</h2>
        <div class="list">
          <div v-for="action in actions" :key="action.id" class="action-card">
            <div>
              <div class="item-title">{{ action.name }}</div>
              <div class="item-desc">{{ action.description }}</div>
            </div>
            <div class="action-controls">
              <button
                class="toggle"
                :class="{ active: action.active }"
                :disabled="combat.active"
                @click="game.toggleAction(action)"
              >
                {{ action.active ? 'Active' : 'Idle' }}
              </button>
              <div class="action-hint">
                +{{ action.gains.exp ?? 0 }} XP / tick
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
