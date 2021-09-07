import {randomNumberBetween, randomNumberBounds} from './randomNumberBetween'
import {DomainBounds, Optimizer, Pos_Buffer} from './micro'

export function createParticleSwarmOptimization(
  cost_func: (data: Pos_Buffer) => number,
  previousBest: Pos_Buffer,
  domain: DomainBounds[],
): Optimizer {
  const particleCount = 50

  const best = {
    pos: previousBest,
    fitness: cost_func(previousBest),
  }

  const particles = Array.from({length: particleCount}).map(
    (_, particleIndex) => {
      const pos =
        particleIndex === 0
          ? previousBest
          : (new Float32Array(previousBest.length) as Pos_Buffer)

      if (particleIndex > 0)
        for (let i = 0; i < pos.length; i++)
          pos[i] = randomNumberBounds(domain[i])

      const fitness = cost_func(pos)

      if (fitness < best.fitness) {
        best.fitness = fitness
        best.pos = pos
      }

      const velocity = new Float32Array(previousBest.length)

      for (let i = 0; i < velocity.length; i++)
        velocity[i] = randomNumberBetween(-0.1, 0.1)

      return {
        pos: new Float32Array(pos) as Pos_Buffer,
        fitness,
        rollingFitnessDelta: 1,
        velocity: velocity,
        variables: [
          // Math.random() * 1.9,
          // Math.random() * 2.0,
          // Math.random() * 2.0,
          // Math.random() * 0.1,
          // Math.random() * 1.0,

          0.9, 0.1, 0.001, 0.1,
        ],
      }
    },
  )

  // particles.sort(
  //   (a, b) =>
  //     a.variables.reduce((s, f) => s + f) - b.variables.reduce((s, f) => s + f),
  // )

  return {
    best: best,
    particles,
    runNext: (iteration: number) => {
      for (const particle of particles) {
        const [omega, phiGlobal, megaDelta, learningRate] = particle.variables

        for (let i = 0; i < particle.pos.length; i++) {
          // const bestPos = particle.bestPos[i]
          const pos = particle.pos[i]
          const vel = particle.velocity[i]

          particle.velocity[i] =
            vel * omega +
            phiGlobal * Math.random() * (best.pos[i] - pos) +
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

        if (particle.fitness < best.fitness) {
          best.fitness = particle.fitness
          best.pos = new Float32Array(particle.pos) as Pos_Buffer
        }
      }

      if (iteration !== 0 && iteration % 100 === 0) {
        let totalVelocity = 0

        for (let i = 0; i < particles.length; i++) {
          for (let p = 0; p < best.pos.length; p++) {
            totalVelocity += Math.abs(particles[i].velocity[p])
          }
        }

        const scaledVel = totalVelocity / (particles.length * best.pos.length)

        if (scaledVel < 0.0006) {
          for (let p = 0; p < particles.length; p++) {
            const particle = particles[p]

            for (let i = 0; i < particle.pos.length; i++) {
              particle.pos[i] = randomNumberBounds(domain[i])
              particle.velocity[i] = randomNumberBetween(-1, 1)
            }
          }
        }
      }
    },
  }
}

function lerp(start: number, end: number, amt: number) {
  return (1 - amt) * start + amt * end
}
