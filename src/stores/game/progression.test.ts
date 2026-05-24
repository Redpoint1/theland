import { reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  formatCopperToCurrency,
  useProgressionLogic,
  type CharacterState,
  type CurrencyState,
} from './progression'
import type { Profession, ProfessionKey, Skill, SkillKey, Stat, StatKey } from './types'

const statKeys: StatKey[] = ['Strength', 'Agility', 'Vitality', 'Spirit', 'Intelligence']
const skillKeys: SkillKey[] = ['Combat', 'Survival', 'Harvesting', 'Crafting', 'Arcana']
const professionKeys: ProfessionKey[] = ['Mining', 'Herbalism', 'Smelting', 'Alchemy']

const createStats = () =>
  reactive(
    Object.fromEntries(
      statKeys.map((key) => [
        key,
        {
          name: key,
          value: 1,
          exp: 0,
          expToNext: 100,
          baseExpToNext: 100,
          description: `${key} stat`,
        },
      ]),
    ) as Record<StatKey, Stat>,
  )

const createSkills = () =>
  reactive(
    Object.fromEntries(
      skillKeys.map((key) => [
        key,
        {
          name: key,
          level: 0,
          exp: 0,
          expToNext: 100,
          baseExpToNext: 100,
          description: `${key} skill`,
        },
      ]),
    ) as Record<SkillKey, Skill>,
  )

const createProfessions = () =>
  reactive(
    Object.fromEntries(
      professionKeys.map((key) => [
        key,
        {
          name: key,
          level: 1,
          exp: 0,
          expToNext: 100,
          baseExpToNext: 100,
          maxLevel: 5,
          description: `${key} profession`,
          bonusLabel: 'Yield',
          bonusPerLevel: 0.05,
          rankTiers: [{ name: 'Novice', minLevel: 1, bonusMultiplier: 1 }],
        },
      ]),
    ) as Record<ProfessionKey, Profession>,
  )

const createProgressionHarness = () => {
  const character = reactive<CharacterState>({
    level: 1,
    exp: 0,
    expToNext: 120,
    baseExpToNext: 120,
  })
  const currency = reactive<CurrencyState>({ copper: 0 })
  const stats = createStats()
  const skills = createSkills()
  const professions = createProfessions()

  return {
    character,
    currency,
    stats,
    skills,
    professions,
    progression: useProgressionLogic({
      character,
      currency,
      stats,
      skills,
      professions,
    }),
  }
}

describe('progression helpers', () => {
  it('formats copper into condensed and expanded currency strings', () => {
    expect(formatCopperToCurrency(12345)).toBe('1g 23s 45c')
    expect(formatCopperToCurrency(45, { showAllUnits: true })).toBe('0g 0s 45c')
  })

  it('applies Arcana experience bonus and carries excess character exp into the next level', () => {
    const { character, skills, progression } = createProgressionHarness()

    skills.Arcana.level = 5

    expect(progression.addCharacterExp(110)).toBe(1)
    expect(character.level).toBe(2)
    expect(character.exp).toBe(1)
    expect(character.expToNext).toBe(191)
  })

  it('floors spending costs and clamps professions at their max level', () => {
    const { currency, professions, progression } = createProgressionHarness()

    currency.copper = 150
    expect(progression.spendCurrency(49.9)).toBe(true)
    expect(currency.copper).toBe(101)
    expect(progression.spendCurrency(200)).toBe(false)
    expect(currency.copper).toBe(101)

    professions.Mining.level = 2
    professions.Mining.exp = 95
    professions.Mining.expToNext = 100
    professions.Mining.maxLevel = 3

    progression.addProfessionExp('Mining', 10)

    expect(professions.Mining.level).toBe(3)
    expect(professions.Mining.exp).toBe(0)
    expect(professions.Mining.expToNext).toBe(0)
  })
})