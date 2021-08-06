export async function runPSO(cost_func, featureCount, onGeneration) {
  const particleCount = 30

  let bestGlobalPos = new Float32Array(featureCount)
  let bestGlobalFitness = 100000000
  let lastGenerationBestFitness = 100000000
  let rollingFitnessImprovement = 100

  const omega = 0.8
  const phiParticle = 0.4
  const phiGlobal = 0.4
  const learningRate = 1

  const particles = Array.from({length: particleCount}).map(() => {
    const pos = Array.from({length: featureCount}).map(() => Math.random())
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
      pos: new Float32Array(pos),
      bestPos: new Float32Array(pos),
      fitness,
      bestFitness: fitness,
      velocity: velocity,
    }
  })

  for (let generation = 0; generation < 1000; generation++) {
    for (const particle of particles) {
      for (let i = 0; i < particle.pos.length; i++) {
        const bestPos = particle.bestPos[i]
        const pos = particle.pos[i]
        const vel = particle.velocity[i]

        particle.velocity[i] =
          vel * omega +
          phiGlobal * Math.random() * (bestGlobalPos[i] - pos) +
          phiParticle * Math.random() * (bestPos - pos)

        particle.pos[i] += particle.velocity[i] * learningRate
      }
      particle.fitness = cost_func(particle.pos)
      if (particle.fitness < particle.bestFitness) {
        particle.bestFitness = particle.fitness
        particle.bestPos = new Float32Array(particle.pos)

        if (particle.fitness < bestGlobalFitness) {
          bestGlobalFitness = particle.fitness
          bestGlobalPos = new Float32Array(particle.pos)
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

    if (rollingFitnessImprovement < 1) {
      break
    }

    await onGeneration(bestGlobalPos, particles)
  }

  return bestGlobalPos
}

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end
}
