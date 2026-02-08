export const computeExpToNext = (
  baseExp: number,
  level: number,
  growth: number,
  flat: number,
) => {
  let expToNext = Math.max(1, Math.floor(baseExp))
  const steps = Math.max(0, Math.floor(level) - 1)
  for (let i = 0; i < steps; i += 1) {
    expToNext = Math.floor(expToNext * growth + flat)
  }
  return expToNext
}
