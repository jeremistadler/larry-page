import {Dna} from 'shared/src/dna'
import {drawOnBuffer} from 'shared/src/fitness-calculator'

export function drawDnaOnCanvas(ctx: CanvasRenderingContext2D, image: Dna) {
  const width = ctx.canvas.width
  const height = ctx.canvas.height

  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, width, height)

  for (const triangle of image.genes) {
    ctx.fillStyle =
      'rgba(' +
      Math.floor(triangle.color[0] * 255) +
      ',' +
      Math.floor(triangle.color[1] * 255) +
      ',' +
      Math.floor(triangle.color[2] * 255) +
      ',' +
      triangle.color[3] +
      ')'

    ctx.beginPath()
    ctx.moveTo(triangle.pos[0] * width, triangle.pos[1] * height)
    ctx.lineTo(triangle.pos[2] * width, triangle.pos[3] * height)
    ctx.lineTo(triangle.pos[4] * width, triangle.pos[5] * height)
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
