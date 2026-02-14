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
  ActionItem,
  EnemyType,
  InventorySlot,
  ItemDef,
  Profession,
  ProfessionAction,
  ProfessionKey,
  Skill,
  SkillKey,
  SpellDefinition,
  SpellProgress,
  Stat,
  StatKey,
  Zone,
} from './game/types'
import { useActionLogic } from './game/actions'
import { useCombatLogic } from './game/combat'
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

export const useGameStore = defineStore('game', () => {
  const paused = ref(false)

  const character = reactive({
    level: 1,
    exp: 0,
    expToNext: 120,
    baseExpToNext: 120,
  })

  const currency = reactive({
    copper: 25,
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
  const spellDefinitions = reactive<SpellDefinition[]>(createSpellDefinitions())
  const spellbook = reactive<Record<string, SpellProgress>>(
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
    ),
  )
  const selectedSpellId = ref('arcane-burst')

  const defaultZone = zones[0]!
  const defaultEnemy: EnemyType = defaultZone.enemies[0]!

  const combat = reactive({
    zoneId: defaultZone.id,
    enemyId: defaultEnemy.id,
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
  const mana = ref(0)

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
  const statAllocations = reactive<Record<StatKey, number>>({
    Strength: 0,
    Agility: 0,
    Vitality: 0,
    Spirit: 0,
    Intelligence: 0,
  })

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

  playerHp.value = maxHp.value
  mana.value = maxMana.value

  const { startTicker, stopTicker } = useTicker({
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
    startTicker,
    stopTicker,
  }
})
