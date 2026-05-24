import { describe, expect, it } from 'vitest'
import { computeExpToNext } from './experience'

describe('computeExpToNext', () => {
  it('clamps low base values and applies floored growth with flat increments per level', () => {
    expect(computeExpToNext(0.4, 1, 1.5, 10)).toBe(1)
    expect(computeExpToNext(100, 3, 1.5, 10)).toBe(250)
  })
})