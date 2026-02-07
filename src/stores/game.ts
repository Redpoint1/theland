import { computed, reactive, ref } from 'vue'
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

export type {
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

  const idleActionProgress = ref(0)
  const professionActionProgress = ref(0)
  const idleActionJustCompleted = ref(false)
  const professionActionJustCompleted = ref(false)

  const actions = reactive<ActionItem[]>(createActions())

  const baseInventorySlots = 30
  let inventorySlotId = 0

  const itemDefs = reactive<Record<string, ItemDef>>(createItemDefs())

  const inventory = reactive<InventorySlot[]>([])

  const maxInventorySlots = computed(
    () => baseInventorySlots + Math.floor(stats.Strength.value / 5),
  )

  const getItemDef = (itemId: string) => itemDefs[itemId]

  const createSlot = (itemId?: string, quantity = 0): InventorySlot => ({
    id: (inventorySlotId += 1),
    itemId,
    quantity,
  })

  const createEmptySlot = (index: number): InventorySlot => ({
    id: -(index + 1),
    quantity: 0,
  })

  const getItemQuantity = (itemId: string) =>
    inventory.reduce((total, slot) => (slot.itemId === itemId ? total + slot.quantity : total), 0)

  const removeItem = (itemId: string, amount: number) => {
    let remaining = amount
    for (let i = inventory.length - 1; i >= 0; i -= 1) {
      const slot = inventory[i]
      if (!slot || slot.itemId !== itemId) continue
      const take = Math.min(slot.quantity, remaining)
      slot.quantity -= take
      remaining -= take
      if (slot.quantity <= 0) {
        inventory.splice(i, 1)
      }
      if (remaining <= 0) break
    }
    return remaining <= 0
  }

  const addItem = (itemId: string, amount: number) => {
    const def = getItemDef(itemId)
    if (!def) return

    let remaining = amount
    while (remaining > 0) {
      let slot =
        def.maxStack > 1
          ? inventory.find((entry) => entry.itemId === itemId && entry.quantity < def.maxStack)
          : undefined

      if (!slot) {
        if (inventory.length >= maxInventorySlots.value) return
        slot = createSlot(itemId, 0)
        inventory.push(slot)
      }

      const space = def.maxStack - slot.quantity
      const addNow = Math.min(space, remaining)
      slot.quantity += addNow
      remaining -= addNow
    }
  }

  const sellFromSlot = (slotId: number, amount: number | 'all') => {
    const slot = inventory.find((entry) => entry.id === slotId)
    if (!slot || !slot.itemId) return
    const def = getItemDef(slot.itemId)
    if (!def) return

    const sellQty = amount === 'all' ? slot.quantity : Math.min(slot.quantity, amount)
    if (sellQty <= 0) return
    slot.quantity -= sellQty
    addCurrency({ copper: sellQty * def.priceCopper })

    if (slot.quantity <= 0) {
      const index = inventory.findIndex((entry) => entry.id === slotId)
      if (index >= 0) inventory.splice(index, 1)
    }
  }

  const inventorySlots = computed<InventorySlot[]>(() => {
    const slots = [...inventory]
    const emptyCount = Math.max(0, maxInventorySlots.value - slots.length)
    for (let i = 0; i < emptyCount; i += 1) {
      slots.push(createEmptySlot(i))
    }
    return slots
  })

  const usedInventorySlots = computed(() => inventory.length)

  const seedInventory = () => {
    seedInventoryItems.forEach((entry) => {
      addItem(entry.itemId, entry.amount)
    })
  }

  seedInventory()

  const zones = reactive<Zone[]>(createZones())

  const statList = computed(() => Object.values(stats))
  const skillList = computed(() => Object.values(skills))
  const professionList = computed(() => Object.values(professions))

  const skillBonuses = computed(() => {
    return {
      combatDamageMultiplier: 1 + skills.Combat.level * 0.05,
      combatDamageReduction: Math.min(0.8, skills.Combat.level * 0.05),
      regenMultiplier: 1 + skills.Survival.level * 0.02,
      expMultiplier: 1 + skills.Arcana.level * 0.02,
      currencyMultiplier:
        1 + skills.Crafting.level * 0.01 + skills.Harvesting.level * 0.01,
    }
  })

  const defaultZone = zones[0]!

  const defaultEnemy: EnemyType = defaultZone.enemies[0]!

  const combat = reactive({
    active: false,
    resting: false,
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

  const combatLogs = ref<CombatLogEntry[]>([])
  let combatLogId = 0

  const professionLogs = ref<ProfessionLogEntry[]>([])
  let professionLogId = 0

  const actionLogs = ref<ActionLogEntry[]>([])
  let actionLogId = 0

  const addCombatLog = (type: CombatLogType, message: string) => {
    combatLogs.value.push({
      id: (combatLogId += 1),
      timestamp: Date.now(),
      type,
      message,
    })

    if (combatLogs.value.length > 1000) {
      combatLogs.value.splice(0, combatLogs.value.length - 1000)
    }
  }

  const addProfessionLog = (type: ProfessionLogType, message: string) => {
    professionLogs.value.push({
      id: (professionLogId += 1),
      timestamp: Date.now(),
      type,
      message,
    })

    if (professionLogs.value.length > 500) {
      professionLogs.value.splice(0, professionLogs.value.length - 500)
    }
  }

  const addActionLog = (type: ActionLogType, message: string) => {
    actionLogs.value.push({
      id: (actionLogId += 1),
      timestamp: Date.now(),
      type,
      message,
    })

    if (actionLogs.value.length > 500) {
      actionLogs.value.splice(0, actionLogs.value.length - 500)
    }
  }

  const clearCombatLogs = () => {
    combatLogs.value = []
  }

  const clearProfessionLogs = () => {
    professionLogs.value = []
  }

  const clearActionLogs = () => {
    actionLogs.value = []
  }

  const currentZone = computed((): Zone => zones.find((zone) => zone.id === combat.zoneId) ?? defaultZone)
  const maxHp = computed(() => Math.floor(character.level * 8 + stats.Vitality.value * 12))
  const playerHp = ref(maxHp.value)

  const progressPercent = (current: number, max: number) =>
    Math.min(100, Math.floor((current / Math.max(1, max)) * 100))

  const normalizeCurrency = () => {
    if (currency.copper >= 100) {
      currency.silver += Math.floor(currency.copper / 100)
      currency.copper = currency.copper % 100
    }
    if (currency.silver >= 100) {
      currency.gold += Math.floor(currency.silver / 100)
      currency.silver = currency.silver % 100
    }
  }

  const addCurrency = (gain?: Partial<{ copper: number; silver: number; gold: number }>) => {
    if (!gain) return
    const bonus = skillBonuses.value.currencyMultiplier
    currency.copper += Math.floor((gain.copper ?? 0) * bonus)
    currency.silver += Math.floor((gain.silver ?? 0) * bonus)
    currency.gold += Math.floor((gain.gold ?? 0) * bonus)
    normalizeCurrency()
  }

  const addCharacterExp = (amount: number) => {
    const bonus = skillBonuses.value.expMultiplier
    character.exp += Math.floor(amount * bonus)
    while (character.exp >= character.expToNext) {
      character.exp -= character.expToNext
      character.level += 1
      character.expToNext = Math.floor(character.expToNext * 1.18 + 50)
      statList.value.forEach((stat) => {
        stat.value += 1
      })
    }
  }

  const addStatExp = (key: StatKey, amount: number) => {
    const stat = stats[key]
    stat.exp += amount
    while (stat.exp >= stat.expToNext) {
      stat.exp -= stat.expToNext
      stat.value += 1
      stat.expToNext = Math.floor(stat.expToNext * 1.2 + 15)
    }
  }

  const addSkillExp = (key: SkillKey, amount: number) => {
    const skill = skills[key]
    skill.exp += amount
    while (skill.exp >= skill.expToNext) {
      skill.exp -= skill.expToNext
      skill.level += 1
      skill.expToNext = Math.floor(skill.expToNext * 1.22 + 10)
    }
  }

  const addProfessionExp = (key: ProfessionKey, amount: number) => {
    const profession = professions[key]
    profession.exp += amount
    while (profession.exp >= profession.expToNext) {
      profession.exp -= profession.expToNext
      profession.level += 1
      profession.expToNext = Math.floor(profession.expToNext * 1.25 + 15)
    }
  }

  const isIdleActionActive = computed(() => actions.some((action) => action.active))
  const isProfessionActionActive = computed(() =>
    professionActions.some((action) => action.active),
  )

  const applyIdleGains = (action: ActionItem) => {
    if (action.gains.exp) {
      addCharacterExp(action.gains.exp)
    }
    if (action.gains.stats) {
      Object.entries(action.gains.stats).forEach(([key, amount]) => {
        addStatExp(key as StatKey, amount ?? 0)
      })
    }
    if (action.gains.skills) {
      Object.entries(action.gains.skills).forEach(([key, amount]) => {
        addSkillExp(key as SkillKey, amount ?? 0)
      })
    }
    if (action.gains.currency) {
      addCurrency(action.gains.currency)
    }
  }

  const randomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min

  const pickEnemy = (zone: Zone): EnemyType => {
    if (!zone.enemies.length) {
      addCombatLog('system', `No enemies configured for ${zone.name}.`)
      return defaultEnemy
    }
    const index = Math.floor(Math.random() * zone.enemies.length)
    return zone.enemies[index] ?? zone.enemies[0]
  }

  const spawnEnemy = () => {
    const zone = currentZone.value
    const enemy = pickEnemy(zone)
    const level = randomInt(zone.levelMin, zone.levelMax)
    const baseHp = Math.floor(level * 10 * enemy.hpFactor + zone.basePower * 4)
    const rewardScale = (1 + level * 0.06) * enemy.rewardFactor

    combat.enemyLevel = level
    combat.enemyName = enemy.name
    combat.enemyPower = zone.basePower * enemy.powerFactor + level * 1.8
    combat.enemyMaxHp = baseHp
    combat.enemyHp = baseHp

    combatRewards.exp = Math.floor(zone.baseRewards.exp * rewardScale)
    combatRewards.copper = Math.floor(zone.baseRewards.copper * rewardScale)
    combatRewards.skillExp = Math.floor(zone.baseRewards.skillExp * rewardScale)
    combatRewards.statExp = Math.floor(zone.baseRewards.statExp * rewardScale)

    addCombatLog(
      'combat',
      `Encountered ${combat.enemyName} (Lv. ${combat.enemyLevel}) in ${zone.name}.`,
    )
  }

  const setZone = (zoneId: string) => {
    combat.zoneId = zoneId
    spawnEnemy()
  }

  const deactivateActions = () => {
    actions.forEach((action) => {
      action.active = false
    })
  }

  const deactivateProfessionActions = () => {
    professionActions.forEach((action) => {
      action.active = false
    })
  }

  const toggleCombat = () => {
    combat.active = !combat.active
    if (combat.active) {
      combat.resting = false
      deactivateActions()
      deactivateProfessionActions()
      addCombatLog('combat', `Combat started in ${currentZone.value.name}.`)
    } else {
      addCombatLog('combat', 'Combat stopped.')
    }
  }

  const toggleResting = () => {
    combat.resting = !combat.resting
    if (combat.resting) {
      combat.active = false
      deactivateActions()
      deactivateProfessionActions()
      addCombatLog('rest', 'Resting to recover health.')
    } else {
      addCombatLog('rest', 'Rest ended.')
    }
  }

  const formatActionRewards = (action: ActionItem) => {
    const summary: string[] = []

    if (action.gains.exp) {
      const expGain = Math.floor(action.gains.exp * skillBonuses.value.expMultiplier)
      summary.push(`+${expGain} XP`)
    }

    if (action.gains.stats) {
      Object.entries(action.gains.stats).forEach(([key, amount]) => {
        if ((amount ?? 0) > 0) summary.push(`+${amount} ${key} XP`)
      })
    }

    if (action.gains.skills) {
      Object.entries(action.gains.skills).forEach(([key, amount]) => {
        if ((amount ?? 0) > 0) summary.push(`+${amount} ${key} XP`)
      })
    }

    if (action.gains.currency) {
      const bonus = skillBonuses.value.currencyMultiplier
      const gold = Math.floor((action.gains.currency.gold ?? 0) * bonus)
      const silver = Math.floor((action.gains.currency.silver ?? 0) * bonus)
      const copper = Math.floor((action.gains.currency.copper ?? 0) * bonus)
      if (gold) summary.push(`+${gold}g`)
      if (silver) summary.push(`+${silver}s`)
      if (copper) summary.push(`+${copper}c`)
    }

    return summary.length ? summary.join(', ') : 'no rewards'
  }

  const getMissingInputs = (action: ProfessionAction) => {
    if (!action.inputs || action.inputs.length === 0) return []
    return action.inputs
      .map((input) => {
        const available = getItemQuantity(input.itemId)
        if (available >= input.amount) return null
        const name = getItemDef(input.itemId)?.name ?? input.itemId
        return `${name} x${input.amount - available}`
      })
      .filter((entry): entry is string => !!entry)
  }

  const toggleAction = (action: ActionItem) => {
    if (combat.active || combat.resting) {
      addActionLog('system', 'Cannot start idle actions during combat or rest.')
      return
    }
    const previousActive = actions.find((item) => item.active)
    actions.forEach((item) => {
      item.active = item.id === action.id ? !action.active : false
    })
    idleActionProgress.value = 0
    idleActionJustCompleted.value = false
    const activated = actions.find((item) => item.id === action.id)?.active
    if (previousActive && previousActive.id !== action.id) {
      addActionLog('action', `Stopped ${previousActive.name}.`)
    }
    if (activated) {
      addActionLog('action', `Started ${action.name}.`)
      combat.active = false
      combat.resting = false
      deactivateProfessionActions()
    } else {
      addActionLog('action', `Stopped ${action.name}.`)
    }
  }

  const runCombatTick = () => {
    if (!combat.active) return
    if (combat.enemyHp <= 0) {
      spawnEnemy()
    }

    const playerPower =
      character.level * 2 +
      stats.Strength.value * 1.4 +
      stats.Agility.value * 1.1 +
      skills.Combat.level * 2 +
      stats.Spirit.value * 0.4
    const enemyPower = combat.enemyPower
    const combatBonus = skillBonuses.value.combatDamageMultiplier
    const damageReduction = skillBonuses.value.combatDamageReduction

    const playerDamage = Math.max(
      1,
      Math.floor((playerPower - enemyPower * 0.5 + randomInt(0, 6)) * combatBonus),
    )
    combat.enemyHp = Math.max(0, combat.enemyHp - playerDamage)

    addCombatLog('damage', `You hit ${combat.enemyName} for ${playerDamage} damage.`)

    if (combat.enemyHp === 0) {
      const rewardSummary = `+${combatRewards.exp} XP, +${combatRewards.copper}c`
      addCombatLog(
        'kill',
        `Defeated ${combat.enemyName} (Lv. ${combat.enemyLevel}). Rewards: ${rewardSummary}.`,
      )
      addCharacterExp(combatRewards.exp)
      addCurrency({ copper: combatRewards.copper })
      addSkillExp('Combat', combatRewards.skillExp)
      addSkillExp('Survival', Math.floor(combatRewards.skillExp * 0.4))
      addStatExp('Strength', combatRewards.statExp)
      addStatExp('Agility', combatRewards.statExp)
      addStatExp('Vitality', combatRewards.statExp)
      spawnEnemy()
      return
    }

    const mitigation = stats.Vitality.value * 0.8 + stats.Agility.value * 0.4
    const enemyDamageBase = Math.max(1, Math.floor(enemyPower - mitigation + randomInt(0, 4)))
    const enemyDamage = Math.max(1, Math.floor(enemyDamageBase * (1 - damageReduction)))
    playerHp.value = Math.max(0, playerHp.value - enemyDamage)

    addCombatLog('damage', `${combat.enemyName} hits you for ${enemyDamage} damage (received).`)

    if (playerHp.value === 0) {
      combat.active = false
      combat.resting = true
      addCombatLog('combat', 'You are downed and begin resting.')
    }
  }

  const runIdleActions = () => {
    if (combat.active || combat.resting) return
    const active = actions.find((action) => action.active)
    if (!active) {
      idleActionProgress.value = 0
      idleActionJustCompleted.value = false
      return
    }
    if (idleActionJustCompleted.value) {
      idleActionJustCompleted.value = false
      idleActionProgress.value = 0
    }
    idleActionProgress.value += tickMs
    if (idleActionProgress.value >= actionDurationMs) {
      idleActionProgress.value = actionDurationMs
      applyIdleGains(active)
      addActionLog('reward', `Completed ${active.name}. ${formatActionRewards(active)}.`)
      idleActionJustCompleted.value = true
    }
  }

  const toggleProfessionAction = (action: ProfessionAction) => {
    const profession = professions[action.profession]
    if (profession.level < action.requiredLevel) {
      addProfessionLog(
        'system',
        `${action.name} requires ${action.profession} level ${action.requiredLevel}.`,
      )
      return
    }
    const missingInputs = getMissingInputs(action)
    if (missingInputs.length > 0) {
      addProfessionLog(
        'system',
        `Cannot start ${action.name} - missing ${missingInputs.join(', ')}.`,
      )
      return
    }
    const previousActive = professionActions.find((item) => item.active)
    const nextActive = !action.active
    professionActions.forEach((item) => {
      item.active = item.id === action.id ? nextActive : false
    })
    professionActionProgress.value = 0
    professionActionJustCompleted.value = false
    if (previousActive && previousActive.id !== action.id) {
      addProfessionLog('action', `Stopped ${previousActive.name}.`)
    }
    if (nextActive) {
      addProfessionLog('action', `Started ${action.name}.`)
      combat.active = false
      combat.resting = false
      deactivateActions()
    } else {
      addProfessionLog('action', `Stopped ${action.name}.`)
    }
  }

  const professionBonuses = computed(() => {
    return {
      Mining: 1 + professions.Mining.level * professions.Mining.bonusPerLevel,
      Herbalism: 1 + professions.Herbalism.level * professions.Herbalism.bonusPerLevel,
      Smelting: 1 + professions.Smelting.level * professions.Smelting.bonusPerLevel,
      Alchemy: 1 + professions.Alchemy.level * professions.Alchemy.bonusPerLevel,
    }
  })

  const runProfessionActions = () => {
    if (combat.active || combat.resting || isIdleActionActive.value) return
    const active = professionActions.find((action) => action.active)
    if (!active) {
      professionActionProgress.value = 0
      professionActionJustCompleted.value = false
      return
    }
    const missingInputs = getMissingInputs(active)
    if (missingInputs.length > 0) {
      active.active = false
      professionActionProgress.value = 0
      professionActionJustCompleted.value = false
      addProfessionLog(
        'system',
        `Stopped ${active.name} - missing ${missingInputs.join(', ')}.`,
      )
      return
    }
    if (professionActionJustCompleted.value) {
      professionActionJustCompleted.value = false
      professionActionProgress.value = 0
    }
    professionActionProgress.value += tickMs
    if (professionActionProgress.value >= actionDurationMs) {
      professionActionProgress.value = actionDurationMs
      if (active.inputs && active.inputs.length > 0) {
        const hasAllInputs = active.inputs.every(
          (input) => getItemQuantity(input.itemId) >= input.amount,
        )
        if (!hasAllInputs) {
          active.active = false
          professionActionProgress.value = 0
          professionActionJustCompleted.value = false
          addProfessionLog(
            'system',
            `Stopped ${active.name} - missing required inputs.`,
          )
          return
        }
        active.inputs.forEach((input) => {
          removeItem(input.itemId, input.amount)
        })
      }
      const bonus = professionBonuses.value[active.profession]
      addProfessionExp(active.profession, active.expGain)
      const rewardSummary: string[] = []
      active.rewards.forEach((reward) => {
        const boosted = reward.amount * bonus
        const baseAmount = Math.floor(boosted)
        const remainder = boosted - baseAmount
        const extraItemChance = bonus - 1
        const extra = remainder > 0 && Math.random() < extraItemChance ? 1 : 0
        const total = baseAmount + extra
        if (total > 0) {
          addItem(reward.itemId, total)
          const name = getItemDef(reward.itemId)?.name ?? reward.itemId
          rewardSummary.push(`${name} x${total}`)
        }
      })
      const rewardsText = rewardSummary.length ? rewardSummary.join(', ') : 'no items'
      addProfessionLog(
        'reward',
        `Completed ${active.name}. +${active.expGain} ${active.profession} XP, ${rewardsText}.`,
      )
      professionActionJustCompleted.value = true
    }
  }

  const runTick = () => {
    if (paused.value) return
    if (playerHp.value > maxHp.value) {
      playerHp.value = maxHp.value
    }

    if (combat.resting && playerHp.value < maxHp.value) {
      const regenBase = Math.max(2, Math.floor(stats.Spirit.value * 1.2 + stats.Vitality.value * 0.4))
      const regen = Math.floor(regenBase * skillBonuses.value.regenMultiplier)
      playerHp.value = Math.min(maxHp.value, playerHp.value + regen)
      addCombatLog('rest', `Recovered ${regen} HP.`)
      if (playerHp.value >= maxHp.value) {
        combat.resting = false
        addCombatLog('rest', 'Fully recovered.')
      }
    } else if (!combat.active && playerHp.value < maxHp.value) {
      const regenBase = Math.max(1, Math.floor(stats.Spirit.value * 0.6))
      const regen = Math.floor(regenBase * skillBonuses.value.regenMultiplier)
      playerHp.value = Math.min(maxHp.value, playerHp.value + regen)
    }

    runCombatTick()
    runIdleActions()
    runProfessionActions()
  }

  let timer: number | undefined

  const startTicker = () => {
    if (timer) return
    spawnEnemy()
    timer = window.setInterval(runTick, tickMs)
  }

  const stopTicker = () => {
    if (!timer) return
    window.clearInterval(timer)
    timer = undefined
  }

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
