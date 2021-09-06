import {DomainBounds, Optimizer, Pos_Buffer} from './micro'

export function createGridSearch(
  cost_func: (data: Pos_Buffer) => number,
  previousBest: Pos_Buffer,
  domain: DomainBounds[],
): Optimizer {
  const testBuffer = new Float32Array(previousBest) as Pos_Buffer

  const best = {
    pos: previousBest,
    fitness: cost_func(testBuffer),
  }

  const state = {
    pos: testBuffer,
    fitness: cost_func(testBuffer),
  }

  const STEPS = 5
  const stepSizes = domain.map(f => (f[1] - f[0]) / STEPS)

  return {
    best: best,
    particles: [state],
    runNext: (iteration: number) => {
      const fitness = cost_func(testBuffer)
      if (fitness < best.fitness) {
        best.fitness = fitness
        best.pos = new Float32Array(testBuffer) as Pos_Buffer
      }

      state.fitness = fitness
      state.pos = testBuffer

      let dim = 0

      while (true) {
        testBuffer[dim] = testBuffer[dim] + stepSizes[dim]

        if (testBuffer[dim] > domain[dim][1]) {
          testBuffer[dim] = domain[dim][0]
          dim++

          if (dim >= testBuffer.length) {
            dim = 0
            for (let i = 0; i < testBuffer.length; i++) {
              testBuffer[i] = 0
            }
          }
        } else {
          break
        }
      }
    },
  }
}
