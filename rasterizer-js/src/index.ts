import imageUrl from 'url:../images/The-Chosen.jpg'
import {
  RGB_Norm_Buffer,
  Settings,
  Triangle_Buffer,
  TRIANGLE_SIZE,
} from './types'
import {runPSO_decent} from './swarm_decent'
import {calculateFitness, drawTrianglesToTexture} from './fitness-calculator'

async function initialize() {
  const settings: Settings = {
    size: 128,
    viewportSize: 128 * 2,
    triangleCount: 20,
  }
  const viewportScale = settings.viewportSize / settings.size

  console.log('Loading image...')
  const originalImage = await fetchImage(imageUrl, 128)

  const ctxOriginal = createCanvas('Original', settings.viewportSize).ctx

  drawImageDataScaled(ctxOriginal, originalImage, viewportScale)

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
    return calculateFitness(settings, pos, imageTex)
  }

  const bestCtx = createCanvas('Best', settings.viewportSize).ctx

  const particleCtxList = Array.from({length: 3}).map(
    (_, i) => createCanvas('Particle ' + (i + 1), settings.viewportSize).ctx,
  )

  runPSO_decent(
    lossFn,
    settings.triangleCount * TRIANGLE_SIZE,
    particleCtxList.length,
    async (best, particles) => {
      particles.map((p, i) => {
        const triangleTex = drawTrianglesToTexture(settings, p.pos)
        drawTextureToCanvas(
          particleCtxList[i],
          triangleTex,
          settings.size,
          viewportScale,
        )
      })

      const triangleTex = drawTrianglesToTexture(settings, best)
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
