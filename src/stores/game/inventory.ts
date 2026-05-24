import { computed } from 'vue'
import type { InventorySlot, ItemDef, Stat, StatKey } from './types'

export interface InventoryDeps {
  itemDefs: Record<string, ItemDef>
  inventory: InventorySlot[]
  stats: Record<StatKey, Stat>
  baseInventorySlots: number
  addCurrency: (copperGain?: number) => void
  spendCurrency: (copperCost?: number) => boolean
  getCurrencyCopper: () => number
}

export const useInventoryLogic = ({
  itemDefs,
  inventory,
  stats,
  baseInventorySlots,
  addCurrency,
  spendCurrency,
  getCurrencyCopper,
}: InventoryDeps) => {
  let inventorySlotId = 0

  const rebaseInventorySlotId = (slots: InventorySlot[] = inventory) => {
    inventorySlotId = slots.reduce((maxId, slot) => Math.max(maxId, slot.id), 0)
  }

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

  const maxInventorySlots = computed(
    () => baseInventorySlots + Math.floor(stats.Strength.value / 5),
  )

  const getItemQuantity = (itemId: string) =>
    inventory.reduce((total, slot) => (slot.itemId === itemId ? total + slot.quantity : total), 0)

  const restoreInventory = (slots: InventorySlot[]) => {
    const totals = new Map<string, number>()

    slots.forEach((slot) => {
      if (!slot.itemId) return
      const quantity = Math.max(0, Math.floor(slot.quantity))
      if (quantity <= 0) return
      totals.set(slot.itemId, (totals.get(slot.itemId) ?? 0) + quantity)
    })

    inventory.splice(0, inventory.length)
    inventorySlotId = 0

    totals.forEach((quantity, itemId) => {
      const def = getItemDef(itemId)
      if (!def) return

      let remaining = quantity
      while (remaining > 0) {
        const stackQuantity = Math.min(def.maxStack, remaining)
        inventory.push(createSlot(itemId, stackQuantity))
        remaining -= stackQuantity
      }
    })
  }

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

  const getAddableAmount = (itemId: string, amount: number) => {
    const def = getItemDef(itemId)
    if (!def || amount <= 0) return 0

    const stackSpace = inventory
      .filter((slot) => slot.itemId === itemId)
      .reduce((total, slot) => total + Math.max(0, def.maxStack - slot.quantity), 0)

    const remainingAfterStacks = Math.max(0, amount - stackSpace)
    if (remainingAfterStacks <= 0) return amount

    const emptySlots = Math.max(0, maxInventorySlots.value - inventory.length)
    const newSlotCapacity = emptySlots * def.maxStack
    const addableFromNewSlots = Math.min(remainingAfterStacks, newSlotCapacity)
    return amount - (remainingAfterStacks - addableFromNewSlots)
  }

  const addItem = (itemId: string, amount: number) => {
    const def = getItemDef(itemId)
    if (!def || amount <= 0) return 0

    let remaining = amount
    let added = 0
    while (remaining > 0) {
      let slot =
        def.maxStack > 1
          ? inventory.find((entry) => entry.itemId === itemId && entry.quantity < def.maxStack)
          : undefined

      if (!slot) {
        if (inventory.length >= maxInventorySlots.value) return added
        slot = createSlot(itemId, 0)
        inventory.push(slot)
      }

      const space = def.maxStack - slot.quantity
      const addNow = Math.min(space, remaining)
      slot.quantity += addNow
      remaining -= addNow
      added += addNow
    }

    return added
  }

  const buyItem = (itemId: string, amount: number) => {
    const def = getItemDef(itemId)
    if (!def || amount <= 0) return 0

    const affordable = Math.floor(getCurrencyCopper() / def.priceCopper)
    const addable = getAddableAmount(itemId, amount)
    const purchaseQty = Math.min(amount, affordable, addable)
    if (purchaseQty <= 0) return 0

    const totalCost = purchaseQty * def.priceCopper
    if (!spendCurrency(totalCost)) return 0

    return addItem(itemId, purchaseQty)
  }

  const sellFromSlot = (slotId: number, amount: number | 'all') => {
    const slot = inventory.find((entry) => entry.id === slotId)
    if (!slot || !slot.itemId) return
    const def = getItemDef(slot.itemId)
    if (!def) return

    const sellQty = amount === 'all' ? slot.quantity : Math.min(slot.quantity, amount)
    if (sellQty <= 0) return
    slot.quantity -= sellQty
    addCurrency(sellQty * def.priceCopper)

    if (slot.quantity <= 0) {
      const index = inventory.findIndex((entry) => entry.id === slotId)
      if (index >= 0) inventory.splice(index, 1)
    }
  }

  const consumeFromSlot = (slotId: number, amount = 1) => {
    const slot = inventory.find((entry) => entry.id === slotId)
    if (!slot || !slot.itemId || amount <= 0) return undefined
    const consumeQty = Math.min(slot.quantity, amount)
    if (consumeQty <= 0) return undefined
    const consumedItemId = slot.itemId
    slot.quantity -= consumeQty

    if (slot.quantity <= 0) {
      const index = inventory.findIndex((entry) => entry.id === slotId)
      if (index >= 0) inventory.splice(index, 1)
    }

    return consumedItemId
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

  return {
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
    restoreInventory,
    rebaseInventorySlotId,
  }
}
