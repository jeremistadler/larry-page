import {randomNumberBetween, randomNumberBounds} from './randomNumberBetween'
import {DomainBounds, Optimizer, Triangle_Buffer} from './types'

export function createParticleSwarmOptimization(
  cost_func: (data: Triangle_Buffer) => number,
  previousBest: Triangle_Buffer,
  domain: DomainBounds[],
): Optimizer {
  const particleCount = 20

  const state = {
    pos: previousBest,
    fitness: cost_func(previousBest),
  }

  const particles = Array.from({length: particleCount}).map(
    (_, particleIndex) => {
      const pos =
        particleIndex === 0
          ? previousBest
          : (new Float32Array(previousBest.length) as Triangle_Buffer)

      if (particleIndex > 0)
        for (let i = 0; i < pos.length; i++)
          pos[i] = randomNumberBounds(domain[i])

      const fitness = cost_func(pos)

      if (fitness < state.fitness) {
        state.fitness = fitness
        state.pos = pos
      }

      const velocity = new Float32Array(previousBest.length)

      for (let i = 0; i < velocity.length; i++)
        velocity[i] = randomNumberBetween(-0.1, 0.1)

      return {
        pos: new Float32Array(pos) as Triangle_Buffer,
        bestPos: new Float32Array(pos) as Triangle_Buffer,
        fitness,
        rollingFitnessDelta: 1,
        bestFitness: fitness,
        velocity: velocity,
        variables: [
          // Math.random() * 1.9,
          // Math.random() * 2.0,
          // Math.random() * 2.0,
          // Math.random() * 0.1,
          // Math.random() * 1.0,

          0.8, 0.1, 0.1, 0.05, 0.3,
        ],
      }
    },
  )

  particles.sort(
    (a, b) =>
      a.variables.reduce((s, f) => s + f) - b.variables.reduce((s, f) => s + f),
  )

  return {
    best: state,
    particles,
    runNext: (iteration: number) => {
      for (const particle of particles) {
        const [omega, phiParticle, phiGlobal, megaDelta, learningRate] =
          particle.variables

        for (let i = 0; i < particle.pos.length; i++) {
          const bestPos = particle.bestPos[i]
          const pos = particle.pos[i]
          const vel = particle.velocity[i]

          particle.velocity[i] =
            vel * omega +
            phiGlobal * Math.random() * (state.pos[i] - pos) +
            phiParticle * Math.random() * (bestPos - pos) +
            (Math.random() - 0.5) * megaDelta

          particle.pos[i] += particle.velocity[i] * learningRate
          const [min, max] = domain[i]

          if (particle.pos[i] < min) {
            particle.pos[i] = min
            if (particle.velocity[i] < 0) particle.velocity[i] = 0
          }

          if (particle.pos[i] > max) {
            particle.pos[i] = max
            if (particle.velocity[i] > 0) particle.velocity[i] = 0
          }
        }

        const oldFitness = particle.fitness
        particle.fitness = cost_func(particle.pos)
        const delta = oldFitness / particle.fitness

        particle.rollingFitnessDelta = lerp(
          particle.rollingFitnessDelta,
          delta,
          0.5,
        )

        if (particle.fitness < particle.bestFitness) {
          particle.bestFitness = particle.fitness
          particle.bestPos = new Float32Array(particle.pos) as Triangle_Buffer

          if (particle.fitness < state.fitness) {
            state.fitness = particle.fitness
            state.pos = new Float32Array(particle.pos) as Triangle_Buffer
          }
        }
      }

      if (iteration !== 0 && iteration % 400 === 0) {
        for (let p = particles.length - 1; p >= 0; p--) {
          const particle = particles[p]

          for (let i = 0; i < particle.pos.length; i++) {
            particle.pos[i] = randomNumberBetween(domain[i][0], domain[i][1])
            particle.bestPos[i] = randomNumberBetween(
              domain[i][0],
              domain[i][1],
            )
            particle.velocity[i] = randomNumberBetween(-0.2, 0.2)
          }
        }
      }
    },
  }
}

function lerp(start: number, end: number, amt: number) {
  return (1 - amt) * start + amt * end
}
