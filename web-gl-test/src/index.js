import {diffTextures} from './diffTextures'
import {drawTriangles} from './drawTriangles'
import {gpuReduceCreate} from './gpuReduceCreate'
import {regl} from './regl'
import {renderTexture} from './renderTexture'
import {posBuffer, triangles, colorBuffer, TEXTURE_SIZE} from './triangles'

export var tempTexture = regl.framebuffer({
  width: TEXTURE_SIZE,
  height: TEXTURE_SIZE,
  format: 'rgba',
  type: 'float',
  mag: 'nearest',
  min: 'nearest',
})

var temp3Texture = regl.framebuffer({
  width: TEXTURE_SIZE,
  height: TEXTURE_SIZE,
  format: 'rgba',
  type: 'float',
  mag: 'nearest',
  min: 'nearest',
})

var image = new Image()
image.src = 'test.jpg'
image.onload = function () {
  const imageTexture = regl.texture(image)

  let lastFitness = 100000000

  regl.frame(() => {
    regl.clear({
      color: [1, 1, 1, 1],
      framebuffer: tempTexture,
    })
    regl.clear({
      color: [1, 1, 1, 1],
      framebuffer: temp3Texture,
    })

    const indexToChange = Math.floor(Math.random() * triangles.length)
    const oldTriangle = triangles[indexToChange]
    triangles[indexToChange] = {
      pos: [
        [2 - Math.random() * 4, 2 - Math.random() * 4],
        [2 - Math.random() * 4, 2 - Math.random() * 4],
        [2 - Math.random() * 4, 2 - Math.random() * 4],
      ],
      color: [
        [Math.random(), Math.random(), Math.random(), Math.random()],
        [Math.random(), Math.random(), Math.random(), Math.random()],
        [Math.random(), Math.random(), Math.random(), Math.random()],
      ],
    }

    posBuffer.subdata(triangles.map(f => f.pos))
    colorBuffer.subdata(triangles.map(f => f.color))

    drawTriangles({
      outFbo: tempTexture,
    })

    diffTextures({
      texture1: tempTexture,
      texture2: imageTexture,
      outFbo: temp3Texture,
    })

    var gpuReduce = gpuReduceCreate()
    const result = gpuReduce(temp3Texture)

    if (lastFitness > result) {
      lastFitness = result
      console.log(result)

      regl.clear({
        color: [1, 1, 1, 1],
      })
      renderTexture({texture: tempTexture})
    } else {
      triangles[indexToChange] = oldTriangle
    }
  })
}
