<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, RouterView } from 'vue-router'
import { useGameStore, type ActionItem, type ProfessionAction } from './stores/game'
import InfoTooltip from './components/InfoTooltip.vue'
import FloatingLogWindow from './components/FloatingLogWindow.vue'

const game = useGameStore()
const {
  character,
  currencyBreakdown,
  playerHp,
  mana,
  maxMana,
  maxHp,
  actions,
  professionActions,
  activeTask,
  stats,
  skillBonuses,
  combatLogs,
  actionLogs,
  professionLogs,
} = storeToRefs(game)

const activeActionName = computed(() => {
  if (activeTask.value.type === 'idle') {
    const active = actions.value.find((action: ActionItem) => action.id === activeTask.value.actionId)
    return active ? active.name : 'None'
  }
  if (activeTask.value.type === 'profession') {
    const active = professionActions.value.find(
      (action: ProfessionAction) => action.id === activeTask.value.actionId,
    )
    return active ? active.name : 'None'
  }
  if (activeTask.value.type === 'combat') return 'Combat'
  if (activeTask.value.type === 'rest') return 'Resting'
  return 'None'
})

const totalCopper = computed(
  () => currencyBreakdown.value.gold * 10000 + currencyBreakdown.value.silver * 100 + currencyBreakdown.value.copper,
)
const readableCurrency = computed(() => game.formatCopperToCurrency(totalCopper.value, { showAllUnits: true }))

const hpPercent = computed(() => Math.floor((playerHp.value / Math.max(1, maxHp.value)) * 100))
const manaPercent = computed(() => Math.floor((mana.value / Math.max(1, maxMana.value)) * 100))

const passiveHpRegenBase = computed(() => Math.max(1, Math.floor(stats.value.Spirit.value * 0.6)))
const restHpRegenBase = computed(() =>
  Math.max(2, Math.floor(stats.value.Spirit.value * 1.2 + stats.value.Vitality.value * 0.4)),
)
const passiveHpRegen = computed(() =>
  Math.floor(passiveHpRegenBase.value * skillBonuses.value.regenMultiplier),
)
const restHpRegen = computed(() =>
  Math.floor(restHpRegenBase.value * skillBonuses.value.regenMultiplier),
)

const logsSidebarStorageKey = 'theland:logs-sidebar-state'
const mobileLogsBreakpoint = 720

const hasStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const readPersistedDesktopLogsOpen = () => {
  if (!hasStorage()) return false

  try {
    const raw = window.localStorage.getItem(logsSidebarStorageKey)
    if (!raw) return false

    const parsed = JSON.parse(raw)
    if (typeof parsed === 'boolean') return parsed
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.desktopOpen === 'boolean') {
      return parsed.desktopOpen
    }

    return false
  } catch {
    return false
  }
}

const viewportWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
const isMobileViewport = ref(viewportWidth.value <= mobileLogsBreakpoint)
const desktopLogsOpen = ref(readPersistedDesktopLogsOpen())
const mobileLogsOpen = ref(false)

const activeActionType = computed(() => {
  if (activeTask.value.type === 'idle') return 'Idle Action'
  if (activeTask.value.type === 'profession') return 'Profession Action'
  if (activeTask.value.type === 'combat') return 'Combat'
  if (activeTask.value.type === 'rest') return 'Rest'
  return 'None'
})

const activeActionDescription = computed(() => {
  if (activeTask.value.type === 'idle') {
    const active = actions.value.find((action: ActionItem) => action.id === activeTask.value.actionId)
    return active?.description ?? 'No idle action active.'
  }
  if (activeTask.value.type === 'profession') {
    const active = professionActions.value.find(
      (action: ProfessionAction) => action.id === activeTask.value.actionId,
    )
    return active?.description ?? 'No profession action active.'
  }
  if (activeTask.value.type === 'combat') return 'Fighting in the currently selected combat zone.'
  if (activeTask.value.type === 'rest') return 'Recovering health and mana while inactive.'
  return 'No active task.'
})

const logsOpen = computed(() => (isMobileViewport.value ? mobileLogsOpen.value : desktopLogsOpen.value))
const mobileLogsButtonLabel = computed(() => (mobileLogsOpen.value ? 'Close Logs' : 'Logs'))
const shellStyle = computed(() => ({
  '--logs-sidebar-collapsed-width': '3.1rem',
  '--logs-sidebar-open-min-width': '21rem',
  '--logs-sidebar-gap': '1rem',
  '--log-sidebar-rail-width': '3.1rem',
}))

