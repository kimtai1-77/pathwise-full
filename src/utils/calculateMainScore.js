
export function calculateMainScore(scoresArray = []) {
  const sum = scoresArray.reduce((total, score) => total + score, 0)
  return Math.round(sum / scoresArray.length) || 0
}

export function getScoreThresholdClass(score) {
  if (score >= 80) return 'score-green'
  if (score >= 50) return 'score-orange'
  else return 'score-red'
}