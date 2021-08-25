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

  const CR = 0.9
  const F = 0.8

  const particles = Array.from({length: particleCount}).map(() => {
    const pos = new Float32Array(
      Array.from({length: featureCount}).map(() => Math.random()),
    ) as Triangle_Buffer
    const fitness = cost_func(pos)

    if (fitness < bestGlobalFitness) {
      bestGlobalFitness = fitness
      bestGlobalPos = pos
    }

    return {
      pos: new Float32Array(pos) as Triangle_Buffer,
      fitness,
    }
  })

  for (let iteration = 0; ; iteration++) {
    for (const particle of particles) {
      let a = randomIn(particles)
      while (a === particle) {
        a = randomIn(particles)
      }

      let b = randomIn(particles)
      while (b === particle || a === b) {
        b = randomIn(particles)
      }

      let c = randomIn(particles)
      while (c === particle || c === b || c === a) {
        c = randomIn(particles)
      }

      const dim = Math.floor(Math.random() * featureCount)
      const temp = new Float32Array(particle.pos.length) as Triangle_Buffer

      for (let i = 0; i < temp.length; i++) {
        temp[i] =
          i === dim || Math.random() > CR
            ? a.pos[i] + F * (b.pos[i] - c.pos[i])
            : particle.pos[i]
      }

      const testFitness = cost_func(temp)

      if (testFitness < particle.fitness) {
        particle.fitness = testFitness
        particle.pos = temp

        if (testFitness < bestGlobalFitness) {
          bestGlobalFitness = testFitness
          bestGlobalPos = temp
        }
      }
    }

    if (iteration % 100 === 0) await onGeneration(bestGlobalPos, particles)
  }
}

function randomIn<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)]
}
