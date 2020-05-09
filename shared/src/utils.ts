import {Dna, Gene} from './dna'

export class Utils {
  static randomIndex(arr: any[]) {
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

  static createDna(numberOfGenes: number, organismId: string): Dna {
    var dna = {
      fitness: Infinity,
      genes: new Array(numberOfGenes),
      generation: 0,
      mutation: 0,
      organism: {
        id: organismId,
        width: 200,
        height: 200,
      },
    }

    for (var i = 0; i < numberOfGenes; i++) {
      var gene: Gene = (dna.genes[i] = {
        color: [
          Math.random(),
          Math.random(),
          Math.random(),
          Math.random() * 0.8 + 0.2,
        ],
        pos: new Array(6),
      })
      for (var q = 0; q < gene.pos.length; q++) gene.pos[q] = Math.random()
    }

    return dna
  }
}
