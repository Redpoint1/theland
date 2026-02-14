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
          <InfoTooltip>
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
