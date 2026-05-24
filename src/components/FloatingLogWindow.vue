<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useGameStore, type ActionLogEntry, type CombatLogEntry, type ProfessionLogEntry } from '../stores/game'
import InfoTooltip from './InfoTooltip.vue'

type LogTab = 'combat' | 'action' | 'profession'
type BasicLogEntry = CombatLogEntry | ActionLogEntry | ProfessionLogEntry

interface PersistedPanelState {
  activeTab: LogTab
  filters: Record<LogTab, Record<string, boolean>>
  lastSeen: Record<LogTab, number>
}

interface ParsedLogEntry {
  before: string
  focus?: string
  after: string
  tooltipTitle?: string
  tooltipLines?: string[]
}

const props = withDefaults(
  defineProps<{
    combatLogs: CombatLogEntry[]
    actionLogs: ActionLogEntry[]
    professionLogs: ProfessionLogEntry[]
    onClearCombat?: () => void
    onClearAction?: () => void
    onClearProfession?: () => void
    isOpen?: boolean
    isMobile?: boolean
  }>(),
  {
    isOpen: false,
    isMobile: false,
  },
)

const emit = defineEmits<{
  (event: 'toggle'): void
  (event: 'close'): void
}>()

const route = useRoute()
const game = useGameStore()
const { character, stats, skills, skillBonuses } = storeToRefs(game)

const storageKey = 'theland:log-window-state'

const tabs = ['combat', 'action', 'profession'] as const satisfies readonly LogTab[]

const tabMeta: Record<LogTab, { label: string; empty: string; limitText: string }> = {
  combat: { label: 'Combat', empty: 'No combat logs yet.', limitText: 'Latest 1000 combat events retained.' },
  action: { label: 'Actions', empty: 'No action logs yet.', limitText: 'Latest 1000 action events retained.' },
  profession: { label: 'Professions', empty: 'No profession logs yet.', limitText: 'Latest 1000 profession events retained.' },
}

const filterOptions: Record<LogTab, Array<{ id: string; label: string }>> = {
  combat: [
    { id: 'combat', label: 'Combat' },
    { id: 'damage', label: 'Damage' },
    { id: 'kill', label: 'Kills' },
    { id: 'rest', label: 'Rest' },
    { id: 'system', label: 'System' },
  ],
  action: [
    { id: 'action', label: 'Actions' },
    { id: 'reward', label: 'Rewards' },
    { id: 'system', label: 'System' },
  ],
  profession: [
    { id: 'action', label: 'Actions' },
    { id: 'reward', label: 'Rewards' },
    { id: 'system', label: 'System' },
  ],
}

const formatPercent = (value: number) => `${Math.round(value * 10000) / 100}%`

