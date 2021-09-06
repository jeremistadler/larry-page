import {DomainBounds, Optimizer, Triangle_Buffer} from './micro'

export function createGridSearch4D(
  cost_func: (data: Triangle_Buffer) => number,
  previousBest: Triangle_Buffer,
  domain: DomainBounds[],
): Optimizer {
  const testBuffer = new Float32Array(previousBest) as Triangle_Buffer

  const best = {
    pos: previousBest,
    fitness: cost_func(testBuffer),
  }

  const state = {
    pos: testBuffer,
    fitness: cost_func(testBuffer),
  }

  const STEPS = 8
  const stepSizes = domain.map(f => (f[1] - f[0]) / (STEPS - 1))

  return {
    best: best,
    particles: [state],
    runNext: (iteration: number) => {
      for (let i = 0; i < testBuffer.length; i++) {
        testBuffer[i] = best.pos[i]
      }

      if (testBuffer.length < 4) return

      let d1 = Math.floor(Math.random() * testBuffer.length)
      let d2 = d1
      let d3 = d1
      let d4 = d1

      while (d1 === d2) {
        d2 = Math.floor(Math.random() * testBuffer.length)
      }
      while (d1 === d3 || d2 === d3) {
        d3 = Math.floor(Math.random() * testBuffer.length)
      }
      while (d1 === d4 || d2 === d4 || d3 === d4) {
        d4 = Math.floor(Math.random() * testBuffer.length)
      }

      for (let a = 0; a < STEPS; a++) {
        testBuffer[d1] = a * stepSizes[d1]

        for (let b = 0; b < STEPS; b++) {
          testBuffer[d2] = b * stepSizes[d2]

          for (let c = 0; c < STEPS; c++) {
            testBuffer[d3] = c * stepSizes[d3]

            for (let d = 0; d < STEPS; d++) {
              testBuffer[d4] = d * stepSizes[d4]

              const fitness = cost_func(testBuffer)

              if (fitness < best.fitness) {
                best.fitness = fitness
                best.pos = new Float32Array(testBuffer) as Triangle_Buffer
              }
            }
          }
        }
      }
    },
  }
}
