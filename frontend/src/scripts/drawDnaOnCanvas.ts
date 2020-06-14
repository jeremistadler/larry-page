import {Dna} from 'shared/src/dna'
import {drawOnBuffer} from 'shared/src/fitness-calculator'

export function drawDnaOnCanvas(ctx: CanvasRenderingContext2D, dna: Dna) {
  var width = ctx.canvas.width
  var height = ctx.canvas.height

  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, width, height)

  for (var g = 0; g < dna.genes.length; g++) {
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
}

export function drawFitnessDiffOnCanvas(
  ctx: CanvasRenderingContext2D,
  dna: Dna,
  imageData: ImageData,
) {
  if (imageData.width !== ctx.canvas.width) return

  if (imageData.height !== ctx.canvas.height) return

  const buffer = drawOnBuffer(dna, imageData)

  for (var i = 0; i < buffer.length; i++) {
    var q = Math.abs(imageData.data[i] - buffer[i])
    buffer[i] = q
  }

  for (let y = 0; y < imageData.width; y++) {
    for (let x = 0; x < imageData.height; x++) {
      buffer[y * imageData.width * 4 + x * 4 + 3] = 255
    }
  }

  ctx.putImageData(
    new ImageData(buffer, imageData.width, imageData.height),
    0,
    0,
  )
}
