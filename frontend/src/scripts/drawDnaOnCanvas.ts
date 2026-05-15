import {Dna, GENE_FLOATS} from 'shared/src/dna'
import {drawOnBuffer} from 'shared/src/fitness-calculator'

export function drawDnaOnCanvas(ctx: CanvasRenderingContext2D, image: Dna) {
  const width = ctx.canvas.width
  const height = ctx.canvas.height

  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, width, height)

  const genes = image.genes
  const count = image.geneCount

  for (let i = 0; i < count; i++) {
    const off = i * GENE_FLOATS
    ctx.fillStyle =
      'rgba(' +
      Math.floor(genes[off + 6] * 255) +
      ',' +
      Math.floor(genes[off + 7] * 255) +
      ',' +
      Math.floor(genes[off + 8] * 255) +
      ',' +
      genes[off + 9] +
      ')'

    ctx.beginPath()
    ctx.moveTo(genes[off + 0] * width, genes[off + 1] * height)
    ctx.lineTo(genes[off + 2] * width, genes[off + 3] * height)
    ctx.lineTo(genes[off + 4] * width, genes[off + 5] * height)
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
    new ImageData(
      out as unknown as Uint8ClampedArray<ArrayBuffer>,
      imageData.width,
      imageData.height,
    ),
    0,
    0,
  )
}
