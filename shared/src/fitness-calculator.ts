import {Dna, GENE_FLOATS} from './dna'
import {drawTriangle} from './raster'
import {ImageData} from './ImageData'

const Buffers: Record<string, Uint8Array> = {}

function GetBuffer(width: number, height: number) {
  const key = width + ':' + height
  let buffer = Buffers[key]
  if (buffer) return buffer
  buffer = new Uint8Array(width * height * 4)
  Buffers[key] = buffer
  return buffer
}

function clearToWhite(buffer: Uint8Array) {
  buffer.fill(255)
}

function rasterize(dna: Dna, image: ImageData): Uint8Array {
  const buffer = GetBuffer(image.width, image.height)
  clearToWhite(buffer)

  const w = image.width
  const h = image.height
  const genes = dna.genes
  const count = genes.length / GENE_FLOATS

  for (let i = 0; i < count; i++) {
    const off = i * GENE_FLOATS

    const r = (genes[off + 6] * 255) | 0
    const g = (genes[off + 7] * 255) | 0
    const b = (genes[off + 8] * 255) | 0
    let alphaI = (genes[off + 9] * 256) | 0
    if (alphaI < 0) alphaI = 0
    else if (alphaI > 256) alphaI = 256
    if (alphaI === 0) continue

    drawTriangle(
      buffer,
      w,
      h,
      genes[off + 0] * w,
      genes[off + 1] * h,
      genes[off + 2] * w,
      genes[off + 3] * h,
      genes[off + 4] * w,
      genes[off + 5] * h,
      r,
      g,
      b,
      alphaI,
    )
  }

  return buffer
}

export function drawOnBuffer(dna: Dna, image: ImageData): Uint8Array {
  return rasterize(dna, image)
}

export function GetFitness(dna: Dna, image: ImageData): number {
  const buffer = rasterize(dna, image)
  return calculateFitness(image, buffer)
}

function calculateFitness(img: ImageData, buf: Uint8Array): number {
  const data = img.data
  const len = data.length
  let diff = 0
  for (let i = 0; i < len; i += 4) {
    const dr = data[i] - buf[i]
    const dg = data[i + 1] - buf[i + 1]
    const db = data[i + 2] - buf[i + 2]
    diff += dr * dr + dg * dg + db * db
  }
  const pixelCount = img.width * img.height
  return diff / pixelCount
}
