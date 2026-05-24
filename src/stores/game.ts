import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { actionDurationMs, tickMs } from './game/constants'
import {
  createActions,
  createItemDefs,
  createProfessionActions,
  createProfessions,
  createSpellDefinitions,
  createSkills,
  createStats,
  createZones,
  seedInventoryItems,
} from './game/data'
import type {
  ActiveTask,
  ActiveTaskType,
  ActionItem,
  ActionLogEntry,
  ActionLogType,
  CombatLogEntry,
  CombatLogType,
  EnemyType,
  InventorySlot,
  ItemDef,
  Profession,
  ProfessionAction,
  ProfessionKey,
  ProfessionLogEntry,
  ProfessionLogType,
  Skill,
  SkillKey,
  SpellDefinition,
  SpellProgress,
  Stat,
  StatKey,
  Zone,
} from './game/types'
import { useActionLogic } from './game/actions'
import { useCombatLogic, type ActiveBuff, type CombatRewards, type CombatState } from './game/combat'
import { useInventoryLogic } from './game/inventory'
import { useLogbook } from './game/logs'
import { useProgressionLogic } from './game/progression'
import { computeExpToNext } from './game/experience'
import { useTicker } from './game/ticker'

export type {
  ActiveTask,
  ActiveTaskType,
  ActionItem,
  ActionLogEntry,
  ActionLogType,
  CombatLogEntry,
  CombatLogType,
  EnemyType,
  InventorySlot,
  ItemDef,
  ItemQuality,
  Profession,
  ProfessionAction,
  ProfessionKey,
  ProfessionLogEntry,
  ProfessionLogType,
  Skill,
  SkillKey,
  SpellDefinition,
  SpellProgress,
  Stat,
  StatKey,
  Zone,
} from './game/types'

const saveStorageKey = 'theland:save-state'
const saveVersion = 1
const autosaveIntervalMs = 60_000

const statKeys: StatKey[] = ['Strength', 'Agility', 'Vitality', 'Spirit', 'Intelligence']
const skillKeys: SkillKey[] = ['Combat', 'Survival', 'Harvesting', 'Crafting', 'Arcana']
const professionKeys: ProfessionKey[] = ['Mining', 'Herbalism', 'Smelting', 'Alchemy']
const activeTaskTypes = new Set<ActiveTaskType>(['none', 'idle', 'profession', 'combat', 'rest'])
const combatLogTypes = new Set<CombatLogType>(['combat', 'damage', 'kill', 'rest', 'system'])
const professionLogTypes = new Set<ProfessionLogType>(['action', 'reward', 'system'])
const actionLogTypes = new Set<ActionLogType>(['action', 'reward', 'system'])

interface CharacterState {
  level: number
  exp: number
  expToNext: number
  baseExpToNext: number
}

interface CurrencyState {
  copper: number
}

interface StatProgressState {
  value: number
  exp: number
  expToNext: number
  baseExpToNext: number
}

interface SkillProgressState {
  level: number
  exp: number
  expToNext: number
  baseExpToNext: number
}

interface ProfessionProgressState {
  level: number
  exp: number
  expToNext: number
  baseExpToNext: number
}

interface GameSnapshotState {
  paused: boolean
  character: CharacterState
  currency: CurrencyState
  stats: Record<StatKey, StatProgressState>
  skills: Record<SkillKey, SkillProgressState>
  professions: Record<ProfessionKey, ProfessionProgressState>
  activeTask: ActiveTask
  inventory: InventorySlot[]
  spellbook: Record<string, SpellProgress>
  selectedSpellId: string
  combat: CombatState
  combatRewards: CombatRewards
  combatLogs: CombatLogEntry[]
  professionLogs: ProfessionLogEntry[]
  actionLogs: ActionLogEntry[]
  playerHp: number
  mana: number
  attributePoints: number
  statAllocations: Record<StatKey, number>
  idleActionProgress: number
  professionActionProgress: number
  activeBuffs: ActiveBuff[]
}

interface PersistedGameSnapshot {
  version: number
  savedAt: number
  state: GameSnapshotState
}

interface NewGameStateDeps {
  itemDefs: Record<string, ItemDef>
  spellDefinitions: SpellDefinition[]
  defaultZone: Zone
  defaultEnemy: EnemyType
  defaultIdleActionId?: string
  defaultSelectedSpellId: string
}

const hasStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'

const readArray = <T>(value: unknown, readItem: (entry: unknown) => T | null): T[] | null => {
  if (!Array.isArray(value)) return null
  const result: T[] = []
  for (const entry of value) {
    const parsed = readItem(entry)
    if (!parsed) return null
    result.push(parsed)
  }
  return result
}

const cloneEntries = <T extends object>(entries: T[]) => entries.map((entry) => ({ ...entry }))

const cloneActiveTask = (task: ActiveTask): ActiveTask =>
  task.actionId ? { type: task.type, actionId: task.actionId } : { type: task.type }

const createDefaultCharacterState = (): CharacterState => ({
  level: 1,
  exp: 0,
  expToNext: 120,
  baseExpToNext: 120,
})

const createDefaultCurrencyState = (): CurrencyState => ({
  copper: 25,
})

