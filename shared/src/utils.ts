import {Dna, GENE_FLOATS} from './dna'

export class Utils {
  static randomIndex(arr: ArrayLike<unknown>) {
    return Math.floor(Math.random() * arr.length)
  }

  /**
   * @min inclusive
   * @max exclusive
   */
  static randomFloat(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  /**
   * @min inclusive
   * @max inclusive
   */
  static randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  static CreateNumberArray(length: number) {
    var arr = new Array(length)
    for (var i = 0; i < length; i++) arr[i] = 0
    return arr
  }

  static ClampFloat(num: number) {
    return Math.min(1, Math.max(num, 0))
  }

  static ClampByte(num: number) {
    return Math.min(255, Math.max(num, 0))
  }

  static Clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max)
  }

  static createDna(numberOfGenes: number, imageId: string): Dna {
    const genes = new Float32Array(numberOfGenes * GENE_FLOATS)
    for (let i = 0; i < numberOfGenes; i++) {
      const off = i * GENE_FLOATS
      genes[off + 0] = Math.random()
      genes[off + 1] = Math.random()
      genes[off + 2] = Math.random()
      genes[off + 3] = Math.random()
      genes[off + 4] = Math.random()
      genes[off + 5] = Math.random()
      genes[off + 6] = Math.random()
      genes[off + 7] = Math.random()
      genes[off + 8] = Math.random()
      genes[off + 9] = Math.random() * 0.8 + 0.2
    }
    return {
      id: imageId,
      fitness: Number.MAX_SAFE_INTEGER,
      testedPlacements: 0,
      sourceImageWidth: 200,
      sourceImageHeight: 200,
      genes,
    }
  }
}
