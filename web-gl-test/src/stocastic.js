export async function runStocastic(cost_func, originalPos, onGeneration) {
  const pos = new Float32Array(originalPos)
  let bestFitness = cost_func(pos)

  for (let generation = 0; generation < 1000; generation++) {
    for (let sample = 0; sample < 10; sample++) {
      for (let i = 0; i < pos.length; i++) {
        const oldValue = pos[i]
        const newValue = oldValue + (Math.random() - 0.5) * 0.2

        pos[i] = newValue

        const fitness = cost_func(pos)
        if (bestFitness / fitness > 0.9999) {
          bestFitness = fitness
        } else {
          pos[i] = oldValue
        }
      }

      await onGeneration(pos)
    }
  }

  return pos
}
