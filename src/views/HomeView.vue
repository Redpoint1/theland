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
import InfoTooltip from '../components/InfoTooltip.vue'

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

interface ParsedActionLog {
  before: string
  focus?: string
  after: string
  tooltipTitle?: string
  tooltipLines?: string[]
}

const parseActionLog = (log: { message: string; type: string }): ParsedActionLog => {
  const message = log.message

  const started = message.match(/^Started (.+)\.$/)
  if (started) {
    const [, actionName] = started
    return {
      before: 'Started ',
      focus: actionName,
      after: '.',
      tooltipTitle: 'Action Started',
      tooltipLines: ['This action is now your active idle task.', 'Progress runs every tick while not in combat.'],
    }
  }

  const stopped = message.match(/^Stopped (.+)\.$/)
  if (stopped) {
    const [, actionName] = stopped
    return {
      before: 'Stopped ',
      focus: actionName,
      after: '.',
      tooltipTitle: 'Action Stopped',
      tooltipLines: ['This action is no longer active.', 'No further rewards are generated until restarted.'],
    }
  }

  const noMana = message.match(/^Not enough mana to complete (.+)\.$/)
  if (noMana) {
    const [, actionName] = noMana
    return {
      before: 'Not enough mana to complete ',
      focus: actionName,
      after: '.',
      tooltipTitle: 'Mana Requirement',
      tooltipLines: ['Action halted due to insufficient mana.', 'Increase Intelligence or use mana consumables to sustain it.'],
    }
  }

  const completed = message.match(/^Completed (.+)\. (.+)\.$/)
  if (completed) {
    const [, actionName, rewards] = completed
    return {
      before: 'Completed ',
      focus: actionName,
      after: `. ${rewards}.`,
      tooltipTitle: 'Action Completion',
      tooltipLines: ['Action cycle finished.', `Rewards granted: ${rewards}`],
    }
  }

  const used = message.match(/^Used (.+)\. (.+)\.$/)
  if (used) {
    const [, itemName, effects] = used
    const effectText = effects ?? 'No additional effect details.'
    return {
      before: 'Used ',
      focus: itemName,
      after: `. ${effectText}.`,
      tooltipTitle: 'Consumable Used',
      tooltipLines: [effectText, 'Effect applies immediately and item is consumed.'],
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
      >
        <template #row="{ log }">
          <span class="log-time">{{ new Date(log.timestamp).toLocaleTimeString() }}</span>
          <span class="log-type">{{ log.type }}</span>
          <div class="log-message">
            <template v-if="parseActionLog(log).focus && parseActionLog(log).tooltipLines">
              {{ parseActionLog(log).before }}
              <InfoTooltip max-width="520px" placement="bottom" align="left" teleport>
                <template #trigger>
                  <span class="log-focus">{{ parseActionLog(log).focus }}</span>
                </template>
                <template #content>
                  <div class="info-tooltip-title">{{ parseActionLog(log).tooltipTitle }}</div>
                  <div
                    v-for="line in parseActionLog(log).tooltipLines"
                    :key="line"
                    class="info-tooltip-line"
                  >
                    {{ line }}
                  </div>
                </template>
              </InfoTooltip>
              {{ parseActionLog(log).after }}
            </template>
            <template v-else>
              {{ log.message }}
            </template>
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

.log-focus {
  color: #c8f0ff;
  border-bottom: 1px dotted rgba(116, 210, 255, 0.7);
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

</style>
