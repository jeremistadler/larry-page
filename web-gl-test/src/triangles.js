import {regl} from './regl'

export const TEXTURE_SIZE = 128

export const triangles = [
  {
    pos: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    color: [
      [0.5, 0.3, 0.4, 0.8],
      [0.2, 0.6, 0.4, 0.8],
      [0.4, 0.1, 0.1, 0.8],
    ],
  },
  {
    pos: [
      [1, 1],
      [-0.3, -0.7],
      [0.2, -0.6],
    ],
    color: [
      [0.2, 0.2, 0.6, 0.8],
      [0.2, 0.2, 0.9, 0.8],
      [0.2, 0.2, 0.8, 0.8],
    ],
  },
]

triangles.length = 0
for (let i = 0; i < 8; i++) {
  triangles.push({
    pos: [
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    color: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
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
