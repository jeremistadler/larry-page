import {Dna} from './dna'
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

  for (let i = 0; i < genes.length; i++) {
    const gene = genes[i]
    const color = gene.color
    const pos = gene.pos

    const r = (color[0] * 255) | 0
    const g = (color[1] * 255) | 0
    const b = (color[2] * 255) | 0
    let alphaI = (color[3] * 256) | 0
    if (alphaI < 0) alphaI = 0
    else if (alphaI > 256) alphaI = 256
    if (alphaI === 0) continue

    drawTriangle(
      buffer,
      w,
      h,
      pos[0] * w,
      pos[1] * h,
      pos[2] * w,
      pos[3] * h,
      pos[4] * w,
      pos[5] * h,
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
