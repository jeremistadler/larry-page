import {Triangle_Buffer} from './types'

export async function runPSO(
  cost_func: (data: Triangle_Buffer) => number,
  featureCount: number,
  particleCount: number,
  onGeneration: (
    best: Triangle_Buffer,
    particles: {pos: Triangle_Buffer; fitness: number}[],
  ) => Promise<void>,
) {
  let bestGlobalPos = new Float32Array(featureCount) as Triangle_Buffer
  let bestGlobalFitness = 100000000
  let lastGenerationBestFitness = 100000000
  let rollingFitnessImprovement = 100

  const omega = 0.98
  const phiParticle = 0.1
  const phiGlobal = 0.01
  const learningRate = 1

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
    }
  })

  for (let generation = 0; generation < 1000; generation++) {
    for (const particle of particles) {
      let totalVelocity = 0
      for (let i = 0; i < particle.pos.length; i++) {
        const bestPos = particle.bestPos[i]
        const pos = particle.pos[i]
        const vel = particle.velocity[i]

        particle.velocity[i] =
          vel * omega +
          phiGlobal * Math.random() * (bestGlobalPos[i] - pos) +
          phiParticle * Math.random() * (bestPos - pos)

        totalVelocity += Math.abs(particle.velocity[i])

        particle.pos[i] += particle.velocity[i] * learningRate
      }

      if (totalVelocity < 0.5) {
        for (let i = 0; i < particle.pos.length; i++) {
          particle.velocity[i] += (Math.random() - 0.5) * 0.2
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
