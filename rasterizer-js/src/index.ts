import imageUrl from 'url:../images/threeRgbTriangles.png'
// import imageUrl from 'url:../images/test.jpg'
import {
  ColorMapItemNormalized,
  ColorMapNormalized,
  indexToName,
  RGB_Norm_Buffer,
  Settings,
  Triangle_Buffer,
  TRIANGLE_SIZE,
} from './types'
import {KnownPoints, runPSO} from './fmin'
import {calculateFitness, drawTrianglesToTexture} from './fitness-calculator'

const FluorescentPink = [
  255 / 255,
  72 / 255,
  176 / 255,
] as ColorMapItemNormalized
const Blue = [0, 120 / 255, 191 / 255] as ColorMapItemNormalized
const Green = [0, 169 / 255, 92 / 255] as ColorMapItemNormalized
const Orange = [255 / 255, 108 / 255, 47 / 255] as ColorMapItemNormalized
const Red = [255 / 255, 10 / 255, 10 / 255] as ColorMapItemNormalized

async function initialize() {
  const settings: Settings = {
    size: 128,
    viewportSize: 512,
    triangleCount: 4,
    historySize: 512,
  }
  const viewportScale = settings.viewportSize / settings.size

  console.log('Loading image...')
  const originalImage = await fetchImage(imageUrl, settings.size)

  const ctxOriginal = createCanvas('Original', settings.viewportSize).ctx

  drawImageDataScaled(ctxOriginal, originalImage, viewportScale)

  const palette = [
    FluorescentPink, //
    Blue,
    // Orange,
    Red,
    Green,
  ]
  const colorMap: ColorMapNormalized = []

  for (let i = 0; i < settings.triangleCount; i++) {
    colorMap.push(
      palette[Math.floor((i / settings.triangleCount) * palette.length)],
    )
  }

  const imageTex = imageToImageTex(originalImage, settings.size)

  const lossFn = (pos: Triangle_Buffer) => {
    return calculateFitness(settings, pos, imageTex, colorMap)
  }

  const bestCtx = createCanvas('Best', settings.viewportSize).ctx

  const dimensionsCtxList = Array.from({
    length: TRIANGLE_SIZE * 4, // settings.triangleCount ,
  }).map((_, i) => createCanvas(indexToName(i), settings.viewportSize))

  runPSO(
    lossFn,
    settings.triangleCount * TRIANGLE_SIZE,
    async (best, knownValues) => {
      // for (let dim = 0; dim < dimensionsCtxList.length; dim++) {
      //   drawDimensionToCanvas(
      //     dimensionsCtxList[dim].ctx,
      //     best,
      //     lossFn,
      //     settings.viewportSize,
      //     dim,
      //     knownValues,
      //   )
      // }

      const triangleTex = drawTrianglesToTexture(settings, best, colorMap)
      drawTextureToCanvas(bestCtx, triangleTex, settings.size, viewportScale)

      await delay(20)
    },
  )
}

document.addEventListener('DOMContentLoaded', function () {
  initialize().catch(err => console.error(err))
})

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function createCanvas(name: string, size: number) {
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

  return {canvas, ctx, setName: (name: string) => (text.innerHTML = name)}
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
  ctx: CanvasRenderingContext2D,
  pos: Triangle_Buffer,
  cost_fn: (pos: Triangle_Buffer) => number,
  size: number,
  index: number,
  knownPoints: KnownPoints[],
) {
  const orgValue = pos[index]
  const EVALUATION_COUNT = 10
  const pointSize = size / EVALUATION_COUNT
  ctx.fillStyle = 'rgb(255, 255, 255)'
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < EVALUATION_COUNT; i++) {
    const perc = i / EVALUATION_COUNT
    pos[index] = perc
    const fitness = cost_fn(pos)

    ctx.fillStyle = `rgba(0, 50, 150, 0.4)`
    ctx.beginPath()
    ctx.fillRect(perc * size, fitness * size, pointSize, 4)
    ctx.fill()
  }

  pos[index] = orgValue

  ctx.fillStyle = `rgba(0, 0, 0, 0.1)`

  for (let i = 0; i < knownPoints.length; i++) {
    ctx.beginPath()
    ctx.arc(
      knownPoints[i].pos[index] * size,
      knownPoints[i].fitness * size,
      2,
      0,
      Math.PI * 2,
      false,
    )
    ctx.fill()
  }
}

function drawHistoryToCanvas(
  ctx: CanvasRenderingContext2D,
  history: number[][],
  size: number,
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
