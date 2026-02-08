import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { actionDurationMs, tickMs } from './game/constants'
import {
  createActions,
  createItemDefs,
  createProfessionActions,
  createProfessions,
  createSkills,
  createStats,
  createZones,
  seedInventoryItems,
} from './game/data'
import type {
  ActiveTask,
  ActionItem,
  EnemyType,
  InventorySlot,
  ItemDef,
  Profession,
  ProfessionAction,
  ProfessionKey,
  Skill,
  SkillKey,
  Stat,
  StatKey,
  Zone,
} from './game/types'
import { useActionLogic } from './game/actions'
import { useCombatLogic } from './game/combat'
import { useInventoryLogic } from './game/inventory'
import { useLogbook } from './game/logs'
import { useProgressionLogic } from './game/progression'
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
  Profession,
  ProfessionAction,
  ProfessionKey,
  ProfessionLogEntry,
  ProfessionLogType,
  Skill,
  SkillKey,
  Stat,
  StatKey,
  Zone,
} from './game/types'

export const useGameStore = defineStore('game', () => {
  const paused = ref(false)

  const character = reactive({
    level: 1,
    exp: 0,
    expToNext: 120,
  })

  const currency = reactive({
    copper: 25,
    silver: 0,
    gold: 0,
  })

  const stats = reactive<Record<StatKey, Stat>>(createStats())

  const skills = reactive<Record<SkillKey, Skill>>(createSkills())

  const professions = reactive<Record<ProfessionKey, Profession>>(createProfessions())

  const professionActions = reactive<ProfessionAction[]>(createProfessionActions())

  const actions = reactive<ActionItem[]>(createActions())

  const defaultIdleActionId = actions[0]?.id
  const activeTask = ref<ActiveTask>({
    type: defaultIdleActionId ? 'idle' : 'none',
    actionId: defaultIdleActionId,
  })

  const baseInventorySlots = 30

  const itemDefs = reactive<Record<string, ItemDef>>(createItemDefs())

  const inventory = reactive<InventorySlot[]>([])
  const zones = reactive<Zone[]>(createZones())

  const defaultZone = zones[0]!
  const defaultEnemy: EnemyType = defaultZone.enemies[0]!

  const combat = reactive({
    zoneId: defaultZone.id,
    enemyName: defaultEnemy.name,
    enemyLevel: defaultZone.levelMin,
    enemyHp: 40,
    enemyMaxHp: 40,
    enemyPower: defaultZone.basePower,
  })

  const combatRewards = reactive({
    exp: defaultZone.baseRewards.exp,
    copper: defaultZone.baseRewards.copper,
    skillExp: defaultZone.baseRewards.skillExp,
    statExp: defaultZone.baseRewards.statExp,
  })

  const playerHp = ref(0)

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
  } = useLogbook()

  const {
    statList,
    skillList,
    professionList,
    skillBonuses,
    addCurrency,
    addCharacterExp,
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

  const {
    maxInventorySlots,
    inventorySlots,
    usedInventorySlots,
    addItem,
    removeItem,
    getItemQuantity,
    sellFromSlot,
    getItemDef,
  } = useInventoryLogic({
    itemDefs,
    inventory,
    stats,
    baseInventorySlots,
    addCurrency,
  })

  const seedInventory = () => {
    seedInventoryItems.forEach((entry) => {
      addItem(entry.itemId, entry.amount)
    })
  }

  seedInventory()

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
    addActionLog,
    addProfessionLog,
    getItemQuantity,
    removeItem,
    addItem,
    getItemDef,
  })

  const {
    currentZone,
    maxHp,
    spawnEnemy,
    setZone,
    toggleCombat,
    toggleResting,
    runCombatTick,
  } = useCombatLogic({
    character,
    stats,
    skills,
    skillBonuses,
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
    addSkillExp,
    addStatExp,
    deactivateActions,
    deactivateProfessionActions,
  })

  playerHp.value = maxHp.value

  const { startTicker, stopTicker } = useTicker({
    paused,
    activeTask,
    playerHp,
    maxHp,
    stats,
    skillBonuses,
    tickMs,
    addCombatLog,
    runCombatTick,
    runIdleActions,
    runProfessionActions,
    spawnEnemy,
  })

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
    removeItem,
    getItemQuantity,
    sellFromSlot,
    getItemDef,
    zones,
    combat,
    combatRewards,
    combatLogs,
    professionLogs,
    actionLogs,
    playerHp,
    maxHp,
    statList,
    skillList,
    currentZone,
    skillBonuses,
    progressPercent,
    addCurrency,
    toggleCombat,
    toggleResting,
    toggleAction,
    toggleProfessionAction,
    setZone,
    addCombatLog,
    clearCombatLogs,
    addProfessionLog,
    clearProfessionLogs,
    addActionLog,
    clearActionLogs,
    startTicker,
    stopTicker,
  }
})
