<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useGameStore, type ActionLogEntry, type CombatLogEntry, type ProfessionLogEntry } from '../stores/game'
import InfoTooltip from './InfoTooltip.vue'

type LogTab = 'combat' | 'action' | 'profession'
type BasicLogEntry = CombatLogEntry | ActionLogEntry | ProfessionLogEntry

interface WindowBounds {
  width: number
  height: number
  left: number
  top: number
}

interface PersistedWindowState {
  minimized: boolean
  activeTab: LogTab
  bounds: WindowBounds
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

const props = defineProps<{
  combatLogs: CombatLogEntry[]
  actionLogs: ActionLogEntry[]
  professionLogs: ProfessionLogEntry[]
  onClearCombat?: () => void
  onClearAction?: () => void
  onClearProfession?: () => void
}>()

const route = useRoute()
const game = useGameStore()
const { character, stats, skills, skillBonuses } = storeToRefs(game)

const storageKey = 'theland:log-window-state'
const outerGap = 16
const narrowBreakpoint = 720
const defaultWidth = 420
const defaultHeight = 360
const minimizedBarHeight = 56

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

const viewportWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
const viewportHeight = ref(typeof window === 'undefined' ? 720 : window.innerHeight)
const isNarrowViewport = ref(viewportWidth.value <= narrowBreakpoint)

const bounds = reactive<WindowBounds>({
  width: defaultWidth,
  height: defaultHeight,
  left: outerGap,
  top: outerGap,
})

const state = reactive<PersistedWindowState>({
  minimized: false,
  activeTab: 'combat',
  bounds: { ...bounds },
  filters: createDefaultFilters(),
  lastSeen: {
    combat: 0,
    action: 0,
    profession: 0,
  },
})

const dragState = reactive({
  active: false,
  pointerX: 0,
  pointerY: 0,
  left: 0,
  top: 0,
})

const resizeState = reactive({
  active: false,
  pointerX: 0,
  pointerY: 0,
  width: 0,
  height: 0,
})

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

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

const getWidthBounds = () => {
  const maxWidth = Math.max(260, viewportWidth.value - outerGap * 2)
  const minWidth = Math.min(320, maxWidth)
  return { minWidth, maxWidth }
}

const getHeightBounds = () => {
  const maxHeight = Math.max(200, viewportHeight.value - outerGap * 2)
  const minHeight = Math.min(220, maxHeight)
  return { minHeight, maxHeight }
}

const clampBounds = (value: Partial<WindowBounds>): WindowBounds => {
  const { minWidth, maxWidth } = getWidthBounds()
  const { minHeight, maxHeight } = getHeightBounds()
  const width = clamp(Math.round(value.width ?? bounds.width ?? defaultWidth), minWidth, maxWidth)
  const height = clamp(Math.round(value.height ?? bounds.height ?? defaultHeight), minHeight, maxHeight)
  const visualHeight = state.minimized ? minimizedBarHeight : height
  const left = clamp(
    Math.round(value.left ?? bounds.left ?? outerGap),
    outerGap,
    Math.max(outerGap, viewportWidth.value - width - outerGap),
  )
  const top = clamp(
    Math.round(value.top ?? bounds.top ?? outerGap),
    outerGap,
    Math.max(outerGap, viewportHeight.value - visualHeight - outerGap),
  )
  return { width, height, left, top }
}

const getDefaultBounds = (): WindowBounds => {
  const { maxWidth } = getWidthBounds()
  const { maxHeight } = getHeightBounds()
  const width = Math.min(defaultWidth, maxWidth)
  const height = Math.min(defaultHeight, maxHeight)
  return clampBounds({
    width,
    height,
    left: viewportWidth.value - width - outerGap,
    top: viewportHeight.value - height - outerGap,
  })
}

const readPersistedState = (): PersistedWindowState | null => {
  if (!hasStorage()) return null

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!isRecord(parsed) || !isLogTab(parsed.activeTab) || typeof parsed.minimized !== 'boolean') {
      return null
    }

    const nextState: PersistedWindowState = {
      minimized: parsed.minimized,
      activeTab: parsed.activeTab,
      bounds: getDefaultBounds(),
      filters: createDefaultFilters(),
      lastSeen: {
        combat: 0,
        action: 0,
        profession: 0,
      },
    }

