export type StatKey = 'Strength' | 'Agility' | 'Vitality' | 'Spirit' | 'Intelligence'
export type SkillKey = 'Combat' | 'Survival' | 'Harvesting' | 'Crafting' | 'Arcana'
export type ProfessionKey = 'Mining' | 'Herbalism' | 'Smelting' | 'Alchemy'

export interface ProfessionRankTier {
  name: string
  minLevel: number
  bonusMultiplier: number
}

export interface Stat {
  name: StatKey
  value: number
  exp: number
  expToNext: number
  baseExpToNext: number
  description: string
}

export interface Skill {
  name: SkillKey
  level: number
  exp: number
  expToNext: number
  baseExpToNext: number
  description: string
}

export interface Profession {
  name: ProfessionKey
  level: number
  exp: number
  expToNext: number
  baseExpToNext: number
  maxLevel: number
  description: string
  bonusLabel: string
  bonusPerLevel: number
  rankTiers: [ProfessionRankTier, ...ProfessionRankTier[]]
}

export interface ProfessionAction {
  id: string
  profession: ProfessionKey
  name: string
  description: string
  requiredLevel: number
  expGain: number
  inputs?: Array<{ itemId: string; amount: number }>
  rewards: Array<{ itemId: string; amount: number }>
}

export interface ActionGain {
  exp?: number
  stats?: Partial<Record<StatKey, number>>
  skills?: Partial<Record<SkillKey, number>>
  currency?: number
}

export interface ActionItem {
  id: string
  name: string
  description: string
  manaCost?: number
  gains: ActionGain
}

export type ActiveTaskType = 'none' | 'idle' | 'profession' | 'combat' | 'rest'

export interface ActiveTask {
  type: ActiveTaskType
  actionId?: string
}

export interface EnemyType {
  id: string
  name: string
  powerFactor: number
  hpFactor: number
  rewardFactor: number
}

export interface EnemyDropEntry {
  chance: number
  amount: number
  itemId?: string
  currency?: 'copper'
}

export interface SpellDefinition {
  id: string
  name: string
  description: string
  effectType: 'damage' | 'healing' | 'buff'
  maxLevel: number
  requiredArcanaLevel: number
  manaCost: number
  baseDamage: number
  damagePerLevel: number
  statScaling: {
    intelligence: number
    spirit: number
  }
  skillScaling: {
    arcana: number
    combat: number
  }
  buffProfile?: {
    durationTicks: number
    combatDamageBonus?: number
    damageReductionBonus?: number
    spellPowerBonus?: number
  }
}

export interface SpellProgress {
  id: string
  learned: boolean
  level: number
  exp: number
  expToNext: number
}

export type ItemQuality = 'Common' | 'Uncommon' | 'Rare' | 'Epic'
export type ItemType = 'Equip' | 'Resource' | 'Consumable' | 'Quest'

export interface ItemDef {
  id: string
  name: string
  quality: ItemQuality
  type: ItemType
  subtype: string
  description: string
  effectDescription?: string
  maxStack: number
  priceCopper: number
}

export interface InventorySlot {
  id: number
  itemId?: string
  quantity: number
}

export type CombatLogType = 'combat' | 'damage' | 'kill' | 'rest' | 'system'
export type ProfessionLogType = 'action' | 'reward' | 'system'
export type ActionLogType = 'action' | 'reward' | 'system'

export interface CombatLogEntry {
  id: number
  timestamp: number
  type: CombatLogType
  message: string
}

export interface ProfessionLogEntry {
  id: number
  timestamp: number
  type: ProfessionLogType
  message: string
}

export interface ActionLogEntry {
  id: number
  timestamp: number
  type: ActionLogType
  message: string
}

export interface Zone {
  id: string
  name: string
  description: string
  levelMin: number
  levelMax: number
  basePower: number
  baseRewards: {
    exp: number
    copper: number
    skillExp: number
    statExp: number
  }
  enemies: [EnemyType, ...EnemyType[]]
}

export interface SeedItem {
  itemId: string
  amount: number
}
