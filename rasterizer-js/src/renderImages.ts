import pkg from 'snappy'
const {uncompressSync} = pkg

import * as fs from 'fs/promises'
import {RGB_Norm_Buffer, Generations} from './micro.js'
import {
  drawCirclesToNewTex,
  drawTrianglesToTexture,
} from './fitness-calculator.js'
import imageEncode from 'image-encode'

const TARGET_HEIGHT = 1024
const images = await fetchImagesList()

for (const imageName of images) {
  console.log(imageName, 'Fetching best image...')

  const fileName =
    [imageName, 'triangle', 44, 'FluorescentPink,Blue'].join('_') + '.json'
  const filePath = './data_best/' + fileName

  const gen = await fs
    .readFile(filePath, 'utf8')
    .then(f => JSON.parse(f))
    .then(item => {
      item.data = JSON.parse(
        uncompressSync(Buffer.from(item.compressed_data, 'base64'), {
          asBuffer: false,
        }),
      )
      item.compressed_data = null
      item.data.positions = new Float32Array(item.data.positions)
      return item as Generations
    })
    .catch(err => {
      if (err.code === 'ENOENT') {
        console.log(fileName, 'not found')
        return null
      }
      console.log(imageName, err)
    })

  if (gen == null) continue

  console.log('Rendering', gen.source_image_name, gen.id)

  const TARGET_WIDTH = Math.floor(
    (gen.source_image_width / gen.source_image_height) * TARGET_HEIGHT,
  )

  const tex =
    gen.item_type === 'triangle'
      ? drawTrianglesToTexture(
          TARGET_WIDTH,
          TARGET_HEIGHT,
          gen.data.positions,
          gen.data.color_map,
        )
      : drawCirclesToNewTex(
          TARGET_WIDTH,
          TARGET_HEIGHT,
          gen.data.positions,
          gen.data.color_map,
        )

  const imageData = texToImageData(tex, TARGET_WIDTH, TARGET_HEIGHT)

  const arrBuff = imageEncode(imageData.data, 'png', {
    width: TARGET_WIDTH,
    height: TARGET_HEIGHT,
  })
  const buf = arrayBufferToBufferCycle(arrBuff)

  console.log('Creating dirs...')

  const nameFolder = './rendered_by_name/' + imageName
  await fs.mkdir(nameFolder, {recursive: true})

  const bestFolder = './rendered_best'
  await fs.mkdir(bestFolder, {recursive: true})

  const instanceFolder =
    './rendered_by_instance/' +
    [imageName, gen.item_type, gen.item_count, gen.color_map_hash].join('_')
  await fs.mkdir(instanceFolder, {recursive: true})

  console.log('Saving files...')

  await fs.writeFile(
    nameFolder +
      '/' +
      [gen.item_type, gen.item_count, gen.color_map_hash, gen.generation].join(
        '_',
      ) +
      '.png',
    buf,
  )

  await fs.writeFile(
    bestFolder +
      '/' +
      [gen.item_type, gen.item_count, gen.color_map_hash].join('_') +
      '.png',
    buf as any,
  )

  await fs.writeFile(
    instanceFolder +
      '/' +
      [gen.item_type, gen.item_count, gen.color_map_hash, gen.generation].join(
        '_',
      ) +
      '.png',
    buf as any,
  )
}

console.log('Done')

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
