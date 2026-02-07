<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore, type InventorySlot, type ItemQuality } from '../stores/game'

const game = useGameStore()
const { inventorySlots, maxInventorySlots, usedInventorySlots } = storeToRefs(game)
const { getItemDef } = game

const sortKey = ref<'name' | 'quality' | 'amount' | 'price'>('name')
const sortDir = ref<'asc' | 'desc'>('asc')

const qualityRank: Record<ItemQuality, number> = {
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  Epic: 4,
}

const sortedSlots = computed(() => {
  const slots = [...inventorySlots.value]
  const dir = sortDir.value === 'asc' ? 1 : -1
  return slots.sort((a, b) => {
    const aDef = a.itemId ? getItemDef(a.itemId) : undefined
    const bDef = b.itemId ? getItemDef(b.itemId) : undefined
    if (!aDef && !bDef) return 0
    if (!aDef) return 1
    if (!bDef) return -1

    let aValue = ''
    let bValue = ''

    switch (sortKey.value) {
      case 'quality':
        return (qualityRank[aDef.quality] - qualityRank[bDef.quality]) * dir
      case 'amount':
        return (a.quantity - b.quantity) * dir
      case 'price':
        return (aDef.priceCopper - bDef.priceCopper) * dir
      case 'name':
      default:
        aValue = aDef.name
        bValue = bDef.name
        return aValue.localeCompare(bValue) * dir
    }
  })
})

const sellAmounts: Array<number | 'all'> = [1, 10, 100, 1000, 'all']
const canSell = (slot: InventorySlot) => slot.itemId && slot.quantity > 0
</script>

<template>
  <main class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">The Land: Inventory</p>
        <h1>Pack & Loot</h1>
        <p class="subtitle">
          Inventory size scales with Strength. Stack, sort, and sell items for coin.
        </p>
      </div>
      <div class="hero-actions">
        <div class="tick">Slots: {{ usedInventorySlots }} / {{ maxInventorySlots }}</div>
      </div>
    </header>

    <section class="grid">
      <div class="panel inventory">
        <div class="combat-header">
          <div>
            <h2>Inventory</h2>
            <div class="item-desc">
              Slots: {{ usedInventorySlots }} / {{ maxInventorySlots }}
            </div>
          </div>
          <div class="inventory-sort">
            <label>
              Sort by
              <select v-model="sortKey">
                <option value="name">Name</option>
                <option value="quality">Quality</option>
                <option value="amount">Amount</option>
                <option value="price">Price</option>
              </select>
            </label>
            <label>
              Order
              <select v-model="sortDir">
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
            </label>
          </div>
        </div>

        <div class="inventory-grid">
          <div v-for="slot in sortedSlots" :key="slot.id" class="inventory-card">
            <div v-if="slot.itemId" class="inventory-item">
              <div class="inventory-header">
                <div>
                  <div class="item-title">{{ getItemDef(slot.itemId)?.name }}</div>
                  <div class="item-desc">
                    {{ getItemDef(slot.itemId)?.type }} · {{ getItemDef(slot.itemId)?.subtype }}
                  </div>
                </div>
                <div class="inventory-qty">x{{ slot.quantity }}</div>
              </div>
              <div class="inventory-meta">
                <div class="inventory-quality">{{ getItemDef(slot.itemId)?.quality }}</div>
                <div class="inventory-price">
                  {{ getItemDef(slot.itemId)?.priceCopper }}c
                </div>
              </div>
              <div class="inventory-actions">
                <button
                  v-for="amount in sellAmounts"
                  :key="amount"
                  class="toggle"
                  :disabled="!canSell(slot)"
                  @click="game.sellFromSlot(slot.id, amount)"
                >
                  Sell {{ amount === 'all' ? 'All' : amount }}
                </button>
              </div>
              <div class="inventory-tooltip">
                <div class="tooltip-title">{{ getItemDef(slot.itemId)?.name }}</div>
                <div class="tooltip-body">{{ getItemDef(slot.itemId)?.description }}</div>
                <div class="tooltip-meta">
                  Stack: {{ getItemDef(slot.itemId)?.maxStack }} ·
                  {{ getItemDef(slot.itemId)?.type }} / {{ getItemDef(slot.itemId)?.subtype }}
                </div>
              </div>
            </div>
            <div v-else class="inventory-empty">Empty Slot</div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
