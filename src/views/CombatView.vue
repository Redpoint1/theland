<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const { zones, combat, combatRewards, currentZone, playerHp, maxHp } = storeToRefs(game)
const { progressPercent } = game
</script>

<template>
  <main class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">The Land: Combat Grounds</p>
        <h1>Fighting Grounds</h1>
        <p class="subtitle">
          Choose a zone and toggle combat. Idle actions pause while fighting.
        </p>
      </div>
      <div class="hero-actions">
        <div class="combat-buttons">
          <button class="toggle" :class="{ active: combat.active }" @click="game.toggleCombat">
            {{ combat.active ? 'Fighting' : 'Start Combat' }}
          </button>
          <button
            class="toggle"
            :class="{ active: combat.resting }"
            @click="game.toggleResting"
          >
            {{ combat.resting ? 'Resting' : 'Rest' }}
          </button>
        </div>
        <div class="tick">Health: {{ playerHp }} / {{ maxHp }}</div>
        <div class="progress">
          <div
            class="progress-fill hp"
            :style="{ width: progressPercent(playerHp, maxHp) + '%' }"
          ></div>
        </div>
      </div>
    </header>

    <section class="grid">
      <div class="panel combat">
        <div class="combat-header">
          <div>
            <h2>Zones</h2>
            <div class="item-desc">Recommended levels and difficulty reflect the Land.</div>
          </div>
        </div>

        <div class="zone-grid">
          <button
            v-for="zone in zones"
            :key="zone.id"
            class="zone-card"
            :class="{ selected: zone.id === combat.zoneId }"
            @click="game.setZone(zone.id)"
          >
            <div class="item-title">{{ zone.name }}</div>
            <div class="item-desc">{{ zone.description }}</div>
            <div class="zone-level">Lv. {{ zone.levelMin }}-{{ zone.levelMax }}</div>
          </button>
        </div>

        <div class="enemy-card">
          <div>
            <div class="item-title">{{ combat.enemyName }}</div>
            <div class="item-desc">Zone: {{ currentZone.name }}</div>
          </div>
          <div class="enemy-stats">
            <div class="label">Enemy Level</div>
            <div class="value">{{ combat.enemyLevel }}</div>
          </div>
          <div class="enemy-hp">
            <div class="label">Enemy Health</div>
            <div class="value">{{ combat.enemyHp }} / {{ combat.enemyMaxHp }}</div>
            <div class="progress">
              <div
                class="progress-fill enemy"
                :style="{ width: progressPercent(combat.enemyHp, combat.enemyMaxHp) + '%' }"
              ></div>
            </div>
          </div>
          <div class="reward-hint">
            Rewards: +{{ combatRewards.exp }} XP, +{{ combatRewards.copper }}c,
            +{{ combatRewards.skillExp }} Combat XP / kill
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
