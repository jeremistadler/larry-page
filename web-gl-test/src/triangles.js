import {regl} from './regl'

export const TEXTURE_SIZE = 64

export const RISO_COLORS = [
  // [0, 0, 0],
  // [0, 131, 138],
  // [0, 120, 191],
  // [255, 102, 94],
  // [255, 232, 0],
  // [0, 169, 92],

  [255, 232, 0],
  [255, 108, 47],
  [118, 91, 167],
]
export const TOTAL_TRIANGLES = 50

export let posData = new Float32Array(TOTAL_TRIANGLES * 3 * 2)
export let colorData = new Float32Array(TOTAL_TRIANGLES * 4 * 3)

// export const triangles = [
//   {
//     pos: [0, 0, 1, 0, 0, 1],
//     color: [0.5, 0.3, 0.4, 0.8, 0.2, 0.6, 0.4, 0.8, 0.4, 0.1, 0.1, 0.8],
//   },
// ]

for (let i = 0; i < TOTAL_TRIANGLES; i++) {
  const color = [
    ...RISO_COLORS[Math.floor((i / TOTAL_TRIANGLES) * RISO_COLORS.length)],
    220,
  ]

  for (let y = 0; y < color.length; y++) {
    colorData[i * 4 * 3 + y + 4 * 0] = color[y] / 255
    colorData[i * 4 * 3 + y + 4 * 1] = color[y] / 255
    colorData[i * 4 * 3 + y + 4 * 2] = color[y] / 255
  }

  // const color = [...RISO_COLORS[i], 255]
  // for (let y = 0; y < color.length; y++) {
  //   colorData[i * 4 * 3 + y + 4 * 0] = color[y] / 255
  //   colorData[i * 4 * 3 + y + 4 * 1] = color[y] / 255
  //   colorData[i * 4 * 3 + y + 4 * 2] = color[y] / 255
  // }

  // const x = i / TOTAL_TRIANGLES
  // const d = TOTAL_TRIANGLES / 80

  // posData[i * 3 * 2 + 0] = x
  // posData[i * 3 * 2 + 1] = 0.4

  // posData[i * 3 * 2 + 2] = x + d
  // posData[i * 3 * 2 + 3] = 0.6

  // posData[i * 3 * 2 + 4] = x + d * 2
  // posData[i * 3 * 2 + 5] = 0.4
}

// for (let y = 0; y < posData.length; y++) {
//   posData[y] = Math.random()
// }

console.log({posData, colorData})

export const posBuffer = regl.buffer({
  usage: 'dynamic',
  type: 'float',
  length: posData.length,
  data: posData,
})

export const colorBuffer = regl.buffer({
  usage: 'static',
  type: 'float',
  length: colorData.length,
  data: colorData,
})
