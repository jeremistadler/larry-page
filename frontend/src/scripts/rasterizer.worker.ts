/* eslint-disable no-restricted-globals */
import {Dna, ISettings, IDnaRenderContext, IWorkerResult} from 'shared/src/dna'
import {
  MutateDna,
  GetMutator,
  UpdateEffectiveness,
} from 'shared/src/gene-mutator'
import init, {Rasterizer} from 'larry-rasterizer-web'

async function startRasterizing(
  sourceImageData: ImageData,
  dna: Dna,
  settings: ISettings,
  epoc: number,
) {
  await init()
  const rasterizer = new Rasterizer(
    sourceImageData.width,
    sourceImageData.height,
    sourceImageData.data as unknown as Uint8Array,
  )
  const wasmFitness = (d: Dna) =>
    rasterizer.get_fitness(d.genes.subarray(0, d.geneCount * 10))

  let targetIterations = 10

  while (true) {
    const startTime = Date.now()

    for (let runIndex = 0; runIndex < targetIterations; runIndex++) {
      const mutator = GetMutator()

      const ctx: IDnaRenderContext = {
        dna,
        mutations: [],
        mutator,
        source: sourceImageData,
        fitness: dna.fitness,
        settings,
      }

      const originalFitness = ctx.fitness

      MutateDna(ctx, wasmFitness)

      const fitnessImprovement = originalFitness - ctx.fitness

      UpdateEffectiveness(fitnessImprovement, mutator)

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