const createDefaultStatAllocations = (): Record<StatKey, number> => ({
  Strength: 0,
  Agility: 0,
  Vitality: 0,
  Spirit: 0,
  Intelligence: 0,
})

const createDefaultActiveTask = (defaultIdleActionId?: string): ActiveTask => ({
  type: defaultIdleActionId ? 'idle' : 'none',
  actionId: defaultIdleActionId,
})

const createDefaultSpellbookState = (
  spellDefinitions: SpellDefinition[],
): Record<string, SpellProgress> =>
  Object.fromEntries(
    spellDefinitions.map((spell) => [
      spell.id,
      {
        id: spell.id,
        learned: spell.id === 'arcane-burst',
        level: spell.id === 'arcane-burst' ? 1 : 0,
        exp: 0,
        expToNext: 60,
      },
    ]),
  ) as Record<string, SpellProgress>

const getDefaultSelectedSpellId = (spellDefinitions: SpellDefinition[]) =>
  spellDefinitions.find((spell) => spell.id === 'arcane-burst')?.id ?? spellDefinitions[0]?.id ?? ''

const createDefaultCombatState = (defaultZone: Zone, defaultEnemy: EnemyType): CombatState => ({
  zoneId: defaultZone.id,
  enemyId: defaultEnemy.id,
  enemyName: defaultEnemy.name,
  enemyLevel: defaultZone.levelMin,
  enemyHp: 40,
  enemyMaxHp: 40,
  enemyPower: defaultZone.basePower,
})

const createDefaultCombatRewards = (defaultZone: Zone): CombatRewards => ({
  exp: defaultZone.baseRewards.exp,
  copper: defaultZone.baseRewards.copper,
  skillExp: defaultZone.baseRewards.skillExp,
  statExp: defaultZone.baseRewards.statExp,
})

const createStatProgressState = (stat: Stat): StatProgressState => ({
  value: stat.value,
  exp: stat.exp,
  expToNext: stat.expToNext,
  baseExpToNext: stat.baseExpToNext,
})

const createSkillProgressState = (skill: Skill): SkillProgressState => ({
  level: skill.level,
  exp: skill.exp,
  expToNext: skill.expToNext,
  baseExpToNext: skill.baseExpToNext,
})

const createProfessionProgressState = (profession: Profession): ProfessionProgressState => ({
  level: profession.level,
  exp: profession.exp,
  expToNext: profession.expToNext,
  baseExpToNext: profession.baseExpToNext,
})

const toStatProgressRecord = (source: Record<StatKey, Stat>): Record<StatKey, StatProgressState> => ({
  Strength: createStatProgressState(source.Strength),
  Agility: createStatProgressState(source.Agility),
  Vitality: createStatProgressState(source.Vitality),
  Spirit: createStatProgressState(source.Spirit),
  Intelligence: createStatProgressState(source.Intelligence),
})

const toSkillProgressRecord = (
  source: Record<SkillKey, Skill>,
): Record<SkillKey, SkillProgressState> => ({
  Combat: createSkillProgressState(source.Combat),
  Survival: createSkillProgressState(source.Survival),
  Harvesting: createSkillProgressState(source.Harvesting),
  Crafting: createSkillProgressState(source.Crafting),
  Arcana: createSkillProgressState(source.Arcana),
})

const toProfessionProgressRecord = (
  source: Record<ProfessionKey, Profession>,
): Record<ProfessionKey, ProfessionProgressState> => ({
  Mining: createProfessionProgressState(source.Mining),
  Herbalism: createProfessionProgressState(source.Herbalism),
  Smelting: createProfessionProgressState(source.Smelting),
  Alchemy: createProfessionProgressState(source.Alchemy),
})

const cloneSpellbookState = (
  source: Record<string, SpellProgress>,
  spellDefinitions: SpellDefinition[],
): Record<string, SpellProgress> =>
  Object.fromEntries(
    spellDefinitions.map((spell) => [spell.id, { ...source[spell.id] }]),
  ) as Record<string, SpellProgress>

const createSeededInventoryState = (itemDefs: Record<string, ItemDef>): InventorySlot[] => {
  let nextSlotId = 0
  const slots: InventorySlot[] = []

  const createSlot = (itemId: string): InventorySlot => ({
    id: (nextSlotId += 1),
    itemId,
    quantity: 0,
  })

  seedInventoryItems.forEach((entry) => {
    const def = itemDefs[entry.itemId]
    if (!def || entry.amount <= 0) return

    let remaining = entry.amount
    while (remaining > 0) {
      let slot =
        def.maxStack > 1
          ? slots.find((candidate) => candidate.itemId === entry.itemId && candidate.quantity < def.maxStack)
          : undefined

      if (!slot) {
        slot = createSlot(entry.itemId)
        slots.push(slot)
      }

      const space = def.maxStack - slot.quantity
      const addNow = Math.min(space, remaining)
      slot.quantity += addNow
      remaining -= addNow
    }
  })

  return slots
}

