import gifencoder from 'gifencoder'
import {Dna} from 'shared/src/dna'

const downloadURL = function (data: string, fileName: string) {
  const a = document.createElement('a')
  a.href = data
  a.download = fileName
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const addGifToBody = function (data: Uint8Array) {
  const blob = new Blob([data], {
    type: 'image/gif',
  })

  const a = document.createElement('img')
  a.src = window.URL.createObjectURL(blob)
  a.style.width = '128px'
  a.style.height = '128px'
  a.style.position = 'absolute'
  a.style.top = '10px'
  a.style.left = '10px'
  document.body.appendChild(a)
}

const downloadBlob = function (data: Uint8Array, fileName: string) {
  const blob = new Blob([data], {
    type: 'image/gif',
  })
  const url = window.URL.createObjectURL(blob)

  downloadURL(url, fileName)
  setTimeout(function () {
    return window.URL.revokeObjectURL(url)
  }, 1000)
}

export function createGif(dna: Dna) {
  const encoder = new gifencoder(512, 512)
  const stream = encoder.createReadStream()

  const bufs: Uint8Array[] = []
  stream.on('data', (data: Uint8Array) => bufs.push(data))
  stream.on('end', () => {
    const totalSize = bufs.reduce((len, buf) => len + buf.length, 0)
    const total = new Uint8Array(totalSize)

    let offset = 0
    for (let i = 0; i < bufs.length; i++) {
      total.set(bufs[i], offset)
      offset += bufs[i].length
    }

    downloadBlob(total, 'hello.gif')
  })

  encoder.start()
  encoder.setRepeat(0) // 0 for repeat, -1 for no-repeat
  encoder.setDelay(100) // frame delay in ms
  encoder.setQuality(10) // image quality. 10 is default.

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  var width = 512
  var height = 512

  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, width, height)

  // ctx.putImageData(this.source, 0, 0)
  // return

  for (var frame = 0; frame < dna.genes.length; frame++) {
    for (var g = 0; g < frame; g++) {
      var gene = dna.genes[g]
      ctx.fillStyle =
        'rgba(' +
        Math.floor(gene.color[0] * 255) +
        ',' +
        Math.floor(gene.color[1] * 255) +
        ',' +
        Math.floor(gene.color[2] * 255) +
        ',' +
        gene.color[3] +
        ')'

      ctx.beginPath()
      ctx.moveTo(gene.pos[0] * width, gene.pos[1] * height)
      ctx.lineTo(gene.pos[2] * width, gene.pos[3] * height)
      ctx.lineTo(gene.pos[4] * width, gene.pos[5] * height)
      ctx.closePath()
      ctx.fill()
    }

    encoder.addFrame(ctx)
  }

  encoder.finish()
}
