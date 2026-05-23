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

  const cloneEntries = <T extends { id: number }>(entries: T[]) => entries.map((entry) => ({ ...entry }))

  const getMaxId = <T extends { id: number }>(entries: T[]) =>
    entries.reduce((maxId, entry) => Math.max(maxId, entry.id), 0)

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
    combatLogId = 0
  }

  const clearProfessionLogs = () => {
    professionLogs.value = []
    professionLogId = 0
  }

  const clearActionLogs = () => {
    actionLogs.value = []
    actionLogId = 0
  }

  const restoreCombatLogs = (entries: CombatLogEntry[]) => {
    combatLogs.value = cloneEntries(entries)
    combatLogId = getMaxId(combatLogs.value)
  }

  const restoreProfessionLogs = (entries: ProfessionLogEntry[]) => {
    professionLogs.value = cloneEntries(entries)
    professionLogId = getMaxId(professionLogs.value)
  }

  const restoreActionLogs = (entries: ActionLogEntry[]) => {
    actionLogs.value = cloneEntries(entries)
    actionLogId = getMaxId(actionLogs.value)
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
    restoreCombatLogs,
    restoreProfessionLogs,
    restoreActionLogs,
  }
}
