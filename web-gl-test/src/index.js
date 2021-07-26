import {diffTextures} from './diffTextures'
import {drawTriangles} from './drawTriangles'
import {gpuReduceCreate} from './gpuReduceCreate'
import {regl} from './regl'
import {renderTexture} from './renderTexture'
import {
  posBuffer,
  triangles,
  colorBuffer,
  TEXTURE_SIZE,
  RISO_COLORS,
} from './triangles'

export var triangleResultFbo = regl.framebuffer({
  width: TEXTURE_SIZE,
  height: TEXTURE_SIZE,
  colorFormat: 'rgba',
  colorType: 'uint8',
  mag: 'nearest',
  min: 'nearest',
})

var diffResultFbo = regl.framebuffer({
  width: TEXTURE_SIZE,
  height: TEXTURE_SIZE,
  colorFormat: 'rgba', //luminance
  colorType: 'float',
  mag: 'nearest',
  min: 'nearest',
})

const pixelReadBuffer = new Float32Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)

// console.log(regl.limits.textureFormats)

var gpuReduce = gpuReduceCreate()

function clamp(val) {
  return Math.min(1, Math.max(val, 0))
}

var image = new Image()
image.src = 'test.jpg'
image.onload = function () {
  const imageTexture = regl.texture(image)

  let lastFitness = 100000000

  regl.frame(() => {
    const RENDER_SAMPLES = 30
    const startTime = performance.now()

    for (let renderSample = 0; renderSample < RENDER_SAMPLES; renderSample++) {
      regl.clear({
        color: [1, 1, 1, 1],
        framebuffer: triangleResultFbo,
      })
      regl.clear({
        color: [0, 0, 0, 1],
        framebuffer: diffResultFbo,
      })

      const indexToChange = Math.floor(Math.random() * triangles.length)
      const oldTriangle = triangles[indexToChange]

      const newColor =
        RISO_COLORS[Math.floor(Math.random() * RISO_COLORS.length)]
      triangles[indexToChange] = {
        pos: [
          [
            (Math.random() - 0.5) * 0.2 + oldTriangle.pos[0][0],
            (Math.random() - 0.5) * 0.2 + oldTriangle.pos[0][1],
          ],
          [
            (Math.random() - 0.5) * 0.2 + oldTriangle.pos[1][0],
            (Math.random() - 0.5) * 0.2 + oldTriangle.pos[1][1],
          ],
          [
            (Math.random() - 0.5) * 0.2 + oldTriangle.pos[2][0],
            (Math.random() - 0.5) * 0.2 + oldTriangle.pos[2][1],
          ],
        ],
        color: [
          [...newColor, Math.random()],
          [...newColor, Math.random()],
          [...newColor, Math.random()],
        ],
      }

      posBuffer.subdata(triangles.map(f => f.pos))
      colorBuffer.subdata(triangles.map(f => f.color))

      drawTriangles({
        outFbo: triangleResultFbo,
      })

      diffTextures({
        texture1: triangleResultFbo,
        texture2: imageTexture,
        outFbo: diffResultFbo,
      })

      // renderTexture({texture: diffResultFbo})

      regl({framebuffer: diffResultFbo})(() => {
        const gpuResult = gpuReduce(diffResultFbo)
        const result = gpuResult

        // const buff = regl.read()
        // let result = 0

        // for (let i = 0; i < pixelReadBuffer.length; i++) {
        //   result += buff[i]
        // }

        // console.log({gpuResult, result})

        if (result < lastFitness || Math.random() < 0.02) {
          // console.log('New best fitness', result)
          lastFitness = result

          regl.clear({
            color: [1, 1, 1, 1],
            framebuffer: null,
          })
          renderTexture({texture: triangleResultFbo})
        } else {
          triangles[indexToChange] = oldTriangle
        }
      })
    }

    const endTime = performance.now()
    console.log('Render took', (endTime - startTime) / RENDER_SAMPLES)
  })
}
