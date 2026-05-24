<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '../stores/game'
import ProgressBar from '../components/ProgressBar.vue'
import StatCard from '../components/StatCard.vue'
import SkillCard from '../components/SkillCard.vue'
import IdleActionCard from '../components/IdleActionCard.vue'

const game = useGameStore()
const {
  tickMs,
  paused,
  character,
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
  idleActionProgress,
  idleActionJustCompleted,
} = storeToRefs(game)
const { actionDurationMs, increaseStatAllocation, decreaseStatAllocation, applyStatAllocations } = game

const readableCurrency = computed(() => game.formatCopperToCurrency(game.currency.copper))

const idleProgressValue = computed(() =>
  idleActionJustCompleted.value ? actionDurationMs : idleActionProgress.value,
)

const isIdleActionActive = (actionId: string) =>
  activeTask.value.type === 'idle' && activeTask.value.actionId === actionId

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
            <span class="currency-label">Currency</span>
            <span class="currency-value">{{ readableCurrency }}</span>
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
    </section>
  </main>
</template>

<style scoped>
@import '../styles/view-shell.css';

.subtitle {
  max-width: 520px;
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

.row {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.label {
  color: #8fa2c6;
  font-size: 0.85rem;
}

.value {
  font-size: 1.6rem;
  font-weight: 600;
}

.exp-block {
  min-width: 200px;
  flex: 1;
}

.hp-block {
  margin-top: 0.5rem;
}

.currency {
  display: grid;
  grid-template-columns: repeat(3, minmax(80px, 1fr));
  gap: 0.5rem;
  text-align: center;
}

.currency-label {
  display: block;
  color: #8fa2c6;
  font-size: 0.75rem;
}

.currency-value {
  font-size: 1.2rem;
  font-weight: 600;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.actions .list {
  gap: 0.75rem;
}

</style>