const toggleLogs = () => {
  if (isMobileViewport.value) {
    mobileLogsOpen.value = !mobileLogsOpen.value
    return
  }

  desktopLogsOpen.value = !desktopLogsOpen.value
}

const closeLogs = () => {
  if (isMobileViewport.value) {
    mobileLogsOpen.value = false
    return
  }

  desktopLogsOpen.value = false
}

const handleViewportResize = () => {
  if (typeof window === 'undefined') return

  viewportWidth.value = window.innerWidth
  const nextIsMobileViewport = viewportWidth.value <= mobileLogsBreakpoint

  if (!nextIsMobileViewport) {
    mobileLogsOpen.value = false
  }

  isMobileViewport.value = nextIsMobileViewport
}

const handleWindowKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && mobileLogsOpen.value) {
    mobileLogsOpen.value = false
  }
}

watch(desktopLogsOpen, (desktopOpen) => {
  if (!hasStorage()) return

  window.localStorage.setItem(logsSidebarStorageKey, JSON.stringify({ desktopOpen }))
})

watch(
  [mobileLogsOpen, isMobileViewport],
  ([isMobileOpen, isMobile]) => {
    if (typeof document === 'undefined') return

    if (isMobile && isMobileOpen) {
      document.body.style.overflow = 'hidden'
      return
    }

    document.body.style.removeProperty('overflow')
  },
  { immediate: true },
)

onMounted(() => {
  handleViewportResize()
  window.addEventListener('resize', handleViewportResize)
  window.addEventListener('keydown', handleWindowKeydown)
  game.startTicker()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleViewportResize)
  window.removeEventListener('keydown', handleWindowKeydown)
  document.body.style.removeProperty('overflow')
  game.stopTicker()
})
</script>

