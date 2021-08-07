import {Dna} from './dna'
import {generateChronologicalId} from './generateChronologicalId'

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

  static createDna(numberOfGenes: number, imageId: string): Dna {
    var dna: Dna = {
      id: imageId,
      settingsId: generateChronologicalId(),

      genes: new Array(numberOfGenes),
      testedPlacements: 0,
      sourceImageWidth: 200,
      sourceImageHeight: 200,
      renderSize: 128,
      parent: null,
      fitness: Number.MAX_SAFE_INTEGER,
      colorSetup: {
        maxOpacity: 1,
        minOpacity: 0,
        solidColors: [
          [Math.random(), Math.random(), Math.random()],
          [Math.random(), Math.random(), Math.random()],
          [Math.random(), Math.random(), Math.random()],
        ],
      },
    }

    for (var i = 0; i < numberOfGenes; i++) {
      dna.genes[i] = {
        color: [
          ...dna.colorSetup.solidColors[i % dna.colorSetup.solidColors.length],
          Math.random() * 0.8 + 0.2,
        ],
        pos: [
          Math.random(),
          Math.random(),
          Math.random(),
          Math.random(),
          Math.random(),
          Math.random(),
        ],
      }
    }

    return dna
  }
}
