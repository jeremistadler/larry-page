import {DomainBounds, Optimizer, Pos_Buffer} from './micro.js'
import incrSGDRegression from '@stdlib/ml-incr-sgd-regression'
import {randomNumberBounds} from './randomNumberBetween.js'

export function createStochasticGradientDescent(
  cost_func: (data: Pos_Buffer) => number,
  previousBest: Pos_Buffer,
  domain: DomainBounds[],
): Optimizer {
  const testBuffer = new Float32Array(previousBest) as Pos_Buffer

  const state = {
    pos: previousBest,
    fitness: cost_func(testBuffer),
  }

  var accumulator = incrSGDRegression()

  return {
    best: state,
    particles: [state],
    hasConverged: () => false,
    runNext: (iteration: number) => {
      for (let i = 0; i < testBuffer.length; i++) {
        testBuffer[i] = randomNumberBounds(domain[i])
      }

      const fitness = cost_func(testBuffer)

      // accumulator([...testBuffer], fitness)

      if (iteration % 100 === 0) {
        console.log(fitness, accumulator.coefs)

        if (fitness < state.fitness) {
          state.fitness = fitness
          state.pos = new Float32Array(testBuffer) as Pos_Buffer
        }
      }
    },
  }
}
