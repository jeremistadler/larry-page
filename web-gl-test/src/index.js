import {diffTextures} from './diffTextures'
import {drawTriangles} from './drawTriangles'
import {regl} from './regl'
import {renderTexture} from './renderTexture'
import incrSGDRegression from '@stdlib/ml-incr-sgd-regression'

import {
  posBuffer,
  triangles,
  colorBuffer,
  TEXTURE_SIZE,
  RISO_COLORS,
} from './triangles'

const triangleResultFbo = regl.framebuffer({
  width: TEXTURE_SIZE,
  height: TEXTURE_SIZE,
  colorFormat: 'rgba',
  colorType: 'uint8',
  mag: 'nearest',
  min: 'nearest',
  stencil: false,
  depthStencil: false,
})

const diffResultFbo = regl.framebuffer({
  width: TEXTURE_SIZE,
  height: TEXTURE_SIZE,
  colorFormat: 'rgba', //luminance
  colorType: 'float',
  mag: 'nearest',
  min: 'nearest',
  stencil: false,
  depthStencil: false,
})

let mode = 0

document.body.addEventListener(
  'click',
  () => {
    mode++
    mode = mode % 4
  },
  {passive: true, capture: false},
)

const pixelReadBuffer = new Float32Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)

// console.log(regl.limits.textureFormats)

// var gpuReduce = gpuReduceCreate()

var image = new Image()
image.src = 'test.jpg'
image.onload = function () {
  const imageTexture = regl.texture(image)
  let fitnessTestCounter = 0

  function calculateFitness() {
    fitnessTestCounter++
    colorBuffer.subdata(triangles.map(f => f.color))
    posBuffer.subdata(triangles.map(f => f.pos))

    regl.clear({
      color: [1, 1, 1, 1],
      framebuffer: triangleResultFbo,
    })
    drawTriangles({
      outFbo: triangleResultFbo,
    })

    regl.clear({
      color: [0, 0, 0, 1],
      framebuffer: diffResultFbo,
    })
    diffTextures({
      texture1: triangleResultFbo,
      texture2: imageTexture,
      outFbo: diffResultFbo,
    })

    let result = 0

    regl({framebuffer: diffResultFbo})(() => {
      const buff = regl.read(pixelReadBuffer)
      for (let i = 0; i < pixelReadBuffer.length; i += 4) {
        result += buff[i]
      }
    })

    return result
  }

  let currentFitness = calculateFitness()
  let lastLoggedFitness = currentFitness

  setInterval(() => {
    console.log({
      fitnessTestCounter,
      currentFitness,
      fitnessDiff: lastLoggedFitness - currentFitness,
      fitnessDiffPerTest:
        ((lastLoggedFitness - currentFitness) / fitnessTestCounter) * 1000,
    })

    fitnessTestCounter = 0
    lastLoggedFitness = currentFitness
  }, 1000)

  regl.frame(() => {
    for (let sampleIndex = 0; sampleIndex < 10; sampleIndex++) {
      const triangleIndex = Math.floor(Math.random() * triangles.length)
      const pos = [
        Math.random(),
        Math.random(),
        Math.random(),
        Math.random(),
        Math.random(),
        Math.random(),
      ]

      const prePos = triangles[triangleIndex].pos
      triangles[triangleIndex].pos = pos
      const fitness = calculateFitness()

      if (currentFitness / fitness > 0.9999) {
        currentFitness = fitness
      } else {
        triangles[triangleIndex].pos = prePos
      }
    }

    regl.clear({
      color: [1, 1, 1, 1],
      framebuffer: null,
    })

    if (mode === 0) {
      calculateFitness()
      drawTriangles({
        outFbo: null,
      })
      // renderTexture({texture: triangleResultFbo})
    }
    if (mode === 1) {
      renderTexture({texture: imageTexture})
    }
    if (mode === 2) {
      renderTexture({texture: imageTexture})
      renderTexture({texture: triangleResultFbo})
    }
    if (mode === 3) {
      calculateFitness()
      renderTexture({texture: diffResultFbo})
    }
  })
}
