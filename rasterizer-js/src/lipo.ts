import {Triangle_Buffer} from './types'
import {norm} from 'mathjs'

export type KnownPoints = {
  pos: Triangle_Buffer
  fitness: number
}

export async function runPSO(
  cost_func: (data: Triangle_Buffer) => number,
  featureCount: number,
  onGeneration: (
    best: Triangle_Buffer,
    knownPoints: KnownPoints[],
  ) => Promise<void>,
) {
  const knownValues: KnownPoints[] = []

  {
    const initial = new Float32Array(featureCount) as Triangle_Buffer
    initial.fill(0.5)

    knownValues.push({pos: initial, fitness: cost_func(initial)})
  }

  let globalBest = knownValues[0]
  let k = 0.1

  while (true) {
    await onGeneration(globalBest.pos, knownValues)

    // seenValies = np.array([uniform(x[0],x[1]) for x in X])
    // seenFitness = []
    // seenFitness.append((seenValies,f(seenValies)))
    // t = 1

    for (let retryIndex = 0; retryIndex < 10; retryIndex++) {
      const next = new Float32Array(featureCount) as Triangle_Buffer
      for (let i = 0; i < next.length; i++) {
        next[i] = Math.random()
      }

      // while t < n:
      // seenValies = np.array([uniform(x[0],x[1]) for x in X])
      const min = Math.min(
        ...knownValues.map(item => {
          const diff = new Float32Array(item.pos.length)
          for (let i = 0; i < diff.length; i++) {
            diff[i] = next[i] - item.pos[i]
          }
          const normValue = norm([...diff]) as number

          console.log(normValue)

          return item.fitness + k * normValue
        }),
      )

      if (min >= globalBest.fitness) {
        const curr = {pos: next, fitness: cost_func(next)}
        knownValues.push(curr)
        if (curr.fitness < globalBest.fitness) globalBest = curr
      }
    }
  }
}
