import * as fs from 'fs/promises'
import Prisma from '@prisma/client'

await fs.mkdir('./data_unsynced', {recursive: true})
await fs.mkdir('./data_best', {recursive: true})

console.log('Getting files to upload...')
const filesToSync = await fetchFileList()
console.log('...', filesToSync.length, 'local files to upload')

console.log('Connecting to db...')
const prisma = new Prisma.PrismaClient()
await prisma.$connect()

console.log('Fetching instances of renders...')
const allTypes = await prisma.generations.groupBy({
  by: ['color_map_hash', 'item_type', 'item_count', 'source_image_name'],
  _max: {
    generation: true,
  },
})

console.log('...', allTypes.length, 'instances')

for (const item of allTypes) {
  const fileName =
    [
      item.source_image_name,
      item.item_type,
      item.item_count,
      item.color_map_hash,
    ].join('_') + '.json'
  const filePath = './data_best/' + fileName

  const savedGeneration = await fs
    .readFile(filePath, 'utf8')
    .then(f => JSON.parse(f))
    .then(f => f.generation)
    .catch(err => {
      console.log(err.code, err)
      return 0
    })

  if (item._max.generation > savedGeneration) {
    console.log('Saving', fileName, '...')
    const latestItem = await prisma.generations.findFirst({
      where: {
        source_image_name: item.source_image_name,
        item_type: item.item_type,
        item_count: item.item_count,
        color_map_hash: item.color_map_hash,
      },
      orderBy: {
        generation: 'desc',
      },
    })

    if (latestItem == null) {
      console.error('Could not find item in db:', item)
      continue
    }

    const c = {
      ...latestItem,
      compressed_data: latestItem.compressed_data.toString('base64'),
    }

    await fs.writeFile(filePath, JSON.stringify(c))
  }
}

const docs = []
for (const fileName of filesToSync) {
  try {
    const doc = JSON.parse(
      await fs.readFile('./data_unsynced/' + fileName, {encoding: 'utf8'}),
    )
    doc.compressed_data = Buffer.from(doc.compressed_data, 'base64')
    docs.push(doc)
  } catch (error) {
    console.error(fileName, error)
  }
}

console.log('... uploading local items')
await prisma.generations.createMany({
  skipDuplicates: true,
  data: docs,
})

console.log('... deleting local items')
for (const fileName of filesToSync) {
  try {
    await fs.unlink('./data_unsynced/' + fileName)
  } catch (error) {
    console.error(fileName, error)
  }
}

console.log('Done!')
await prisma.$disconnect()

async function fetchFileList() {
  const files = await fs.readdir('./data_unsynced')
  return files.filter(f => f.endsWith('.json'))
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}
