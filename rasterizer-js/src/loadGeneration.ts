import * as fs from 'fs/promises'
import * as path from 'path'
import {
  ColorMapNormalized,
  Pos_Buffer,
  TRIANGLE_SIZE,
  ItemType,
  Generations,
  CIRCLE_SIZE,
} from './micro.js'
import {createBounds} from './createBounds.js'
import snappy from 'snappy'
import {generateId} from './generateId.js'
import {colorPaletteToHash, createColorMap} from './createColorMap.js'
const {compressSync, uncompressSync} = snappy

export async function saveGeneration(gen: Generations) {
  const bestFileName =
    [
      gen.source_image_name,
      gen.item_type,
      gen.item_count,
      gen.color_map_hash,
    ].join('_') + '.json'
  const bestFilePath = './data_best/' + bestFileName
  const unsyncedFilePath = `./data_unsynced/${
    gen.source_image_name
  }_${Date.now()}_${Math.floor(Math.random() * 100000)}.json`

  const dataAsString = JSON.stringify({
    ...gen,
    data: undefined,
    compressed_data: compressSync(
      JSON.stringify({...gen.data, positions: [...gen.data.positions]}),
    ).toString('base64'),
  })

  await fs.writeFile(bestFilePath, dataAsString)
  await fs.writeFile(unsyncedFilePath, dataAsString)
}

export async function loadGeneration(
  imageName: string,
  type: ItemType,
  itemCount: number,
  palette: ColorMapNormalized,
): Promise<Generations> {
  const featureCount =
    itemCount * (type === 'triangle' ? TRIANGLE_SIZE : CIRCLE_SIZE)
  const colorHash = colorPaletteToHash(palette)
  const fileName = [imageName, type, itemCount, colorHash].join('_') + '.json'
  const filePath = path.resolve('./data_best', fileName)
  const data = await fs
    .readFile(filePath, 'utf8')
    .then(f => JSON.parse(f) as Generations)
    .then(item => {
      item.data = JSON.parse(
        uncompressSync(
          Buffer.from(item.compressed_data as unknown as string, 'base64'),
          {
            asBuffer: false,
          },
        ),
      )
      item.compressed_data = null
      item.data.positions = new Float32Array(item.data.positions) as Pos_Buffer
      return item
    })
    .catch(err => {
      if (err.code === 'ENOENT') return null
      throw err
    })

  if (data) {
    console.log('Loading previous save...')

    if (data.data.positions.length !== featureCount) {
      throw new Error(
        'DB positions did not equal settings ' +
          data.data.positions.length +
          ' ' +
          featureCount,
      )
    }

    if (data.data.bounds.length !== featureCount) {
      throw new Error(
        'DB bounds did not equal settings ' +
          data.data.bounds.length +
          ' ' +
          featureCount,
      )
    }

    if (data.data.color_map.length !== itemCount) {
      throw new Error(
        'DB color_map did not equal settings ' +
          data.data.color_map.length +
          ' ' +
          itemCount,
      )
    }

    return data
  }

  console.log('No previous found, creating new...')

  const bounds = createBounds(itemCount, type)
  if (bounds.length !== featureCount)
    throw new Error('Bounds are not the same length as pos ' + bounds.length)

  const positions = new Float32Array(featureCount) as Pos_Buffer

  for (let i = 0; i < positions.length; i++) {
    positions[i] = bounds[0][0]
  }

  const originalSizeList = await fs
    .readFile('./images_resized/map.json', 'utf8')
    .then(
      f =>
        JSON.parse(f) as {
          name: string
          originalWidth: number
          originalHeight: number
        }[],
    )

  const orgSize = originalSizeList.find(f => f.name === imageName)
  if (orgSize == null)
    throw new Error(
      'Could not find original size in map.json file for ' + imageName,
    )

  return {
    id: generateId(),
    color_map_hash: colorHash,
    created_at: new Date(),
    updated_at: new Date(),
    fitness: 0,
    generation: 0,
    item_count: itemCount,
    item_type: type,
    optimizer_algorithm: 'differential_evolution',
    ms_per_generation: 0,
    source_image_name: imageName,
    source_image_height: orgSize.originalHeight,
    source_image_width: orgSize.originalWidth,
    compressed_data: null,
    parent_id: null,
    training_resolution: 64,
    data: {
      bounds,
      positions,
      palette: palette,
      color_map: createColorMap(itemCount, palette),
    },
  }
}