    if (isRecord(parsed.bounds)) {
      const { width, height, left, top } = parsed.bounds
      if (
        typeof width === 'number' &&
        typeof height === 'number' &&
        typeof left === 'number' &&
        typeof top === 'number'
      ) {
        nextState.bounds = clampBounds({ width, height, left, top })
      }
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

const panelStyle = computed(() => ({
  width: `${bounds.width}px`,
  height: state.minimized ? 'auto' : `${bounds.height}px`,
  left: `${bounds.left}px`,
  top: `${bounds.top}px`,
}))

const persistState = () => {
  if (!hasStorage()) return

  const snapshot: PersistedWindowState = {
    minimized: state.minimized,
    activeTab: state.activeTab,
    bounds: { ...bounds },
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

const handleWindowResize = () => {
  if (typeof window === 'undefined') return

  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
  isNarrowViewport.value = viewportWidth.value <= narrowBreakpoint
  Object.assign(bounds, clampBounds(bounds))
}

const stopPointerInteraction = () => {
  dragState.active = false
  resizeState.active = false
  document.body.style.removeProperty('user-select')
}

const handlePointerMove = (event: PointerEvent) => {
  if (dragState.active) {
    Object.assign(
      bounds,
      clampBounds({
        ...bounds,
        left: dragState.left + event.clientX - dragState.pointerX,
        top: dragState.top + event.clientY - dragState.pointerY,
      }),
    )
    return
  }

  if (!resizeState.active) return

  Object.assign(
    bounds,
    clampBounds({
      ...bounds,
      width: resizeState.width + event.clientX - resizeState.pointerX,
      height: resizeState.height + event.clientY - resizeState.pointerY,
    }),
  )
}

const startDragging = (event: PointerEvent) => {
  if (isNarrowViewport.value) return

  const target = event.target as HTMLElement | null
  if (target?.closest('button') || target?.closest('input')) return

  dragState.active = true
  dragState.pointerX = event.clientX
  dragState.pointerY = event.clientY
  dragState.left = bounds.left
  dragState.top = bounds.top
  document.body.style.userSelect = 'none'
}

const startResizing = (event: PointerEvent) => {
  if (isNarrowViewport.value || state.minimized) return

  resizeState.active = true
  resizeState.pointerX = event.clientX
  resizeState.pointerY = event.clientY
  resizeState.width = bounds.width
  resizeState.height = bounds.height
  document.body.style.userSelect = 'none'
}

const setActiveTab = (tab: LogTab) => {
  state.activeTab = tab
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

  if (!state.minimized) {
    syncSeenToLatest(state.activeTab)
  }
}

const minimizeWindow = () => {
  syncSeenToLatest()
  state.minimized = true
  Object.assign(bounds, clampBounds(bounds))
}

const restoreWindow = () => {
  state.minimized = false
  syncSeenToLatest()
  Object.assign(bounds, clampBounds(bounds))
}

const formatType = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

onMounted(() => {
  handleWindowResize()

  const persisted = readPersistedState()
  if (persisted) {
    state.minimized = persisted.minimized
    state.activeTab = persisted.activeTab
    state.filters = persisted.filters
    state.lastSeen = persisted.lastSeen
    Object.assign(bounds, clampBounds(persisted.bounds))
  } else {
    Object.assign(bounds, getDefaultBounds())
    syncSeenToLatest()
  }

  if (!state.minimized) {
    syncSeenToLatest()
  }

  syncTabToRoute(route.path)

  window.addEventListener('resize', handleWindowResize)
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', stopPointerInteraction)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize)
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', stopPointerInteraction)
  document.body.style.removeProperty('user-select')
})

watch(latestSeenIds, () => {
  if (!state.minimized) {
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
  () => state.minimized,
  () => {
    Object.assign(bounds, clampBounds(bounds))
  },
)

watch(
  () => ({
    minimized: state.minimized,
    activeTab: state.activeTab,
    combatFilters: state.filters.combat,
    actionFilters: state.filters.action,
    professionFilters: state.filters.profession,
    lastSeen: state.lastSeen,
    bounds: { ...bounds },
  }),
  () => {
    persistState()
  },
  { deep: true },
)
</script>

<template>
  <Teleport to="body">
    <section
      class="floating-log-window"
      :class="{ minimized: state.minimized, narrow: isNarrowViewport, dragging: dragState.active }"
      :style="panelStyle"
    >
      <header class="floating-log-header" @pointerdown="startDragging">
        <button
          v-if="state.minimized"
          type="button"
          class="minimized-toggle"
          @pointerdown.stop
          @click="restoreWindow"
        >
          Logs ({{ unreadCount }})
        </button>

        <template v-else>
          <div>
            <div class="floating-log-title">Logs</div>
            <div class="floating-log-subtitle">{{ activeTabMeta.limitText }}</div>
          </div>
          <div class="floating-log-actions">
            <button type="button" class="ghost" @pointerdown.stop @click="clearActiveLogs">Clear</button>
            <button type="button" class="ghost" @pointerdown.stop @click="minimizeWindow">Minimize</button>
          </div>
        </template>
      </header>

      <div v-if="!state.minimized" class="floating-log-body">
        <nav class="floating-log-tabs" aria-label="Log tabs">
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

        <div class="floating-log-filters">
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

        <div class="floating-log-list">
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

        <button
          v-if="!isNarrowViewport"
          type="button"
          class="floating-log-resize-handle"
          aria-label="Resize logs window"
          @pointerdown.stop.prevent="startResizing"
        ></button>
      </div>
    </section>
  </Teleport>
</template>

<style scoped>
.floating-log-window {
  position: fixed;
  z-index: 2400;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 260px;
  min-height: 200px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  box-sizing: border-box;
  border-radius: 20px;
  background: rgba(14, 20, 33, 0.96);
  border: 1px solid rgba(80, 98, 130, 0.35);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(16px);
}

.floating-log-window.minimized {
  min-height: 0;
  width: 240px;
}

.floating-log-window.dragging {
  cursor: grabbing;
}

.floating-log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  background: linear-gradient(140deg, rgba(24, 34, 52, 0.96), rgba(16, 24, 39, 0.96));
  border-bottom: 1px solid rgba(80, 98, 130, 0.24);
  cursor: grab;
}

.floating-log-title {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #eef5ff;
}

.floating-log-subtitle {
  font-size: 0.78rem;
  color: #8fa2c6;
}

.floating-log-actions {
  display: flex;
  gap: 0.5rem;
}

.floating-log-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  position: relative;
  gap: 0.9rem;
  padding: 0.9rem;
  min-height: 0;
}

.floating-log-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-button,
.filter-chip,
.ghost,
.minimized-toggle {
  border: 1px solid rgba(92, 112, 146, 0.35);
  border-radius: 999px;
  background: rgba(23, 32, 49, 0.84);
  color: #d8e4ff;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.tab-button,
.filter-chip,
.ghost {
  padding: 0.45rem 0.85rem;
}

.tab-button:hover,
.filter-chip:hover,
.ghost:hover,
.minimized-toggle:hover {
  transform: translateY(-1px);
  border-color: rgba(116, 210, 255, 0.55);
}

.tab-button.active,
.filter-chip.active {
  background: rgba(116, 210, 255, 0.18);
  border-color: rgba(116, 210, 255, 0.75);
  color: #c8f0ff;
}

.tab-button {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
}

.tab-count {
  color: #8fa2c6;
  font-size: 0.78rem;
}

.floating-log-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.floating-log-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.55rem;
  min-height: 0;
  padding: 0.75rem;
  border-radius: 16px;
  background: rgba(12, 18, 30, 0.92);
  border: 1px solid rgba(60, 80, 110, 0.32);
  overflow: auto;
}

.log-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-bottom: 0.45rem;
  border-bottom: 1px solid rgba(60, 80, 110, 0.2);
}

.log-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.log-meta {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  flex-wrap: wrap;
  font-size: 0.72rem;
  color: #d7e3fd;
}

.log-time {
  color: #7f92b6;
  font-variant-numeric: tabular-nums;
}

.log-type {
  text-transform: uppercase;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  color: #9fb0d3;
}

.log-message {
  color: #e2ebff;
  font-size: 0.84rem;
  line-height: 1.35;
}

.log-focus {
  color: #c8f0ff;
}

.log-empty {
  color: #8fa2c6;
  font-size: 0.84rem;
}

.minimized-toggle {
  width: 100%;
  padding: 0.65rem 0.9rem;
  text-align: left;
}

.floating-log-resize-handle {
  position: absolute;
  right: 0.3rem;
  bottom: 0.3rem;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  background:
    linear-gradient(135deg, transparent 37%, rgba(116, 210, 255, 0.45) 37%, rgba(116, 210, 255, 0.45) 50%, transparent 50%),
    linear-gradient(135deg, transparent 55%, rgba(116, 210, 255, 0.75) 55%, rgba(116, 210, 255, 0.75) 68%, transparent 68%);
  cursor: nwse-resize;
  opacity: 0.85;
}

@media (max-width: 720px) {
  .floating-log-window {
    left: 12px !important;
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px);
  }

  .floating-log-window.minimized {
    width: calc(100vw - 24px) !important;
  }

  .floating-log-header {
    cursor: default;
  }

  .log-meta {
    gap: 0.4rem;
  }
}
</style>