const createNewGameSnapshotState = ({
  itemDefs,
  spellDefinitions,
  defaultZone,
  defaultEnemy,
  defaultIdleActionId,
  defaultSelectedSpellId,
}: NewGameStateDeps): GameSnapshotState => {
  const character = createDefaultCharacterState()
  const stats = createStats()
  const skills = createSkills()
  const professions = createProfessions()

  return {
    paused: false,
    character,
    currency: createDefaultCurrencyState(),
    stats: toStatProgressRecord(stats),
    skills: toSkillProgressRecord(skills),
    professions: toProfessionProgressRecord(professions),
    activeTask: createDefaultActiveTask(defaultIdleActionId),
    inventory: createSeededInventoryState(itemDefs),
    spellbook: createDefaultSpellbookState(spellDefinitions),
    selectedSpellId: defaultSelectedSpellId,
    combat: createDefaultCombatState(defaultZone, defaultEnemy),
    combatRewards: createDefaultCombatRewards(defaultZone),
    combatLogs: [],
    professionLogs: [],
    actionLogs: [],
    playerHp: Math.floor(character.level * 8 + stats.Vitality.value * 12),
    mana: Math.floor(30 + stats.Intelligence.value * 10),
    attributePoints: 0,
    statAllocations: createDefaultStatAllocations(),
    idleActionProgress: 0,
    professionActionProgress: 0,
    activeBuffs: [],
  }
}

const readCharacterState = (value: unknown): CharacterState | null => {
  if (!isRecord(value)) return null
  const { level, exp, expToNext, baseExpToNext } = value
  if (!isFiniteNumber(level) || !isFiniteNumber(exp) || !isFiniteNumber(expToNext) || !isFiniteNumber(baseExpToNext)) {
    return null
  }
  return { level, exp, expToNext, baseExpToNext }
}

const readCurrencyState = (value: unknown): CurrencyState | null => {
  if (!isRecord(value) || !isFiniteNumber(value.copper)) return null
  return { copper: value.copper }
}

const readStatProgressState = (value: unknown): StatProgressState | null => {
  if (!isRecord(value)) return null
  const { value: statValue, exp, expToNext, baseExpToNext } = value
  if (!isFiniteNumber(statValue) || !isFiniteNumber(exp) || !isFiniteNumber(expToNext) || !isFiniteNumber(baseExpToNext)) {
    return null
  }
  return { value: statValue, exp, expToNext, baseExpToNext }
}

const readSkillProgressState = (value: unknown): SkillProgressState | null => {
  if (!isRecord(value)) return null
  const { level, exp, expToNext, baseExpToNext } = value
  if (!isFiniteNumber(level) || !isFiniteNumber(exp) || !isFiniteNumber(expToNext) || !isFiniteNumber(baseExpToNext)) {
    return null
  }
  return { level, exp, expToNext, baseExpToNext }
}

const readProfessionProgressState = (value: unknown): ProfessionProgressState | null => {
  if (!isRecord(value)) return null
  const { level, exp, expToNext, baseExpToNext } = value
  if (!isFiniteNumber(level) || !isFiniteNumber(exp) || !isFiniteNumber(expToNext) || !isFiniteNumber(baseExpToNext)) {
    return null
  }
  return { level, exp, expToNext, baseExpToNext }
}

const readStatProgressRecord = (value: unknown): Record<StatKey, StatProgressState> | null => {
  if (!isRecord(value)) return null

  const result = {} as Record<StatKey, StatProgressState>
  for (const key of statKeys) {
    const parsed = readStatProgressState(value[key])
    if (!parsed) return null
    result[key] = parsed
  }
  return result
}

const readSkillProgressRecord = (value: unknown): Record<SkillKey, SkillProgressState> | null => {
  if (!isRecord(value)) return null

  const result = {} as Record<SkillKey, SkillProgressState>
  for (const key of skillKeys) {
    const parsed = readSkillProgressState(value[key])
    if (!parsed) return null
    result[key] = parsed
  }
  return result
}

const readProfessionProgressRecord = (
  value: unknown,
): Record<ProfessionKey, ProfessionProgressState> | null => {
  if (!isRecord(value)) return null

  const result = {} as Record<ProfessionKey, ProfessionProgressState>
  for (const key of professionKeys) {
    const parsed = readProfessionProgressState(value[key])
    if (!parsed) return null
    result[key] = parsed
  }
  return result
}

const readActiveTaskState = (
  value: unknown,
  actionIds: Set<string>,
  professionActionIds: Set<string>,
): ActiveTask | null => {
  if (!isRecord(value) || !isString(value.type) || !activeTaskTypes.has(value.type as ActiveTaskType)) {
    return null
  }

  const type = value.type as ActiveTaskType
  const actionId = value.actionId

  if (type === 'idle') {
    if (!isString(actionId) || !actionIds.has(actionId)) return null
    return { type, actionId }
  }

  if (type === 'profession') {
    if (!isString(actionId) || !professionActionIds.has(actionId)) return null
    return { type, actionId }
  }

  return { type }
}

const readInventorySlotState = (value: unknown): InventorySlot | null => {
  if (!isRecord(value) || !isFiniteNumber(value.id) || !isFiniteNumber(value.quantity)) return null
  if (value.itemId !== undefined && !isString(value.itemId)) return null
  if (!Number.isInteger(value.id) || !Number.isInteger(value.quantity) || value.quantity < 0) return null

  return value.itemId === undefined
    ? { id: value.id, quantity: value.quantity }
    : { id: value.id, itemId: value.itemId, quantity: value.quantity }
}

