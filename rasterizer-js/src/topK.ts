import {DomainBounds, Optimizer, Triangle_Buffer} from './types'

export function createTopK(
  cost_func: (data: Triangle_Buffer) => number,
  previousBest: Triangle_Buffer,
  domain: DomainBounds[],
): Optimizer {
  const MAX_CHANGE = 0.4

  const testBuffer = new Float32Array(previousBest) as Triangle_Buffer
  const globalBestPos = new Float32Array(previousBest) as Triangle_Buffer

  const result = {
    bestPos: globalBestPos,
    bestFitness: cost_func(testBuffer),
  }

  return {
    runNext: () => {
      for (let i = 0; i < testBuffer.length; i++) {
        let value = globalBestPos[i] + (Math.random() - 0.5) * MAX_CHANGE
        if (value < domain[i][0]) value = domain[i][0]
        if (value > domain[i][1]) value = domain[i][1]
        testBuffer[i] = value
      }
      const fitness = cost_func(testBuffer)
      if (fitness < result.bestFitness) {
        result.bestFitness = fitness
        result.bestPos = new Float32Array(testBuffer) as Triangle_Buffer
      }

      return result
    },
  }
}
