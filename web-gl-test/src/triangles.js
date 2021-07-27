import {regl} from './regl'

export const TEXTURE_SIZE = 64

export const RISO_COLORS = [
  [0, 0, 0],
  [0, 131, 138],
  [0, 120, 191],
  [255, 102, 94],
  [255, 232, 0],
  [0, 169, 92],
]

export const triangles = [
  {
    pos: [0, 0, 1, 0, 0, 1],
    color: [0.5, 0.3, 0.4, 0.8, 0.2, 0.6, 0.4, 0.8, 0.4, 0.1, 0.1, 0.8],
  },
]

const TOTAL_TRIANGLES = 10
triangles.length = 0
for (let i = 0; i < TOTAL_TRIANGLES; i++) {
  const color = [
    ...RISO_COLORS[Math.floor((i / TOTAL_TRIANGLES) * RISO_COLORS.length)],
    0.3,
  ]
  triangles.push({
    pos: [0, 0, 0, 0, 0, 0],
    color: [...color, ...color, ...color],
  })
}

export const posBuffer = regl.buffer({
  length: 2 * 3 * 4 * triangles.length,
  type: 'float',
  usage: 'dynamic',
})

export const colorBuffer = regl.buffer({
  length: 4 * 3 * 4 * triangles.length,
  type: 'float',
  usage: 'dynamic',
})