<template>
  <div class="shell" :style="shellStyle">
    <div v-if="isMobileViewport && mobileLogsOpen" class="logs-backdrop" @click="closeLogs"></div>

    <div class="shell-frame" :class="{ 'logs-open': logsOpen && !isMobileViewport }">
      <aside class="logs-sidebar-shell" :class="{ open: logsOpen, mobile: isMobileViewport }">
        <FloatingLogWindow
          :combat-logs="combatLogs"
          :action-logs="actionLogs"
          :profession-logs="professionLogs"
          :on-clear-combat="game.clearCombatLogs"
          :on-clear-action="game.clearActionLogs"
          :on-clear-profession="game.clearProfessionLogs"
          :is-open="logsOpen"
          :is-mobile="isMobileViewport"
          @toggle="toggleLogs"
          @close="closeLogs"
        />
      </aside>

      <div class="main-stack">
        <nav class="top-nav">
          <div class="brand">The Land: Idle Seeds</div>
          <div class="top-nav-actions">
            <button v-if="isMobileViewport" type="button" class="logs-menu-button" @click="toggleLogs">
              {{ mobileLogsButtonLabel }}
            </button>
            <div class="nav-links">
              <RouterLink to="/" class="nav-link">Sanctum</RouterLink>
              <RouterLink to="/mist-village" class="nav-link">Mist Village</RouterLink>
              <RouterLink to="/combat" class="nav-link">Fighting Grounds</RouterLink>
              <RouterLink to="/inventory" class="nav-link">Inventory</RouterLink>
              <RouterLink to="/professions" class="nav-link">Professions</RouterLink>
              <RouterLink to="/bonuses" class="nav-link">Bonuses</RouterLink>
              <RouterLink to="/settings" class="nav-link">Settings</RouterLink>
            </div>
          </div>
        </nav>

        <section class="hud">
          <InfoTooltip align="left">
            <template #trigger>
              <div class="hud-item">
                <span class="hud-label">Level</span>
                <span class="hud-value">{{ character.level }}</span>
              </div>
            </template>
            <template #content>
              <div class="info-tooltip-title">Character Level</div>
              <div class="info-tooltip-line">Current Level: {{ character.level }}</div>
              <div class="info-tooltip-line info-tooltip-muted">Gain levels by earning character XP.</div>
            </template>
          </InfoTooltip>

          <InfoTooltip>
            <template #trigger>
              <div class="hud-item">
                <span class="hud-label">XP</span>
                <span class="hud-value">{{ character.exp }} / {{ character.expToNext }}</span>
              </div>
            </template>
            <template #content>
              <div class="info-tooltip-title">Character Experience</div>
              <div class="info-tooltip-line">Progress: {{ character.exp }} / {{ character.expToNext }}</div>
              <div class="info-tooltip-line">Remaining: {{ Math.max(0, character.expToNext - character.exp) }}</div>
              <div class="info-tooltip-line info-tooltip-muted">Arcana increases XP gains globally.</div>
            </template>
          </InfoTooltip>

          <InfoTooltip>
            <template #trigger>
              <div class="hud-item">
                <span class="hud-label">Currency</span>
                <span class="hud-value">{{ readableCurrency }}</span>
              </div>
            </template>
            <template #content>
              <div class="info-tooltip-title">Currency</div>
              <div class="info-tooltip-line">{{ readableCurrency }}</div>
              <div class="info-tooltip-line">Explicit: {{ game.formatCopperToCurrency(totalCopper, { showAllUnits: true }) }}</div>
              <div class="info-tooltip-line info-tooltip-muted">1 Gold = 100 Silver = 10,000 Copper.</div>
            </template>
          </InfoTooltip>

          <InfoTooltip>
            <template #trigger>
              <div class="hud-item">
                <span class="hud-label">HP</span>
                <span class="hud-value">{{ playerHp }} / {{ maxHp }}</span>
              </div>
            </template>
            <template #content>
              <div class="info-tooltip-title">Health (HP)</div>
              <div class="info-tooltip-line">Current: {{ playerHp }} / {{ maxHp }}</div>
              <div class="info-tooltip-line">Percent: {{ hpPercent }}%</div>
              <div class="info-tooltip-line">Passive regen/tick: {{ passiveHpRegen }}</div>
              <div class="info-tooltip-line">Rest regen/tick: {{ restHpRegen }}</div>
              <div class="info-tooltip-line info-tooltip-muted">Passive formula: floor(Spirit × 0.6) × regen multiplier.</div>
              <div class="info-tooltip-line info-tooltip-muted">Rest formula: floor(Spirit × 1.2 + Vitality × 0.4) × regen multiplier.</div>
              <div class="info-tooltip-line info-tooltip-muted">Vitality increases max HP; Spirit drives HP recovery speed.</div>
            </template>
          </InfoTooltip>

          <InfoTooltip>
            <template #trigger>
              <div class="hud-item">
                <span class="hud-label">Mana</span>
                <span class="hud-value">{{ mana }} / {{ maxMana }}</span>
              </div>
            </template>
            <template #content>
              <div class="info-tooltip-title">Mana</div>
              <div class="info-tooltip-line">Current: {{ mana }} / {{ maxMana }}</div>
              <div class="info-tooltip-line">Percent: {{ manaPercent }}%</div>
              <div class="info-tooltip-line info-tooltip-muted">Intelligence increases max mana and regen.</div>
            </template>
          </InfoTooltip>

          <InfoTooltip max-width="420px" align="right">
            <template #trigger>
              <div class="hud-item wide">
                <span class="hud-label">Action</span>
                <span class="hud-value">{{ activeActionName }}</span>
              </div>
            </template>
            <template #content>
              <div class="info-tooltip-title">Active Task</div>
              <div class="info-tooltip-line">Type: {{ activeActionType }}</div>
              <div class="info-tooltip-line">Name: {{ activeActionName }}</div>
              <div class="info-tooltip-line info-tooltip-muted">{{ activeActionDescription }}</div>
            </template>
          </InfoTooltip>
        </section>

        <main class="content-shell">
          <RouterView />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shell {
  width: 100%;
  min-height: 100vh;
  padding: 1.25rem 1.25rem 2.5rem;
}

.shell-frame {
  position: relative;
  display: block;
  min-height: calc(100vh - 3.75rem);
  transition: grid-template-columns 0.28s ease, gap 0.28s ease;
}

.shell-frame.logs-open {
  display: grid;
  grid-template-columns: minmax(var(--logs-sidebar-open-min-width), 1fr) minmax(0, 1280px);
  align-items: start;
  gap: var(--logs-sidebar-gap);
}

