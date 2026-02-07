import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'

export type StatKey = 'Strength' | 'Agility' | 'Vitality' | 'Spirit' | 'Intelligence'
export type SkillKey = 'Combat' | 'Survival' | 'Harvesting' | 'Crafting' | 'Arcana'
export type ProfessionKey = 'Mining' | 'Herbalism' | 'Smelting' | 'Alchemy'

export interface Stat {
  name: StatKey
  value: number
  exp: number
  expToNext: number
  description: string
}

export interface Skill {
  name: SkillKey
  level: number
  exp: number
  expToNext: number
  description: string
}

export interface Profession {
  name: ProfessionKey
  level: number
  exp: number
  expToNext: number
  description: string
  bonusLabel: string
  bonusPerLevel: number
}

export interface ProfessionAction {
  id: string
  profession: ProfessionKey
  name: string
  description: string
  requiredLevel: number
  active: boolean
  expGain: number
  rewards: Array<{ itemId: string; amount: number }>
}

export interface ActionGain {
  exp?: number
  stats?: Partial<Record<StatKey, number>>
  skills?: Partial<Record<SkillKey, number>>
  currency?: Partial<{ copper: number; silver: number; gold: number }>
}

export interface ActionItem {
  id: string
  name: string
  description: string
  active: boolean
  gains: ActionGain
}

export interface EnemyType {
  id: string
  name: string
  powerFactor: number
  hpFactor: number
  rewardFactor: number
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

const tickMs = 1000
const actionDurationMs = 5000

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

  const stats = reactive<Record<StatKey, Stat>>({
    Strength: {
      name: 'Strength',
      value: 8,
      exp: 0,
      expToNext: 90,
      description: 'Power, lifting, melee force.',
    },
    Agility: {
      name: 'Agility',
      value: 7,
      exp: 0,
      expToNext: 90,
      description: 'Speed, reflexes, dexterity.',
    },
    Vitality: {
      name: 'Vitality',
      value: 9,
      exp: 0,
      expToNext: 95,
      description: 'Health, stamina, endurance.',
    },
    Spirit: {
      name: 'Spirit',
      value: 6,
      exp: 0,
      expToNext: 100,
      description: 'Mana, willpower, recovery.',
    },
    Intelligence: {
      name: 'Intelligence',
      value: 7,
      exp: 0,
      expToNext: 100,
      description: 'Knowledge, crafting, tactics.',
    },
  })

  const skills = reactive<Record<SkillKey, Skill>>({
    Combat: {
      name: 'Combat',
      level: 0,
      exp: 0,
      expToNext: 60,
      description: 'Weapon handling and battle instincts.',
    },
    Survival: {
      name: 'Survival',
      level: 0,
      exp: 0,
      expToNext: 55,
      description: 'Tracking, foraging, fieldcraft.',
    },
    Harvesting: {
      name: 'Harvesting',
      level: 0,
      exp: 0,
      expToNext: 50,
      description: 'Gathering resources and loot.',
    },
    Crafting: {
      name: 'Crafting',
      level: 0,
      exp: 0,
      expToNext: 65,
      description: 'Making gear and supplies.',
    },
    Arcana: {
      name: 'Arcana',
      level: 0,
      exp: 0,
      expToNext: 70,
      description: 'Mana control and spellwork.',
    },
  })

  const professions = reactive<Record<ProfessionKey, Profession>>({
    Mining: {
      name: 'Mining',
      level: 0,
      exp: 0,
      expToNext: 50,
      description: 'Extract ore and crystals from the Land.',
      bonusLabel: 'Yield bonus',
      bonusPerLevel: 0.03,
    },
    Herbalism: {
      name: 'Herbalism',
      level: 0,
      exp: 0,
      expToNext: 50,
      description: 'Gather rare herbs and reagents.',
      bonusLabel: 'Yield bonus',
      bonusPerLevel: 0.03,
    },
    Smelting: {
      name: 'Smelting',
      level: 0,
      exp: 0,
      expToNext: 60,
      description: 'Refine ores into usable ingots.',
      bonusLabel: 'Output bonus',
      bonusPerLevel: 0.02,
    },
    Alchemy: {
      name: 'Alchemy',
      level: 0,
      exp: 0,
      expToNext: 60,
      description: 'Brew tonics and mana infusions.',
      bonusLabel: 'Potency bonus',
      bonusPerLevel: 0.02,
    },
  })

