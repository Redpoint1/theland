import { reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import { useInventoryLogic } from './inventory'
import type { InventorySlot, ItemDef, Stat, StatKey } from './types'

const statKeys: StatKey[] = ['Strength', 'Agility', 'Vitality', 'Spirit', 'Intelligence']

const createStats = (strength = 0) =>
  reactive(
    Object.fromEntries(
      statKeys.map((key) => [
        key,
        {
          name: key,
          value: key === 'Strength' ? strength : 0,
          exp: 0,
          expToNext: 100,
          baseExpToNext: 100,
          description: `${key} stat`,
        },
      ]),
    ) as Record<StatKey, Stat>,
  )

const createItemDefs = () =>
  reactive<Record<string, ItemDef>>({
    herb: {
      id: 'herb',
      name: 'Herb',
      quality: 'Common',
      type: 'Resource',
      subtype: 'Plant',
      description: 'Basic herb',
      maxStack: 5,
      priceCopper: 4,
    },
    ore: {
      id: 'ore',
      name: 'Ore',
      quality: 'Common',
      type: 'Resource',
      subtype: 'Metal',
      description: 'Basic ore',
      maxStack: 10,
      priceCopper: 15,
    },
  })

const createInventoryHarness = ({
  baseInventorySlots = 1,
  strength = 0,
  copper = 0,
}: {
  baseInventorySlots?: number
  strength?: number
  copper?: number
} = {}) => {
  const inventory = reactive<InventorySlot[]>([])
  const stats = createStats(strength)
  const itemDefs = createItemDefs()
  let currentCopper = copper

  return {
    inventory,
    getCopper: () => currentCopper,
    inventoryLogic: useInventoryLogic({
      itemDefs,
      inventory,
      stats,
      baseInventorySlots,
      addCurrency: (copperGain = 0) => {
        currentCopper += Math.max(0, Math.floor(copperGain))
      },
      spendCurrency: (copperCost = 0) => {
        const cost = Math.max(0, Math.floor(copperCost))
        if (currentCopper < cost) return false
        currentCopper -= cost
        return true
      },
      getCurrencyCopper: () => currentCopper,
    }),
  }
}

describe('inventory logic', () => {
  it('splits stacks and stops adding items when inventory capacity is full', () => {
    const { inventory, inventoryLogic } = createInventoryHarness({
      baseInventorySlots: 1,
      strength: 5,
    })

    expect(inventoryLogic.maxInventorySlots.value).toBe(2)
    expect(inventoryLogic.addItem('herb', 12)).toBe(10)
    expect(inventory.map((slot) => ({ itemId: slot.itemId, quantity: slot.quantity }))).toEqual([
      { itemId: 'herb', quantity: 5 },
      { itemId: 'herb', quantity: 5 },
    ])
  })

  it('limits purchases by affordability and rebuilds restored stacks from saved totals', () => {
    const purchaseHarness = createInventoryHarness({
      baseInventorySlots: 1,
      copper: 40,
    })

    expect(purchaseHarness.inventoryLogic.buyItem('ore', 5)).toBe(2)
    expect(purchaseHarness.getCopper()).toBe(10)
    expect(
      purchaseHarness.inventory.map((slot) => ({ itemId: slot.itemId, quantity: slot.quantity })),
    ).toEqual([{ itemId: 'ore', quantity: 2 }])

    const restoreHarness = createInventoryHarness({ baseInventorySlots: 5 })

    restoreHarness.inventoryLogic.restoreInventory([
      { id: 91, itemId: 'herb', quantity: 7 },
      { id: 92, itemId: 'herb', quantity: 4 },
      { id: 93, itemId: 'unknown', quantity: 8 },
      { id: 94, quantity: 2 },
    ])

    expect(
      restoreHarness.inventory.map((slot) => ({ id: slot.id, itemId: slot.itemId, quantity: slot.quantity })),
    ).toEqual([
      { id: 1, itemId: 'herb', quantity: 5 },
      { id: 2, itemId: 'herb', quantity: 5 },
      { id: 3, itemId: 'herb', quantity: 1 },
    ])
  })
})