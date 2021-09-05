import {Pos_Buffer} from './micro'
import fmin from 'optimization-js'

export type KnownPoints = {
  pos: Pos_Buffer
  fitness: number
}

export async function runPSO(
  cost_func: (data: Pos_Buffer) => number,
  featureCount: number,
  onGeneration: (best: Pos_Buffer, knownPoints: KnownPoints[]) => Promise<void>,
) {
  let best = {
    pos: new Float32Array(featureCount) as Pos_Buffer,
    fitness: 1,
  }
  for (let i = 0; i < featureCount; i++) {
    best.pos[i] = Math.random()
  }
  best.fitness = cost_func(best.pos)

  const seen: KnownPoints[] = []

  const costFn = (pos: Pos_Buffer) => {
    const c = new Float32Array(pos) as Pos_Buffer
    const f = cost_func(c)
    seen.push({fitness: f, pos: c})
    return f
  }

  while (true) {
    const temp = new Float32Array(best.pos)
    // for (let i = 0; i < featureCount; i++) {
    //   temp[i] = Math.random()
    // }
    const result = fmin.minimize_Powell(costFn, [...temp]) as {
      argument: Float32Array
      fncvalue: number
    }

    best = {fitness: result.fncvalue, pos: result.argument as Pos_Buffer}

    await onGeneration(best.pos, seen)
  }
}
