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

  const rendered = drawOnBuffer(dna, imageData)
  const out = new Uint8ClampedArray(rendered.length)

  for (let i = 0; i < rendered.length; i += 4) {
    out[i] = Math.abs(imageData.data[i] - rendered[i])
    out[i + 1] = Math.abs(imageData.data[i + 1] - rendered[i + 1])
    out[i + 2] = Math.abs(imageData.data[i + 2] - rendered[i + 2])
    out[i + 3] = 255
  }

  ctx.putImageData(
    new ImageData(out as unknown as Uint8ClampedArray<ArrayBuffer>, imageData.width, imageData.height),
    0,
    0,
  )
}
