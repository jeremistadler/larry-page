import {randomNumberBounds} from './randomNumberBetween'
import {DomainBounds, Optimizer, Pos_Buffer} from './micro'

export function createDifferentialEvolution(
  cost_func: (data: Pos_Buffer) => number,
  previousBest: Pos_Buffer,
  domain: DomainBounds[],
): Optimizer {
  const state = {
    pos: previousBest,
    fitness: cost_func(previousBest),
  }

  const CR = 0.9
  const F = 0.8
  const particleCount = 30

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

      if (fitness < state.fitness) {
        state.fitness = fitness
        state.pos = new Float32Array(pos) as Pos_Buffer
      }

      return {
        pos,
        fitness,
      }
    },
  )

  const temp = new Float32Array(previousBest.length) as Pos_Buffer

  return {
    best: state,
    particles,
    runNext: (iteration: number) => {
      if (iteration % 100 === 1) {
        const pos = new Float32Array(previousBest.length) as Pos_Buffer

        for (let i = 0; i < pos.length; i++)
          pos[i] = randomNumberBounds(domain[i])

        const fitness = cost_func(pos)

        if (fitness < state.fitness) {
          state.fitness = fitness
          state.pos = new Float32Array(pos) as Pos_Buffer
        }

        // console.log('Adding one', particles.length)

        particles.push({
          pos,
          fitness,
        })
      }

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

        const dim = Math.floor(Math.random() * previousBest.length)

        for (let i = 0; i < temp.length; i++) {
          let val =
            i === dim || Math.random() < CR
              ? a.pos[i] + F * (b.pos[i] - c.pos[i])
              : particle.pos[i]

          if (val < domain[i][0]) val = domain[i][0]
          if (val > domain[i][1]) val = domain[i][1]

          temp[i] = val
        }

        const testFitness = cost_func(temp)

        if (testFitness < particle.fitness) {
          particle.fitness = testFitness
          particle.pos = new Float32Array(temp) as Pos_Buffer

          if (testFitness < state.fitness) {
            state.fitness = testFitness
            state.pos = particle.pos
          }
        }
      }
    },
  }
}

function randomIn<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)]
}
