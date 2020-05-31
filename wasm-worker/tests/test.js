const SIZE = 25
const MAX_TRIANGLES = 100

const {wasm, memory} = require('./initTest')(SIZE, MAX_TRIANGLES)
const chalk = require('chalk')
const {rasterizeAtPos, calcMinMax} = wasm.exports

// const pixelDataCount = SIZE * SIZE * 3
// const pixelDataByteLength = pixelDataCount * 4
// const pixelPointer = 0
// const pixelData = new Float32Array(memory.buffer, pixelPointer, pixelDataCount)

const minMaxDataCount = SIZE * 2 * MAX_TRIANGLES
const minMaxByteLength = minMaxDataCount
const minMaxPointer = 0
const minMaxData = new Uint8Array(memory.buffer, minMaxPointer, minMaxDataCount)

const srcColorCount = 4 * MAX_TRIANGLES
const srcColorByteLength = srcColorCount * 4
const srcColorPointer = minMaxPointer + minMaxByteLength
const srcColorData = new Float32Array(
  memory.buffer,
  srcColorPointer,
  srcColorCount,
)

const dstColorCount = 4
const dstColorByteLength = dstColorCount * 4
const dstColorPointer = srcColorPointer + srcColorByteLength
const dstColorData = new Float32Array(
  memory.buffer,
  dstColorPointer,
  dstColorCount,
)

let triangleIndex = 0

function prepareTriangle(r, g, b, a, ax, ay, bx, by, cx, cy) {
  srcColorData[triangleIndex * 4 + 0] = r
  srcColorData[triangleIndex * 4 + 1] = g
  srcColorData[triangleIndex * 4 + 2] = b
  srcColorData[triangleIndex * 4 + 3] = a

  calcMinMax(minMaxPointer, triangleIndex, ax, ay, bx, by, cx, cy)
  triangleIndex++
}

for (let y = 0; y < SIZE * MAX_TRIANGLES; y++) {
  minMaxData[y * 2 + 0] = 255
  minMaxData[y * 2 + 1] = 0
}

prepareTriangle(1, 0, 0, 0.4, 0, 0, 8, 2, 4, 11)
prepareTriangle(0, 0.3, 0, 0.4, 0, 3, 14, 11, 7, 14)

const TRIANGLES_DRAWN = triangleIndex

for (let y = 0; y < SIZE; y++) {
  const a = [minMaxData[y * 2 + 0].toString().padEnd(3, ' ') + '|']
  for (let x = 0; x < SIZE; x++) {
    dstColorData[0] = 0
    dstColorData[1] = 0
    dstColorData[2] = 0

    rasterizeAtPos(
      srcColorPointer,
      dstColorPointer,
      minMaxPointer,

      x,
      y,

      0,
      TRIANGLES_DRAWN - 1,
    )

    const r = dstColorData[0]
    const g = dstColorData[1]
    const b = dstColorData[2]

    const num = (r + g + b)
      .toString()
      .replace('0.', '.')
      .padEnd(2, ' ')
      .slice(0, 2)

    a.push(chalk.rgb(r * 255, g * 255, b * 255)(num))
  }
  a.push('|' + minMaxData[y * 2 + 1].toString().padStart(3, ' '))
  console.log(a.join(''))
}

//assert.equal(result, 3)
//console.log('ok')
