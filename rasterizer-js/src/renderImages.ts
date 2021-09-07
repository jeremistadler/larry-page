import Prisma from '@prisma/client'
import imageEncode from 'image-encode'
import pkg from 'snappy'
const {uncompressSync} = pkg

import * as fs from 'fs/promises'
import {
  ColorMapNormalized,
  RGB_Norm_Buffer,
  Pos_Buffer,
  TRIANGLE_SIZE,
  CIRCLE_SIZE,
} from './micro.js'
import {
  drawCirclesToNewTex,
  drawTrianglesToTexture,
} from './fitness-calculator.js'

const prisma = new Prisma.PrismaClient()

const images = await fetchImagesList()

const bestPath = './rendered/best'
await fs.mkdir(bestPath, {recursive: true})

for (const imageName of images) {
  console.log(imageName, 'Fetching best image...')
  const gen = await prisma.generations.findFirst({
    where: {
      source_image_name: imageName,
      item_type: 'triangle',
      item_count: 120,
      fitness: {gt: 0},
      compressed_data: {not: null},
    },
    orderBy: [
      {
        training_resolution: 'desc',
      },
      {
        fitness: 'asc',
      },
    ],
  })

  if (gen == null) {
    console.log('No results for image', imageName)
    continue
  }

  if (gen.compressed_data == null) {
    console.log('No compressed_data for image', imageName)
    continue
  }

  console.log('Uncompressing data...')
  const data = JSON.parse(
    uncompressSync(gen.compressed_data, {asBuffer: true}).toString('utf8'),
  ) as {positions: Pos_Buffer; color_map: ColorMapNormalized}

  console.log({
    itemCount: gen.item_count,
    posItemCount:
      data.positions.length /
      (gen.item_type === 'triangle' ? TRIANGLE_SIZE : CIRCLE_SIZE),
    colorItemCount: data.color_map.length,
  })

  console.log('Creating dir...')
  const folderPath = './rendered/' + gen.source_image_name
  await fs.mkdir(folderPath, {recursive: true})

  console.log('Rendering', gen.source_image_name, gen.id)

  const TARGET_HEIGHT = 1024
  const TARGET_WIDTH = Math.floor(
    (gen.source_image_width / gen.source_image_height) * TARGET_HEIGHT,
  )

  const tex =
    gen.item_type === 'triangle'
      ? drawTrianglesToTexture(
          TARGET_WIDTH,
          TARGET_HEIGHT,
          new Float32Array(data.positions) as Pos_Buffer,
          data.color_map,
        )
      : drawCirclesToNewTex(
          TARGET_WIDTH,
          TARGET_HEIGHT,
          new Float32Array(data.positions) as Pos_Buffer,
          data.color_map,
        )

  const imageData = texToImageData(tex, TARGET_WIDTH, TARGET_HEIGHT)

  const arrBuff = imageEncode(imageData.data, 'png', {
    width: TARGET_WIDTH,
    height: TARGET_HEIGHT,
  })
  const buf = arrayBufferToBufferCycle(arrBuff)
  await fs.writeFile(
    folderPath +
      '/' +
      gen.item_type +
      '_' +
      gen.item_count +
      '_' +
      gen.generation +
      '.png',
    buf as any,
  )

  await fs.writeFile(
    bestPath + '/' + gen.source_image_name + '.png',
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
