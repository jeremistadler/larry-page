import Prisma from '@prisma/client'
import imageDecode from 'image-decode'
import {performance} from 'perf_hooks'
import sharp from 'sharp'
import snappy from 'snappy'
const {compressSync, uncompressSync} = snappy

import * as fs from 'fs/promises'
import {
  ColorMapNormalized,
  DomainBounds,
  OptimizerType,
  RGB_Norm_Buffer,
  Settings,
  Pos_Buffer,
  TRIANGLE_SIZE,
} from './micro'
import {RisoColors} from './FluorescentPink'
import {calculateTriangleFitness} from './fitness-calculator'
import {randomNumberBounds} from './randomNumberBetween'
import {createOptimizer, OPTIMIZER_LIST} from './optimizers'

const imageName = process.argv[2]

if (!imageName) {
  console.log('No image name', process.argv)
  process.exit(1)
}

console.log('Image name', imageName)

const settings: Settings = {
  size: 256,
  viewportSize: 512,
  itemCount: 80,
  historySize: 512,
  itemSize: TRIANGLE_SIZE,
}

const prisma = new Prisma.PrismaClient()
const imagePath = './images/' + imageName

const originalImage = imageDecode(await fs.readFile(imagePath))

const resized = await sharp(imagePath)
  .resize(settings.size, settings.size, {
    fit: 'fill',
    background: '#fff',
  })
  .raw()
  .toBuffer({resolveWithObject: true})

const resizedImage = {
  width: resized.info.width,
  height: resized.info.height,
  data: Uint8ClampedArray.from(resized.data),
}
const originalTex = imageToImageTex(
  resizedImage,
  settings.size,
  resized.info.channels,
)

const palette = [RisoColors.Red, RisoColors.Green]
const colorMap: ColorMapNormalized = []

for (let i = 0; i < settings.itemCount; i++) {
  colorMap.push(palette[Math.floor((i / settings.itemCount) * palette.length)])
}
const bounds: DomainBounds[] = Array.from({
  length: settings.itemCount * TRIANGLE_SIZE,
}).map((_, i): DomainBounds => {
  const a = i % TRIANGLE_SIZE
  return a === TRIANGLE_SIZE - 1 ? [0.1, 0.8] : [0.05, 0.95]
})

let globalGeneration = 0

const lossFn = (pos: Pos_Buffer) => {
  globalGeneration++
  const f = calculateTriangleFitness(settings, pos, originalTex, colorMap)

  // if (f === 0 || f < 0 || f > 1 || isNaN(f)) {
  //   throw new Error('calculateFitness returned invalid result ' + f)
  // }

  return f
}

let best = new Float32Array(TRIANGLE_SIZE * settings.itemCount) as Pos_Buffer
for (let i = 0; i < best.length; i++) best[i] = randomNumberBounds(bounds[i])

console.log('Fetching predecessor...')

const dbItem = await prisma.generations.findFirst({
  where: {
    source_image_name: imageName,
    item_count: settings.itemCount,
    item_type: 'triangle',
    fitness: {gt: 0},
    compressed_data: {not: null},
  },
  orderBy: [
    {
      training_resolution: 'desc',
    },
    {
      fitness: 'asc',
    },
  ],
})

let parentId: null | number = null

if (dbItem != null && dbItem.compressed_data != null) {
  console.log('Got predecessor')

  const decompressed = JSON.parse(
    uncompressSync(dbItem.compressed_data, {asBuffer: false}),
  ) as {positions: number[]; color_map: ColorMapNormalized}

  if (decompressed.positions.length !== best.length) {
    throw new Error(
      'DB positions did not equal triangles ' +
        decompressed.positions.length +
        ' ' +
        best.length,
    )
  }

  best = new Float32Array(decompressed.positions) as Pos_Buffer
  globalGeneration = dbItem.generation
  parentId = dbItem.id
} else {
  console.log('No predecessor found, starting from scratch')
}

let optimizerType: OptimizerType = 'differential_evolution'
let optimizer = createOptimizer(optimizerType, lossFn, bounds, best)

let nextIterationCount = 1
let nextIterationOptimizer = 0
let globalGenerationStartForOptimizer = globalGeneration
let lastGlobalGeneration = globalGeneration

let isExiting = false

process.on('SIGTERM', () => {
  console.log('Got exit signal')
  isExiting = true
})

process.on('SIGQUIT', () => {
  console.log('Got exit signal')
  isExiting = true
})

console.log('Running with', optimizerType, 'optimizer')
runIterations()

function runIterations() {
  const start = performance.now()
  for (let iteration = 0; iteration < nextIterationCount; iteration++) {
    optimizer.runNext(nextIterationOptimizer++)
  }
  const time = performance.now() - start
  nextIterationCount = Math.max(
    1,
    Math.floor((nextIterationCount / time) * 1000 * 5),
  )
  best = optimizer.best.pos

  const generationsUsed = globalGeneration - lastGlobalGeneration
  lastGlobalGeneration = globalGeneration

  if (optimizer.best.fitness === 0 || isNaN(optimizer.best.fitness)) {
    console.log(optimizer)
    throw new Error('Fitness is invalid ' + optimizerType)
  }

  prisma.generations
    .create({
      data: {
        training_resolution: settings.size,
        generation: globalGeneration,
        optimizer_algorithm: optimizerType,
        item_type: 'triangle',
        item_count: settings.itemCount,
        source_image_height: originalImage.height,
        source_image_width: originalImage.width,
        source_image_name: imageName,
        fitness: optimizer.best.fitness,
        parent_id: parentId,
        ms_per_generation: time / generationsUsed,

        compressed_data: compressSync(
          JSON.stringify({
            positions: [...best],
            color_map: colorMap,
            stencils: [],
            bounds: bounds,
          }),
        ),
      },
    })
    .then(saveResult => {
      parentId = saveResult.id
    })
    .catch(err => {
      console.error('Save error', err)
    })

  if (globalGeneration - globalGenerationStartForOptimizer > 100000) {
    globalGenerationStartForOptimizer = globalGeneration
    optimizerType =
      OPTIMIZER_LIST[
        (OPTIMIZER_LIST.indexOf(optimizerType) + 1) % OPTIMIZER_LIST.length
      ]
    optimizer = createOptimizer(optimizerType, lossFn, bounds, best)
    nextIterationCount = 1
    nextIterationOptimizer = 0
    console.log('Changed optimizer to', optimizerType)
  }

  if (!isExiting) setImmediate(runIterations)
}

function imageToImageTex(
  imageData: ImageData,
  size: number,
  channels: number,
): RGB_Norm_Buffer {
  const tex = new Float32Array(size * size * 3) as RGB_Norm_Buffer

  const data = imageData.data
  const height = imageData.height
  const width = imageData.width

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      const pos = y * width + x

      tex[pos * 3 + 0] = data[pos * channels + 0] / 255
      tex[pos * 3 + 1] = data[pos * channels + 1] / 255
      tex[pos * 3 + 2] = data[pos * channels + 2] / 255
    }
  }

  return tex
}
