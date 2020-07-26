/* eslint-disable no-restricted-globals */
import {
  Dna,
  ISettings,
  IDnaRenderContext,
  IWorkerResult,
  Gene,
} from 'shared/src/dna'
import {
  MutateDna,
  GetMutator,
  UpdateEffectiveness,
  trianglesIntersect,
} from 'shared/src/gene-mutator'
import {GetFitness} from 'shared/src/fitness-calculator'
import {Utils} from 'shared/src/utils'

function startRasterizing(
  sourceImageData: ImageData,
  dna: Dna,
  settings: ISettings,
  epoc: number,
) {
  removeWorst(dna, sourceImageData)

  let targetIterations = 10

  while (true) {
    const startTime = Date.now()

    for (let runIndex = 0; runIndex < targetIterations; runIndex++) {
      //var startTime = Date.now()

      var mutator = GetMutator()

      var ctx: IDnaRenderContext = {
        dna: dna,
        mutations: [],
        mutator: mutator,
        source: sourceImageData,
        fitness: dna.fitness,
        settings: settings,
      }

      const originalFitness = ctx.fitness

      for (let i = 0; i < settings.iterations; i++) MutateDna(ctx)

      const fitnessImprovement = originalFitness - ctx.fitness

      UpdateEffectiveness(fitnessImprovement, mutator)

      dna.generation += settings.iterations
      dna.mutation += ctx.mutations.length
      dna.fitness = ctx.fitness
    }

    const elapsedMs = Date.now() - startTime
    targetIterations = Math.max(
      10,
      (settings.updateScreenInterval / elapsedMs) * targetIterations,
    )

    const workerResult: IWorkerResult = {dna, epoc}
    self.postMessage(workerResult, null as any)
  }
}

self.onmessage = function (e: any) {
  startRasterizing(e.data.image, e.data.dna, e.data.settings, e.data.epoc)
}

function removeWorst(dna: Dna, sourceImageData: ImageData) {
  const startTime = Date.now()
  const originalFitness = GetFitness(dna, sourceImageData)
  const emptyGene: Gene = {
    color: [0, 0, 0, 0],
    pos: Utils.CreateNumberArray(6),
  }

  const targetGeneCount = dna.maxGenes || 100
  let removedCount = 0

  while (dna.genes.length - removedCount > targetGeneCount) {
    const list: {fitness: number; index: number; fitnessDiff: number}[] = []

    for (var i = 0; i < dna.genes.length; i++) {
      var gene = dna.genes[i]
      dna.genes[i] = emptyGene

      var fitness = GetFitness(dna, sourceImageData)
      list.push({
        fitness: fitness,
        index: i,
        fitnessDiff: fitness - originalFitness,
      })

      dna.genes[i] = gene
    }

    list.sort((a, b) => a.fitness - b.fitness)

    const removedGenes: Gene[] = []

    // Remove all genes that are not intersecting
    for (
      let i = 0;
      i < list.length && dna.genes.length > targetGeneCount;
      i++
    ) {
      const oldGene = dna.genes[list[i].index]
      dna.genes[list[i].index] = emptyGene
      removedCount++

      if (removedGenes.some(gene => trianglesIntersect(oldGene, gene))) {
        break
      }

      removedGenes.push(oldGene)
    }
  }

  dna.fitness = GetFitness(dna, sourceImageData)

  console.log(
    'Removed ',
    removedCount,
    ' genes in ',
    Date.now() - startTime,
    ' ms',
  )
}
