import { computed } from 'vue'
import type {
  Profession,
  ProfessionKey,
  Skill,
  SkillKey,
  Stat,
  StatKey,
} from './types'
import { computeExpToNext } from './experience'

export interface CurrencyState {
  copper: number
}

export interface CurrencyBreakdown {
  copper: number
  silver: number
  gold: number
}

export interface CharacterState {
  level: number
  exp: number
  expToNext: number
  baseExpToNext: number
}

export interface SkillBonuses {
  combatDamageMultiplier: number
  combatDamageReduction: number
  regenMultiplier: number
  expMultiplier: number
  currencyMultiplier: number
}

export interface ProgressionDeps {
  character: CharacterState
  currency: CurrencyState
  stats: Record<StatKey, Stat>
  skills: Record<SkillKey, Skill>
  professions: Record<ProfessionKey, Profession>
}

export const useProgressionLogic = ({
  character,
  currency,
  stats,
  skills,
  professions,
}: ProgressionDeps) => {
  const characterExpToNext = (level: number) =>
    computeExpToNext(character.baseExpToNext, level, 1.18, 50)

  const statExpToNext = (stat: Stat) =>
    computeExpToNext(stat.baseExpToNext, stat.value, 1.2, 15)

  const skillExpToNext = (skill: Skill) =>
    computeExpToNext(skill.baseExpToNext, skill.level, 1.22, 10)

  const professionExpToNext = (profession: Profession) =>
    computeExpToNext(profession.baseExpToNext, profession.level, 1.25, 15)
  const statList = computed(() => Object.values(stats))
  const skillList = computed(() => Object.values(skills))
  const professionList = computed(() => Object.values(professions))

  const skillBonuses = computed<SkillBonuses>(() => {
    return {
      combatDamageMultiplier: 1 + skills.Combat.level * 0.05,
      combatDamageReduction: Math.min(0.8, skills.Combat.level * 0.05),
      regenMultiplier: 1 + skills.Survival.level * 0.02,
      expMultiplier: 1 + skills.Arcana.level * 0.02,
      currencyMultiplier:
        1 + skills.Crafting.level * 0.01 + skills.Harvesting.level * 0.01,
    }
  })

  const currencyBreakdown = computed<CurrencyBreakdown>(() => {
    const total = Math.max(0, Math.floor(currency.copper))
    const gold = Math.floor(total / 10000)
    const silver = Math.floor((total % 10000) / 100)
    const copper = total % 100
    return { gold, silver, copper }
  })

  const addCurrency = (copperGain = 0) => {
    if (!copperGain) return
    const bonus = skillBonuses.value.currencyMultiplier
    currency.copper += Math.floor(copperGain * bonus)
  }

  const addCharacterExp = (amount: number) => {
    const bonus = skillBonuses.value.expMultiplier
    character.exp += Math.floor(amount * bonus)
    let levelsGained = 0
    while (character.exp >= character.expToNext) {
      character.exp -= character.expToNext
      character.level += 1
      levelsGained += 1
      character.expToNext = characterExpToNext(character.level)
    }
    return levelsGained
  }

  const addStatExp = (key: StatKey, amount: number) => {
    const stat = stats[key]
    stat.exp += amount
    while (stat.exp >= stat.expToNext) {
      stat.exp -= stat.expToNext
      stat.value += 1
      stat.expToNext = statExpToNext(stat)
    }
  }

  const addSkillExp = (key: SkillKey, amount: number) => {
    const skill = skills[key]
    skill.exp += amount
    while (skill.exp >= skill.expToNext) {
      skill.exp -= skill.expToNext
      skill.level += 1
      skill.expToNext = skillExpToNext(skill)
    }
  }

  const addProfessionExp = (key: ProfessionKey, amount: number) => {
    const profession = professions[key]
    profession.exp += amount
    while (profession.exp >= profession.expToNext) {
      profession.exp -= profession.expToNext
      profession.level += 1
      profession.expToNext = professionExpToNext(profession)
    }
  }

  return {
    statList,
    skillList,
    professionList,
    skillBonuses,
    currencyBreakdown,
    addCurrency,
    addCharacterExp,
    addStatExp,
    addSkillExp,
    addProfessionExp,
  }
}
