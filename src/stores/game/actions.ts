import { computed, ref, type ComputedRef } from 'vue'
import type { CurrencyState, SkillBonuses } from './progression'
import type {
  ActionItem,
  Profession,
  ProfessionAction,
  ProfessionKey,
  SkillKey,
  StatKey,
} from './types'

export interface ActionLogicDeps {
  actions: ActionItem[]
  professionActions: ProfessionAction[]
  professions: Record<ProfessionKey, Profession>
  combat: { active: boolean; resting: boolean }
  actionDurationMs: number
  tickMs: number
  skillBonuses: ComputedRef<SkillBonuses>
  addCharacterExp: (amount: number) => void
  addStatExp: (key: StatKey, amount: number) => void
  addSkillExp: (key: SkillKey, amount: number) => void
  addProfessionExp: (key: ProfessionKey, amount: number) => void
  addCurrency: (gain?: Partial<CurrencyState>) => void
  addActionLog: (type: 'action' | 'reward' | 'system', message: string) => void
  addProfessionLog: (type: 'action' | 'reward' | 'system', message: string) => void
  getItemQuantity: (itemId: string) => number
  removeItem: (itemId: string, amount: number) => boolean
  addItem: (itemId: string, amount: number) => void
  getItemDef: (itemId: string) => { name: string } | undefined
}

