const assert = require('assert')
const {wasm, memory} = require('./initTest')
const chalk = require('chalk')
const {rasterizeTriangle} = wasm.exports

const SIZE = 5

const pixelDataCount = SIZE * SIZE * 3
const pixelDataByteLength = pixelDataCount * 4
const pixelPointer = 0
const pixelData = new Float32Array(memory.buffer, pixelPointer, pixelDataCount)

const minMaxDataCount = SIZE * 2
const minMaxByteLength = minMaxDataCount
const minMaxPointer = pixelPointer + pixelDataByteLength
const minMaxData = new Uint8Array(memory.buffer, minMaxPointer, minMaxDataCount)

for (let y = 0; y < SIZE; y++) {
  minMaxData[y * 2 + 0] = SIZE
  minMaxData[y * 2 + 1] = 0
}

rasterizeTriangle(
  pixelPointer,
  minMaxPointer,
  2,
  0,
  SIZE + 1,
  SIZE + 1,
  SIZE + 1,
  0,
  1,
  0.2,
  0.2,
  1,
)

// for (let y = 0; y < SIZE; y++) {
//   minMaxData[y * 2 + 0] = SIZE
//   minMaxData[y * 2 + 1] = 0
// }

// rasterizeTriangle(
//   pixelPointer,
//   minMaxPointer,
//   SIZE + 1,
//   SIZE + 1,
//   SIZE + 1,
//   0,
//   0,
//   SIZE + 1,
//   0.2,
//   0.2,
//   1,
//   1,
// )

for (let y = 0; y < SIZE; y++) {
  const a = [minMaxData[y * 2 + 0] + '|']
  for (let x = 0; x < SIZE; x++) {
    const r = pixelData[(y * SIZE + x) * 3 + 0]
    const g = pixelData[(y * SIZE + x) * 3 + 1]
    const b = pixelData[(y * SIZE + x) * 3 + 2]

    const num = (r + g + b)
      .toString()
      .replace('0.', '.')
      .padEnd(2, ' ')
      .slice(0, 2)

    a.push(chalk.rgb(r * 255, g * 255, b * 255)(num))
  }
  a.push('|' + minMaxData[y * 2 + 1])
  console.log(a.join(''))
}

//assert.equal(result, 3)
//console.log('ok')
