import {createParticleSwarmOptimization} from './swarm'
import {createTopK} from './topK'
import {DomainBounds, Optimizer, OptimizerType, Triangle_Buffer} from './types'

export const OPTIMIZER_LIST: OptimizerType[] = [
  'particle_swarm_optimization',
  'top_k',
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

    case 'top_k':
      return createTopK(cost_func, previousBest, domain)
  }
}
