import {Dna, Triangle} from 'shared/src/dna'

export function buildDna(
  rng: () => number,
  numberOfGenes: number,
  imageWidth: number,
  imageHeight: number,
): Dna {
  const solidColors: [number, number, number][] = [
    [rng(), rng(), rng()],
    [rng(), rng(), rng()],
    [rng(), rng(), rng()],
  ]

  const genes: Triangle[] = new Array(numberOfGenes)
  for (let i = 0; i < numberOfGenes; i++) {
    const base = solidColors[i % solidColors.length]
    genes[i] = {
      color: [base[0], base[1], base[2], rng() * 0.8 + 0.2],
      pos: [rng(), rng(), rng(), rng(), rng(), rng()],
    }
  }

  return {
    id: 'bench',
    settingsId: 'bench',
    testedPlacements: 0,
    fitness: Number.MAX_SAFE_INTEGER,
    parent: null,
    genes,
    renderSize: 128,
    colorSetup: {solidColors, minOpacity: 0, maxOpacity: 1},
    sourceImageWidth: imageWidth,
    sourceImageHeight: imageHeight,
  }
}
