const SIZE = 255
const MAX_TRIANGLES = 100
const {wasm, memory} = require('./initTest')(SIZE, MAX_TRIANGLES)
const {calcMinMax, calculateFitness} = wasm.exports

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

const comparePixelCount = SIZE * SIZE * 3
const comparePixelByteLength = comparePixelCount
const comparePixelPointer = dstColorPointer + dstColorByteLength
const comparePixelData = new Uint8Array(
  memory.buffer,
  comparePixelPointer,
  comparePixelCount,
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

module.exports.prepareWasmDna = function prepareWasmDna(dna) {
  triangleIndex = 0
  for (let y = 0; y < SIZE * MAX_TRIANGLES; y++) {
    minMaxData[y * 2 + 0] = 255
    minMaxData[y * 2 + 1] = 0
  }

  for (var i = 0; i < dna.genes.length; i++) {
    const gene = dna.genes[i]

    prepareTriangle(
      gene.color[0],
      gene.color[1],
      gene.color[2],
      gene.color[3],
      gene.pos[0] * SIZE,
      gene.pos[1] * SIZE,
      gene.pos[2] * SIZE,
      gene.pos[3] * SIZE,
      gene.pos[4] * SIZE,
      gene.pos[5] * SIZE,
    )
  }
}

module.exports.calculateFitnessWasm = function calculateFitnessWasm(dna) {
  triangleIndex = 0
  for (let y = 0; y < SIZE * MAX_TRIANGLES; y++) {
    minMaxData[y * 2 + 0] = 255
    minMaxData[y * 2 + 1] = 0
  }

  calculateFitness(
    srcColorPointer,
    dstColorPointer,
    comparePixelPointer,
    minMaxPointer,

    0,
    triangleIndex - 1,
  )
}
