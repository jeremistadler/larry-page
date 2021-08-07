import {Dna, ISettings, IDnaRenderContext, IWorkerResult} from 'shared/src/dna'
import loader from '@assemblyscript/loader'
import {
  setFromSettings,
  GetMutator,
  getFromName,
  UpdateEffectiveness,
} from 'shared/src/gene-mutator'

const SIZE = 255
const MAX_TRIANGLES = 100

const memory = new WebAssembly.Memory({
  initial: 16,
  maximum: 16,
})

const srcColorPointer = 0
const srcColorCount = 4 * MAX_TRIANGLES
const srcColorByteLength = srcColorCount * 4
const srcColorData = new Float32Array(
  memory.buffer,
  srcColorPointer,
  srcColorCount,
)

const dstColorPointer = srcColorPointer + srcColorByteLength
const dstColorCount = 4
const dstColorByteLength = dstColorCount * 4
const dstColorData = new Float32Array(
  memory.buffer,
  dstColorPointer,
  dstColorCount,
)

const comparePixelPointer = dstColorPointer + dstColorByteLength
const comparePixelCount = SIZE * SIZE * 3
const comparePixelByteLength = comparePixelCount * 4
const comparePixelData = new Float32Array(
  memory.buffer,
  comparePixelPointer,
  comparePixelCount,
)

const minMaxPointer = comparePixelPointer + comparePixelByteLength
const minMaxDataCount = SIZE * 2 * MAX_TRIANGLES
const minMaxByteLength = minMaxDataCount
const minMaxData = new Uint8Array(memory.buffer, minMaxPointer, minMaxDataCount)

self.onmessage = function (e: any) {
  loader
    .instantiateStreaming(fetch('optimized.wasm'), {env: {memory}})
    .then(results => {
      startRasterizing(
        results.exports,
        memory,
        e.data.image,
        e.data.dna,
        e.data.settings,
      )
    })
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function startRasterizing(
  wasmExports: any,
  memory: WebAssembly.Memory,
  sourceImageData: ImageData,
  dna: Dna,
  settings: ISettings,
) {
  if (sourceImageData.width !== SIZE || sourceImageData.height !== SIZE)
    throw new Error('Invalid source image size')

  for (let y = 0; y < sourceImageData.height; y++) {
    for (let x = 0; x < sourceImageData.width; x++) {
      const r = sourceImageData.data[(y * SIZE + x) * 4 + 0]
      const g = sourceImageData.data[(y * SIZE + x) * 4 + 1]
      const b = sourceImageData.data[(y * SIZE + x) * 4 + 2]

      comparePixelData[(y * SIZE + x) * 3 + 0] = r / 255
      comparePixelData[(y * SIZE + x) * 3 + 1] = g / 255
      comparePixelData[(y * SIZE + x) * 3 + 2] = b / 255
    }
  }

  while (true) {
    //var startTime = Date.now()
    setFromSettings(settings)

    var mutator = GetMutator()

    var ctx: IDnaRenderContext = {
      dna: dna,
      mutations: [],
      mutator: mutator,
      source: sourceImageData,
      fitness: dna.fitness,
      settings: settings,
    }

    const originalFitness = ctx.fitness

    MutateDna(ctx, wasmExports, memory)

    const fitnessImprovement = originalFitness - ctx.fitness

    UpdateEffectiveness(fitnessImprovement, mutator)

    await delay(500)

    if (true) {
      const wasmPixels = new Uint8ClampedArray(SIZE * SIZE * 4)
      const fitnessPixels = new Uint8ClampedArray(SIZE * SIZE * 4)

      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const fit = wasmExports.calculateFitnessAtPos(
            srcColorPointer,
            dstColorPointer,
            comparePixelPointer,
            minMaxPointer,
            x,
            y,
            0,
            2,
          )

          wasmPixels[(y * SIZE + x) * 4 + 0] = dstColorData[0] * 255
          wasmPixels[(y * SIZE + x) * 4 + 1] = dstColorData[1] * 255
          wasmPixels[(y * SIZE + x) * 4 + 2] = dstColorData[2] * 255
          wasmPixels[(y * SIZE + x) * 4 + 3] = 255

          fitnessPixels[(y * SIZE + x) * 4 + 0] = fit / 100000
          fitnessPixels[(y * SIZE + x) * 4 + 1] = fit / 1000
          fitnessPixels[(y * SIZE + x) * 4 + 2] = fit / 10
          fitnessPixels[(y * SIZE + x) * 4 + 3] = 255
        }
      }

      const workerResult: IWorkerResult = {
        dna,
        wasmPixels,
        fitnessPixels,
      }

      self.postMessage(workerResult, null as any)
    }
  }
}

function MutateDna(
  ctx: IDnaRenderContext,
  wasmExports: any,
  memory: WebAssembly.Memory,
) {
  const mutatorState = ctx.mutator.func(ctx)
  if (mutatorState === null) return

  const fitness = getFitnessWasm(ctx.dna, ctx.source, wasmExports, memory)

  if (fitness < ctx.fitness) {
    ctx.fitness = fitness
    ctx.mutations.push(mutatorState)
    ctx.dna.mutation++
  } else ctx.mutator.undo(ctx, mutatorState)

  ctx.dna.generation++
}

function getFitnessWasm(
  dna: Dna,
  image: ImageData,
  wasmExports: any,
  memory: WebAssembly.Memory,
): number {
  if (dna.genes.length >= 100) throw new Error('Too many genes')

  for (let y = 0; y < SIZE * MAX_TRIANGLES; y++) {
    minMaxData[y * 2 + 0] = 255
    minMaxData[y * 2 + 1] = 0
  }

  let triangleIndex = 0

  const prepareTriangle = (r, g, b, a, ax, ay, bx, by, cx, cy) => {
    srcColorData[triangleIndex * 4 + 0] = r
    srcColorData[triangleIndex * 4 + 1] = g
    srcColorData[triangleIndex * 4 + 2] = b
    srcColorData[triangleIndex * 4 + 3] = a

    wasmExports.calcMinMax(minMaxPointer, triangleIndex, ax, ay, bx, by, cx, cy)
    triangleIndex++
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

  return wasmExports.calculateFitness(
    srcColorPointer,
    dstColorPointer,
    comparePixelPointer,
    minMaxPointer,

    0,
    triangleIndex - 1,
  )
}
