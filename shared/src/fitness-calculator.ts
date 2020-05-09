import {IRectangle, Dna, IGeneRectangleState} from './dna'
import {Raster} from './raster'
import {ImageData} from './ImageData'

export class FitnessCalculator {
  static Buffers: Record<string, Uint8Array> = {}

  static posBuffer: number[] = new Array(6)
  static colorBuffer: number[] = new Array(6)

  static GetBuffer(width: number, height: number) {
    var buffer = this.Buffers[width + ':' + height]
    if (buffer) return buffer
    buffer = new Uint8ClampedArray(width * height * 4) as any
    this.Buffers[width + ':' + height] = buffer
    return buffer
  }

  static GetFitness(dna: Dna, image: ImageData) {
    var buffer = this.GetBuffer(image.width, image.height)
    for (var i = 0; i < buffer.length; i++) buffer[i] = 255

    for (var i = 0; i < dna.genes.length; i++) {
      var gene = dna.genes[i]

      this.colorBuffer[0] = Math.floor(gene.color[0] * 255)
      this.colorBuffer[1] = Math.floor(gene.color[1] * 255)
      this.colorBuffer[2] = Math.floor(gene.color[2] * 255)
      this.colorBuffer[3] = gene.color[3]

      this.posBuffer[0] = gene.pos[0] * image.width
      this.posBuffer[1] = gene.pos[1] * image.height
      this.posBuffer[2] = gene.pos[2] * image.width
      this.posBuffer[3] = gene.pos[3] * image.height
      this.posBuffer[4] = gene.pos[4] * image.width
      this.posBuffer[5] = gene.pos[5] * image.height

      Raster.drawPolygon(
        buffer,
        image.width,
        image.height,
        this.posBuffer,
        this.colorBuffer,
      )
    }

    return this.calculateFitness(image, buffer)
  }

  static GetConstrainedFitness(
    dna: Dna,
    image: ImageData,
    rect: IRectangle,
    geneStates: IGeneRectangleState[],
  ) {
    var buffer = this.GetBuffer(image.width, image.height)
    for (var i = 0; i < buffer.length; i++) buffer[i] = 255

    for (var i = 0; i < dna.genes.length; i++) {
      if (!geneStates[i].IsIntersecting) continue

      var gene = dna.genes[i]

      this.colorBuffer[0] = Math.floor(gene.color[0] * 255)
      this.colorBuffer[1] = Math.floor(gene.color[1] * 255)
      this.colorBuffer[2] = Math.floor(gene.color[2] * 255)
      this.colorBuffer[3] = gene.color[3]

      this.posBuffer[0] = gene.pos[0] * image.width
      this.posBuffer[1] = gene.pos[1] * image.height
      this.posBuffer[2] = gene.pos[2] * image.width
      this.posBuffer[3] = gene.pos[3] * image.height
      this.posBuffer[4] = gene.pos[4] * image.width
      this.posBuffer[5] = gene.pos[5] * image.height

      Raster.drawPolygon(
        buffer,
        image.width,
        image.height,
        this.posBuffer,
        this.colorBuffer,
      )
    }

    return this.calculateConstrainedFitness(image, buffer, rect)
  }

  static calculateConstrainedFitness(
    img: ImageData,
    buff2: Uint8Array,
    rect: IRectangle,
  ) {
    var x1 = Math.max(Math.floor(rect.x * img.width), 0)
    var y1 = Math.max(Math.floor(rect.y * img.height), 0)
    var x2 = Math.min(Math.ceil(rect.x2 * img.width), img.width)
    var y2 = Math.min(Math.ceil(rect.y2 * img.height), img.height)

    //if (x1 === 0 && y1 === 0 && x2 === img.width && y2 === img.height)
    //    return this.calculateFitness(img, buff2);

    var diff = 0
    var q = 0
    for (var y = y1; y < y2; y++) {
      for (var x = x1; x < x2; x++) {
        q = Math.abs(
          img.data[(y * img.width + x) * 4 + 0] -
            buff2[(y * img.width + x) * 4 + 0],
        )
        diff += q * q
        q = Math.abs(
          img.data[(y * img.width + x) * 4 + 1] -
            buff2[(y * img.width + x) * 4 + 1],
        )
        diff += q * q
        q = Math.abs(
          img.data[(y * img.width + x) * 4 + 2] -
            buff2[(y * img.width + x) * 4 + 2],
        )
        diff += q * q
        q = Math.abs(
          img.data[(y * img.width + x) * 4 + 3] -
            buff2[(y * img.width + x) * 4 + 3],
        )
        diff += q * q
      }
    }

    return diff
  }

  static calculateFitness(img: ImageData, buff2: Uint8Array) {
    var diff = 0
    for (var i = 0; i < img.data.length; i++) {
      var q = Math.abs(img.data[i] - buff2[i])
      diff += q * q
    }
    return diff
  }
}
