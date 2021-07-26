import {Pos, TransparentColor, Dna} from './dna'
import {Raster} from './raster'
import {ImageData} from './ImageData'

const Buffers: Record<string, Uint8ClampedArray> = {}
const posBuffer: Pos = [0, 0, 0, 0, 0, 0]
const colorBuffer: TransparentColor = [0, 0, 0, 0]

function GetBuffer(width: number, height: number) {
  var buffer = Buffers[width + ':' + height]
  if (buffer) return buffer
  buffer = new Uint8ClampedArray(width * height * 4) as any
  Buffers[width + ':' + height] = buffer
  return buffer
}

export function drawOnBuffer(dna: Dna, image: ImageData) {
  var buffer = GetBuffer(image.width, image.height)
  for (var i = 0; i < buffer.length; i++) buffer[i] = 255

  for (var i = 0; i < dna.triangles.length; i++) {
    var gene = dna.triangles[i]

    colorBuffer[0] = Math.floor(gene.color[0] * 255)
    colorBuffer[1] = Math.floor(gene.color[1] * 255)
    colorBuffer[2] = Math.floor(gene.color[2] * 255)
    colorBuffer[3] = gene.color[3]

    posBuffer[0] = gene.pos[0] * image.width
    posBuffer[1] = gene.pos[1] * image.height
    posBuffer[2] = gene.pos[2] * image.width
    posBuffer[3] = gene.pos[3] * image.height
    posBuffer[4] = gene.pos[4] * image.width
    posBuffer[5] = gene.pos[5] * image.height

    Raster.drawPolygon(
      buffer,
      image.width,
      image.height,
      posBuffer,
      colorBuffer,
    )
  }

  return buffer
}

export function GetFitness(dna: Dna, image: ImageData) {
  var buffer = GetBuffer(image.width, image.height)
  for (var i = 0; i < buffer.length; i++) buffer[i] = 255

  for (var i = 0; i < dna.triangles.length; i++) {
    var gene = dna.triangles[i]

    colorBuffer[0] = Math.floor(gene.color[0] * 255)
    colorBuffer[1] = Math.floor(gene.color[1] * 255)
    colorBuffer[2] = Math.floor(gene.color[2] * 255)
    colorBuffer[3] = gene.color[3]

    posBuffer[0] = gene.pos[0] * image.width
    posBuffer[1] = gene.pos[1] * image.height
    posBuffer[2] = gene.pos[2] * image.width
    posBuffer[3] = gene.pos[3] * image.height
    posBuffer[4] = gene.pos[4] * image.width
    posBuffer[5] = gene.pos[5] * image.height

    Raster.drawPolygon(
      buffer,
      image.width,
      image.height,
      posBuffer,
      colorBuffer,
    )
  }

  return calculateFitness(image, buffer)
}

function calculateFitness(img: ImageData, buff2: Uint8ClampedArray) {
  var diff = 0
  for (var i = 0; i < img.data.length; i++) {
    var q = Math.abs(img.data[i] - buff2[i])
    diff += q * q
  }

  const pixelCount = img.height * img.width
  return diff / pixelCount
}
