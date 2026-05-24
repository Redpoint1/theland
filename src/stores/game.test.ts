import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { useGameStore } from './game'

const saveStorageKey = 'theland:save-state'

const createStore = () => {
  setActivePinia(createPinia())
  return useGameStore()
}

describe('game store persistence', () => {
  it('saves current state and reloads it through a fresh store instance', () => {
    const firstStore = createStore()

    firstStore.currency.copper = 321
    firstStore.character.level = 4

    expect(firstStore.saveNow()).toBe(true)

    const rawSnapshot = window.localStorage.getItem(saveStorageKey)
    expect(rawSnapshot).not.toBeNull()

    const snapshot = JSON.parse(rawSnapshot ?? '{}') as { version?: number; savedAt?: number }
    expect(snapshot.version).toBe(1)
    expect(typeof snapshot.savedAt).toBe('number')

    const secondStore = createStore()

    expect(secondStore.currency.copper).toBe(321)
    expect(secondStore.character.level).toBe(4)
    expect(secondStore.hasSavedProgress).toBe(true)
    expect(secondStore.lastSavedAt).toBe(snapshot.savedAt)
  })

  it('discards invalid saves and hard reset clears persisted progress while restoring defaults', () => {
    window.localStorage.setItem(
      saveStorageKey,
      JSON.stringify({ version: 1, savedAt: Date.now(), state: null }),
    )

    const store = createStore()

    expect(store.saveError).toBe('Discarded invalid saved progress.')
    expect(store.hasSavedProgress).toBe(false)
    expect(window.localStorage.getItem(saveStorageKey)).toBeNull()

    store.currency.copper = 999
    store.character.level = 7
    expect(store.saveNow()).toBe(true)

    store.hardResetGame()

    expect(window.localStorage.getItem(saveStorageKey)).toBeNull()
    expect(store.hasSavedProgress).toBe(false)
    expect(store.saveError).toBeNull()
    expect(store.currency.copper).toBe(25)
    expect(store.character.level).toBe(1)
    expect(store.combat.enemyId).not.toBe('')
  })
})