const parseActionLog = (entry: ActionLogEntry): ParsedLogEntry => {
  const message = entry.message

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

const parseProfessionLog = (entry: ProfessionLogEntry): ParsedLogEntry => {
  const message = entry.message

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

const parseCombatLog = (entry: CombatLogEntry): ParsedLogEntry => {
  const message = entry.message

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

const parseLogEntry = (tab: LogTab, entry: BasicLogEntry): ParsedLogEntry => {
  if (tab === 'combat') return parseCombatLog(entry as CombatLogEntry)
  if (tab === 'action') return parseActionLog(entry as ActionLogEntry)
  return parseProfessionLog(entry as ProfessionLogEntry)
}

function createDefaultFilters(): Record<LogTab, Record<string, boolean>> {
  return {
    combat: {
      combat: true,
      damage: true,
      kill: true,
      rest: true,
      system: true,
    },
    action: {
      action: true,
      reward: true,
      system: true,
    },
    profession: {
      action: true,
      reward: true,
      system: true,
    },
  }
}

const hasStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isLogTab = (value: unknown): value is LogTab =>
  typeof value === 'string' && tabs.includes(value as LogTab)

const state = reactive<PersistedPanelState>({
  activeTab: 'combat',
  filters: createDefaultFilters(),
  lastSeen: {
    combat: 0,
    action: 0,
    profession: 0,
  },
})

const readPersistedState = (): PersistedPanelState | null => {
  if (!hasStorage()) return null

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!isRecord(parsed)) return null

    const nextState: PersistedPanelState = {
      activeTab: isLogTab(parsed.activeTab) ? parsed.activeTab : 'combat',
      filters: createDefaultFilters(),
      lastSeen: {
        combat: 0,
        action: 0,
        profession: 0,
      },
    }

    if (isRecord(parsed.filters)) {
      const parsedFilters = parsed.filters
      tabs.forEach((tab) => {
        const tabFilters = parsedFilters[tab]
        if (!isRecord(tabFilters)) return
        filterOptions[tab].forEach((option) => {
          if (typeof tabFilters[option.id] === 'boolean') {
            nextState.filters[tab][option.id] = tabFilters[option.id] as boolean
          }
        })
      })
    }

    if (isRecord(parsed.lastSeen)) {
      const parsedLastSeen = parsed.lastSeen
      tabs.forEach((tab) => {
        const lastSeen = parsedLastSeen[tab]
        if (typeof lastSeen === 'number' && Number.isFinite(lastSeen)) {
          nextState.lastSeen[tab] = Math.max(0, Math.floor(lastSeen))
        }
      })
    }

    return nextState
  } catch {
    return null
  }
}

const logEntries = computed<Record<LogTab, BasicLogEntry[]>>(() => ({
  combat: props.combatLogs,
  action: props.actionLogs,
  profession: props.professionLogs,
}))

const tabCounts = computed<Record<LogTab, number>>(() => ({
  combat: props.combatLogs.length,
  action: props.actionLogs.length,
  profession: props.professionLogs.length,
}))

const getLatestLogId = (entries: BasicLogEntry[]) => {
  const latestEntry = entries[entries.length - 1]
  return latestEntry?.id ?? 0
}

const latestSeenIds = computed<Record<LogTab, number>>(() => ({
  combat: getLatestLogId(props.combatLogs),
  action: getLatestLogId(props.actionLogs),
  profession: getLatestLogId(props.professionLogs),
}))

const activeEntries = computed(() => logEntries.value[state.activeTab])

const filteredEntries = computed(() =>
  activeEntries.value
    .filter((entry) => state.filters[state.activeTab][entry.type] ?? true)
    .slice()
    .reverse(),
)

const renderedEntries = computed(() =>
  filteredEntries.value.map((entry) => ({
    entry,
    parsed: parseLogEntry(state.activeTab, entry),
  })),
)

const unreadCount = computed(() =>
  tabs.reduce((total, tab) => {
    const unseen = logEntries.value[tab].reduce((count, entry) => {
      return count + (entry.id > state.lastSeen[tab] ? 1 : 0)
    }, 0)
    return total + unseen
  }, 0),
)

const activeFilterOptions = computed(() => filterOptions[state.activeTab])
const activeTabMeta = computed(() => tabMeta[state.activeTab])

const persistState = () => {
  if (!hasStorage()) return

  const snapshot: PersistedPanelState = {
    activeTab: state.activeTab,
    filters: {
      combat: { ...state.filters.combat },
      action: { ...state.filters.action },
      profession: { ...state.filters.profession },
    },
    lastSeen: { ...state.lastSeen },
  }

  window.localStorage.setItem(storageKey, JSON.stringify(snapshot))
}

const syncSeenToLatest = (tab?: LogTab) => {
  if (tab) {
    state.lastSeen[tab] = latestSeenIds.value[tab]
    return
  }

  tabs.forEach((entry) => {
    state.lastSeen[entry] = latestSeenIds.value[entry]
  })
}

const getAutoTabForRoute = (path: string): LogTab | null => {
  if (path === '/combat') return 'combat'
  if (path === '/professions') return 'profession'
  if (path === '/') return 'action'
  return null
}

const syncTabToRoute = (path: string) => {
  const nextTab = getAutoTabForRoute(path)
  if (!nextTab || state.activeTab === nextTab) return
  state.activeTab = nextTab
}

const setActiveTab = (tab: LogTab) => {
  state.activeTab = tab
  if (props.isOpen) {
    syncSeenToLatest(tab)
  }
}

const toggleFilter = (type: string) => {
  state.filters[state.activeTab][type] = !state.filters[state.activeTab][type]
}

const clearActiveLogs = () => {
  if (state.activeTab === 'combat') {
    props.onClearCombat?.()
  } else if (state.activeTab === 'action') {
    props.onClearAction?.()
  } else {
    props.onClearProfession?.()
  }

  if (props.isOpen) {
    syncSeenToLatest(state.activeTab)
  }
}

const handleToggle = () => {
  emit('toggle')
}

const handleClose = () => {
  emit('close')
}

const formatType = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

onMounted(() => {
  const persisted = readPersistedState()
  if (persisted) {
    state.activeTab = persisted.activeTab
    state.filters = persisted.filters
    state.lastSeen = persisted.lastSeen
  } else {
    syncSeenToLatest()
  }

  syncTabToRoute(route.path)

  if (props.isOpen) {
    syncSeenToLatest()
  }
})

watch(latestSeenIds, () => {
  if (props.isOpen) {
    syncSeenToLatest()
  }
})

watch(
  () => route.path,
  (path) => {
    syncTabToRoute(path)
  },
)

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      syncSeenToLatest()
    }
  },
)

