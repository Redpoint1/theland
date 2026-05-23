import type { ComputedRef, Ref } from 'vue'
import type { SkillBonuses } from './progression'
import type { ActiveTask, CombatLogType, Stat, StatKey } from './types'

export interface TickerDeps {
  paused: Ref<boolean>
  activeTask: Ref<ActiveTask>
  playerHp: Ref<number>
  maxHp: ComputedRef<number>
  mana: Ref<number>
  maxMana: ComputedRef<number>
  manaRegen: ComputedRef<number>
  stats: Record<StatKey, Stat>
  skillBonuses: ComputedRef<SkillBonuses>
  tickMs: number
  addCombatLog: (type: CombatLogType, message: string) => void
  runCombatTick: () => void
  runIdleActions: () => void
  runProfessionActions: () => void
}

export const useTicker = ({
  paused,
  activeTask,
  playerHp,
  maxHp,
  mana,
  maxMana,
  manaRegen,
  stats,
  skillBonuses,
  tickMs,
  addCombatLog,
  runCombatTick,
  runIdleActions,
  runProfessionActions,
}: TickerDeps) => {
  const runTick = () => {
    if (paused.value) return
    if (playerHp.value > maxHp.value) {
      playerHp.value = maxHp.value
    }

    if (mana.value > maxMana.value) {
      mana.value = maxMana.value
    }

    if (activeTask.value.type === 'rest' && playerHp.value < maxHp.value) {
      const regenBase = Math.max(2, Math.floor(stats.Spirit.value * 1.2 + stats.Vitality.value * 0.4))
      const regen = Math.floor(regenBase * skillBonuses.value.regenMultiplier)
      playerHp.value = Math.min(maxHp.value, playerHp.value + regen)
      addCombatLog('rest', `Recovered ${regen} HP.`)
      if (playerHp.value >= maxHp.value) {
        activeTask.value = { type: 'none' }
        addCombatLog('rest', 'Fully recovered.')
      }
    } else if (activeTask.value.type !== 'combat' && playerHp.value < maxHp.value) {
      const regenBase = Math.max(1, Math.floor(stats.Spirit.value * 0.6))
      const regen = Math.floor(regenBase * skillBonuses.value.regenMultiplier)
      playerHp.value = Math.min(maxHp.value, playerHp.value + regen)
    }

    if (mana.value < maxMana.value) {
      const regen = Math.max(1, Math.floor(manaRegen.value))
      mana.value = Math.min(maxMana.value, mana.value + regen)
    }

    runCombatTick()
    runIdleActions()
    runProfessionActions()
  }

  let timer: number | undefined

  const startTicker = () => {
    if (timer) return
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
