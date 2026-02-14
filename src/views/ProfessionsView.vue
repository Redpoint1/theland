<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore, type ProfessionKey } from '../stores/game'
import ProfessionCard from '../components/ProfessionCard.vue'
import LogPanel from '../components/LogPanel.vue'
import InfoTooltip from '../components/InfoTooltip.vue'

const game = useGameStore()
const {
  professionList,
  professionActions,
  professionBonuses,
  professionActionProgress,
  professionActionJustCompleted,
  professionLogs,
  activeTask,
} = storeToRefs(game)
const { getItemDef, getItemQuantity, actionDurationMs } = game

const actionsByProfession = computed(() => {
  const map = new Map<string, typeof professionActions.value>()
  professionActions.value.forEach((action) => {
    if (!map.has(action.profession)) {
      map.set(action.profession, [])
    }
    map.get(action.profession)?.push(action)
  })
  return map
})

const professionProgressValue = computed(() =>
  professionActionJustCompleted.value ? actionDurationMs : professionActionProgress.value,
)

const selectedProfessionKey = ref<ProfessionKey | null>(
  professionList.value[0]?.name ?? null,
)

watch(
  professionList,
  (list) => {
    if (!selectedProfessionKey.value && list.length > 0) {
      const first = list[0]
      if (first) selectedProfessionKey.value = first.name
    }
  },
  { immediate: true },
)

const selectedProfession = computed(() =>
  professionList.value.find((profession) => profession.name === selectedProfessionKey.value) ??
  professionList.value[0],
)

const selectedActions = computed(() => {
  if (!selectedProfession.value) return []
  return actionsByProfession.value.get(selectedProfession.value.name) ?? []
})

const activeProfessionActionId = computed(() =>
  activeTask.value.type === 'profession' ? activeTask.value.actionId : undefined,
)

const logEntries = computed(() => professionLogs.value.slice().reverse())

interface ParsedProfessionLog {
  before: string
  focus?: string
  after: string
  tooltipTitle?: string
  tooltipLines?: string[]
}

const parseProfessionLog = (log: { message: string; type: string }): ParsedProfessionLog => {
  const message = log.message

  const started = message.match(/^Started (.+)\.$/)
  if (started) {
    const [, actionName] = started
    return {
      before: 'Started ',
      focus: actionName,
      after: '.',
      tooltipTitle: 'Profession Action Started',
      tooltipLines: ['This profession action is now active.', 'It will consume required inputs each completion.'],
    }
  }

  const stopped = message.match(/^Stopped (.+)\.$/)
  if (stopped) {
    const [, actionName] = stopped
    return {
      before: 'Stopped ',
      focus: actionName,
      after: '.',
      tooltipTitle: 'Profession Action Stopped',
      tooltipLines: ['The profession loop is paused for this action.'],
    }
  }

  const requires = message.match(/^(.+) requires (.+) level (\d+)\.$/)
  if (requires) {
    const [, actionName, professionName, levelRequired] = requires
    return {
      before: `${actionName} requires `,
      focus: `${professionName} level ${levelRequired}`,
      after: '.',
      tooltipTitle: 'Level Requirement',
      tooltipLines: ['Action is locked until required profession level is reached.'],
    }
  }

  const cannotStart = message.match(/^Cannot start (.+) - missing (.+)\.$/)
  if (cannotStart) {
    const [, actionName, missingList] = cannotStart
    return {
      before: `Cannot start ${actionName} - missing `,
      focus: missingList,
      after: '.',
      tooltipTitle: 'Missing Inputs',
      tooltipLines: ['Collect or craft the listed materials before starting this action.'],
    }
  }

  const completed = message.match(/^Completed (.+)\. \+(\d+) (.+) XP, (.+)\.$/)
  if (completed) {
    const [, actionName, xpGain, professionName, rewards] = completed
    return {
      before: 'Completed ',
      focus: actionName,
      after: `. +${xpGain} ${professionName} XP, ${rewards}.`,
      tooltipTitle: 'Profession Completion',
      tooltipLines: [
        `Profession XP gained: +${xpGain} ${professionName} XP`,
        `Rewards generated: ${rewards}`,
      ],
    }
  }

  const stoppedMissing = message.match(/^Stopped (.+) - missing (.+)\.$/)
  if (stoppedMissing) {
    const [, actionName, missingList] = stoppedMissing
    return {
      before: `Stopped ${actionName} - missing `,
      focus: missingList,
      after: '.',
      tooltipTitle: 'Action Auto-Stopped',
      tooltipLines: ['Action ended because required inputs were no longer available.'],
    }
  }

  return {
    before: message,
    after: '',
  }
}

const getItemName = (itemId: string) => getItemDef(itemId)?.name ?? itemId
</script>

<template>
  <main class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">The Land: Professions</p>
        <h1>Professions</h1>
        <p class="subtitle">Train gathering and crafting disciplines for bonuses and unlocks.</p>
      </div>
      <div class="hero-actions">
        <div class="tick">Active actions run while not fighting.</div>
      </div>
    </header>

    <section class="grid">
      <div class="panel">
        <h2>Choose Profession</h2>
        <div class="list">
          <button
            v-for="profession in professionList"
            :key="profession.name"
            class="toggle"
            :class="{ active: profession.name === selectedProfessionKey }"
            @click="selectedProfessionKey = profession.name"
          >
            {{ profession.name }}
          </button>
        </div>
      </div>

      <ProfessionCard
        v-if="selectedProfession"
        :profession="selectedProfession"
        :actions="selectedActions"
        :active-action-id="activeProfessionActionId"
        :bonus-percent="Math.round((professionBonuses[selectedProfession.name] - 1) * 100)"
        :action-duration-ms="actionDurationMs"
        :progress-value="professionProgressValue"
        :get-item-name="getItemName"
        :get-item-quantity="getItemQuantity"
        :on-toggle="game.toggleProfessionAction"
      />

      <LogPanel
        title="Profession Log"
        subtitle="Latest 500 events retained."
        :entries="logEntries"
        :on-clear="game.clearProfessionLogs"
      >
        <template #row="{ log }">
          <span class="log-time">{{ new Date(log.timestamp).toLocaleTimeString() }}</span>
          <span class="log-type">{{ log.type }}</span>
          <div class="log-message">
            <template v-if="parseProfessionLog(log).focus && parseProfessionLog(log).tooltipLines">
              {{ parseProfessionLog(log).before }}
              <InfoTooltip max-width="520px" placement="bottom" align="left" teleport>
                <template #trigger>
                  <span class="log-focus">{{ parseProfessionLog(log).focus }}</span>
                </template>
                <template #content>
                  <div class="info-tooltip-title">{{ parseProfessionLog(log).tooltipTitle }}</div>
                  <div
                    v-for="line in parseProfessionLog(log).tooltipLines"
                    :key="line"
                    class="info-tooltip-line"
                  >
                    {{ line }}
                  </div>
                </template>
              </InfoTooltip>
              {{ parseProfessionLog(log).after }}
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
.list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.toggle {
  background: rgba(69, 85, 110, 0.4);
  color: #e6e9f2;
  border: 1px solid rgba(121, 145, 180, 0.4);
  padding: 0.4rem 1.1rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.toggle.active {
  background: linear-gradient(120deg, #74d2ff, #6ff2c5);
  color: #0b111b;
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