watch(
  () => ({
    activeTab: state.activeTab,
    combatFilters: state.filters.combat,
    actionFilters: state.filters.action,
    professionFilters: state.filters.profession,
    lastSeen: state.lastSeen,
  }),
  () => {
    persistState()
  },
  { deep: true },
)
</script>

<template>
  <section class="log-sidebar" :class="{ open: props.isOpen, mobile: props.isMobile }">
    <button
      v-if="!props.isMobile"
      type="button"
      class="log-sidebar-rail"
      :class="{ open: props.isOpen }"
      :aria-expanded="props.isOpen"
      aria-label="Toggle logs sidebar"
      @click="handleToggle"
    >
      <span class="log-sidebar-rail-label">Logs</span>
      <span v-if="unreadCount > 0" class="log-sidebar-rail-count">{{ unreadCount }}</span>
    </button>

    <section v-if="props.isOpen || !props.isMobile" class="log-sidebar-panel" :class="{ open: props.isOpen, mobile: props.isMobile }">
      <header class="log-sidebar-header">
        <div>
          <div class="log-sidebar-title">Logs</div>
          <div class="log-sidebar-subtitle">{{ activeTabMeta.limitText }}</div>
        </div>
        <div class="log-sidebar-actions">
          <button type="button" class="ghost" @click="clearActiveLogs">Clear</button>
          <button type="button" class="ghost" @click="props.isMobile ? handleClose() : handleToggle()">
            {{ props.isMobile ? 'Close' : 'Collapse' }}
          </button>
        </div>
      </header>

      <div class="log-sidebar-body">
        <nav class="log-sidebar-tabs" aria-label="Log tabs">
          <button
            v-for="tab in tabs"
            :key="tab"
            type="button"
            class="tab-button"
            :class="{ active: state.activeTab === tab }"
            @click="setActiveTab(tab)"
          >
            <span>{{ tabMeta[tab].label }}</span>
            <span class="tab-count">{{ tabCounts[tab] }}</span>
          </button>
        </nav>

        <div class="log-sidebar-filters">
          <button
            v-for="option in activeFilterOptions"
            :key="`${state.activeTab}-${option.id}`"
            type="button"
            class="filter-chip"
            :class="{ active: state.filters[state.activeTab][option.id] }"
            @click="toggleFilter(option.id)"
          >
            {{ option.label }}
          </button>
        </div>

        <div class="log-sidebar-list">
          <div v-if="activeEntries.length === 0" class="log-empty">
            {{ activeTabMeta.empty }}
          </div>
          <div v-else-if="filteredEntries.length === 0" class="log-empty">
            No logs match current filters.
          </div>
          <div v-for="row in renderedEntries" :key="`${state.activeTab}-${row.entry.id}`" class="log-row">
            <div class="log-meta">
              <span class="log-time">{{ new Date(row.entry.timestamp).toLocaleTimeString() }}</span>
              <span class="log-type">{{ formatType(row.entry.type) }}</span>
            </div>
            <div class="log-message">
              <template v-if="row.parsed.focus && row.parsed.tooltipLines">
                {{ row.parsed.before }}
                <InfoTooltip max-width="560px" placement="bottom" align="left" teleport>
                  <template #trigger>
                    <span class="log-focus">{{ row.parsed.focus }}</span>
                  </template>
                  <template #content>
                    <div class="info-tooltip-title">{{ row.parsed.tooltipTitle }}</div>
                    <div
                      v-for="line in row.parsed.tooltipLines"
                      :key="line"
                      class="info-tooltip-line"
                    >
                      {{ line }}
                    </div>
                  </template>
                </InfoTooltip>
                {{ row.parsed.after }}
              </template>
              <template v-else>
                {{ row.entry.message }}
              </template>
            </div>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.log-sidebar {
  display: grid;
  grid-template-columns: var(--log-sidebar-rail-width, 3.1rem) minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: 22px;
  background: rgba(14, 20, 33, 0.96);
  border: 1px solid rgba(80, 98, 130, 0.35);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(16px);
}

