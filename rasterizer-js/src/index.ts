// import imageUrl from 'url:../images/twoTriangles.png'
// import imageUrl from 'url:../images/threeRgbTriangles.png'
import imageUrl from 'url:../images/sasha-matic-vgcVUM1IsZU-unsplash.jpg'
import {
  CIRCLE_SIZE,
  ColorMapNormalized,
  DomainBounds,
  indexToName,
  OptimizerType,
  Particle,
  RGB_Norm_Buffer,
  Settings,
  Pos_Buffer,
} from './micro'
import {calculateFitnessCircle, drawCirclesToNewTex} from './fitness-calculator'
import {OPTIMIZER_LIST, createOptimizer} from './optimizers'
import {randomNumberBounds} from './randomNumberBetween'
import {RisoColors} from './FluorescentPink'

async function initialize() {
  const settings: Settings = {
    size: 128,
    viewportSize: 512,
    itemCount: 100,
    historySize: 512,
    itemSize: CIRCLE_SIZE,
  }
  const viewportScale = settings.viewportSize / settings.size

  console.log('Loading image...')
  const originalImage = await fetchImage(imageUrl, settings.size)

  console.log('Drawing original image...')
  const ctxOriginal = createCanvas('Original', settings.viewportSize).ctx
  drawImageDataScaled(ctxOriginal, originalImage, viewportScale)

  const palette = [
    // FluorescentPink, //
    // Blue,
    // Orange,
    RisoColors.Red,
    RisoColors.Green,
  ]
  const colorMap: ColorMapNormalized = []

  for (let i = 0; i < settings.itemCount; i++) {
    colorMap.push(
      palette[Math.floor((i / settings.itemCount) * palette.length)],
    )
  }
  const domain: DomainBounds[] = Array.from({
    length: settings.itemCount,
  })
    .map((_, i): DomainBounds[] => {
      return [
        [0, 1], // x
        [0, 1], // y
        [0.05, 0.2], // radius
        [0.1, 0.2], // alpha
      ]
      // const a = i % TRIANGLE_SIZE
      // return a === TRIANGLE_SIZE - 1 ? [0.1, 0.8] : [0.05, 0.95]
    })
    .flat(1)

  const imageTex = imageToImageTex(originalImage, settings.size)

  let globalFitnessTests = 0

  const lossFn = (pos: Pos_Buffer) => {
    globalFitnessTests++
    const fitness = calculateFitnessCircle(settings, pos, imageTex, colorMap)

    if (isNaN(fitness)) {
      throw new Error('Fitness is NaN')
    }

    if (fitness < 0) {
      throw new Error('Fitness is less than 0')
    }

    if (fitness > 1) {
      throw new Error('Fitness is more than 1')
    }
    return fitness
  }

  const bestCtx = createCanvas('Best', settings.viewportSize).ctx

  const infoDiv = document.createElement('div')
  document.body.append(infoDiv)

  const infoDiv2 = document.createElement('div')
  document.body.append(infoDiv2)

  const dimensionsCtxList = Array.from({
    length: Math.min(
      30,
      Math.floor((settings.itemSize * settings.itemCount) / 2),
    ),
  }).map((_, i) =>
    createCanvas(
      indexToName(Math.floor(i * 2)) +
        '  ' +
        indexToName(Math.floor(i * 2 + 1)),
      settings.viewportSize / 2,
    ),
  )

  let best = new Float32Array(
    settings.itemSize * settings.itemCount,
  ) as Pos_Buffer
  for (let i = 0; i < best.length; i++) best[i] = randomNumberBounds(domain[i])

  let optimizerType: OptimizerType = 'differential_evolution'
  let optimizer = createOptimizer(optimizerType, lossFn, domain, best)

  let nextIterationCount = 1
  let nextIterationOptimizer = 0
  let lastGlobalFitnessTests = globalFitnessTests

  infoDiv.innerHTML = optimizerType
  infoDiv.onclick = () => {
    optimizerType =
      OPTIMIZER_LIST[
        (OPTIMIZER_LIST.indexOf(optimizerType) + 1) % OPTIMIZER_LIST.length
      ]
    optimizer = createOptimizer(optimizerType, lossFn, domain, best)
    infoDiv.innerHTML = optimizerType
    nextIterationCount = 1
    nextIterationOptimizer = 0
  }

  function runIterations() {
    const start = performance.now()
    for (let iteration = 0; iteration < nextIterationCount; iteration++) {
      optimizer.runNext(nextIterationOptimizer++)
    }
    const time = performance.now() - start
    infoDiv2.innerHTML =
      (time / (globalFitnessTests - lastGlobalFitnessTests)).toFixed(4) +
      ' ms per iteration'
    lastGlobalFitnessTests = globalFitnessTests

    nextIterationCount = Math.max(
      1,
      Math.floor((nextIterationCount / time) * 100),
    )
    best = optimizer.best.pos

    for (let dim = 0; dim < dimensionsCtxList.length; dim++) {
      drawDimensionToCanvas(
        dimensionsCtxList[dim],
        best,
        lossFn,
        dim * 2,
        optimizer.particles,
      )
    }

    const bestTex = drawCirclesToNewTex(
      settings.size,
      settings.size,
      best,
      colorMap,
    )
    drawTextureToCanvas(bestCtx, bestTex, settings.size, viewportScale)

    requestAnimationFrame(runIterations)
  }

  runIterations()
}

document.addEventListener('DOMContentLoaded', function () {
  initialize().catch(err => console.error(err))
})

type Canvas = {
  canvas: HTMLCanvasElement
  setName: (text: string) => void
  ctx: CanvasRenderingContext2D
  size: number
}

