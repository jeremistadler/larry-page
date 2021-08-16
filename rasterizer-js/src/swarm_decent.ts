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

  const learningRate = 0.05

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
      fitness,
      velocity: velocity,
    }
  })

  while (true) {
    for (const particle of particles) {
      for (let i = 0; i < particle.pos.length; i++) {
        const pos = particle.pos[i]
        let velOld = particle.velocity[i]

        // if (Math.random() > 0.3) {
        //   particle.pos[i] = pos + velOld
        //   continue
        // }

        const velA = (Math.random() - 0.5) * learningRate
        const velB = (Math.random() - 0.5) * learningRate

        particle.pos[i] = pos + velA
        const fitnessA = cost_func(particle.pos)

        particle.pos[i] = pos + velB
        const fitnessB = cost_func(particle.pos)

        if (fitnessA < fitnessB) {
          velOld = velA
        } else {
          velOld = velB
        }

        if (Math.abs(fitnessA - fitnessB) <= 0.000001 && (pos < 0 || pos > 1)) {
          velOld = 0
        }

        particle.velocity[i] = velOld
        particle.pos[i] = pos + velOld
      }

      particle.fitness = cost_func(particle.pos)

      if (particle.fitness < bestGlobalFitness) {
        bestGlobalFitness = particle.fitness
        bestGlobalPos = new Float32Array(particle.pos) as Triangle_Buffer
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
