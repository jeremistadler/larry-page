import Prisma from '@prisma/client'
import imageEncode from 'image-encode'

import * as fs from 'fs/promises'
import {ColorMapNormalized, RGB_Norm_Buffer, Triangle_Buffer} from './micro'
import {drawTrianglesToTexture} from './fitness-calculator'

const prisma = new Prisma.PrismaClient()

const images = await fetchImagesList()

console.log('Creating dir...')
await fs.mkdir('./rendered', {recursive: true})

for (const imageName of images) {
  console.log('Fetching best image...')
  const gen = await prisma.generations.findFirst({
    where: {
      source_image_name: imageName,
      fitness: {gt: 0},
    },
    orderBy: [
      {
        fitness: 'asc',
      },
    ],
  })

  if (gen == null) {
    console.log('No results for image', imageName)
    continue
  }

  console.log('Rendering', gen.source_image_name, gen.id)

  const TARGET_HEIGHT = 512
  const TARGET_WIDTH = Math.floor(
    (gen.source_image_width / gen.source_image_height) * TARGET_HEIGHT,
  )

  const tex = drawTrianglesToTexture(
    TARGET_WIDTH,
    TARGET_HEIGHT,
    new Float32Array(JSON.parse(gen.positions)) as Triangle_Buffer,
    JSON.parse(gen.color_map) as ColorMapNormalized,
  )

  const imageData = texToImageData(tex, TARGET_WIDTH, TARGET_HEIGHT)

  const arrBuff = imageEncode(imageData.data, 'png', {
    width: TARGET_WIDTH,
    height: TARGET_HEIGHT,
  })
  const buf = arrayBufferToBufferCycle(arrBuff)
  await fs.writeFile(
    './rendered/' + gen.source_image_name + '_' + gen.generation + '.png',
    buf as any,
  )
}

console.log('Done')
prisma.$disconnect()

function arrayBufferToBufferCycle(ab: ArrayBuffer) {
  var buffer = Buffer.alloc(ab.byteLength)
  var view = new Uint8Array(ab)
  for (var i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i]
  }
  return buffer
}

function texToImageData(
  tex: RGB_Norm_Buffer,
  width: number,
  height: number,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      const pos = y * width + x

      data[pos * 4 + 0] = tex[pos * 3 + 0] * 255
      data[pos * 4 + 1] = tex[pos * 3 + 1] * 255
      data[pos * 4 + 2] = tex[pos * 3 + 2] * 255
      data[pos * 4 + 3] = 255
    }
  }

  return {width, height, data}
}

async function fetchImagesList() {
  const files = await fs.readdir('images')
  return files.filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
}
