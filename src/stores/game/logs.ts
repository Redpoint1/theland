import { ref } from 'vue'
import type {
  ActionLogEntry,
  ActionLogType,
  CombatLogEntry,
  CombatLogType,
  ProfessionLogEntry,
  ProfessionLogType,
} from './types'

export const useLogbook = () => {
  const combatLogs = ref<CombatLogEntry[]>([])
  let combatLogId = 0

  const professionLogs = ref<ProfessionLogEntry[]>([])
  let professionLogId = 0

  const actionLogs = ref<ActionLogEntry[]>([])
  let actionLogId = 0

  const addCombatLog = (type: CombatLogType, message: string) => {
    combatLogs.value.push({
      id: (combatLogId += 1),
      timestamp: Date.now(),
      type,
      message,
    })

    if (combatLogs.value.length > 1000) {
      combatLogs.value.splice(0, combatLogs.value.length - 1000)
    }
  }

  const addProfessionLog = (type: ProfessionLogType, message: string) => {
    professionLogs.value.push({
      id: (professionLogId += 1),
      timestamp: Date.now(),
      type,
      message,
    })

    if (professionLogs.value.length > 500) {
      professionLogs.value.splice(0, professionLogs.value.length - 500)
    }
  }

  const addActionLog = (type: ActionLogType, message: string) => {
    actionLogs.value.push({
      id: (actionLogId += 1),
      timestamp: Date.now(),
      type,
      message,
    })

    if (actionLogs.value.length > 500) {
      actionLogs.value.splice(0, actionLogs.value.length - 500)
    }
  }

  const clearCombatLogs = () => {
    combatLogs.value = []
  }

  const clearProfessionLogs = () => {
    professionLogs.value = []
  }

  const clearActionLogs = () => {
    actionLogs.value = []
  }

  return {
    combatLogs,
    professionLogs,
    actionLogs,
    addCombatLog,
    addProfessionLog,
    addActionLog,
    clearCombatLogs,
    clearProfessionLogs,
    clearActionLogs,
  }
}
