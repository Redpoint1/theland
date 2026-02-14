<script setup lang="ts">
import { computed } from 'vue'
import type { InventorySlot, ItemDef } from '../stores/game'
import InfoTooltip from './InfoTooltip.vue'

const props = defineProps<{
  slot: InventorySlot
  sellAmounts: Array<number | 'all'>
  getItemDef: (itemId: string) => ItemDef | undefined
}>()

const emit = defineEmits<{
  (e: 'sell', slotId: number, amount: number | 'all'): void
  (e: 'use', slotId: number): void
}>()

const itemDef = computed(() =>
  props.slot.itemId ? props.getItemDef(props.slot.itemId) : undefined,
)

const canSell = computed(() => !!props.slot.itemId && props.slot.quantity > 0)
const canUse = computed(() => canSell.value && itemDef.value?.type === 'Consumable')
</script>

<template>
  <div class="inventory-card">
    <div v-if="itemDef" class="inventory-item">
      <div class="inventory-header">
        <div>
          <InfoTooltip teleport max-width="520px" placement="bottom" align="left">
            <template #trigger>
              <div class="item-title">{{ itemDef.name }}</div>
            </template>
            <template #content>
              <div class="info-tooltip-title">{{ itemDef.name }}</div>
              <div class="info-tooltip-line">{{ itemDef.description }}</div>
              <div v-if="itemDef.effectDescription" class="info-tooltip-line">Effect: {{ itemDef.effectDescription }}</div>
              <div class="info-tooltip-line info-tooltip-muted">Type: {{ itemDef.type }} · {{ itemDef.subtype }}</div>
              <div class="info-tooltip-line info-tooltip-muted">Quality: {{ itemDef.quality }}</div>
              <div class="info-tooltip-line info-tooltip-muted">Value: {{ itemDef.priceCopper }}c</div>
              <div class="info-tooltip-line info-tooltip-muted">Stack: {{ itemDef.maxStack }}</div>
              <div class="info-tooltip-line info-tooltip-muted">Owned in slot: {{ slot.quantity }}</div>
            </template>
          </InfoTooltip>
          <div class="item-desc">{{ itemDef.type }} · {{ itemDef.subtype }}</div>
        </div>
        <div class="inventory-qty">x{{ slot.quantity }}</div>
      </div>
      <div class="inventory-meta">
        <div class="inventory-quality">{{ itemDef.quality }}</div>
        <div class="inventory-price">{{ itemDef.priceCopper }}c</div>
      </div>
      <div class="inventory-actions">
        <button class="toggle" :disabled="!canUse" @click="emit('use', slot.id)">Use</button>
        <button
          v-for="amount in sellAmounts"
          :key="amount"
          class="toggle"
          :disabled="!canSell"
          @click="emit('sell', slot.id, amount)"
        >
          Sell {{ amount === 'all' ? 'All' : amount }}
        </button>
      </div>
    </div>
    <div v-else class="inventory-empty">Empty Slot</div>
  </div>
</template>

<style scoped>
.inventory-card {
  padding: 0.75rem;
  border-radius: 14px;
  background: rgba(21, 30, 47, 0.7);
  border: 1px solid rgba(90, 110, 140, 0.3);
  min-height: 160px;
  position: relative;
  overflow: hidden;
}

.inventory-item {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.inventory-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.item-title {
  font-weight: 600;
}

.item-desc {
  font-size: 0.85rem;
  color: #8fa2c6;
}

.inventory-meta {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: #b8c3de;
}

.inventory-qty {
  font-weight: 600;
  color: #e9f2ff;
}

.inventory-quality {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
}

.inventory-price {
  font-weight: 600;
}

.inventory-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.toggle {
  background: rgba(69, 85, 110, 0.4);
  color: #e6e9f2;
  border: 1px solid rgba(121, 145, 180, 0.4);
  padding: 0.35rem 0.7rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.inventory-empty {
  color: #7f92b6;
  font-size: 0.85rem;
  text-align: center;
  padding-top: 2rem;
}
</style>
