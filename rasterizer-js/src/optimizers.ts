import {createParticleSwarmOptimization} from './swarm'
import {createMutateAll} from './mutate_all'
import {createMutateOne} from './mutate_one'
import {DomainBounds, Optimizer, OptimizerType, Triangle_Buffer} from './types'
import {createDifferentialEvolution} from './differential_evolution'
import {createStochasticGradientDescent} from './stochastic_gradient_descent'

export const OPTIMIZER_LIST: OptimizerType[] = [
  'particle_swarm_optimization',
  'differential_evolution',
  'mutate_all',
  'mutate_one',
  // 'stochastic_gradient_descent',
]

export function createOptimizer(
  type: OptimizerType,
  cost_func: (data: Triangle_Buffer) => number,
  domain: DomainBounds[],
  previousBest: Triangle_Buffer,
): Optimizer {
  switch (type) {
    case 'particle_swarm_optimization':
      return createParticleSwarmOptimization(cost_func, previousBest, domain)

    case 'differential_evolution':
      return createDifferentialEvolution(cost_func, previousBest, domain)

    case 'mutate_all':
      return createMutateAll(cost_func, previousBest, domain)

    case 'mutate_one':
      return createMutateOne(cost_func, previousBest, domain)

    case 'stochastic_gradient_descent':
      return createStochasticGradientDescent(cost_func, previousBest, domain)
  }
}
