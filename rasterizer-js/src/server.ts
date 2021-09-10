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
import {
  GENERATIONS_PER_EXIT,
  GENERATIONS_PER_SAVE,
  getOptimalTextureSize,
  MAX_GENERATIONS_PER_LEVEL,
} from './getOptimalTextureSize.js'
import {countUntouchedFeatures} from './countUntouchedFeatures.js'

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
  targetItemCount: 300,
  historySize: 512,
  itemSize: TRIANGLE_SIZE,
  type: 'triangle',
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
let currentSlice = new Float32Array(settings.itemSize * 1) as Pos_Buffer

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
  currentSlice,
)

let samplesNextRound = 1
let optimizerCalls = 0
let lastFitnessTestCounter = fitnessTestCounter
let fitnessTestsSinceNextLevel = 0
let fitnestTestsSinceStart = 0
let fitnestTestsSinceLastSave = 0

const untouchedFeatures = countUntouchedFeatures(best, generation.data.bounds)
let targetFeatureCount =
  Math.max(1, Math.ceil(untouchedFeatures / settings.itemSize)) *
  settings.itemSize

async function save(ms_per_generation: number) {
  if (generation.fitness !== optimizer.best.fitness) {
    generation.fitness = optimizer.best.fitness
    generation.data.positions = best
    generation.optimizer_algorithm = optimizerType
    generation.parent_id = generation.id
    generation.id = generateId()
    generation.generation = fitnessTestCounter
    generation.ms_per_generation = ms_per_generation
    generation.created_at = new Date()
    generation.updated_at = generation.created_at

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

  if (fitnestTestsSinceStart > GENERATIONS_PER_EXIT) {
    console.log('Exiting...')
    isExiting = true
  }

  if (fitnestTestsSinceLastSave > GENERATIONS_PER_SAVE || isExiting === true) {
    fitnestTestsSinceLastSave = 0
    console.log('Saving...')
    save(time / testsSinceLastRound)
  }

  if (
    fitnessTestsSinceNextLevel > MAX_GENERATIONS_PER_LEVEL ||
    optimizer.hasConverged()
  ) {
    fitnessTestsSinceNextLevel = 0
    let targetSliceSize = currentSlice.length

    if (
      targetFeatureCount - targetSliceSize === prerenderIndex &&
      targetFeatureCount === targetSliceSize
    ) {
      console.log('New triangle!')

      if (targetFeatureCount < settings.targetItemCount * settings.itemSize)
        targetFeatureCount += settings.itemSize
      targetSliceSize = settings.itemSize
    } else if (targetFeatureCount - targetSliceSize === prerenderIndex) {
      console.log('Increase slice size and restart')

      prerenderIndex = 0
      targetSliceSize += settings.itemSize
    } else {
      // Bump index
      console.log('Bump index')

      prerenderIndex += targetSliceSize

      // Last slice to big, move back so we match the end
      if (prerenderIndex + targetSliceSize >= targetFeatureCount) {
        prerenderIndex = targetFeatureCount - targetSliceSize
      }
    }

    const prerenderPos = new Float32Array(prerenderIndex) as Pos_Buffer
    for (let i = 0; i < prerenderPos.length; i++) prerenderPos[i] = best[i]

    prerendered = drawTrianglesToTexture(
      settings.size,
      settings.size,
      prerenderPos,
      colorMap,
    )

    if (targetSliceSize !== currentSlice.length) {
      console.log(
        'Changed batch size from',
        currentSlice.length,
        'to',
        targetSliceSize,
      )
      currentSlice = new Float32Array(targetSliceSize) as Pos_Buffer
    }

    for (let i = 0; i < currentSlice.length; i++)
      currentSlice[i] = best[i + prerenderIndex]

    console.log(
      'Generation',
      fitnessTestCounter,
      ', feature count:',
      targetFeatureCount,
      ', slice size:',
      currentSlice.length,
      'at index',
      prerenderIndex,
    )

    optimizer = createOptimizer(
      optimizerType,
      lossFn,
      generation.data.bounds,
      currentSlice,
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