function createCanvas(name: string, size: number): Canvas {
  const wrapper = document.createElement('div')
  const text = document.createElement('div')
  text.innerHTML = name

  const canvas = document.createElement('canvas') as HTMLCanvasElement

  canvas.width = size
  canvas.height = size

  canvas.style.width = size / devicePixelRatio + 'px'
  canvas.style.height = size / devicePixelRatio + 'px'

  document.body.appendChild(wrapper)
  wrapper.appendChild(text)
  wrapper.appendChild(canvas)

  const ctx = canvas.getContext('2d', {alpha: false})!

  return {canvas, size, ctx, setName: (name: string) => (text.innerHTML = name)}
}

function fetchImage(url: string, size: number): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    var image = new Image()
    image.crossOrigin = ''
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size

      const ctx = canvas.getContext('2d', {
        alpha: false,
      })!

      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(image, 0, 0, size, size)
      const data = ctx.getImageData(0, 0, size, size)

      resolve(data)
    }
    image.onerror = (e: any) => {
      reject(e)
    }
    image.src = url
  })
}

function drawDimensionToCanvas(
  {ctx, size}: Canvas,
  pos: Pos_Buffer,
  cost_fn: (pos: Pos_Buffer) => number,
  index: number,
  particles: Particle[],
) {
  const temp = new Float32Array(pos) as Pos_Buffer
  // const orgValue = pos[index]
  const EVALUATION_COUNT = 6
  const pointSize = size / EVALUATION_COUNT
  ctx.fillStyle = 'rgb(255, 255, 255)'
  ctx.fillRect(0, 0, size, size)

  // for (let x = 0; x < EVALUATION_COUNT; x++) {
  //   for (let y = 0; y < EVALUATION_COUNT; y++) {
  //     const percX = x / EVALUATION_COUNT
  //     const percY = y / EVALUATION_COUNT

  //     temp[index + 0] = percX
  //     temp[index + 1] = percY

  //     const fitness = cost_fn(temp)

  //     ctx.fillStyle = `hsl(${(fitness * 360 * 6) % 360}, 70%, 50%)`
  //     ctx.beginPath()
  //     ctx.fillRect(percX * size, percY * size, pointSize + 1, pointSize + 1)
  //     ctx.fill()
  //   }
  // }

  for (let i = 0; i < particles.length; i++) {
    ctx.fillStyle = `hsla(${
      (i / (particles.length + 1)) * 360
    }, 100%, 50%, 0.8)`
    ctx.beginPath()
    ctx.arc(
      particles[i].pos[index] * size,
      particles[i].pos[index + 1] * size,
      size / 50,
      0,
      Math.PI * 2,
      false,
    )
    ctx.fill()
  }
}

function drawHistoryToCanvas(
  {ctx, size}: Canvas,
  history: number[][],
  selectedIndex: number,
) {
  if (history.length === 0) return

  ctx.fillStyle = 'rgb(245, 245, 255)'
  ctx.fillRect(0, 0, size, size)

  let max = -111000
  for (let a = 0; a < history.length; a++)
    for (let b = 0; b < history[a].length; b++)
      max = Math.max(history[a][b], max)

  let min = 1000000
  for (let a = 0; a < history.length; a++)
    for (let b = 0; b < history[a].length; b++)
      min = Math.min(history[a][b], min)

  const toY = (val: number) =>
    ((val - min) / (max - min)) * size * 0.9 + size * 0.05
  const len = history[0].length

  for (let a = 0; a < history.length; a++) {
    ctx.beginPath()
    ctx.moveTo(0, toY(history[a][0]))

    for (let i = 1; i < len; i++) {
      ctx.lineTo((i / (len - 1)) * size, toY(history[a][i]))
    }

    ctx.lineCap = 'round'
    ctx.lineWidth = selectedIndex === -1 ? 2 : selectedIndex === a ? 4 : 1
    ctx.lineJoin = 'round'
    ctx.strokeStyle = `hsla(${(a / history.length) * 360}, 40%, 50%, ${
      selectedIndex === -1 ? 1 : selectedIndex === a ? 1 : 0.3
    })`
    ctx.stroke()
  }
}

function drawTextureToCanvas(
  ctx: CanvasRenderingContext2D,
  tex: RGB_Norm_Buffer,
  texSize: number,
  scale: number,
) {
  for (var y = 0; y < texSize; y++) {
    for (var x = 0; x < texSize; x++) {
      var pos = y * texSize + x
      ctx.fillStyle =
        'rgba(' +
        tex[pos * 3 + 0] * 255 +
        ',' +
        tex[pos * 3 + 1] * 255 +
        ',' +
        tex[pos * 3 + 2] * 255 +
        ',1)'

      ctx.fillRect(x * scale, y * scale, scale, scale)
    }
  }
}

function drawImageDataScaled(
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
  scale: number,
) {
  const data = imageData.data
  const height = imageData.height
  const width = imageData.width

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var pos = y * width + x
      ctx.fillStyle =
        'rgba(' +
        data[pos * 4 + 0] +
        ',' +
        data[pos * 4 + 1] +
        ',' +
        data[pos * 4 + 2] +
        ',' +
        data[pos * 4 + 3] / 255 +
        ')'

      ctx.fillRect(x * scale, y * scale, scale, scale)
    }
  }
}

function imageToImageTex(imageData: ImageData, size: number): RGB_Norm_Buffer {
  const tex = new Float32Array(size * size * 3) as RGB_Norm_Buffer

  const data = imageData.data
  const height = imageData.height
  const width = imageData.width

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      const pos = y * width + x

      tex[pos * 3 + 0] = data[pos * 4 + 0] / 255
      tex[pos * 3 + 1] = data[pos * 4 + 1] / 255
      tex[pos * 3 + 2] = data[pos * 4 + 2] / 255
    }
  }

  return tex
}
