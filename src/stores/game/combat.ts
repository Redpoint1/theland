import { computed, type ComputedRef, type Ref } from 'vue'
import type { CurrencyState, SkillBonuses } from './progression'
import type {
  CombatLogType,
  EnemyType,
  Skill,
  SkillKey,
  Stat,
  StatKey,
  Zone,
} from './types'

export interface CombatState {
  active: boolean
  resting: boolean
  zoneId: string
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
  zones: Zone[]
  combat: CombatState
  combatRewards: CombatRewards
  playerHp: Ref<number>
  defaultZone: Zone
  defaultEnemy: EnemyType
  addCombatLog: (type: CombatLogType, message: string) => void
  addCharacterExp: (amount: number) => void
  addCurrency: (gain?: Partial<CurrencyState>) => void
  addSkillExp: (key: SkillKey, amount: number) => void
  addStatExp: (key: StatKey, amount: number) => void
  deactivateActions: () => void
  deactivateProfessionActions: () => void
}

export const useCombatLogic = ({
  character,
  stats,
  skills,
  skillBonuses,
  zones,
  combat,
  combatRewards,
  playerHp,
  defaultZone,
  defaultEnemy,
  addCombatLog,
  addCharacterExp,
  addCurrency,
  addSkillExp,
  addStatExp,
  deactivateActions,
  deactivateProfessionActions,
}: CombatLogicDeps) => {
  const currentZone = computed((): Zone => zones.find((zone) => zone.id === combat.zoneId) ?? defaultZone)
  const maxHp = computed(() => Math.floor(character.level * 8 + stats.Vitality.value * 12))

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

  return {
    currentZone,
    maxHp,
    spawnEnemy,
    setZone,
    toggleCombat,
    toggleResting,
    runCombatTick,
  }
}