  const professionActions = reactive<ProfessionAction[]>([
    {
      id: 'mine-scrape',
      profession: 'Mining',
      name: 'Scrape the Vein',
      description: 'Chip away at exposed ore.',
      requiredLevel: 0,
      active: false,
      expGain: 4,
      rewards: [{ itemId: 'iron-ore', amount: 2 }],
    },
    {
      id: 'mine-deep',
      profession: 'Mining',
      name: 'Deep Vein',
      description: 'Push deeper for better ore.',
      requiredLevel: 6,
      active: false,
      expGain: 7,
      rewards: [
        { itemId: 'iron-ore', amount: 4 },
        { itemId: 'mana-crystal', amount: 1 },
      ],
    },
    {
      id: 'herb-forage',
      profession: 'Herbalism',
      name: 'Forage Mist Herbs',
      description: 'Collect common herbs near the village.',
      requiredLevel: 0,
      active: false,
      expGain: 4,
      rewards: [{ itemId: 'mist-herb', amount: 3 }],
    },
    {
      id: 'herb-night',
      profession: 'Herbalism',
      name: 'Night Bloom Hunt',
      description: 'Hunt rare blooms at dusk.',
      requiredLevel: 5,
      active: false,
      expGain: 6,
      rewards: [
        { itemId: 'mist-herb', amount: 5 },
        { itemId: 'mana-crystal', amount: 1 },
      ],
    },
    {
      id: 'smelt-iron',
      profession: 'Smelting',
      name: 'Smelt Iron',
      description: 'Refine ore into ingots.',
      requiredLevel: 0,
      active: false,
      expGain: 5,
      rewards: [{ itemId: 'iron-ingot', amount: 1 }],
    },
    {
      id: 'smelt-pure',
      profession: 'Smelting',
      name: 'Purify Ingots',
      description: 'Produce higher quality ingots.',
      requiredLevel: 7,
      active: false,
      expGain: 8,
      rewards: [{ itemId: 'iron-ingot', amount: 2 }],
    },
    {
      id: 'alchemy-tonic',
      profession: 'Alchemy',
      name: 'Brew Minor Tonic',
      description: 'Basic restorative mixture.',
      requiredLevel: 0,
      active: false,
      expGain: 5,
      rewards: [{ itemId: 'minor-elixir', amount: 1 }],
    },
    {
      id: 'alchemy-focus',
      profession: 'Alchemy',
      name: 'Focus Draught',
      description: 'Infuse a drink with mana.',
      requiredLevel: 8,
      active: false,
      expGain: 9,
      rewards: [
        { itemId: 'minor-elixir', amount: 2 },
        { itemId: 'mana-crystal', amount: 1 },
      ],
    },
  ])

  const idleActionProgress = ref(0)
  const professionActionProgress = ref(0)
  const idleActionJustCompleted = ref(false)
  const professionActionJustCompleted = ref(false)

  const actions = reactive<ActionItem[]>([
    {
      id: 'train-strength',
      name: 'Train Strength',
      description: 'Lift, strike, and grind power gains.',
      active: true,
      gains: {
        exp: 5,
        stats: { Strength: 7, Vitality: 3 },
        skills: { Combat: 3 },
        currency: { copper: 2 },
      },
    },
    {
      id: 'forest-run',
      name: 'Forest Run',
      description: 'Sprint and weave through the wilds.',
      active: false,
      gains: {
        exp: 4,
        stats: { Agility: 6, Vitality: 2 },
        skills: { Survival: 3 },
        currency: { copper: 1 },
      },
    },
    {
      id: 'meditate',
      name: 'Meditate',
      description: 'Focus the core and gather mana.',
      active: false,
      gains: {
        exp: 3,
        stats: { Spirit: 7, Intelligence: 3 },
        skills: { Arcana: 4 },
      },
    },
    {
      id: 'gather',
      name: 'Gather Herbs',
      description: 'Idle harvesting for simple income.',
      active: false,
      gains: {
        exp: 2,
        stats: { Agility: 2, Intelligence: 2 },
        skills: { Harvesting: 5 },
        currency: { copper: 6 },
      },
    },
    {
      id: 'craft',
      name: 'Craft Supplies',
      description: 'Turn finds into coin and skill.',
      active: false,
      gains: {
        exp: 3,
        stats: { Intelligence: 5 },
        skills: { Crafting: 5 },
        currency: { copper: 8 },
      },
    },
  ])

  const baseInventorySlots = 30
  let inventorySlotId = 0

