import imageUrl from 'url:../images/The-Chosen.jpg'
import {
  ColorMapItemNormalized,
  ColorMapNormalized,
  RGB_Norm_Buffer,
  Settings,
  Triangle_Buffer,
  TRIANGLE_SIZE,
} from './types'
import {runPSO} from './swarm_decent'
import {calculateFitness, drawTrianglesToTexture} from './fitness-calculator'

const FluorescentPink = [
  255 / 255,
  72 / 255,
  176 / 255,
] as ColorMapItemNormalized
const Blue = [0, 120 / 255, 191 / 255] as ColorMapItemNormalized
const Green = [0, 169 / 255, 92 / 255] as ColorMapItemNormalized
const Orange = [255 / 255, 108 / 255, 47 / 255] as ColorMapItemNormalized

async function initialize() {
  const settings: Settings = {
    size: 64,
    viewportSize: 64 * 2,
    triangleCount: 30,
    historySize: 512,
  }
  const viewportScale = settings.viewportSize / settings.size

  console.log('Loading image...')
  const originalImage = await fetchImage(imageUrl, settings.size)

  const ctxOriginal = createCanvas('Original', settings.viewportSize).ctx

  drawImageDataScaled(ctxOriginal, originalImage, viewportScale)

  const palette = [
    // FluorescentPink, //
    // Blue,
    Orange,
    Green,
  ]
  const colorMap: ColorMapNormalized = []

  for (let i = 0; i < settings.triangleCount; i++) {
    colorMap.push(
      palette[Math.floor((i / settings.triangleCount) * palette.length)],
    )
  }

  // const ctxTest = createCanvas('Test', settings.viewportSize).ctx
  // // prettier-ignore
  // const triangleTex = drawTrianglesToTexture(settings, new Float32Array([
  //   0.8, 0.8,
  //   0.5, 0.2,
  //   0.2, 0.8,
  //   1,0,0, // rgb
  //   0.1,1.0,0.0 // alpha,
  // ]) as Triangle_Buffer)
  // drawTextureToCanvas(ctxTest, triangleTex, settings.size, viewportScale)

  const imageTex = imageToImageTex(originalImage, settings.size)

  const lossFn = (pos: Triangle_Buffer) => {
    return calculateFitness(settings, pos, imageTex, colorMap)
  }

  const bestCtx = createCanvas('Best', settings.viewportSize).ctx

  const particleCount = 1

  const particleCtxList = Array.from({length: 1}).map(
    (_, i) => createCanvas('Particle ' + (i + 1), settings.viewportSize).ctx,
  )
  const historyCtx = createCanvas('History', settings.historySize).ctx

  const history: number[][] = Array.from({length: particleCount}).map(() => [])

  runPSO(
    lossFn,
    settings.triangleCount * TRIANGLE_SIZE,
    particleCount,
    async (best, particles) => {
      particles.map((p, i) => {
        if (i >= particleCtxList.length) return
        const triangleTex = drawTrianglesToTexture(settings, p.pos, colorMap)
        drawTextureToCanvas(
          particleCtxList[i],
          triangleTex,
          settings.size,
          viewportScale,
        )
      })

      const triangleTex = drawTrianglesToTexture(settings, best, colorMap)
      drawTextureToCanvas(bestCtx, triangleTex, settings.size, viewportScale)

      particles.forEach((p, i) => history[i].push(p.fitness))

      drawHistoryToCanvas(historyCtx, history, settings.historySize)
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

  document.body.appendChild(wrapper)
  wrapper.appendChild(text)
  wrapper.appendChild(canvas)

  const ctx = canvas.getContext('2d', {alpha: false})!

  return {canvas, ctx}
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

function drawHistoryToCanvas(
  ctx: CanvasRenderingContext2D,
  history: number[][],
  size: number,
) {
  if (history.length === 0) return

  ctx.fillStyle = 'rgb(245, 245, 255)'
  ctx.fillRect(0, 0, size, size)

  let max = 0
  for (let a = 0; a < history.length; a++)
    for (let b = 0; b < history[a].length; b++)
      max = Math.max(history[a][b], max)

  const toY = (val: number) => (val / max) * size
  const len = history[0].length

  for (let a = 0; a < history.length; a++) {
    ctx.beginPath()
    ctx.moveTo(0, toY(history[a][0]))

    for (let i = 1; i < len; i++) {
      ctx.lineTo((i / len) * size, toY(history[a][i]))
    }

    ctx.lineCap = 'round'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.strokeStyle = `hsl(${(a / history.length) * 360}, 40%, 50%)`
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
