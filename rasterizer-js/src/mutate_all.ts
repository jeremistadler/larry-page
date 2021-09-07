import {DomainBounds, Optimizer, Pos_Buffer} from './micro.js'

export function createMutateAll(
  cost_func: (data: Pos_Buffer) => number,
  previousBest: Pos_Buffer,
  domain: DomainBounds[],
): Optimizer {
  const MAX_CHANGE = 0.4
  const testBuffer = new Float32Array(previousBest) as Pos_Buffer

  const state = {
    pos: previousBest,
    fitness: cost_func(testBuffer),
  }

  return {
    best: state,
    particles: [state],
    hasConverged: () => false,
    runNext: (iteration: number) => {
      for (let i = 0; i < testBuffer.length; i++) {
        let value = state.pos[i] + (Math.random() - 0.5) * MAX_CHANGE
        if (value < domain[i][0]) value = domain[i][0]
        if (value > domain[i][1]) value = domain[i][1]
        testBuffer[i] = value
      }
      const fitness = cost_func(testBuffer)
      if (fitness < state.fitness) {
        state.fitness = fitness
        state.pos = new Float32Array(testBuffer) as Pos_Buffer
      }
    },
  }
}
