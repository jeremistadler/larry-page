import * as fs from 'fs/promises'
import * as childP from 'child_process'

const allImageNames = await fetchImagesList()

for (const imageName of allImageNames) {
  console.log('Starting', imageName)
  childP.spawn('yarn server', [imageName], {shell: true, stdio: 'inherit'})
}

async function fetchImagesList() {
  const files = await fs.readdir('images')
  return files.filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
}