  const itemDefs = reactive<Record<string, ItemDef>>({
    'mist-herb': {
      id: 'mist-herb',
      name: 'Mist Herb',
      quality: 'Common',
      type: 'Resource',
      subtype: 'Foraging',
      description: 'A fragrant herb used in basic potions.',
      maxStack: 50,
      priceCopper: 3,
    },
    'goblin-ear': {
      id: 'goblin-ear',
      name: 'Goblin Ear',
      quality: 'Uncommon',
      type: 'Quest',
      subtype: 'Trophy',
      description: 'Proof of a goblin raid defeated.',
      maxStack: 20,
      priceCopper: 8,
    },
    'iron-ore': {
      id: 'iron-ore',
      name: 'Iron Ore',
      quality: 'Common',
      type: 'Resource',
      subtype: 'Mining',
      description: 'Raw ore ready for smelting.',
      maxStack: 40,
      priceCopper: 6,
    },
    'mana-crystal': {
      id: 'mana-crystal',
      name: 'Mana Crystal',
      quality: 'Rare',
      type: 'Resource',
      subtype: 'Arcana',
      description: 'A crystal infused with condensed mana.',
      maxStack: 10,
      priceCopper: 45,
    },
    'leather-helm': {
      id: 'leather-helm',
      name: 'Leather Helm',
      quality: 'Common',
      type: 'Equip',
      subtype: 'Helm',
      description: 'Basic protection for the head.',
      maxStack: 1,
      priceCopper: 25,
    },
    'iron-ingot': {
      id: 'iron-ingot',
      name: 'Iron Ingot',
      quality: 'Uncommon',
      type: 'Resource',
      subtype: 'Smelting',
      description: 'Refined metal ready for crafting.',
      maxStack: 30,
      priceCopper: 16,
    },
    'minor-elixir': {
      id: 'minor-elixir',
      name: 'Minor Elixir',
      quality: 'Uncommon',
      type: 'Consumable',
      subtype: 'Alchemy',
      description: 'A simple potion that refreshes vitality.',
      maxStack: 10,
      priceCopper: 20,
    },
  })

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
    addItem('mist-herb', 12)
    addItem('goblin-ear', 3)
    addItem('iron-ore', 18)
    addItem('mana-crystal', 2)
    addItem('leather-helm', 1)
  }

  seedInventory()

  const zones = reactive<Zone[]>([
    {
      id: 'mist-outskirts',
      name: 'Mist Village Outskirts',
      description: 'Wolves and bandits prowl the village edge.',
      levelMin: 1,
      levelMax: 5,
      basePower: 6,
      baseRewards: { exp: 16, copper: 10, skillExp: 6, statExp: 3 },
      enemies: [
        { id: 'wolf', name: 'Wild Wolf', powerFactor: 0.9, hpFactor: 0.9, rewardFactor: 0.9 },
        { id: 'bandit', name: 'Bandit Scout', powerFactor: 1.0, hpFactor: 1.0, rewardFactor: 1.0 },
        { id: 'boar', name: 'Dire Boar', powerFactor: 1.1, hpFactor: 1.15, rewardFactor: 1.1 },
      ],
    },
    {
      id: 'mist-forest',
      name: 'Mist Forest',
      description: 'Dense woods with lurking goblins.',
      levelMin: 4,
      levelMax: 8,
      basePower: 10,
      baseRewards: { exp: 22, copper: 14, skillExp: 7, statExp: 3 },
      enemies: [
        { id: 'goblin', name: 'Forest Goblin', powerFactor: 1.0, hpFactor: 0.95, rewardFactor: 1.0 },
        { id: 'stalker', name: 'Mist Stalker', powerFactor: 1.1, hpFactor: 1.05, rewardFactor: 1.1 },
        { id: 'spider', name: 'Shadow Spider', powerFactor: 0.95, hpFactor: 1.0, rewardFactor: 0.95 },
      ],
    },
    {
      id: 'river-delle',
      name: 'River Delle',
      description: 'River spirits and crocodiles contest the banks.',
      levelMin: 7,
      levelMax: 12,
      basePower: 14,
      baseRewards: { exp: 28, copper: 18, skillExp: 8, statExp: 4 },
      enemies: [
        { id: 'croc', name: 'River Croc', powerFactor: 1.05, hpFactor: 1.15, rewardFactor: 1.1 },
        { id: 'sprite', name: 'River Sprite', powerFactor: 0.9, hpFactor: 0.85, rewardFactor: 0.9 },
        { id: 'lurker', name: 'Marsh Lurker', powerFactor: 1.0, hpFactor: 1.0, rewardFactor: 1.0 },
      ],
    },
    {
      id: 'goblin-warrens',
      name: 'Goblin Warrens',
      description: 'Tunnels under the hills, crawling with goblins.',
      levelMin: 10,
      levelMax: 15,
      basePower: 18,
      baseRewards: { exp: 34, copper: 24, skillExp: 10, statExp: 4 },
      enemies: [
        { id: 'raider', name: 'Goblin Raider', powerFactor: 1.0, hpFactor: 1.0, rewardFactor: 1.0 },
        { id: 'shaman', name: 'Goblin Shaman', powerFactor: 1.1, hpFactor: 0.95, rewardFactor: 1.1 },
        { id: 'brute', name: 'Goblin Brute', powerFactor: 1.2, hpFactor: 1.15, rewardFactor: 1.2 },
      ],
    },
    {
      id: 'shadow-fen',
      name: 'Shadow Fen',
      description: 'Swamp mists hide venom and undead.',
      levelMin: 14,
      levelMax: 20,
      basePower: 22,
      baseRewards: { exp: 40, copper: 30, skillExp: 12, statExp: 5 },
      enemies: [
        { id: 'stalker', name: 'Fen Stalker', powerFactor: 1.05, hpFactor: 1.0, rewardFactor: 1.05 },
        { id: 'bogwraith', name: 'Bog Wraith', powerFactor: 1.15, hpFactor: 0.9, rewardFactor: 1.15 },
        { id: 'slime', name: 'Toxic Slime', powerFactor: 0.95, hpFactor: 1.2, rewardFactor: 0.95 },
      ],
    },
    {
      id: 'darkwood',
      name: 'Darkwood',
      description: 'Ancient trees and shadow beasts.',
      levelMin: 18,
      levelMax: 25,
      basePower: 26,
      baseRewards: { exp: 48, copper: 36, skillExp: 14, statExp: 5 },
      enemies: [
        { id: 'lynx', name: 'Shadow Lynx', powerFactor: 1.05, hpFactor: 0.95, rewardFactor: 1.05 },
        { id: 'treant', name: 'Darkwood Treant', powerFactor: 1.2, hpFactor: 1.2, rewardFactor: 1.2 },
        { id: 'shade', name: 'Night Shade', powerFactor: 1.0, hpFactor: 0.9, rewardFactor: 1.0 },
      ],
    },
    {
      id: 'stonefist-range',
      name: 'Stonefist Range',
      description: 'Rocky passes and ogre patrols.',
      levelMin: 22,
      levelMax: 30,
      basePower: 30,
      baseRewards: { exp: 58, copper: 44, skillExp: 16, statExp: 6 },
      enemies: [
        { id: 'ogre', name: 'Ogre Brute', powerFactor: 1.2, hpFactor: 1.25, rewardFactor: 1.2 },
        { id: 'bear', name: 'Stone Bear', powerFactor: 1.0, hpFactor: 1.1, rewardFactor: 1.0 },
        { id: 'raider', name: 'Cliff Raider', powerFactor: 1.05, hpFactor: 0.95, rewardFactor: 1.05 },
      ],
    },
    {
      id: 'silverpine-forest',
      name: 'Silverpine Forest',
      description: 'Silver bark and fey hunters.',
      levelMin: 26,
      levelMax: 34,
      basePower: 34,
      baseRewards: { exp: 66, copper: 52, skillExp: 18, statExp: 6 },
      enemies: [
        { id: 'fey', name: 'Fey Tracker', powerFactor: 1.05, hpFactor: 0.95, rewardFactor: 1.05 },
        { id: 'stag', name: 'Silver Stag', powerFactor: 0.95, hpFactor: 1.0, rewardFactor: 0.95 },
        { id: 'warden', name: 'Grove Warden', powerFactor: 1.15, hpFactor: 1.1, rewardFactor: 1.15 },
      ],
    },
    {
      id: 'great-plains',
      name: 'Great Plains',
      description: 'Stampedes and roaming beast packs.',
      levelMin: 30,
      levelMax: 38,
      basePower: 38,
      baseRewards: { exp: 74, copper: 60, skillExp: 20, statExp: 7 },
      enemies: [
        { id: 'ripper', name: 'Plains Ripper', powerFactor: 1.1, hpFactor: 1.0, rewardFactor: 1.1 },
        { id: 'hornbeast', name: 'Thunderhorn', powerFactor: 1.2, hpFactor: 1.2, rewardFactor: 1.2 },
        { id: 'scavenger', name: 'Sky Scavenger', powerFactor: 0.95, hpFactor: 0.9, rewardFactor: 0.95 },
      ],
    },
    {
      id: 'ashen-barrens',
      name: 'Ashen Barrens',
      description: 'Scorched earth and ash drakes.',
      levelMin: 34,
      levelMax: 42,
      basePower: 42,
      baseRewards: { exp: 84, copper: 70, skillExp: 22, statExp: 7 },
      enemies: [
        { id: 'drake', name: 'Ash Drake', powerFactor: 1.2, hpFactor: 1.1, rewardFactor: 1.25 },
        { id: 'cinder', name: 'Cinder Hound', powerFactor: 1.0, hpFactor: 0.95, rewardFactor: 1.0 },
        { id: 'pyre', name: 'Pyre Elemental', powerFactor: 1.15, hpFactor: 1.2, rewardFactor: 1.2 },
      ],
    },
    {
      id: 'sunken-ruins',
      name: 'Sunken Ruins',
      description: 'Ancient halls submerged in mana tides.',
      levelMin: 38,
      levelMax: 46,
      basePower: 46,
      baseRewards: { exp: 94, copper: 82, skillExp: 24, statExp: 8 },
      enemies: [
        { id: 'sentinel', name: 'Ruins Sentinel', powerFactor: 1.15, hpFactor: 1.2, rewardFactor: 1.2 },
        { id: 'warden', name: 'Abyss Warden', powerFactor: 1.1, hpFactor: 1.0, rewardFactor: 1.1 },
        { id: 'eel', name: 'Mana Eel', powerFactor: 0.95, hpFactor: 0.9, rewardFactor: 0.95 },
      ],
    },
    {
      id: 'thunder-steppe',
      name: 'Thunder Steppe',
      description: 'Storm-charged beasts and lightning spirits.',
      levelMin: 42,
      levelMax: 50,
      basePower: 50,
      baseRewards: { exp: 104, copper: 94, skillExp: 26, statExp: 8 },
      enemies: [
        { id: 'charger', name: 'Storm Charger', powerFactor: 1.2, hpFactor: 1.1, rewardFactor: 1.2 },
        { id: 'sprite', name: 'Lightning Sprite', powerFactor: 0.95, hpFactor: 0.85, rewardFactor: 0.95 },
        { id: 'howler', name: 'Thunder Howler', powerFactor: 1.1, hpFactor: 1.05, rewardFactor: 1.1 },
      ],
    },
    {
      id: 'wyvern-cliffs',
      name: 'Wyvern Cliffs',
      description: 'Sheer cliffs ruled by winged predators.',
      levelMin: 46,
      levelMax: 54,
      basePower: 54,
      baseRewards: { exp: 116, copper: 110, skillExp: 28, statExp: 9 },
      enemies: [
        { id: 'wyvern', name: 'Cliff Wyvern', powerFactor: 1.2, hpFactor: 1.15, rewardFactor: 1.2 },
        { id: 'harpy', name: 'Sky Harpy', powerFactor: 1.05, hpFactor: 0.9, rewardFactor: 1.05 },
        { id: 'eagle', name: 'Ridge Eagle', powerFactor: 0.95, hpFactor: 0.85, rewardFactor: 0.95 },
      ],
    },
    {
      id: 'crystal-caverns',
      name: 'Crystal Caverns',
      description: 'Glittering tunnels, razor crystal beasts.',
      levelMin: 50,
      levelMax: 60,
      basePower: 60,
      baseRewards: { exp: 130, copper: 128, skillExp: 30, statExp: 9 },
      enemies: [
        { id: 'maw', name: 'Crystal Maw', powerFactor: 1.2, hpFactor: 1.2, rewardFactor: 1.2 },
        { id: 'shard', name: 'Shardling', powerFactor: 0.9, hpFactor: 0.9, rewardFactor: 0.9 },
        { id: 'golem', name: 'Crystal Golem', powerFactor: 1.25, hpFactor: 1.3, rewardFactor: 1.25 },
      ],
    },
    {
      id: 'obsidian-badlands',
      name: 'Obsidian Badlands',
      description: 'Black glass dunes and fireborne.',
      levelMin: 56,
      levelMax: 66,
      basePower: 66,
      baseRewards: { exp: 144, copper: 150, skillExp: 32, statExp: 10 },
      enemies: [
        { id: 'hound', name: 'Obsidian Hound', powerFactor: 1.15, hpFactor: 1.05, rewardFactor: 1.15 },
        { id: 'basilisk', name: 'Glass Basilisk', powerFactor: 1.25, hpFactor: 1.2, rewardFactor: 1.25 },
        { id: 'raider', name: 'Ash Raider', powerFactor: 1.0, hpFactor: 0.95, rewardFactor: 1.0 },
      ],
    },
    {
      id: 'ancient-grove',
      name: 'Ancient Grove',
      description: 'World trees guarded by elder spirits.',
      levelMin: 62,
      levelMax: 72,
      basePower: 72,
      baseRewards: { exp: 160, copper: 176, skillExp: 34, statExp: 10 },
      enemies: [
        { id: 'guardian', name: 'Grove Guardian', powerFactor: 1.2, hpFactor: 1.25, rewardFactor: 1.2 },
        { id: 'archon', name: 'Ancient Archon', powerFactor: 1.3, hpFactor: 1.1, rewardFactor: 1.3 },
        { id: 'sprite', name: 'Verdant Sprite', powerFactor: 0.95, hpFactor: 0.9, rewardFactor: 0.95 },
      ],
    },
    {
      id: 'frostfang-peaks',
      name: 'Frostfang Peaks',
      description: 'Frozen passes and ice-tusk beasts.',
      levelMin: 68,
      levelMax: 78,
      basePower: 78,
      baseRewards: { exp: 178, copper: 204, skillExp: 36, statExp: 11 },
      enemies: [
        { id: 'tusk', name: 'Frost Tusk', powerFactor: 1.2, hpFactor: 1.2, rewardFactor: 1.2 },
        { id: 'yeti', name: 'Ice Yeti', powerFactor: 1.3, hpFactor: 1.3, rewardFactor: 1.3 },
        { id: 'wisp', name: 'Frost Wisp', powerFactor: 0.9, hpFactor: 0.85, rewardFactor: 0.9 },
      ],
    },
    {
      id: 'bloodmoon-marsh',
      name: 'Bloodmoon Marsh',
      description: 'Cursed waters and moonlit predators.',
      levelMin: 74,
      levelMax: 84,
      basePower: 84,
      baseRewards: { exp: 196, copper: 236, skillExp: 38, statExp: 11 },
      enemies: [
        { id: 'stalker', name: 'Bloodmoon Stalker', powerFactor: 1.25, hpFactor: 1.1, rewardFactor: 1.25 },
        { id: 'wraith', name: 'Marsh Wraith', powerFactor: 1.15, hpFactor: 0.95, rewardFactor: 1.15 },
        { id: 'lurker', name: 'Moonlit Lurker', powerFactor: 1.05, hpFactor: 1.05, rewardFactor: 1.05 },
      ],
    },
    {
      id: 'celestial-ridge',
      name: 'Celestial Ridge',
      description: 'High ridges infused with star mana.',
      levelMin: 80,
      levelMax: 92,
      basePower: 92,
      baseRewards: { exp: 218, copper: 270, skillExp: 40, statExp: 12 },
      enemies: [
        { id: 'warden', name: 'Celestial Warden', powerFactor: 1.25, hpFactor: 1.2, rewardFactor: 1.25 },
        { id: 'saber', name: 'Star Saber', powerFactor: 1.15, hpFactor: 1.0, rewardFactor: 1.15 },
        { id: 'seer', name: 'Ridge Seer', powerFactor: 1.05, hpFactor: 0.95, rewardFactor: 1.05 },
      ],
    },
    {
      id: 'dragons-spine',
      name: "Dragon's Spine",
      description: 'The apex range where elder wyrms rule.',
      levelMin: 88,
      levelMax: 100,
      basePower: 100,
      baseRewards: { exp: 240, copper: 320, skillExp: 44, statExp: 12 },
      enemies: [
        { id: 'scion', name: 'Wyrm Scion', powerFactor: 1.3, hpFactor: 1.25, rewardFactor: 1.3 },
        { id: 'ancient', name: 'Ancient Drake', powerFactor: 1.35, hpFactor: 1.3, rewardFactor: 1.35 },
        { id: 'wyrmling', name: 'Feral Wyrmling', powerFactor: 1.15, hpFactor: 1.05, rewardFactor: 1.15 },
      ],
    },
  ])

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
    if (professionActionJustCompleted.value) {
      professionActionJustCompleted.value = false
      professionActionProgress.value = 0
    }
    professionActionProgress.value += tickMs
    if (professionActionProgress.value >= actionDurationMs) {
      professionActionProgress.value = actionDurationMs
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