export const useActionLogic = ({
  actions,
  professionActions,
  professions,
  combat,
  actionDurationMs,
  tickMs,
  skillBonuses,
  addCharacterExp,
  addStatExp,
  addSkillExp,
  addProfessionExp,
  addCurrency,
  addActionLog,
  addProfessionLog,
  getItemQuantity,
  removeItem,
  addItem,
  getItemDef,
}: ActionLogicDeps) => {
  const idleActionProgress = ref(0)
  const professionActionProgress = ref(0)
  const idleActionJustCompleted = ref(false)
  const professionActionJustCompleted = ref(false)

  const isIdleActionActive = computed(() => actions.some((action) => action.active))
  const isProfessionActionActive = computed(() =>
    professionActions.some((action) => action.active),
  )

  const deactivateActions = () => {
    actions.forEach((action) => {
      action.active = false
    })
  }

  const deactivateProfessionActions = () => {
    professionActions.forEach((action) => {
      action.active = false
    })
  }

  const applyIdleGains = (action: ActionItem) => {
    if (action.gains.exp) {
      addCharacterExp(action.gains.exp)
    }
    if (action.gains.stats) {
      Object.entries(action.gains.stats).forEach(([key, amount]) => {
        addStatExp(key as StatKey, amount ?? 0)
      })
    }
    if (action.gains.skills) {
      Object.entries(action.gains.skills).forEach(([key, amount]) => {
        addSkillExp(key as SkillKey, amount ?? 0)
      })
    }
    if (action.gains.currency) {
      addCurrency(action.gains.currency)
    }
  }

  const formatActionRewards = (action: ActionItem) => {
    const summary: string[] = []

    if (action.gains.exp) {
      const expGain = Math.floor(action.gains.exp * skillBonuses.value.expMultiplier)
      summary.push(`+${expGain} XP`)
    }

    if (action.gains.stats) {
      Object.entries(action.gains.stats).forEach(([key, amount]) => {
        if ((amount ?? 0) > 0) summary.push(`+${amount} ${key} XP`)
      })
    }

    if (action.gains.skills) {
      Object.entries(action.gains.skills).forEach(([key, amount]) => {
        if ((amount ?? 0) > 0) summary.push(`+${amount} ${key} XP`)
      })
    }

    if (action.gains.currency) {
      const bonus = skillBonuses.value.currencyMultiplier
      const gold = Math.floor((action.gains.currency.gold ?? 0) * bonus)
      const silver = Math.floor((action.gains.currency.silver ?? 0) * bonus)
      const copper = Math.floor((action.gains.currency.copper ?? 0) * bonus)
      if (gold) summary.push(`+${gold}g`)
      if (silver) summary.push(`+${silver}s`)
      if (copper) summary.push(`+${copper}c`)
    }

    return summary.length ? summary.join(', ') : 'no rewards'
  }

  const getMissingInputs = (action: ProfessionAction) => {
    if (!action.inputs || action.inputs.length === 0) return []
    return action.inputs
      .map((input) => {
        const available = getItemQuantity(input.itemId)
        if (available >= input.amount) return null
        const name = getItemDef(input.itemId)?.name ?? input.itemId
        return `${name} x${input.amount - available}`
      })
      .filter((entry): entry is string => !!entry)
  }

  const toggleAction = (action: ActionItem) => {
    if (combat.active || combat.resting) {
      addActionLog('system', 'Cannot start idle actions during combat or rest.')
      return
    }
    const previousActive = actions.find((item) => item.active)
    actions.forEach((item) => {
      item.active = item.id === action.id ? !action.active : false
    })
    idleActionProgress.value = 0
    idleActionJustCompleted.value = false
    const activated = actions.find((item) => item.id === action.id)?.active
    if (previousActive && previousActive.id !== action.id) {
      addActionLog('action', `Stopped ${previousActive.name}.`)
    }
    if (activated) {
      addActionLog('action', `Started ${action.name}.`)
      combat.active = false
      combat.resting = false
      deactivateProfessionActions()
    } else {
      addActionLog('action', `Stopped ${action.name}.`)
    }
  }

  const runIdleActions = () => {
    if (combat.active || combat.resting) return
    const active = actions.find((action) => action.active)
    if (!active) {
      idleActionProgress.value = 0
      idleActionJustCompleted.value = false
      return
    }
    if (idleActionJustCompleted.value) {
      idleActionJustCompleted.value = false
      idleActionProgress.value = 0
    }
    idleActionProgress.value += tickMs
    if (idleActionProgress.value >= actionDurationMs) {
      idleActionProgress.value = actionDurationMs
      applyIdleGains(active)
      addActionLog('reward', `Completed ${active.name}. ${formatActionRewards(active)}.`)
      idleActionJustCompleted.value = true
    }
  }

  const toggleProfessionAction = (action: ProfessionAction) => {
    const profession = professions[action.profession]
    if (profession.level < action.requiredLevel) {
      addProfessionLog(
        'system',
        `${action.name} requires ${action.profession} level ${action.requiredLevel}.`,
      )
      return
    }
    const missingInputs = getMissingInputs(action)
    if (missingInputs.length > 0) {
      addProfessionLog(
        'system',
        `Cannot start ${action.name} - missing ${missingInputs.join(', ')}.`,
      )
      return
    }
    const previousActive = professionActions.find((item) => item.active)
    const nextActive = !action.active
    professionActions.forEach((item) => {
      item.active = item.id === action.id ? nextActive : false
    })
    professionActionProgress.value = 0
    professionActionJustCompleted.value = false
    if (previousActive && previousActive.id !== action.id) {
      addProfessionLog('action', `Stopped ${previousActive.name}.`)
    }
    if (nextActive) {
      addProfessionLog('action', `Started ${action.name}.`)
      combat.active = false
      combat.resting = false
      deactivateActions()
    } else {
      addProfessionLog('action', `Stopped ${action.name}.`)
    }
  }

  const professionBonuses = computed(() => {
    return {
      Mining: 1 + professions.Mining.level * professions.Mining.bonusPerLevel,
      Herbalism: 1 + professions.Herbalism.level * professions.Herbalism.bonusPerLevel,
      Smelting: 1 + professions.Smelting.level * professions.Smelting.bonusPerLevel,
      Alchemy: 1 + professions.Alchemy.level * professions.Alchemy.bonusPerLevel,
    }
  })

  const runProfessionActions = () => {
    if (combat.active || combat.resting || isIdleActionActive.value) return
    const active = professionActions.find((action) => action.active)
    if (!active) {
      professionActionProgress.value = 0
      professionActionJustCompleted.value = false
      return
    }
    const missingInputs = getMissingInputs(active)
    if (missingInputs.length > 0) {
      active.active = false
      professionActionProgress.value = 0
      professionActionJustCompleted.value = false
      addProfessionLog(
        'system',
        `Stopped ${active.name} - missing ${missingInputs.join(', ')}.`,
      )
      return
    }
    if (professionActionJustCompleted.value) {
      professionActionJustCompleted.value = false
      professionActionProgress.value = 0
    }
    professionActionProgress.value += tickMs
    if (professionActionProgress.value >= actionDurationMs) {
      professionActionProgress.value = actionDurationMs
      if (active.inputs && active.inputs.length > 0) {
        const hasAllInputs = active.inputs.every(
          (input) => getItemQuantity(input.itemId) >= input.amount,
        )
        if (!hasAllInputs) {
          active.active = false
          professionActionProgress.value = 0
          professionActionJustCompleted.value = false
          addProfessionLog(
            'system',
            `Stopped ${active.name} - missing required inputs.`,
          )
          return
        }
        active.inputs.forEach((input) => {
          removeItem(input.itemId, input.amount)
        })
      }
      const bonus = professionBonuses.value[active.profession]
      addProfessionExp(active.profession, active.expGain)
      const rewardSummary: string[] = []
      active.rewards.forEach((reward) => {
        const boosted = reward.amount * bonus
        const baseAmount = Math.floor(boosted)
        const remainder = boosted - baseAmount
        const extraItemChance = bonus - 1
        const extra = remainder > 0 && Math.random() < extraItemChance ? 1 : 0
        const total = baseAmount + extra
        if (total > 0) {
          addItem(reward.itemId, total)
          const name = getItemDef(reward.itemId)?.name ?? reward.itemId
          rewardSummary.push(`${name} x${total}`)
        }
      })
      const rewardsText = rewardSummary.length ? rewardSummary.join(', ') : 'no items'
      addProfessionLog(
        'reward',
        `Completed ${active.name}. +${active.expGain} ${active.profession} XP, ${rewardsText}.`,
      )
      professionActionJustCompleted.value = true
    }
  }

  return {
    idleActionProgress,
    professionActionProgress,
    idleActionJustCompleted,
    professionActionJustCompleted,
    isIdleActionActive,
    isProfessionActionActive,
    professionBonuses,
    toggleAction,
    toggleProfessionAction,
    runIdleActions,
    runProfessionActions,
    deactivateActions,
    deactivateProfessionActions,
  }
}
