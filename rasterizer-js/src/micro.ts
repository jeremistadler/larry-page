export type Settings = {
  size: number
  viewportSize: number
  itemCount: number
  historySize: number
  itemSize: number
  type: 'triangle' | 'circle'
}

export type ColorMapItemNormalized = [R: number, G: number, B: number]
export type ColorMapNormalized = ColorMapItemNormalized[]

export const TRIANGLE_SIZE = 2 * 3 + 1 // (pos: 2 * 3) + (alpha * 1) = 7
export const CIRCLE_SIZE = 2 + 1 + 1 // (pos) radius + (alpha) = 4

export function indexToName(index: number) {
  switch (index % TRIANGLE_SIZE) {
    case 0:
      return 'x0'
    case 1:
      return 'y0'
    case 2:
      return 'x1'
    case 3:
      return 'y1'
    case 4:
      return 'x2'
    case 5:
      return 'y2'
    case 6:
      return 'a0'
    case 7:
      return 'a1'
    case 8:
      return 'a2'
  }

  return 'unknown ' + (index % TRIANGLE_SIZE)
}

/**
 * x0,y0 0,1
 * x1,y2 2,3
 * x2,y2 4,5
 * a0,a1,a2 6,7,8
 *
 * All values are from 0.0 to 1.0
 */
export type Pos_Buffer = Float32Array & {
  readonly Pos_Buffer: unique symbol
}

/**
 * RGB 0.0 to 1.0
 */
export type RGB_Norm_Buffer = Float32Array & {
  readonly RGB_Norm_Buffer: unique symbol
}

/**
 * R 0.0 to 1.0
 */
export type R_Norm_Buffer = Float32Array & {
  readonly R_Norm_Buffer: unique symbol
}

/**
 * RGB 0 to 255
 */
export type RGB_Byte_Buffer = Uint8Array & {
  readonly RGB_Norm_Buffer: unique symbol
}

/**
 * R 0 to 255
 */
export type R_Bit_Buffer = Uint8Array & {
  readonly R_Bit_Buffer: unique symbol
}

export type DomainBounds = [start: number, end: number]

export type Particle = {
  pos: Pos_Buffer
  fitness: number
}

export type Optimizer = {
  runNext: (iteration: number) => void
  best: {
    pos: Pos_Buffer
    fitness: number
  }
  particles: Particle[]
}

export type OptimizerType =
  | 'particle_swarm_optimization'
  | 'differential_evolution'
  | 'mutate_one'
  | 'mutate_all'
  | 'stochastic_gradient_descent'
  | 'grid_search'
  | 'grid_search_4d'
