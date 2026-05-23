import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { enemyDropTables } from './data'
import { computeExpToNext } from './experience'
import { formatCopperToCurrency } from './progression'
import type { SkillBonuses } from './progression'
import type {
  ActiveTask,
  CombatLogType,
  EnemyDropEntry,
  EnemyType,
  Skill,
  SkillKey,
  SpellDefinition,
  SpellProgress,
  Stat,
  StatKey,
  Zone,
} from './types'

export interface CombatState {
  zoneId: string
  enemyId: string
  enemyName: string
  enemyLevel: number
  enemyHp: number
  enemyMaxHp: number
  enemyPower: number
}

export interface CombatRewards {
  exp: number
  copper: number
  skillExp: number
  statExp: number
}

export interface CombatLogicDeps {
  character: { level: number }
  stats: Record<StatKey, Stat>
  skills: Record<SkillKey, Skill>
  skillBonuses: ComputedRef<SkillBonuses>
  spellDefinitions: SpellDefinition[]
  spellbook: Record<string, SpellProgress>
  selectedSpellId: Ref<string>
  zones: Zone[]
  combat: CombatState
  combatRewards: CombatRewards
  playerHp: Ref<number>
  activeTask: Ref<ActiveTask>
  defaultZone: Zone
  defaultEnemy: EnemyType
  addCombatLog: (type: CombatLogType, message: string) => void
  addCharacterExp: (amount: number) => void
  addCurrency: (copperGain?: number) => void
  addItem: (itemId: string, amount: number) => void
  getItemDef: (itemId: string) => { name: string } | undefined
  addSkillExp: (key: SkillKey, amount: number) => void
  addStatExp: (key: StatKey, amount: number) => void
  spendMana: (amount: number) => boolean
  deactivateActions: () => void
  deactivateProfessionActions: () => void
}

export interface ActiveBuff {
  id: string
  name: string
  remainingTicks: number
  combatDamageBonus: number
  damageReductionBonus: number
  spellPowerBonus: number
}

