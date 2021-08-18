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
  const particles = Array.from({length: particleCount}).map((_, i) => {
    const pos = new Float32Array(
      Array.from({length: featureCount}).map(() => Math.random()),
    ) as Triangle_Buffer
    const fitness = cost_func(pos)

    return {
      pos,
      fitness,
      variables: [(i + 1) / (particleCount * 2)],
    }
  })

  const sampleSize = 100
  const testBuffer = new Float32Array(featureCount) as Triangle_Buffer

  while (true) {
    let globalBestFitness = particles[0].fitness
    let globalBestPos = particles[0].pos

    for (const particle of particles) {
      for (let sample = 0; sample < sampleSize; sample++) {
        for (let i = 0; i < particle.pos.length; i++) {
          testBuffer[i] =
            particle.pos[i] + (Math.random() - 0.5) * particle.variables[0]
        }
        const fitness = cost_func(testBuffer)
        if (fitness < particle.fitness) {
          particle.fitness = fitness
          particle.pos = new Float32Array(testBuffer) as Triangle_Buffer

          if (fitness < globalBestFitness) {
            globalBestFitness = fitness
            globalBestPos = particle.pos
          }
        }
      }
    }

    await onGeneration(globalBestPos, particles)
  }
}
