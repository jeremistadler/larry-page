import {diffTextures} from './diffTextures'
import {drawTriangles} from './drawTriangles'
import {regl} from './regl'
import {renderTexture} from './renderTexture'
import incrSGDRegression from '@stdlib/ml-incr-sgd-regression'
import {conjugateGradient} from 'fmin'

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

const GRADIENT_SIZE = 16
const gradientTex = regl.texture({
  width: GRADIENT_SIZE,
  height: GRADIENT_SIZE,
  colorFormat: 'rgba',
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
image.src = '1pxBlack.png'
image.onload = function () {
  const imageTexture = regl.texture(image)
  let lastFitness = 100000000

  function calculateFitness() {
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

  // console.log(calculateFitness())

  // calculateFitness()
  // renderTexture({texture: triangleResultFbo})

  // var accumulator = incrSGDRegression({intercept: false})

  regl.frame(() => {
    // for (let sampleIndex = 0; sampleIndex < 100; sampleIndex++) {
    //   const pos = [
    //     Math.random(),
    //     Math.random(),
    //     Math.random(),
    //     Math.random(),
    //     Math.random(),
    //     Math.random(),
    //   ]

    //   triangles[0].pos = pos
    //   const fitness = (calculateFitness() - 28000) / 4000
    //   accumulator(pos, fitness)
    // }

    // console.log(accumulator.coefs)

    const start = performance.now()
    const fitnessPre = calculateFitness()

    const triangleIndex = Math.floor(Math.random() * triangles.length)
    const posPre = triangles[triangleIndex].pos
    let cycles = 0
    const nelderResult = conjugateGradient(
      pos => {
        triangles[triangleIndex].pos = [...pos]
        cycles++
        return calculateFitness()
      },
      [Math.random(), Math.random(), Math.random(), Math.random()],
    )

    triangles[triangleIndex].pos = [...nelderResult.x]
    const fitnessPost = calculateFitness()

    console.log({
      triangleIndex,
      from: posPre,
      to: [...nelderResult.x],
      ms: performance.now() - start,
      fitnessImprovement: fitnessPost - fitnessPre,
      fitnessPost,
      fitnessPre,
      cycles,
    })

    regl.clear({
      color: [0, 0, 1, 1],
      framebuffer: null,
    })

    if (mode === 0) {
      calculateFitness()
      renderTexture({texture: triangleResultFbo})
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
    if (mode === 4) {
      const arr = []
      let min = 10000000
      let max = 0
      for (let y = 0; y < GRADIENT_SIZE; y++) {
        for (let x = 0; x < GRADIENT_SIZE; x++) {
          const pos = [x / GRADIENT_SIZE, y / GRADIENT_SIZE, 0.5, 0.5, 0.3, 0.6]

          triangles[0].pos = pos

          colorBuffer.subdata([
            ...RISO_COLORS[0],
            1,
            ...RISO_COLORS[0],
            1,
            ...RISO_COLORS[0],
            1,
          ])
          const fitness = calculateFitness() // accumulator.predict(pos)
          arr.push(fitness)

          if (fitness > max) max = fitness
          if (fitness < min) min = fitness

          colorBuffer.subdata([
            ...RISO_COLORS[1],
            1,
            ...RISO_COLORS[1],
            1,
            ...RISO_COLORS[1],
            1,
          ])
          arr.push(calculateFitness())

          colorBuffer.subdata([
            ...RISO_COLORS[3],
            1,
            ...RISO_COLORS[3],
            1,
            ...RISO_COLORS[3],
            1,
          ])
          arr.push(calculateFitness())
          arr.push(-100000)
        }
      }

      const delta = max - min
      const arr2 = []
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === -100000) arr2.push(255)
        else {
          arr2.push(((arr[i] - min) / delta) * 255)
        }
      }

      gradientTex.subimage({
        data: arr2,
      })
      renderTexture({texture: gradientTex})
    }
  })
}

// for (let renderSample = 0; renderSample < RENDER_SAMPLES; renderSample++) {
//   const indexToChange = Math.floor(Math.random() * triangles.length)
//   const oldTriangle = triangles[indexToChange]

//   //const newColor = RISO_COLORS[Math.floor(Math.random() * RISO_COLORS.length)]
//   triangles[indexToChange] = {
//     pos: [
//       [2 - Math.random() * 4, 2 - Math.random() * 4],
//       [2 - Math.random() * 4, 2 - Math.random() * 4],
//       [2 - Math.random() * 4, 2 - Math.random() * 4],
//     ],
//     color: oldTriangle.color,
//   }
// if (lastFitness / result > 0.9995) {
//   // console.log('New best fitness', result)
//   lastFitness = result
// } else {
//   triangles[indexToChange] = oldTriangle
// }
// }
