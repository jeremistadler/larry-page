import {DomainBounds, Triangle_Buffer} from './types'

export type Particle = {
  pos: Triangle_Buffer
  fitness: number
  rollingFitnessDelta: number
  variables: number[]
}

function randomNumber(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export async function runPSO(
  cost_func: (data: Triangle_Buffer) => number,
  featureCount: number,
  particleCount: number,
  domain: DomainBounds[],
  onGeneration: (
    best: Triangle_Buffer,
    particles: Particle[],
    rollingFitnessImprovement: number,
  ) => Promise<void>,
) {
  let bestGlobalPos = new Float32Array(featureCount) as Triangle_Buffer
  let bestGlobalFitness = 100000000
  let lastGenerationBestFitness = 100000000
  let rollingFitnessImprovement = 0

  const particles = Array.from({length: particleCount}).map(() => {
    const pos = new Float32Array(
      Array.from({length: featureCount}).map((_, i) =>
        randomNumber(domain[i][0], domain[i][1]),
      ),
    ) as Triangle_Buffer
    const fitness = cost_func(pos)

    if (fitness < bestGlobalFitness) {
      bestGlobalFitness = fitness
      bestGlobalPos = pos
      lastGenerationBestFitness = fitness
    }

    const velocity = new Float32Array(featureCount)

    for (let i = 0; i < velocity.length; i++)
      velocity[i] = randomNumber(-0.1, 0.1)

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
  })

  particles.sort(
    (a, b) =>
      a.variables.reduce((s, f) => s + f) - b.variables.reduce((s, f) => s + f),
  )

  for (let iteration = 0; ; iteration++) {
    for (const particle of particles) {
      const [omega, phiParticle, phiGlobal, megaDelta, learningRate] =
        particle.variables

      for (let i = 0; i < particle.pos.length; i++) {
        const bestPos = particle.bestPos[i]
        const pos = particle.pos[i]
        const vel = particle.velocity[i]

        particle.velocity[i] =
          vel * omega +
          phiGlobal * Math.random() * (bestGlobalPos[i] - pos) +
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

      // if (delta < 0.9) {
      //   const newParticle = {
      //     fitness: particle.fitness,
      //     pos: new Float32Array(particle.pos) as Triangle_Buffer,
      //     bestPos: new Float32Array(particle.pos) as Triangle_Buffer,
      //     bestFitness: particle.bestFitness,
      //     velocity: new Float32Array(particle.velocity),
      //     variables: particle.variables,
      //     rollingFitnessDelta: 1,
      //   }

      //   for (let i = 0; i < newParticle.velocity.length; i++) {
      //     newParticle.velocity[i] = -newParticle.velocity
      //   }

      //   particles.push(newParticle)
      // }

      if (particle.fitness < particle.bestFitness) {
        particle.bestFitness = particle.fitness
        particle.bestPos = new Float32Array(particle.pos) as Triangle_Buffer

        if (particle.fitness < bestGlobalFitness) {
          bestGlobalFitness = particle.fitness
          bestGlobalPos = new Float32Array(particle.pos) as Triangle_Buffer
        }
      }
    }

    // for (let p = particles.length - 1; p >= 0; p--) {
    //   const particle = particles[p]

    //   if (particle.rollingFitnessDelta > 1.1) particles.splice(p, 1)
    // }

    const fitnessImprovement = lastGenerationBestFitness - bestGlobalFitness
    lastGenerationBestFitness = bestGlobalFitness
    rollingFitnessImprovement = lerp(
      rollingFitnessImprovement,
      fitnessImprovement,
      0.1,
    )

    if (iteration > 0 && iteration % 50 === 0) {
      await onGeneration(bestGlobalPos, particles, rollingFitnessImprovement)
    }

    if (iteration > 0 && iteration % 400 === 0) {
      for (let p = particles.length - 1; p >= 0; p--) {
        const particle = particles[p]

        for (let i = 0; i < particle.pos.length; i++) {
          particle.pos[i] = randomNumber(domain[i][0], domain[i][1])
          particle.bestPos[i] = randomNumber(domain[i][0], domain[i][1])
          particle.velocity[i] = randomNumber(-0.2, 0.2)
        }
      }
    }

    // console.log({
    //   fitnessImprovement,
    //   rollingFitnessImprovement,
    // })
  }

  return bestGlobalPos
}

function lerp(start: number, end: number, amt: number) {
  return (1 - amt) * start + amt * end
}
