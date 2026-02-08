import { computed } from 'vue'
import type {
  Profession,
  ProfessionKey,
  Skill,
  SkillKey,
  Stat,
  StatKey,
} from './types'

export interface CurrencyState {
  copper: number
  silver: number
  gold: number
}

export interface CharacterState {
  level: number
  exp: number
  expToNext: number
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

  const addCurrency = (gain?: Partial<CurrencyState>) => {
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

  return {
    statList,
    skillList,
    professionList,
    skillBonuses,
    normalizeCurrency,
    addCurrency,
    addCharacterExp,
    addStatExp,
    addSkillExp,
    addProfessionExp,
  }
}
