<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '../stores/game'
import ProgressBar from '../components/ProgressBar.vue'
import StatCard from '../components/StatCard.vue'
import SkillCard from '../components/SkillCard.vue'
import SkillBonusItem from '../components/SkillBonusItem.vue'
import IdleActionCard from '../components/IdleActionCard.vue'
import LogPanel from '../components/LogPanel.vue'

const game = useGameStore()
const {
  tickMs,
  paused,
  character,
  currencyBreakdown,
  playerHp,
  mana,
  maxMana,
  maxHp,
  statList,
  statAllocations,
  remainingAttributePoints,
  allocatedPoints,
  skillList,
  actions,
  activeTask,
  skillBonuses,
  idleActionProgress,
  idleActionJustCompleted,
  actionLogs,
} = storeToRefs(game)
const { actionDurationMs, increaseStatAllocation, decreaseStatAllocation, applyStatAllocations } = game

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

const idleProgressValue = computed(() =>
  idleActionJustCompleted.value ? actionDurationMs : idleActionProgress.value,
)

const isIdleActionActive = (actionId: string) =>
  activeTask.value.type === 'idle' && activeTask.value.actionId === actionId

const actionLogEntries = computed(() => actionLogs.value.slice().reverse())

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
            <ProgressBar :value="character.exp" :max="character.expToNext" />
          </div>
        </div>
        <div class="hp-block">
          <div class="label">Health</div>
          <div class="value">{{ playerHp }} / {{ maxHp }}</div>
          <ProgressBar :value="playerHp" :max="maxHp" variant="hp" />
        </div>
        <div class="hp-block">
          <div class="label">Mana</div>
          <div class="value">{{ mana }} / {{ maxMana }}</div>
          <ProgressBar :value="mana" :max="maxMana" />
        </div>
        <div class="currency">
          <div>
            <span class="currency-label">Gold</span>
            <span class="currency-value">{{ currencyBreakdown.gold }}</span>
          </div>
          <div>
            <span class="currency-label">Silver</span>
            <span class="currency-value">{{ currencyBreakdown.silver }}</span>
          </div>
          <div>
            <span class="currency-label">Copper</span>
            <span class="currency-value">{{ currencyBreakdown.copper }}</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <h2>Stats</h2>
        <div class="row" v-if="remainingAttributePoints > 0 || allocatedPoints > 0">
          <div>
            <div class="label">Attribute Points</div>
            <div class="value">{{ remainingAttributePoints }}</div>
          </div>
          <div class="hero-actions">
            <button class="ghost" :disabled="allocatedPoints === 0" @click="applyStatAllocations">
              Apply
            </button>
          </div>
        </div>
        <div class="list">
          <StatCard
            v-for="stat in statList"
            :key="stat.name"
            :stat="stat"
            :pending="statAllocations[stat.name]"
            :can-increase="remainingAttributePoints > 0"
            :can-decrease="statAllocations[stat.name] > 0"
            :on-increase="() => increaseStatAllocation(stat.name)"
            :on-decrease="() => decreaseStatAllocation(stat.name)"
          />
        </div>
      </div>

      <div class="panel">
        <h2>Skills</h2>
        <div class="list">
          <SkillCard v-for="skill in skillList" :key="skill.name" :skill="skill" />
        </div>
      </div>

      <div class="panel">
        <h2>Skill Bonuses</h2>
        <div class="list">
          <SkillBonusItem
            v-for="bonus in bonusItems"
            :key="bonus.label"
            :label="bonus.label"
            :value="bonus.value"
          />
        </div>
      </div>

      <div class="panel actions">
        <h2>Idle Actions</h2>
        <div class="list">
          <IdleActionCard
            v-for="action in actions"
            :key="action.id"
            :action="action"
            :is-active="isIdleActionActive(action.id)"
            :disabled="false"
            :progress-value="idleProgressValue"
            :action-duration-ms="actionDurationMs"
            @toggle="game.toggleAction"
          />
        </div>
      </div>

      <LogPanel
        title="Action Log"
        subtitle="Latest 500 events retained."
        :entries="actionLogEntries"
        :on-clear="game.clearActionLogs"
      />

    </section>
  </main>
</template>