const readSpellProgressState = (value: unknown): SpellProgress | null => {
  if (!isRecord(value)) return null
  const { id, learned, level, exp, expToNext } = value
  if (!isString(id) || !isBoolean(learned) || !isFiniteNumber(level) || !isFiniteNumber(exp) || !isFiniteNumber(expToNext)) {
    return null
  }
  return { id, learned, level, exp, expToNext }
}

const readSpellbookState = (
  value: unknown,
  spellDefinitions: SpellDefinition[],
): Record<string, SpellProgress> | null => {
  if (!isRecord(value)) return null

  const result: Record<string, SpellProgress> = {}
  for (const spell of spellDefinitions) {
    const parsed = readSpellProgressState(value[spell.id])
    if (!parsed || parsed.id !== spell.id) return null
    result[spell.id] = parsed
  }
  return result
}

const readCombatState = (value: unknown, zones: Zone[]): CombatState | null => {
  if (!isRecord(value)) return null
  const { zoneId, enemyId, enemyName, enemyLevel, enemyHp, enemyMaxHp, enemyPower } = value

  if (
    !isString(zoneId) ||
    !isString(enemyId) ||
    !isString(enemyName) ||
    !isFiniteNumber(enemyLevel) ||
    !isFiniteNumber(enemyHp) ||
    !isFiniteNumber(enemyMaxHp) ||
    !isFiniteNumber(enemyPower)
  ) {
    return null
  }

  const zone = zones.find((candidate) => candidate.id === zoneId)
  if (!zone || !zone.enemies.some((enemy) => enemy.id === enemyId)) return null

  return {
    zoneId,
    enemyId,
    enemyName,
    enemyLevel,
    enemyHp,
    enemyMaxHp,
    enemyPower,
  }
}

const readCombatRewardsState = (value: unknown): CombatRewards | null => {
  if (!isRecord(value)) return null
  const { exp, copper, skillExp, statExp } = value
  if (!isFiniteNumber(exp) || !isFiniteNumber(copper) || !isFiniteNumber(skillExp) || !isFiniteNumber(statExp)) {
    return null
  }
  return { exp, copper, skillExp, statExp }
}

const readCombatLogEntry = (value: unknown): CombatLogEntry | null => {
  if (!isRecord(value) || !isFiniteNumber(value.id) || !isFiniteNumber(value.timestamp) || !isString(value.type) || !isString(value.message)) {
    return null
  }
  if (!combatLogTypes.has(value.type as CombatLogType)) return null
  return {
    id: value.id,
    timestamp: value.timestamp,
    type: value.type as CombatLogType,
    message: value.message,
  }
}

const readProfessionLogEntry = (value: unknown): ProfessionLogEntry | null => {
  if (!isRecord(value) || !isFiniteNumber(value.id) || !isFiniteNumber(value.timestamp) || !isString(value.type) || !isString(value.message)) {
    return null
  }
  if (!professionLogTypes.has(value.type as ProfessionLogType)) return null
  return {
    id: value.id,
    timestamp: value.timestamp,
    type: value.type as ProfessionLogType,
    message: value.message,
  }
}

const readActionLogEntry = (value: unknown): ActionLogEntry | null => {
  if (!isRecord(value) || !isFiniteNumber(value.id) || !isFiniteNumber(value.timestamp) || !isString(value.type) || !isString(value.message)) {
    return null
  }
  if (!actionLogTypes.has(value.type as ActionLogType)) return null
  return {
    id: value.id,
    timestamp: value.timestamp,
    type: value.type as ActionLogType,
    message: value.message,
  }
}

const readStatAllocationsState = (value: unknown): Record<StatKey, number> | null => {
  if (!isRecord(value)) return null

  const result = {} as Record<StatKey, number>
  for (const key of statKeys) {
    const points = value[key]
    if (!isFiniteNumber(points) || !Number.isInteger(points) || points < 0) return null
    result[key] = points
  }
  return result
}

const readActiveBuffState = (value: unknown): ActiveBuff | null => {
  if (!isRecord(value)) return null
  const {
    id,
    name,
    remainingTicks,
    combatDamageBonus,
    damageReductionBonus,
    spellPowerBonus,
  } = value

  if (
    !isString(id) ||
    !isString(name) ||
    !isFiniteNumber(remainingTicks) ||
    !isFiniteNumber(combatDamageBonus) ||
    !isFiniteNumber(damageReductionBonus) ||
    !isFiniteNumber(spellPowerBonus)
  ) {
    return null
  }

  return {
    id,
    name,
    remainingTicks,
    combatDamageBonus,
    damageReductionBonus,
    spellPowerBonus,
  }
}

