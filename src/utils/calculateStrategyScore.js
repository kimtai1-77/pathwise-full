
export function calculateStrategyScore(maxControls, missingItems) {
  let score = null

  if (Number.isFinite(maxControls) && maxControls > 0 && Number.isFinite(missingItems)) {
    const boundedMissingItems = Math.min(Math.max(missingItems, 0), maxControls)
    score = Math.round(((maxControls - boundedMissingItems) / maxControls) * 100)
  }

  return score
}