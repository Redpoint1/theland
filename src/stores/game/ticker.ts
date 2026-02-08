import type { ComputedRef, Ref } from 'vue'
import type { SkillBonuses } from './progression'
import type { CombatLogType, Stat, StatKey } from './types'

export interface TickerDeps {
  paused: Ref<boolean>
  combat: { active: boolean; resting: boolean }
  playerHp: Ref<number>
  maxHp: ComputedRef<number>
  stats: Record<StatKey, Stat>
  skillBonuses: ComputedRef<SkillBonuses>
  tickMs: number
  addCombatLog: (type: CombatLogType, message: string) => void
  runCombatTick: () => void
  runIdleActions: () => void
  runProfessionActions: () => void
  spawnEnemy: () => void
}

export const useTicker = ({
  paused,
  combat,
  playerHp,
  maxHp,
  stats,
  skillBonuses,
  tickMs,
  addCombatLog,
  runCombatTick,
  runIdleActions,
  runProfessionActions,
  spawnEnemy,
}: TickerDeps) => {
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
    startTicker,
    stopTicker,
  }
}
