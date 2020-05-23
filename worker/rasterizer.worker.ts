import {
  Dna,
  ISettings,
  IRectangle,
  IDnaRenderContext,
  IWorkerResult,
} from 'shared/src/dna'
import {GeneMutator, GeneHelper} from 'shared/src/gene-mutator'
import {FitnessCalculator} from 'shared/src/fitness-calculator'

/* eslint-disable no-restricted-globals */

class JsRasterizerWorker {
  constructor(public sourceImageData: ImageData) {}

  go(dna: Dna, settings: ISettings) {
    //var startTime = Date.now()
    GeneMutator.setFromSettings(settings)

    var mutator = GeneMutator.GetMutator()

    var ctx: IDnaRenderContext = {
      dna: dna,
      mutations: [],
      mutator: mutator,
      source: this.sourceImageData,
      fitness: dna.fitness,
      settings: settings,
    }

    const originalFitness = ctx.fitness

    for (let i = 0; i < settings.iterations; i++) GeneMutator.MutateDna(ctx)

    const fitnessImprovement =
      (originalFitness - ctx.fitness) / settings.iterations

    const workerResult: IWorkerResult = {
      generations: settings.iterations,
      mutations: ctx.mutations,
      mutatorName: mutator.name,
      fitnessImprovement: fitnessImprovement,
    }

    self.postMessage(workerResult, null as any)
  }
}

var childRasterizer: JsRasterizerWorker | null = null

self.onmessage = function (e: any) {
  if (childRasterizer == null) childRasterizer = new JsRasterizerWorker(e.data)
  else childRasterizer.go(e.data.dna, e.data.settings)
}