.log-sidebar.mobile {
  display: block;
  border-radius: 24px;
}

.log-sidebar-rail {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.9rem 0.4rem;
  border: 0;
  border-right: 1px solid rgba(80, 98, 130, 0.22);
  background: linear-gradient(180deg, rgba(20, 31, 48, 0.95), rgba(12, 18, 30, 0.98));
  color: #d9e7ff;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.log-sidebar-rail:hover,
.log-sidebar-rail.open {
  background: linear-gradient(180deg, rgba(28, 42, 63, 0.98), rgba(17, 25, 39, 0.98));
  color: #f0c566;
}

.log-sidebar-rail-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.62rem;
  font-weight: 700;
}

.log-sidebar-rail-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.45rem;
  padding: 0.16rem 0.28rem;
  border-radius: 999px;
  background: rgba(240, 197, 102, 0.18);
  color: #ffd98c;
  font-size: 0.68rem;
  font-weight: 700;
}

.log-sidebar-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  opacity: 0;
  transform: translateX(-0.75rem);
  pointer-events: none;
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.log-sidebar-panel.open,
.log-sidebar-panel.mobile {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.log-sidebar-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1rem 0.85rem;
  border-bottom: 1px solid rgba(80, 98, 130, 0.2);
}

.log-sidebar-title {
  font-size: 1rem;
  font-weight: 700;
  color: #e9f2ff;
}

.log-sidebar-subtitle {
  margin-top: 0.2rem;
  font-size: 0.78rem;
  color: #91a3c4;
}

.log-sidebar-actions {
  display: flex;
  gap: 0.5rem;
}

.ghost,
.tab-button,
.filter-chip {
  border: 1px solid rgba(99, 121, 158, 0.28);
  background: rgba(25, 36, 54, 0.78);
  color: #d9e7ff;
}

.ghost {
  padding: 0.42rem 0.72rem;
  border-radius: 999px;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, color 0.2s ease;
}

.ghost:hover,
.tab-button:hover,
.filter-chip:hover {
  border-color: rgba(240, 197, 102, 0.52);
  color: #f0c566;
}

.ghost:active,
.tab-button:active,
.filter-chip:active {
  transform: translateY(1px);
}

.log-sidebar-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-height: 0;
  padding: 0.9rem 1rem 1rem;
}

.log-sidebar-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.tab-button {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  padding: 0.65rem 0.8rem;
  border-radius: 14px;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.tab-button.active {
  background: rgba(66, 139, 193, 0.22);
  border-color: rgba(116, 210, 255, 0.75);
  color: #c8f0ff;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.7rem;
  padding: 0.1rem 0.38rem;
  border-radius: 999px;
  background: rgba(10, 16, 28, 0.78);
  font-size: 0.72rem;
}

.log-sidebar-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.filter-chip {
  padding: 0.36rem 0.72rem;
  border-radius: 999px;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.filter-chip.active {
  background: rgba(76, 159, 106, 0.18);
  border-color: rgba(125, 220, 154, 0.5);
  color: #d8ffe2;
}

.log-sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  padding-right: 0.25rem;
  overflow-y: auto;
}

.log-empty {
  padding: 1rem;
  border-radius: 16px;
  background: rgba(16, 24, 38, 0.78);
  color: #99aac9;
  text-align: center;
}

.log-row {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.9rem 0.95rem;
  border-radius: 16px;
  background: rgba(15, 23, 37, 0.82);
  border: 1px solid rgba(80, 98, 130, 0.18);
}

.log-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: #8fa2c6;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.log-time {
  color: #a8b8d8;
}

.log-type {
  color: #7ec7ff;
}

.log-message {
  color: #e7eefc;
  font-size: 0.88rem;
  line-height: 1.5;
}

.log-focus {
  color: #f0c566;
  font-weight: 700;
  cursor: help;
}

@media (max-width: 1024px) {
  .log-sidebar-header {
    flex-direction: column;
  }

  .log-sidebar-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .log-sidebar-tabs {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .log-sidebar {
    height: 100%;
  }

  .log-sidebar.mobile .log-sidebar-panel {
    height: 100%;
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }

  .log-sidebar-header {
    padding: 0.95rem 0.95rem 0.8rem;
  }

  .log-sidebar-body {
    padding: 0.85rem 0.95rem 0.95rem;
  }

  .log-sidebar-list {
    padding-right: 0;
  }
}
</style>