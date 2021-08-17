import {Triangle_Buffer} from './types'

function randomNormalDist(): number {
  let u = 0,
    v = 0
  while (u === 0) u = Math.random() //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random()
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  num = num / 10.0 + 0.5 // Translate to 0 -> 1
  if (num > 1 || num < 0) return randomNormalDist() // resample between 0 and 1
  return num
}

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