.logs-sidebar-shell {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--logs-sidebar-collapsed-width);
  height: calc(100vh - 2.5rem);
  min-height: 36rem;
  min-width: 0;
  z-index: 20;
}

.shell-frame.logs-open .logs-sidebar-shell {
  position: sticky;
  left: auto;
  width: auto;
}

.logs-sidebar-shell.mobile {
  position: fixed;
  inset: 0.5rem auto 0.5rem 0.5rem;
  width: min(100vw - 1rem, 24rem);
  height: auto;
  min-height: 0;
  z-index: 2500;
  transform: translateX(calc(-100% - 1rem));
  transition: transform 0.28s ease;
}

.logs-sidebar-shell.mobile.open {
  transform: translateX(0);
}

.logs-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2400;
  background: rgba(4, 8, 14, 0.58);
  backdrop-filter: blur(6px);
}

.main-stack {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: calc(1280px - var(--logs-sidebar-collapsed-width) - var(--logs-sidebar-gap));
  min-width: 0;
  margin: 0 auto;
}

.shell-frame.logs-open .main-stack {
  max-width: 1280px;
  margin: 0;
  justify-self: end;
}

.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem 1rem;
  margin-bottom: 1rem;
  border-radius: 16px;
  background: rgba(14, 20, 33, 0.9);
  border: 1px solid rgba(80, 98, 130, 0.25);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22);
}

.brand {
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  font-size: 0.8rem;
  color: #c7d4f2;
}

.top-nav-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-left: auto;
  min-width: 0;
}

.nav-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.logs-menu-button {
  border: 1px solid rgba(116, 210, 255, 0.45);
  background: rgba(116, 210, 255, 0.12);
  color: #c8f0ff;
  padding: 0.42rem 0.82rem;
  border-radius: 999px;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.logs-menu-button:hover {
  border-color: rgba(240, 197, 102, 0.5);
  color: #f0c566;
}

.logs-menu-button:active {
  transform: translateY(1px);
}

.nav-link {
  text-decoration: none;
  color: #c7d4f2;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 600;
  font-size: 0.92rem;
  transition: all 0.2s ease;
}

.nav-link:hover {
  border-color: rgba(240, 197, 102, 0.5);
  color: #f0c566;
}

.nav-link.router-link-active {
  background: rgba(116, 210, 255, 0.2);
  border-color: rgba(116, 210, 255, 0.8);
  color: #c8f0ff;
}

.hud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 14px;
  background: rgba(10, 16, 28, 0.9);
  border: 1px solid rgba(80, 98, 130, 0.25);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.22);
}

.hud-item {
  display: flex;
  gap: 0.35rem;
  align-items: baseline;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: rgba(24, 34, 52, 0.8);
  border: 1px solid rgba(90, 110, 140, 0.3);
}

.hud-item.wide {
  min-width: 180px;
  justify-content: space-between;
}

.hud-label {
  font-size: 0.64rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #8fa2c6;
}

.hud-value {
  font-weight: 600;
  color: #e9f2ff;
}

.content-shell {
  min-width: 0;
}

:deep(.app) {
  min-width: 0;
}

@media (max-width: 1024px) {
  .shell {
    padding: 1rem 1rem 2rem;
  }

  .logs-sidebar-shell {
    top: 0;
    left: 0;
    width: var(--logs-sidebar-collapsed-width);
    height: calc(100vh - 2rem);
    min-height: 32rem;
  }

  .shell-frame.logs-open .logs-sidebar-shell {
    top: 1rem;
    width: auto;
  }

  .top-nav {
    align-items: flex-start;
    gap: 0.75rem;
  }

  .top-nav-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
    margin-left: 0;
  }

  .nav-links {
    justify-content: flex-start;
  }

  .hud-item.wide {
    min-width: 160px;
    flex: 1 1 160px;
  }
}

@media (max-width: 720px) {
  .shell {
    padding: 0.85rem 0.85rem 1.5rem;
  }

  .shell-frame {
    display: block;
    min-height: auto;
  }

  .top-nav {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .top-nav-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.7rem;
  }

  .nav-links {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .hud {
    align-items: flex-start;
  }

  .hud-item.wide {
    min-width: 100%;
  }
}
</style>
