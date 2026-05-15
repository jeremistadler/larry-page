/* eslint-disable no-restricted-globals */
import {Dna, ISettings, IDnaRenderContext, IWorkerResult} from 'shared/src/dna'
import {
  MutateDna,
  GetMutator,
  UpdateEffectiveness,
} from 'shared/src/gene-mutator'

async function startRasterizing(
  sourceImageData: ImageData,
  dna: Dna,
  settings: ISettings,
  epoc: number,
) {
  let targetIterations = 10

  while (true) {
    const startTime = Date.now()

    for (let runIndex = 0; runIndex < targetIterations; runIndex++) {
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

      MutateDna(ctx)

      const fitnessImprovement = originalFitness - ctx.fitness

      UpdateEffectiveness(fitnessImprovement, mutator)

      dna.testedPlacements++
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