const readGameSnapshotState = (
  value: unknown,
  options: {
    actionIds: Set<string>
    professionActionIds: Set<string>
    spellDefinitions: SpellDefinition[]
    zones: Zone[]
  },
): GameSnapshotState | null => {
  if (!isRecord(value)) return null

  const character = readCharacterState(value.character)
  const currency = readCurrencyState(value.currency)
  const stats = readStatProgressRecord(value.stats)
  const skills = readSkillProgressRecord(value.skills)
  const professions = readProfessionProgressRecord(value.professions)
  const activeTask = readActiveTaskState(value.activeTask, options.actionIds, options.professionActionIds)
  const inventory = readArray(value.inventory, readInventorySlotState)
  const spellbook = readSpellbookState(value.spellbook, options.spellDefinitions)
  const combat = readCombatState(value.combat, options.zones)
  const combatRewards = readCombatRewardsState(value.combatRewards)
  const combatLogs = readArray(value.combatLogs, readCombatLogEntry)
  const professionLogs = readArray(value.professionLogs, readProfessionLogEntry)
  const actionLogs = readArray(value.actionLogs, readActionLogEntry)
  const statAllocations = readStatAllocationsState(value.statAllocations)
  const activeBuffs = readArray(value.activeBuffs, readActiveBuffState)

  if (
    !isBoolean(value.paused) ||
    !character ||
    !currency ||
    !stats ||
    !skills ||
    !professions ||
    !activeTask ||
    !inventory ||
    !spellbook ||
    !isString(value.selectedSpellId) ||
    !options.spellDefinitions.some((spell) => spell.id === value.selectedSpellId) ||
    !combat ||
    !combatRewards ||
    !combatLogs ||
    !professionLogs ||
    !actionLogs ||
    !isFiniteNumber(value.playerHp) ||
    !isFiniteNumber(value.mana) ||
    !isFiniteNumber(value.attributePoints) ||
    !statAllocations ||
    !isFiniteNumber(value.idleActionProgress) ||
    !isFiniteNumber(value.professionActionProgress) ||
    !activeBuffs
  ) {
    return null
  }

  return {
    paused: value.paused,
    character,
    currency,
    stats,
    skills,
    professions,
    activeTask,
    inventory,
    spellbook,
    selectedSpellId: value.selectedSpellId,
    combat,
    combatRewards,
    combatLogs,
    professionLogs,
    actionLogs,
    playerHp: value.playerHp,
    mana: value.mana,
    attributePoints: value.attributePoints,
    statAllocations,
    idleActionProgress: value.idleActionProgress,
    professionActionProgress: value.professionActionProgress,
    activeBuffs,
  }
}

const readPersistedGameSnapshot = (
  value: unknown,
  options: {
    actionIds: Set<string>
    professionActionIds: Set<string>
    spellDefinitions: SpellDefinition[]
    zones: Zone[]
  },
): PersistedGameSnapshot | null => {
  if (!isRecord(value) || value.version !== saveVersion || !isFiniteNumber(value.savedAt)) return null

  const state = readGameSnapshotState(value.state, options)
  if (!state) return null

  return {
    version: saveVersion,
    savedAt: value.savedAt,
    state,
  }
}

