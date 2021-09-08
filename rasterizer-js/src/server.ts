import {performance} from 'perf_hooks'
import * as fs from 'fs/promises'
import {
  OptimizerType,
  RGB_Norm_Buffer,
  Settings,
  Pos_Buffer,
  TRIANGLE_SIZE,
} from './micro.js'
import {
  calculateTriangleFitnessWithPrerender,
  drawTrianglesToTexture,
} from './fitness-calculator.js'
import {createOptimizer} from './optimizers.js'
import {loadAndResizeTex} from './resized.js'
import {loadGeneration, saveGeneration} from './loadGeneration.js'
import {createColorMap, RisoColors} from './createColorMap.js'
import {generateId} from './generateId.js'
import {getOptimalTextureSize} from './getOptimalTextureSize.js'

let isExiting = false

const imageName = process.argv[2]
if (!imageName) {
  console.log('No image name', process.argv)
  process.exit(1)
}

console.log('Image name', imageName)

await fs.mkdir('./data_unsynced/', {recursive: true})
await fs.mkdir('./data_best/', {recursive: true})

const settings: Settings = {
  size: 64,
  viewportSize: 512,
  sliceItemCount: 4,
  targetItemCount: 44,
  historySize: 512,
  itemSize: TRIANGLE_SIZE,
  type: 'triangle',
}

if (settings.targetItemCount % settings.sliceItemCount !== 0) {
  throw new Error('targetItemCount needs to be multiple of itemCount')
}

const palette = [RisoColors.FluorescentPink, RisoColors.Blue]
const colorMap = createColorMap(settings.targetItemCount, palette)
const generation = await loadGeneration(
  imageName,
  settings.type,
  settings.targetItemCount,
  palette,
)

settings.size = getOptimalTextureSize(generation.generation)
generation.training_resolution = settings.size
console.log('Texture size:', settings.size)

console.log('Loading source image...')
const resizedTex = await loadAndResizeTex(imageName, settings.size)

let fitnessTestCounter = generation.generation
let best = generation.data.positions

let currentPosSlice = new Float32Array(
  settings.itemSize * settings.sliceItemCount,
) as Pos_Buffer

let prerenderIndex = 0
let prerendered = new Float32Array(
  settings.size * settings.size * 3,
) as RGB_Norm_Buffer
prerendered.fill(1)

const lossFn = (pos: Pos_Buffer) => {
  fitnessTestCounter++

  const f = calculateTriangleFitnessWithPrerender(
    settings,
    pos,
    best,
    prerenderIndex,
    resizedTex,
    prerendered,
    colorMap,
  )

  if (isNaN(f)) {
    console.log({
      settings,
      pos,
      best,
      prerenderIndex,
      resizedTex,
      prerendered,
      colorMap,
    })
    throw new Error('Fitness is NaN')
  }

  if (f < 0) {
    throw new Error('Fitness is less than 0')
  }
  return f
}

let optimizerType: OptimizerType = 'differential_evolution'
let optimizer = createOptimizer(
  optimizerType,
  lossFn,
  generation.data.bounds,
  currentPosSlice,
)

let samplesNextRound = 1
let optimizerCalls = 0
let lastFitnessTestCounter = fitnessTestCounter
let fitnessTestsSinceNextLevel = 0
let fitnestTestsSinceStart = 0
let fitnestTestsSinceLastSave = 0

async function save(ms_per_generation: number) {
  if (generation.fitness !== optimizer.best.fitness) {
    generation.fitness = optimizer.best.fitness
    generation.data.positions = best
    generation.optimizer_algorithm = optimizerType
    generation.parent_id = generation.id
    generation.id = generateId()
    generation.generation = fitnessTestCounter
    generation.ms_per_generation = ms_per_generation

    return saveGeneration(generation).catch(err => {
      console.error('Save error', err)
    })
  }
}

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
  for (let iteration = 0; iteration < samplesNextRound; iteration++) {
    optimizer.runNext(optimizerCalls++)
  }
  const time = performance.now() - start
  samplesNextRound = Math.max(1, Math.floor((samplesNextRound / time) * 500))
  for (let i = 0; i < optimizer.best.pos.length; i++) {
    best[i + prerenderIndex] = optimizer.best.pos[i]
  }

  const testsSinceLastRound = fitnessTestCounter - lastFitnessTestCounter
  lastFitnessTestCounter = fitnessTestCounter

  fitnessTestsSinceNextLevel += testsSinceLastRound
  fitnestTestsSinceStart += testsSinceLastRound
  fitnestTestsSinceLastSave += testsSinceLastRound

  if (optimizer.best.fitness === 0 || isNaN(optimizer.best.fitness)) {
    console.log(optimizer)
    throw new Error('Fitness is invalid ' + optimizerType)
  }

  if (fitnestTestsSinceStart > 200_000) {
    isExiting = true
  }

  if (fitnestTestsSinceLastSave > 80_000 || isExiting) {
    fitnestTestsSinceLastSave = 0
    console.log('Saving...')
    save(time / testsSinceLastRound)
  }

  if (fitnessTestsSinceNextLevel > 40000 || optimizer.hasConverged()) {
    fitnessTestsSinceNextLevel = 0
    prerenderIndex += currentPosSlice.length
    if (prerenderIndex === best.length) {
      prerenderIndex = 0

      if (settings.targetItemCount === settings.sliceItemCount) {
        settings.sliceItemCount = 1
      } else {
        settings.sliceItemCount++
        while (settings.targetItemCount % settings.sliceItemCount !== 0) {
          settings.sliceItemCount++
        }

        settings.sliceItemCount = Math.min(
          settings.targetItemCount,
          settings.sliceItemCount,
        )
      }

      console.log('Changed batch size to', settings.sliceItemCount)
    }

    const prerenderPos = new Float32Array(prerenderIndex) as Pos_Buffer
    for (let i = 0; i < prerenderPos.length; i++) prerenderPos[i] = best[i]

    prerendered = drawTrianglesToTexture(
      settings.size,
      settings.size,
      prerenderPos,
      colorMap,
    )

    if (
      settings.sliceItemCount * settings.sliceItemCount !==
      currentPosSlice.length
    ) {
      currentPosSlice = new Float32Array(
        settings.sliceItemCount * settings.itemSize,
      ) as Pos_Buffer
    }

    for (let i = 0; i < currentPosSlice.length; i++)
      currentPosSlice[i] = best[i + prerenderIndex]

    console.log(
      'Recreating optimizer with size',
      currentPosSlice.length,
      'at index',
      prerenderIndex,
    )

    optimizer = createOptimizer(
      optimizerType,
      lossFn,
      generation.data.bounds,
      currentPosSlice,
    )
  }

  // if (globalGeneration - globalGenerationStartForOptimizer > 10000) {
  //   globalGenerationStartForOptimizer = globalGeneration
  //   optimizerType =
  //     OPTIMIZER_LIST[
  //       (OPTIMIZER_LIST.indexOf(optimizerType) + 1) % OPTIMIZER_LIST.length
  //     ]
  //   optimizer = createOptimizer(optimizerType, lossFn, bounds, best)
  //   nextIterationCount = 1
  //   nextIterationOptimizer = 0
  //   console.log('Changed optimizer to', optimizerType)
  // }

  if (!isExiting) setImmediate(runIterations)
}
