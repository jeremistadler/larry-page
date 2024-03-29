import {Pos_Buffer} from './micro.js'

export async function runPSO(
  cost_func: (data: Pos_Buffer) => number,
  featureCount: number,
  particleCount: number,
  onGeneration: (
    best: Pos_Buffer,
    particles: {pos: Pos_Buffer; fitness: number; variables: number[]}[],
  ) => Promise<void>,
) {
  let bestGlobalPos = new Float32Array(featureCount) as Pos_Buffer
  let bestGlobalFitness = 100000000

  const particles = Array.from({length: particleCount}).map((_, i) => {
    const pos = new Float32Array(
      Array.from({length: featureCount}).map(() => Math.random()),
    ) as Pos_Buffer
    const fitness = cost_func(pos)

    if (fitness < bestGlobalFitness) {
      bestGlobalFitness = fitness
      bestGlobalPos = pos
    }

    return {
      pos: new Float32Array(pos) as Pos_Buffer,
      fitness,
      variables: [lerp(0.12, 0.3, i / particleCount)],
    }
  })

  const testBuffer = new Float32Array(featureCount) as Pos_Buffer

  while (true) {
    for (const particle of particles) {
      let best = new Float32Array(particle.pos) as Pos_Buffer
      let bestFitness = 1000000

      for (let sample = 0; sample < 5000; sample++) {
        for (let i = 0; i < particle.pos.length; i++) {
          testBuffer[i] = Math.min(
            1,
            Math.max(
              0,
              particle.pos[i] + (Math.random() - 0.5) * particle.variables[0],
            ),
          )
        }

        const fitness = cost_func(testBuffer)
        if (fitness < bestFitness) {
          bestFitness = fitness
          best = new Float32Array(testBuffer) as Pos_Buffer

          if (fitness < bestGlobalFitness) {
            bestGlobalFitness = fitness
            bestGlobalPos = new Float32Array(testBuffer) as Pos_Buffer
          }
        }
      }

      particle.pos = best
      particle.fitness = bestFitness
    }

    await onGeneration(bestGlobalPos, particles)
  }
}

function lerp(start: number, end: number, amt: number) {
  return (1 - amt) * start + amt * end
}