export const useGameStore = defineStore('game', () => {
  const paused = ref(false)

  const character = reactive<CharacterState>(createDefaultCharacterState())
  const currency = reactive<CurrencyState>(createDefaultCurrencyState())
  const stats = reactive<Record<StatKey, Stat>>(createStats())
  const skills = reactive<Record<SkillKey, Skill>>(createSkills())
  const professions = reactive<Record<ProfessionKey, Profession>>(createProfessions())
  const professionActions = reactive<ProfessionAction[]>(createProfessionActions())
  const actions = reactive<ActionItem[]>(createActions())

  const defaultIdleActionId = actions[0]?.id
  const activeTask = ref<ActiveTask>(createDefaultActiveTask(defaultIdleActionId))

  const baseInventorySlots = 30
  const itemDefs = reactive<Record<string, ItemDef>>(createItemDefs())
  const inventory = reactive<InventorySlot[]>([])
  const zones = reactive<Zone[]>(createZones())
  const spellDefinitions = reactive<SpellDefinition[]>(createSpellDefinitions())
  const defaultSelectedSpellId = getDefaultSelectedSpellId(spellDefinitions)
  const spellbook = reactive<Record<string, SpellProgress>>(createDefaultSpellbookState(spellDefinitions))
  const selectedSpellId = ref(defaultSelectedSpellId)

  const defaultZone = zones[0]!
  const defaultEnemy: EnemyType = defaultZone.enemies[0]!
  const combat = reactive<CombatState>(createDefaultCombatState(defaultZone, defaultEnemy))
  const combatRewards = reactive<CombatRewards>(createDefaultCombatRewards(defaultZone))

  const playerHp = ref(0)
  const mana = ref(0)
  const lastSavedAt = ref<number | null>(null)
  const saveError = ref<string | null>(null)
  const hasSavedProgress = ref(false)

  const actionIds = new Set(actions.map((action) => action.id))
  const professionActionIds = new Set(professionActions.map((action) => action.id))

  const {
    combatLogs,
    professionLogs,
    actionLogs,
    addCombatLog,
    addProfessionLog,
    addActionLog,
    clearCombatLogs,
    clearProfessionLogs,
    clearActionLogs,
    restoreCombatLogs,
    restoreProfessionLogs,
    restoreActionLogs,
  } = useLogbook()

  const {
    statList,
    skillList,
    professionList,
    skillBonuses,
    currencyBreakdown,
    formatCopperToCurrency,
    addCurrency,
    spendCurrency,
    addCharacterExp: addCharacterExpCore,
    addStatExp,
    addSkillExp,
    addProfessionExp,
  } = useProgressionLogic({
    character,
    currency,
    stats,
    skills,
    professions,
  })

  const attributePoints = ref(0)
  const statAllocations = reactive<Record<StatKey, number>>(createDefaultStatAllocations())

  const allocatedPoints = computed(() =>
    Object.values(statAllocations).reduce((total, value) => total + value, 0),
  )

  const remainingAttributePoints = computed(
    () => attributePoints.value - allocatedPoints.value,
  )

  const addCharacterExp = (amount: number) => {
    const levelsGained = addCharacterExpCore(amount)
    if (levelsGained > 0) {
      attributePoints.value += levelsGained * 3
    }
    return levelsGained
  }

  const increaseStatAllocation = (key: StatKey) => {
    if (remainingAttributePoints.value <= 0) return
    statAllocations[key] += 1
  }

  const decreaseStatAllocation = (key: StatKey) => {
    if (statAllocations[key] <= 0) return
    statAllocations[key] -= 1
  }

  const applyStatAllocations = () => {
    const points = allocatedPoints.value
    if (points <= 0) return
    Object.entries(statAllocations).forEach(([key, value]) => {
      if (!value) return
      const statKey = key as StatKey
      stats[statKey].value += value
      stats[statKey].expToNext = computeExpToNext(
        stats[statKey].baseExpToNext,
        stats[statKey].value,
        1.2,
        15,
      )
      statAllocations[statKey] = 0
    })
    attributePoints.value -= points
  }

  const maxMana = computed(() => Math.floor(30 + stats.Intelligence.value * 10))
  const manaRegen = computed(() => 1 + stats.Intelligence.value * 0.25)

  const spendMana = (amount: number) => {
    if (amount <= 0) return true
    if (mana.value < amount) return false
    mana.value -= amount
    return true
  }

  const {
    maxInventorySlots,
    inventorySlots,
    usedInventorySlots,
    addItem,
    buyItem,
    removeItem,
    getItemQuantity,
    sellFromSlot,
    consumeFromSlot,
    getItemDef,
    restoreInventory,
  } = useInventoryLogic({
    itemDefs,
    inventory,
    stats,
    baseInventorySlots,
    addCurrency,
    spendCurrency,
    getCurrencyCopper: () => currency.copper,
  })

  const clampPlayerResources = () => {
    playerHp.value = Math.min(playerHp.value, maxHp.value)
    mana.value = Math.min(mana.value, maxMana.value)
  }

  const useConsumableFromSlot = (slotId: number) => {
    const slot = inventory.find((entry) => entry.id === slotId)
    if (!slot || !slot.itemId || slot.quantity <= 0) return
    const def = getItemDef(slot.itemId)
    if (!def || def.type !== 'Consumable') return

    const consumedItemId = consumeFromSlot(slotId, 1)
    if (!consumedItemId) return

    if (consumedItemId === 'minor-elixir') {
      playerHp.value += 35
      addCharacterExp(8)
      addActionLog('reward', 'Used Minor Elixir. +35 HP, +8 XP.')
    } else if (consumedItemId === 'focus-draught') {
      mana.value += 30
      addCharacterExp(12)
      addActionLog('reward', 'Used Focus Draught. +30 Mana, +12 XP.')
    } else if (consumedItemId === 'warding-tonic') {
      playerHp.value += 55
      mana.value += 20
      addActionLog('reward', 'Used Warding Tonic. +55 HP, +20 Mana.')
    } else if (consumedItemId === 'fury-philter') {
      addCharacterExp(26)
      addSkillExp('Combat', 20)
      addActionLog('reward', 'Used Fury Philter. +26 XP, +20 Combat XP.')
    } else if (consumedItemId === 'clarity-elixir') {
      mana.value += 60
      addSkillExp('Arcana', 26)
      addActionLog('reward', 'Used Clarity Elixir. +60 Mana, +26 Arcana XP.')
    } else if (consumedItemId === 'frostguard-draught') {
      playerHp.value += 90
      addStatExp('Vitality', 18)
      addActionLog('reward', 'Used Frostguard Draught. +90 HP, +18 Vitality XP.')
    } else if (consumedItemId === 'dragonfire-tonic') {
      addCharacterExp(60)
      addSkillExp('Combat', 45)
      addSkillExp('Arcana', 30)
      addActionLog('reward', 'Used Dragonfire Tonic. +60 XP, +45 Combat XP, +30 Arcana XP.')
    } else if (consumedItemId === 'rift-essence') {
      playerHp.value += 130
      mana.value += 130
      addCharacterExp(100)
      addActionLog('reward', 'Used Rift Essence. +130 HP, +130 Mana, +100 XP.')
    }

    clampPlayerResources()
  }

  const {
    idleActionProgress,
    professionActionProgress,
    idleActionJustCompleted,
    professionActionJustCompleted,
    isIdleActionActive,
    isProfessionActionActive,
    professionBonuses,
    toggleAction,
    toggleProfessionAction,
    runIdleActions,
    runProfessionActions,
    deactivateActions,
    deactivateProfessionActions,
    restoreActionProgress,
  } = useActionLogic({
    actions,
    professionActions,
    professions,
    activeTask,
    actionDurationMs,
    tickMs,
    skillBonuses,
    addCharacterExp,
    addStatExp,
    addSkillExp,
    addProfessionExp,
    addCurrency,
    spendMana,
    addActionLog,
    addProfessionLog,
    getItemQuantity,
    removeItem,
    addItem,
    getItemDef,
  })

  const {
    currentZone,
    currentEnemyDropPreview,
    activeBuffs,
    availableSpells,
    knownSpells,
    maxHp,
    spawnEnemy,
    setZone,
    toggleCombat,
    toggleResting,
    runCombatTick,
    learnSpell,
    setSelectedSpell,
    castSelectedSpell,
    selectedSpell,
    selectedSpellManaCost,
    restoreActiveBuffs,
  } = useCombatLogic({
    character,
    stats,
    skills,
    skillBonuses,
    spellDefinitions,
    spellbook,
    selectedSpellId,
    zones,
    combat,
    combatRewards,
    playerHp,
    activeTask,
    defaultZone,
    defaultEnemy,
    addCombatLog,
    addCharacterExp,
    addCurrency,
    addItem,
    getItemDef,
    addSkillExp,
    addStatExp,
    spendMana,
    deactivateActions,
    deactivateProfessionActions,
  })

  const applyStatProgress = (source: Record<StatKey, StatProgressState>) => {
    statKeys.forEach((key) => {
      stats[key].value = source[key].value
      stats[key].exp = source[key].exp
      stats[key].expToNext = source[key].expToNext
      stats[key].baseExpToNext = source[key].baseExpToNext
    })
  }

  const applySkillProgress = (source: Record<SkillKey, SkillProgressState>) => {
    skillKeys.forEach((key) => {
      skills[key].level = source[key].level
      skills[key].exp = source[key].exp
      skills[key].expToNext = source[key].expToNext
      skills[key].baseExpToNext = source[key].baseExpToNext
    })
  }

  const applyProfessionProgress = (source: Record<ProfessionKey, ProfessionProgressState>) => {
    professionKeys.forEach((key) => {
      professions[key].level = source[key].level
      professions[key].exp = source[key].exp
      professions[key].expToNext = source[key].expToNext
      professions[key].baseExpToNext = source[key].baseExpToNext
    })
  }

  const applySpellbookState = (source: Record<string, SpellProgress>) => {
    spellDefinitions.forEach((spell) => {
      const target = spellbook[spell.id]
      const next = source[spell.id]
      if (!target || !next) return
      target.id = next.id
      target.learned = next.learned
      target.level = next.level
      target.exp = next.exp
      target.expToNext = next.expToNext
    })
  }

  const captureSnapshotState = (): GameSnapshotState => ({
    paused: paused.value,
    character: { ...character },
    currency: { ...currency },
    stats: toStatProgressRecord(stats),
    skills: toSkillProgressRecord(skills),
    professions: toProfessionProgressRecord(professions),
    activeTask: cloneActiveTask(activeTask.value),
    inventory: cloneEntries(inventory),
    spellbook: cloneSpellbookState(spellbook, spellDefinitions),
    selectedSpellId: selectedSpellId.value,
    combat: { ...combat },
    combatRewards: { ...combatRewards },
    combatLogs: cloneEntries(combatLogs.value),
    professionLogs: cloneEntries(professionLogs.value),
    actionLogs: cloneEntries(actionLogs.value),
    playerHp: playerHp.value,
    mana: mana.value,
    attributePoints: attributePoints.value,
    statAllocations: { ...statAllocations },
    idleActionProgress: idleActionProgress.value,
    professionActionProgress: professionActionProgress.value,
    activeBuffs: cloneEntries(activeBuffs.value),
  })

  const applySnapshotState = (state: GameSnapshotState) => {
    paused.value = state.paused
    Object.assign(character, state.character)
    Object.assign(currency, state.currency)
    applyStatProgress(state.stats)
    applySkillProgress(state.skills)
    applyProfessionProgress(state.professions)
    activeTask.value = cloneActiveTask(state.activeTask)
    restoreInventory(state.inventory)
    applySpellbookState(state.spellbook)
    selectedSpellId.value = state.selectedSpellId
    Object.assign(combat, state.combat)
    Object.assign(combatRewards, state.combatRewards)
    restoreCombatLogs(state.combatLogs)
    restoreProfessionLogs(state.professionLogs)
    restoreActionLogs(state.actionLogs)
    attributePoints.value = state.attributePoints
    Object.assign(statAllocations, state.statAllocations)
    restoreActionProgress(state.idleActionProgress, state.professionActionProgress)
    restoreActiveBuffs(state.activeBuffs)
    playerHp.value = Math.max(0, Math.min(Math.floor(state.playerHp), maxHp.value))
    mana.value = Math.max(0, Math.min(Math.floor(state.mana), maxMana.value))
  }

  const createFreshGameState = () =>
    createNewGameSnapshotState({
      itemDefs,
      spellDefinitions,
      defaultZone,
      defaultEnemy,
      defaultIdleActionId,
      defaultSelectedSpellId,
    })

  const loadPersistedSnapshot = (): PersistedGameSnapshot | null => {
    if (!hasStorage()) return null

    try {
      const rawSnapshot = window.localStorage.getItem(saveStorageKey)
      if (!rawSnapshot) return null

      const parsed = readPersistedGameSnapshot(JSON.parse(rawSnapshot), {
        actionIds,
        professionActionIds,
        spellDefinitions,
        zones,
      })

      if (!parsed) {
        window.localStorage.removeItem(saveStorageKey)
        saveError.value = 'Discarded invalid saved progress.'
        hasSavedProgress.value = false
        lastSavedAt.value = null
        return null
      }

      hasSavedProgress.value = true
      lastSavedAt.value = parsed.savedAt
      saveError.value = null
      return parsed
    } catch {
      saveError.value = 'Failed to load saved progress.'
      hasSavedProgress.value = false
      lastSavedAt.value = null
      return null
    }
  }

  const saveNow = () => {
    if (!hasStorage()) {
      saveError.value = 'Local storage unavailable.'
      return false
    }

    const snapshot: PersistedGameSnapshot = {
      version: saveVersion,
      savedAt: Date.now(),
      state: captureSnapshotState(),
    }

    try {
      window.localStorage.setItem(saveStorageKey, JSON.stringify(snapshot))
      hasSavedProgress.value = true
      lastSavedAt.value = snapshot.savedAt
      saveError.value = null
      return true
    } catch {
      saveError.value = 'Failed to save progress.'
      return false
    }
  }

  const clearSavedProgress = () => {
    if (hasStorage()) {
      try {
        window.localStorage.removeItem(saveStorageKey)
      } catch {
        saveError.value = 'Failed to clear saved progress.'
      }
    }

    hasSavedProgress.value = false
    lastSavedAt.value = null
  }

  let autosaveTimer: number | undefined
  let runtimeStarted = false

  const handleBeforeUnload = () => {
    saveNow()
  }

  const startAutosave = () => {
    if (!hasStorage() || autosaveTimer) return
    autosaveTimer = window.setInterval(() => {
      saveNow()
    }, autosaveIntervalMs)
  }

  const stopAutosave = () => {
    if (!autosaveTimer) return
    window.clearInterval(autosaveTimer)
    autosaveTimer = undefined
  }

  const startRuntime = () => {
    if (runtimeStarted) return
    runtimeStarted = true
    startTickerCore()
    startAutosave()
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
  }

  const stopRuntime = (flushSave = true) => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
    stopAutosave()
    if (runtimeStarted) {
      stopTickerCore()
      runtimeStarted = false
    }
    if (flushSave) {
      saveNow()
    }
  }

  const hardResetGame = () => {
    const shouldRestart = runtimeStarted
    if (shouldRestart) {
      stopRuntime(false)
    }

    clearSavedProgress()
    saveError.value = null
    applySnapshotState(createFreshGameState())
    spawnEnemy()

    if (shouldRestart) {
      startRuntime()
    }
  }

  const persistedSnapshot = loadPersistedSnapshot()
  if (persistedSnapshot) {
    applySnapshotState(persistedSnapshot.state)
  } else {
    applySnapshotState(createFreshGameState())
    spawnEnemy()
  }

  const { startTicker: startTickerCore, stopTicker: stopTickerCore } = useTicker({
    paused,
    activeTask,
    playerHp,
    maxHp,
    mana,
    maxMana,
    manaRegen,
    stats,
    skillBonuses,
    tickMs,
    addCombatLog,
    runCombatTick,
    runIdleActions,
    runProfessionActions,
  })

  const startTicker = () => {
    startRuntime()
  }

  const stopTicker = () => {
    stopRuntime()
  }

  const progressPercent = (current: number, max: number) =>
    Math.min(100, Math.floor((current / Math.max(1, max)) * 100))

  return {
    tickMs,
    paused,
    character,
    currency,
    stats,
    skills,
    professions,
    professionActions,
    professionList,
    professionBonuses,
    isIdleActionActive,
    isProfessionActionActive,
    idleActionProgress,
    professionActionProgress,
    idleActionJustCompleted,
    professionActionJustCompleted,
    actionDurationMs,
    actions,
    activeTask,
    itemDefs,
    inventory,
    inventorySlots,
    usedInventorySlots,
    maxInventorySlots,
    addItem,
    buyItem,
    removeItem,
    getItemQuantity,
    sellFromSlot,
    useConsumableFromSlot,
    getItemDef,
    zones,
    combat,
    combatRewards,
    combatLogs,
    professionLogs,
    actionLogs,
    playerHp,
    mana,
    maxMana,
    maxHp,
    attributePoints,
    statAllocations,
    allocatedPoints,
    remainingAttributePoints,
    statList,
    skillList,
    currentZone,
    currentEnemyDropPreview,
    activeBuffs,
    availableSpells,
    knownSpells,
    spellbook,
    selectedSpellId,
    selectedSpell,
    selectedSpellManaCost,
    skillBonuses,
    currencyBreakdown,
    formatCopperToCurrency,
    progressPercent,
    addCurrency,
    spendCurrency,
    addCharacterExp,
    spendMana,
    toggleCombat,
    toggleResting,
    toggleAction,
    toggleProfessionAction,
    setZone,
    learnSpell,
    setSelectedSpell,
    castSelectedSpell,
    addCombatLog,
    clearCombatLogs,
    addProfessionLog,
    clearProfessionLogs,
    addActionLog,
    clearActionLogs,
    increaseStatAllocation,
    decreaseStatAllocation,
    applyStatAllocations,
    autosaveIntervalMs,
    hasSavedProgress,
    lastSavedAt,
    saveError,
    saveNow,
    hardResetGame,
    startTicker,
    stopTicker,
  }
})
