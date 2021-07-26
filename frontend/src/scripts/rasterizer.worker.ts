/* eslint-disable no-restricted-globals */
import {
  Dna,
  ISettings,
  IDnaRenderContext,
  IWorkerResult,
  Triangle,
} from 'shared/src/dna'
import {
  MutateDna,
  GetMutator,
  UpdateEffectiveness,
  trianglesIntersect,
} from 'shared/src/gene-mutator'
import {GetFitness} from 'shared/src/fitness-calculator'
import {Utils} from 'shared/src/utils'

async function startRasterizing(
  sourceImageData: ImageData,
  dna: Dna,
  settings: ISettings,
  epoc: number,
) {
  removeWorst(dna, sourceImageData)

  let targetIterations = 10

  while (true) {
    await new Promise(resolve => setTimeout(resolve, 1000))

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

      dna.triedChanges += settings.iterations
      dna.changedTriangles += ctx.mutations.length
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
  const emptyGene: Triangle = {
    color: [0, 0, 0, 0],
    pos: Utils.CreateNumberArray(6),
  }

  const targetGeneCount = dna.maxTriangles || 100
  let removedCount = 0

  while (dna.triangles.length - removedCount > targetGeneCount) {
    const list: {fitness: number; index: number; fitnessDiff: number}[] = []

    for (var i = 0; i < dna.triangles.length; i++) {
      var gene = dna.triangles[i]
      dna.triangles[i] = emptyGene

      var fitness = GetFitness(dna, sourceImageData)
      list.push({
        fitness: fitness,
        index: i,
        fitnessDiff: fitness - originalFitness,
      })

      dna.triangles[i] = gene
    }

    list.sort((a, b) => a.fitness - b.fitness)

    const removedGenes: Triangle[] = []

    // Remove all genes that are not intersecting
    for (
      let i = 0;
      i < list.length && dna.triangles.length > targetGeneCount;
      i++
    ) {
      const oldGene = dna.triangles[list[i].index]
      dna.triangles[list[i].index] = emptyGene
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
