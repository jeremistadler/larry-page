import {DomainBounds, Optimizer, Pos_Buffer} from './micro'

export function createMutateOne(
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
    runNext: (iteration: number) => {
      const dim = Math.floor(Math.random() * previousBest.length)
      for (let i = 0; i < testBuffer.length; i++) {
        let value =
          i === dim
            ? state.pos[i] + (Math.random() - 0.5) * MAX_CHANGE
            : state.pos[i]
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
