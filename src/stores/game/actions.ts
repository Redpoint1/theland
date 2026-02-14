import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { SkillBonuses } from './progression'
import type {
  ActiveTask,
  ActiveTaskType,
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
  activeTask: Ref<ActiveTask>
  actionDurationMs: number
  tickMs: number
  skillBonuses: ComputedRef<SkillBonuses>
  addCharacterExp: (amount: number) => void
  addStatExp: (key: StatKey, amount: number) => void
  addSkillExp: (key: SkillKey, amount: number) => void
  addProfessionExp: (key: ProfessionKey, amount: number) => void
  addCurrency: (copperGain?: number) => void
  spendMana: (amount: number) => boolean
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
  activeTask,
  actionDurationMs,
  tickMs,
  skillBonuses,
  addCharacterExp,
  addStatExp,
  addSkillExp,
  addProfessionExp,
  addCurrency,
  spendMana,
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

  const isIdleActionActive = computed(() => activeTask.value.type === 'idle')
  const isProfessionActionActive = computed(() => activeTask.value.type === 'profession')

  const setActiveTask = (type: ActiveTaskType, actionId?: string) => {
    activeTask.value = { type, actionId }
  }

  const deactivateActions = () => {
    if (activeTask.value.type === 'idle') {
      setActiveTask('none')
    }
  }

  const deactivateProfessionActions = () => {
    if (activeTask.value.type === 'profession') {
      setActiveTask('none')
    }
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
      const totalCopper = Math.floor(action.gains.currency * bonus)
      if (totalCopper > 0) {
        const gold = Math.floor(totalCopper / 10000)
        const silver = Math.floor((totalCopper % 10000) / 100)
        const copper = totalCopper % 100
        if (gold) summary.push(`+${gold}g`)
        if (silver) summary.push(`+${silver}s`)
        if (copper || (!gold && !silver)) summary.push(`+${copper}c`)
      }
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
    const previousActive =
      activeTask.value.type === 'idle'
        ? actions.find((item) => item.id === activeTask.value.actionId)
        : undefined
    const wasActive = activeTask.value.type === 'idle' && activeTask.value.actionId === action.id
    if (wasActive) {
      setActiveTask('none')
    } else {
      setActiveTask('idle', action.id)
    }
    idleActionProgress.value = 0
    idleActionJustCompleted.value = false
    const activated = activeTask.value.type === 'idle' && activeTask.value.actionId === action.id
    if (previousActive && previousActive.id !== action.id) {
      addActionLog('action', `Stopped ${previousActive.name}.`)
    }
    if (activated) {
      addActionLog('action', `Started ${action.name}.`)
      deactivateProfessionActions()
    } else {
      addActionLog('action', `Stopped ${action.name}.`)
    }
  }

  const runIdleActions = () => {
    if (activeTask.value.type !== 'idle') {
      idleActionProgress.value = 0
      idleActionJustCompleted.value = false
      return
    }
    const active = actions.find((action) => action.id === activeTask.value.actionId)
    if (!active) {
      setActiveTask('none')
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
      if (active.manaCost && active.manaCost > 0) {
        const spent = spendMana(active.manaCost)
        if (!spent) {
          addActionLog('system', `Not enough mana to complete ${active.name}.`)
          setActiveTask('none')
          idleActionProgress.value = 0
          idleActionJustCompleted.value = false
          return
        }
      }
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
    const previousActive =
      activeTask.value.type === 'profession'
        ? professionActions.find((item) => item.id === activeTask.value.actionId)
        : undefined
    const wasActive =
      activeTask.value.type === 'profession' && activeTask.value.actionId === action.id
    if (wasActive) {
      setActiveTask('none')
    } else {
      setActiveTask('profession', action.id)
    }
    professionActionProgress.value = 0
    professionActionJustCompleted.value = false
    if (previousActive && previousActive.id !== action.id) {
      addProfessionLog('action', `Stopped ${previousActive.name}.`)
    }
    if (!wasActive) {
      addProfessionLog('action', `Started ${action.name}.`)
      deactivateActions()
    } else {
      addProfessionLog('action', `Stopped ${action.name}.`)
    }
  }

  const professionBonuses = computed(() => {
    const rankBonus = (key: ProfessionKey) => {
      const profession = professions[key]
      const activeRank =
        profession.rankTiers
          .slice()
          .reverse()
          .find((rank) => profession.level >= rank.minLevel) ?? profession.rankTiers[0]
      return activeRank?.bonusMultiplier ?? 0
    }

    return {
      Mining: 1 + professions.Mining.level * professions.Mining.bonusPerLevel + rankBonus('Mining'),
      Herbalism:
        1 + professions.Herbalism.level * professions.Herbalism.bonusPerLevel + rankBonus('Herbalism'),
      Smelting:
        1 + professions.Smelting.level * professions.Smelting.bonusPerLevel + rankBonus('Smelting'),
      Alchemy: 1 + professions.Alchemy.level * professions.Alchemy.bonusPerLevel + rankBonus('Alchemy'),
    }
  })

  const runProfessionActions = () => {
    if (activeTask.value.type !== 'profession') {
      professionActionProgress.value = 0
      professionActionJustCompleted.value = false
      return
    }
    const active = professionActions.find((action) => action.id === activeTask.value.actionId)
    if (!active) {
      setActiveTask('none')
      professionActionProgress.value = 0
      professionActionJustCompleted.value = false
      return
    }
    const missingInputs = getMissingInputs(active)
    if (missingInputs.length > 0) {
      setActiveTask('none')
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
          setActiveTask('none')
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
