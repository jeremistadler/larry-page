import {diffTextures} from './diffTextures'
import {drawTriangles} from './drawTriangles'
import {regl} from './regl'
import {renderTexture} from './renderTexture'
// import {nelderMead} from 'fmin'
import {runPSO} from './particle_swarm'

import {posBuffer, TEXTURE_SIZE, posData} from './triangles'
import {runStocastic} from './stocastic'

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
  colorFormat: 'rgba',
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
    mode = mode % 2
  },
  {passive: true, capture: false},
)

const pixelReadBuffer = new Float32Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)

var image = new Image()
image.src = 'threeRgbTriangles.png'
image.onload = async function () {
  const imageTexture = regl.texture(image)
  let fitnessTestCounter = 0

  //

  posData[0] = 0
  posData[1] = 0

  posData[2] = 1
  posData[3] = 0

  posData[4] = 1
  posData[5] = 1

  regl.frame(() => {
    calculateFitness()
    regl.clear({
      color: [1, 1, 1, 1],
      framebuffer: null,
    })
    renderTexture({
      texture: triangleResultFbo,
    })
  })

  //

  return

  function calculateFitness() {
    fitnessTestCounter++
    posBuffer.subdata(posData)

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

    return result // / 30000
  }

  let currentFitness = calculateFitness()
  const startFitness = currentFitness
  let lastLoggedFitness = currentFitness

  // setInterval(() => {

  // }, 1000)

  // const oldPositions = new Float32Array(posData.length)

  const loss = testPoints => {
    posData.set(testPoints)
    return calculateFitness()
  }

  const solution = await runPSO(
    loss,
    posData.length,
    (currentPos, particles) => {
      // regl.clear({
      //   color: [1, 1, 1, 1],
      //   framebuffer: triangleResultFbo,
      // })
      regl.clear({
        color: [1, 1, 1, 1],
        framebuffer: null,
      })
      // particles.forEach(p => {
      //   posBuffer.subdata(p.pos)
      //   drawTriangles({
      //     outFbo: null,
      //   })
      // })

      posData.set(currentPos)
      currentFitness = calculateFitness()
      renderTexture({texture: diffResultFbo})

      return new Promise(r => setTimeout(r, 10))
    },
  )

  posData.set(solution)
  currentFitness = calculateFitness()
  renderTexture({texture: diffResultFbo})

  const stocasticSolution = await runStocastic(loss, posData, currentPos => {
    // regl.clear({
    //   color: [1, 1, 1, 1],
    //   framebuffer: triangleResultFbo,
    // })
    regl.clear({
      color: [1, 1, 1, 1],
      framebuffer: null,
    })

    posData.set(currentPos)
    currentFitness = calculateFitness()
    renderTexture({texture: diffResultFbo})

    return new Promise(r => setTimeout(r, 10))
  })

  posData.set(stocasticSolution)
  currentFitness = calculateFitness()
  renderTexture({texture: diffResultFbo})

  console.log({
    posData,
    fitnessTestCounter,
    currentFitness,
    fitnessDiff: lastLoggedFitness - currentFitness,
    fitnessDiffPerTest:
      ((lastLoggedFitness - currentFitness) / fitnessTestCounter) * 1000,
  })

  fitnessTestCounter = 0
  lastLoggedFitness = currentFitness

  // regl.frame(() => {
  // oldPositions.set(posData)

  // for (let sampleIndex = 0; sampleIndex < 10; sampleIndex++) {
  //   oldPositions.set(posData)

  //   // for (let i = 0; i < 6; i++) {
  //   //   posData[triangleIndex * + i] + Math.random()
  //   // }

  //   // for (let y = 0; y < posData.length; y++) {
  //   //   posData[y] = Math.random()
  //   // }

  //   const triangleIndex = Math.floor(Math.random() * posData.length)
  //   posData[triangleIndex] += (Math.random() - 0.5) * 0.1

  //   const fitness = calculateFitness()

  //   sdg([...posData], fitness / startFitness)

  //   if (currentFitness / fitness > 0.9999) {
  //     currentFitness = fitness
  //   } else {
  //     posData.set(oldPositions)
  //   }
  // }

  //   regl.clear({
  //     color: [1, 1, 1, 1],
  //     framebuffer: null,
  //   })

  //   if (mode === 0) {
  //     calculateFitness()
  //     drawTriangles({
  //       outFbo: null,
  //     })
  //     // renderTexture({texture: triangleResultFbo})
  //   } else if (mode === 1) {
  //     renderTexture({texture: imageTexture})
  //   } else if (mode === 2) {
  //     // posBuffer.subdata(sdg.coefs)

  //     drawTriangles({
  //       outFbo: null,
  //     })
  //   } else if (mode === 3) {
  //     calculateFitness()
  //     renderTexture({texture: diffResultFbo})
  //   }
  // })
}
