import * as fs from 'fs/promises'
import sharp from 'sharp'
import imageDecode from 'image-decode'

const allImageNames = await fetchImagesList()
const sizes = [64, 128, 256, 512, 1024]

await fs.mkdir('./images_resized', {recursive: true})
const mapFile = []

for (const imageName of allImageNames) {
  console.log(imageName)
  const srcImagePath = './images/' + imageName
  const originalImage = imageDecode(await fs.readFile(srcImagePath))
  mapFile.push({
    name: imageName,
    originalWidth: originalImage.width,
    originalHeight: originalImage.height,
  })

  for (const size of sizes) {
    const distPath = './images_resized/' + size + '_' + imageName

    const fileExists = await fs
      .stat(distPath)
      .then(f => f.isFile() && f.size > 0)
      .catch(() => false)

    if (fileExists) continue

    await sharp(srcImagePath)
      .resize(size, size, {
        fit: 'fill',
        background: '#fff',
      })
      .jpeg({
        quality: 95,
      })
      .toFile(distPath)
  }
}

await fs.writeFile(
  './images_resized/map.json',
  JSON.stringify(mapFile, null, 2),
)

async function fetchImagesList() {
  const files = await fs.readdir('./images')
  return files.filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
}
