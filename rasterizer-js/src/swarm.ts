import {Triangle_Buffer} from './types'

export async function runPSO(
  cost_func: (data: Triangle_Buffer) => number,
  featureCount: number,
  particleCount: number,
  onGeneration: (
    best: Triangle_Buffer,
    particles: {pos: Triangle_Buffer; fitness: number; variables: number[]}[],
  ) => Promise<void>,
) {
  let bestGlobalPos = new Float32Array(featureCount) as Triangle_Buffer
  let bestGlobalFitness = 100000000
  let lastGenerationBestFitness = 100000000
  let rollingFitnessImprovement = 100

  const particles = Array.from({length: particleCount}).map(() => {
    const pos = new Float32Array(
      Array.from({length: featureCount}).map(() => Math.random()),
    ) as Triangle_Buffer
    const fitness = cost_func(pos)

    if (fitness < bestGlobalFitness) {
      bestGlobalFitness = fitness
      bestGlobalPos = pos
      lastGenerationBestFitness = fitness
    }

    const velocity = new Float32Array(featureCount)

    for (let i = 0; i < velocity.length; i++)
      velocity[i] = (Math.random() - 0.5) * 0.1

    return {
      pos: new Float32Array(pos) as Triangle_Buffer,
      bestPos: new Float32Array(pos) as Triangle_Buffer,
      fitness,
      bestFitness: fitness,
      velocity: velocity,
      variables: [
        Math.random() * 1.9,
        Math.random() * 2.0,
        Math.random() * 2.0,
        Math.random() * 0.1,
        Math.random() * 1.0,
      ],
    }
  })

  particles.sort(
    (a, b) =>
      a.variables.reduce((s, f) => s + f) - b.variables.reduce((s, f) => s + f),
  )

  while (true) {
    for (const particle of particles) {
      const [omega, phiParticle, phiGlobal, megaDelta, learningRate] =
        particle.variables

      let totalVelocity = 0
      for (let i = 0; i < particle.pos.length; i++) {
        const bestPos = particle.bestPos[i]
        const pos = particle.pos[i]
        const vel = particle.velocity[i]

        particle.velocity[i] =
          vel * omega +
          phiGlobal * Math.random() * (bestGlobalPos[i] - pos) +
          phiParticle * Math.random() * (bestPos - pos) +
          (Math.random() - 0.5) * megaDelta

        totalVelocity += Math.abs(particle.velocity[i])

        particle.pos[i] += particle.velocity[i] * learningRate

        if (particle.pos[i] < 0) {
          particle.pos[i] = 0
          if (particle.velocity[i] < 0) particle.velocity[i] = 0
        }

        if (particle.pos[i] > 1) {
          particle.pos[i] = 1
          if (particle.velocity[i] > 0) particle.velocity[i] = 0
        }
      }

      if (totalVelocity < 0.1) {
        for (let i = 0; i < particle.pos.length; i++) {
          particle.pos[i] += (Math.random() - 0.5) * 0.1
          particle.velocity[i] += (Math.random() - 0.5) * 0.1
        }
      }

      particle.fitness = cost_func(particle.pos)

      if (particle.fitness < particle.bestFitness) {
        particle.bestFitness = particle.fitness
        particle.bestPos = new Float32Array(particle.pos) as Triangle_Buffer

        if (particle.fitness < bestGlobalFitness) {
          bestGlobalFitness = particle.fitness
          bestGlobalPos = new Float32Array(particle.pos) as Triangle_Buffer
        }
      }
    }

    const fitnessImprovement = lastGenerationBestFitness - bestGlobalFitness
    lastGenerationBestFitness = bestGlobalFitness
    rollingFitnessImprovement = lerp(
      rollingFitnessImprovement,
      fitnessImprovement,
      0.1,
    )

    console.log({
      fitnessImprovement,
      rollingFitnessImprovement,
    })

    // if (rollingFitnessImprovement < 1) {
    //   break
    // }

    await onGeneration(bestGlobalPos, particles)
  }

  return bestGlobalPos
}

function lerp(start: number, end: number, amt: number) {
  return (1 - amt) * start + amt * end
}
