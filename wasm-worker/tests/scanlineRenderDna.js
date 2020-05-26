const SIZE = 255
const {wasm, memory} = require('./initTest')(255)
const {calcMinMax, rasterizeFloat} = wasm.exports

const pixelDataCount = SIZE * SIZE * 3
const pixelDataByteLength = pixelDataCount * 4
const pixelPointer = 0
const pixelData = new Float32Array(memory.buffer, pixelPointer, pixelDataCount)

const minMaxDataCount = SIZE * 2
const minMaxByteLength = minMaxDataCount
const minMaxPointer = pixelPointer + pixelDataByteLength
const minMaxData = new Uint8Array(memory.buffer, minMaxPointer, minMaxDataCount)

module.exports.renderDnaWasm = function renderDnaWasm(dna) {
  for (var i = 0; i < dna.genes.length; i++) {
    const gene = dna.genes[i]

    for (let y = 0; y < SIZE; y++) {
      minMaxData[y * 2 + 0] = SIZE
      minMaxData[y * 2 + 1] = 0
    }

    calcMinMax(
      minMaxPointer,
      gene.pos[0] * SIZE,
      gene.pos[1] * SIZE,
      gene.pos[2] * SIZE,
      gene.pos[3] * SIZE,
      gene.pos[4] * SIZE,
      gene.pos[5] * SIZE,
    )

    rasterizeFloat(
      pixelPointer,
      minMaxPointer,
      gene.color[0],
      gene.color[1],
      gene.color[2],
      gene.color[3],
    )
  }
}
