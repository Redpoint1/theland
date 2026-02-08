import { computed } from 'vue'
import type { CurrencyState } from './progression'
import type { InventorySlot, ItemDef, Stat, StatKey } from './types'

export interface InventoryDeps {
  itemDefs: Record<string, ItemDef>
  inventory: InventorySlot[]
  stats: Record<StatKey, Stat>
  baseInventorySlots: number
  addCurrency: (gain?: Partial<CurrencyState>) => void
}

export const useInventoryLogic = ({
  itemDefs,
  inventory,
  stats,
  baseInventorySlots,
  addCurrency,
}: InventoryDeps) => {
  let inventorySlotId = 0

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

  return {
    maxInventorySlots,
    inventorySlots,
    usedInventorySlots,
    addItem,
    removeItem,
    getItemQuantity,
    sellFromSlot,
    getItemDef,
  }
}
