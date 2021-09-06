import {createParticleSwarmOptimization} from './swarm'
import {createMutateAll} from './mutate_all'
import {createMutateOne} from './mutate_one'
import {DomainBounds, Optimizer, OptimizerType, Pos_Buffer} from './micro'
import {createDifferentialEvolution} from './differential_evolution'
import {createStochasticGradientDescent} from './stochastic_gradient_descent'
import {createGridSearch} from './grid_search'
import {createGridSearch4D} from './grid_search_4d'

export const OPTIMIZER_LIST: OptimizerType[] = [
  'particle_swarm_optimization',
  'differential_evolution',
  'mutate_all',
  'mutate_one',
  'grid_search',
  'grid_search_4d',
  // 'stochastic_gradient_descent',
]

export function createOptimizer(
  type: OptimizerType,
  cost_func: (data: Pos_Buffer) => number,
  domain: DomainBounds[],
  previousBest: Pos_Buffer,
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

    case 'grid_search':
      return createGridSearch(cost_func, previousBest, domain)

    case 'grid_search_4d':
      return createGridSearch4D(cost_func, previousBest, domain)

    case 'stochastic_gradient_descent':
      return createStochasticGradientDescent(cost_func, previousBest, domain)
  }
}
