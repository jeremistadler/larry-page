import {Dna, GENE_FLOATS} from 'shared/src/dna'

export function buildDna(
  rng: () => number,
  numberOfGenes: number,
  imageWidth: number,
  imageHeight: number,
): Dna {
  const genes = new Float32Array(numberOfGenes * GENE_FLOATS)
  for (let i = 0; i < numberOfGenes; i++) {
    const off = i * GENE_FLOATS
    genes[off + 0] = rng()
    genes[off + 1] = rng()
    genes[off + 2] = rng()
    genes[off + 3] = rng()
    genes[off + 4] = rng()
    genes[off + 5] = rng()
    genes[off + 6] = rng()
    genes[off + 7] = rng()
    genes[off + 8] = rng()
    genes[off + 9] = rng() * 0.8 + 0.2
  }

  return {
    id: 'bench',
    fitness: Number.MAX_SAFE_INTEGER,
    testedPlacements: 0,
    sourceImageWidth: imageWidth,
    sourceImageHeight: imageHeight,
    renderSize: imageWidth,
    genes,
  }
}