export const useCombatLogic = ({
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
}: CombatLogicDeps) => {
  const currentZone = computed((): Zone => zones.find((zone) => zone.id === combat.zoneId) ?? defaultZone)
  const maxHp = computed(() => Math.floor(character.level * 8 + stats.Vitality.value * 12))
  const activeBuffs = ref<ActiveBuff[]>([])
  const totalCombatDamageBuff = computed(() =>
    activeBuffs.value.reduce((total, buff) => total + buff.combatDamageBonus, 0),
  )
  const totalDamageReductionBuff = computed(() =>
    activeBuffs.value.reduce((total, buff) => total + buff.damageReductionBonus, 0),
  )
  const totalSpellPowerBuff = computed(() =>
    activeBuffs.value.reduce((total, buff) => total + buff.spellPowerBonus, 0),
  )
  const availableSpells = computed(() => spellDefinitions)
  const knownSpells = computed(() =>
    spellDefinitions.filter((spell) => spellbook[spell.id]?.learned),
  )
  const selectedSpell = computed(
    () => spellDefinitions.find((spell) => spell.id === selectedSpellId.value) ?? spellDefinitions[0],
  )
  const selectedSpellManaCost = computed(() => selectedSpell.value?.manaCost ?? 0)
  const currentEnemyDrops = computed<EnemyDropEntry[]>(() => enemyDropTables[combat.enemyId] ?? [])
  const currentEnemyDropPreview = computed(() =>
    currentEnemyDrops.value.map((drop) => {
      const chancePercent = Math.round(drop.chance * 100)
      if (drop.currency === 'copper') {
        return `${chancePercent}% ${formatCopperToCurrency(drop.amount)}`
      }
      const itemName = getItemDef(drop.itemId ?? '')?.name ?? drop.itemId ?? 'Unknown item'
      return `${chancePercent}% ${itemName} x${drop.amount}`
    }),
  )

  const setActiveTask = (type: ActiveTask['type']) => {
    activeTask.value = { type }
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
    combat.enemyId = enemy.id
    combat.enemyName = enemy.name
    combat.enemyPower = zone.basePower * enemy.powerFactor + level * 1.8
    combat.enemyMaxHp = baseHp
    combat.enemyHp = baseHp

    combatRewards.exp = Math.floor(zone.baseRewards.exp * rewardScale)
    combatRewards.copper = (enemyDropTables[enemy.id] ?? [])
      .filter((drop) => drop.currency === 'copper' && drop.chance >= 1)
      .reduce((total, drop) => total + drop.amount, 0)
    combatRewards.skillExp = Math.floor(zone.baseRewards.skillExp * rewardScale)
    combatRewards.statExp = Math.floor(zone.baseRewards.statExp * rewardScale)

    addCombatLog(
      'combat',
      `Encountered ${combat.enemyName} (Lv. ${combat.enemyLevel}) in ${zone.name}.`,
    )
  }

  const rollEnemyDrops = (enemyId: string) => {
    const drops = enemyDropTables[enemyId] ?? []
    const itemTotals = new Map<string, number>()
    let rawCopperTotal = 0

    drops.forEach((drop) => {
      const chance = Math.max(0, Math.min(1, drop.chance))
      if (Math.random() > chance) return

      if (drop.currency === 'copper') {
        rawCopperTotal += drop.amount
        return
      }

      if (!drop.itemId) return
      itemTotals.set(drop.itemId, (itemTotals.get(drop.itemId) ?? 0) + drop.amount)
    })

    return { itemTotals, rawCopperTotal }
  }

  const handleEnemyDefeated = () => {
    const { itemTotals, rawCopperTotal } = rollEnemyDrops(combat.enemyId)
    const appliedCopper = rawCopperTotal > 0
      ? Math.floor(rawCopperTotal * skillBonuses.value.currencyMultiplier)
      : 0

    if (rawCopperTotal > 0) {
      addCurrency(rawCopperTotal)
    }

    const dropSummary: string[] = []
    if (appliedCopper > 0) {
      dropSummary.push(`${formatCopperToCurrency(appliedCopper)}`)
    }

    itemTotals.forEach((amount, itemId) => {
      addItem(itemId, amount)
      const name = getItemDef(itemId)?.name ?? itemId
      dropSummary.push(`${name} x${amount}`)
    })

    const dropsText = dropSummary.length ? dropSummary.join(', ') : 'none'
    addCombatLog(
      'kill',
      `Defeated ${combat.enemyName} (Lv. ${combat.enemyLevel}). Rewards: +${combatRewards.exp} XP, Drops: ${dropsText}.`,
    )
    addCharacterExp(combatRewards.exp)
    addSkillExp('Combat', combatRewards.skillExp)
    addSkillExp('Survival', Math.floor(combatRewards.skillExp * 0.4))
    addStatExp('Strength', combatRewards.statExp)
    addStatExp('Agility', combatRewards.statExp)
    addStatExp('Vitality', combatRewards.statExp)
    spawnEnemy()
  }

  const setZone = (zoneId: string) => {
    combat.zoneId = zoneId
    spawnEnemy()
  }

  const spellExpToNext = (level: number) => {
    if (level >= 100) return 0
    return computeExpToNext(60, level, 1.15, 8)
  }

  const gainSpellExp = (spellId: string, amount: number) => {
    const progress = spellbook[spellId]
    if (!progress || !progress.learned || progress.level >= 100 || amount <= 0) return

    progress.exp += Math.floor(amount)
    while (progress.level < 100 && progress.exp >= progress.expToNext) {
      progress.exp -= progress.expToNext
      progress.level += 1
      progress.expToNext = spellExpToNext(progress.level)
    }

    if (progress.level >= 100) {
      progress.level = 100
      progress.exp = 0
      progress.expToNext = 0
    }
  }

  const learnSpell = (spellId: string) => {
    const spell = spellDefinitions.find((entry) => entry.id === spellId)
    if (!spell) return
    const progress = spellbook[spellId]
    if (!progress || progress.learned) return

    if (skills.Arcana.level < spell.requiredArcanaLevel) {
      addCombatLog(
        'system',
        `Cannot learn ${spell.name}. Requires Arcana level ${spell.requiredArcanaLevel}.`,
      )
      return
    }

    progress.learned = true
    progress.level = Math.max(1, progress.level)
    progress.exp = 0
    progress.expToNext = spellExpToNext(progress.level)
    addCombatLog('system', `Learned spell: ${spell.name}.`)
  }

  const setSelectedSpell = (spellId: string) => {
    const progress = spellbook[spellId]
    if (!progress?.learned) return
    selectedSpellId.value = spellId
  }

  const toggleCombat = () => {
    if (activeTask.value.type === 'combat') {
      setActiveTask('none')
      addCombatLog('combat', 'Combat stopped.')
      return
    }
    setActiveTask('combat')
    deactivateActions()
    deactivateProfessionActions()
    addCombatLog('combat', `Combat started in ${currentZone.value.name}.`)
  }

  const toggleResting = () => {
    if (activeTask.value.type === 'rest') {
      setActiveTask('none')
      addCombatLog('rest', 'Rest ended.')
      return
    }
    setActiveTask('rest')
    deactivateActions()
    deactivateProfessionActions()
    addCombatLog('rest', 'Resting to recover health.')
  }

  const runCombatTick = () => {
    if (activeTask.value.type !== 'combat') return
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
    const combatBonus = skillBonuses.value.combatDamageMultiplier * (1 + totalCombatDamageBuff.value)
    const damageReduction = Math.min(
      0.9,
      skillBonuses.value.combatDamageReduction + totalDamageReductionBuff.value,
    )

    const playerDamage = Math.max(
      1,
      Math.floor((playerPower - enemyPower * 0.5 + randomInt(0, 6)) * combatBonus),
    )
    combat.enemyHp = Math.max(0, combat.enemyHp - playerDamage)

    addCombatLog('damage', `You hit ${combat.enemyName} for ${playerDamage} damage.`)

    if (combat.enemyHp === 0) {
      handleEnemyDefeated()
      return
    }

    const mitigation = stats.Vitality.value * 0.8 + stats.Agility.value * 0.4
    const enemyDamageBase = Math.max(1, Math.floor(enemyPower - mitigation + randomInt(0, 4)))
    const enemyDamage = Math.max(1, Math.floor(enemyDamageBase * (1 - damageReduction)))
    playerHp.value = Math.max(0, playerHp.value - enemyDamage)

    addCombatLog('damage', `${combat.enemyName} hits you for ${enemyDamage} damage (received).`)

    if (playerHp.value === 0) {
      setActiveTask('rest')
      addCombatLog('combat', 'You are downed and begin resting.')
    }

    if (activeBuffs.value.length > 0) {
      const expired: string[] = []
      activeBuffs.value = activeBuffs.value
        .map((buff) => ({ ...buff, remainingTicks: buff.remainingTicks - 1 }))
        .filter((buff) => {
          if (buff.remainingTicks > 0) return true
          expired.push(buff.name)
          return false
        })

      expired.forEach((name) => addCombatLog('system', `${name} has faded.`))
    }
  }

  const castSelectedSpell = () => {
    if (activeTask.value.type !== 'combat') {
      addCombatLog('system', 'You can only cast spells during combat.')
      return
    }

    const spell = selectedSpell.value
    if (!spell) return
    const progress = spellbook[spell.id]
    if (!progress?.learned) {
      addCombatLog('system', `You have not learned ${spell.name}.`)
      return
    }

    if (spell.effectType === 'healing' && playerHp.value >= maxHp.value) {
      addCombatLog('system', `${spell.name} cannot be cast at full health.`)
      return
    }

    const spent = spendMana(spell.manaCost)
    if (!spent) {
      addCombatLog('system', `Not enough mana for ${spell.name}.`)
      return
    }

    const spellLevel = progress.level
    const rawPower =
      spell.baseDamage +
      spellLevel * spell.damagePerLevel +
      stats.Intelligence.value * spell.statScaling.intelligence +
      stats.Spirit.value * spell.statScaling.spirit +
      skills.Arcana.level * spell.skillScaling.arcana +
      skills.Combat.level * spell.skillScaling.combat +
      Math.random() * 4

    if (spell.effectType === 'healing') {
      const healAmount = Math.max(
        4,
        Math.floor(rawPower * skillBonuses.value.regenMultiplier),
      )
      playerHp.value = Math.min(maxHp.value, playerHp.value + healAmount)
      addCombatLog('rest', `${spell.name} restores ${healAmount} HP.`)
    } else if (spell.effectType === 'buff') {
      const profile = spell.buffProfile
      if (!profile) {
        addCombatLog('system', `${spell.name} has no buff profile configured.`)
        return
      }

      const levelFactor = 1 + progress.level * 0.01
      const arcanaFactor = 1 + skills.Arcana.level * 0.002
      const spiritFactor = 1 + stats.Spirit.value * 0.0015
      const scale = levelFactor * arcanaFactor * spiritFactor

      const appliedBuff: ActiveBuff = {
        id: spell.id,
        name: spell.name,
        remainingTicks: Math.max(1, Math.floor(profile.durationTicks + progress.level * 0.06)),
        combatDamageBonus: Math.min(0.5, (profile.combatDamageBonus ?? 0) * scale),
        damageReductionBonus: Math.min(0.4, (profile.damageReductionBonus ?? 0) * scale),
        spellPowerBonus: Math.min(0.5, (profile.spellPowerBonus ?? 0) * scale),
      }

      const existingIndex = activeBuffs.value.findIndex((buff) => buff.id === spell.id)
      if (existingIndex >= 0) {
        activeBuffs.value[existingIndex] = appliedBuff
      } else {
        activeBuffs.value.push(appliedBuff)
      }

      addCombatLog(
        'system',
        `${spell.name} empowers you for ${appliedBuff.remainingTicks} ticks (+${Math.round(appliedBuff.combatDamageBonus * 100)}% combat, +${Math.round(appliedBuff.spellPowerBonus * 100)}% spell, +${Math.round(appliedBuff.damageReductionBonus * 100)}% reduction).`,
      )
    } else {
      const bonusDamage = Math.max(
        6,
        Math.floor(rawPower * skillBonuses.value.combatDamageMultiplier * (1 + totalSpellPowerBuff.value)),
      )

      combat.enemyHp = Math.max(0, combat.enemyHp - bonusDamage)
      addCombatLog('damage', `${spell.name} hits ${combat.enemyName} for ${bonusDamage} spell damage.`)

      if (combat.enemyHp === 0) {
        handleEnemyDefeated()
      }
    }

    gainSpellExp(spell.id, spell.manaCost * 1.2 + combat.enemyLevel * 0.8)
    addSkillExp('Arcana', Math.max(2, Math.floor(spell.manaCost * 0.3)))
  }

  return {
    currentZone,
    currentEnemyDrops,
    currentEnemyDropPreview,
    activeBuffs,
    availableSpells,
    knownSpells,
    selectedSpell,
    selectedSpellManaCost,
    maxHp,
    spawnEnemy,
    setZone,
    toggleCombat,
    toggleResting,
    runCombatTick,
    learnSpell,
    setSelectedSpell,
    castSelectedSpell,
    restoreActiveBuffs: (buffs: ActiveBuff[]) => {
      activeBuffs.value = buffs.map((buff) => ({ ...buff }))
    },
    clearActiveBuffs: () => {
      activeBuffs.value = []
    },
  }
}
