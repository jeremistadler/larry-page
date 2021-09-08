import * as fs from 'fs/promises'
import * as os from 'os'
import * as childP from 'child_process'

const allImageNames = await fetchImagesList()
let nextImageIndex = 0

let runningNames = new Set()
const targetItems = os.cpus().length

console.log('Max processes:', targetItems)

setInterval(() => {
  if (runningNames.size < targetItems) {
    startThread(allImageNames[nextImageIndex])
    nextImageIndex = (nextImageIndex + 1) % allImageNames.length
  }
}, 1000)

function startThread(imageName) {
  console.log('Starting', imageName)
  runningNames.add(imageName)

  const cp = childP.spawn('node ./dist/server.js', [imageName], {
    shell: true,
    stdio: 'inherit',
  })
  cp.addListener('exit', code => {
    runningNames.delete(imageName)
    console.log(imageName, 'stopped with code', code)
  })
  cp.addListener('error', error => {
    console.log(imageName, 'error', error)
  })
  if (cp.killed) {
    runningNames.delete(imageName)
    console.log(imageName, 'was killed on start')
  }
}

async function fetchImagesList() {
  const files = await fs.readdir('images')
  return files.filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
}
