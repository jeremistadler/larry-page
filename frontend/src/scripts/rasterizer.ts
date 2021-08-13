import {Dna, ISettings, IWorkerResult} from 'shared/src/dna'
import {GetFitness} from 'shared/src/fitness-calculator'
import {DnaApi} from './api'

export class JsRasterizer {
  workers: Worker[] = []
  onFrameCompleted: {(dna: Dna): void}[] = []
  currentIteration = 0
  epoc = 0
  disposed: boolean = false
  source: ImageData | null = null

  constructor(public dna: Dna, public settings: ISettings) {
    if (dna.testedPlacements == null) dna.testedPlacements = 0

    DnaApi.loadAndScaleImageData(dna, settings.size, settings.size).then(
      imageData => {
        if (this.disposed) return
        this.source = imageData
        dna.fitness = GetFitness(dna, imageData)

        for (var i = 0; i < settings.workerThreads; i++) this.createThread()
      },
    )

    // const blured = new ImageData(
    //   source.data.slice(),
    //   source.width,
    //   source.height,
    // )

    //stackBlurCanvasRGB(blured, source.width / 10)
  }

  onMessage(e: MessageEvent) {
    var data = e.data as IWorkerResult

    if (data.epoc !== this.epoc) return

    this.dna = data.dna
    this.currentIteration++

    var fitnessAfter = GetFitness(this.dna, this.source!)
    if (fitnessAfter > this.dna.fitness)
      console.warn(
        'Fitness diff: ' + (this.dna.fitness - fitnessAfter),
        ' worker calculates diff differently',
      )
    this.dna.fitness = fitnessAfter

    for (let g = 0; g < this.onFrameCompleted.length; g++)
      this.onFrameCompleted[g](this.dna)

    if (this.currentIteration % this.settings.saveInterval === 0) {
      // DnaApi.saveDna(this.dna)
    }
  }

  createThread() {
    const worker = new Worker('rasterizer.worker.ts')
    this.workers.push(worker)
    worker.onmessage = f => this.onMessage(f)
    worker.onerror = a => console.error(a)

    worker.postMessage({
      image: this.source,
      dna: this.dna,
      settings: this.settings,
      epoc: this.epoc,
    })
  }

  nudge() {
    this.epoc++

    for (let i = 0; i < this.workers.length; i++) {
      this.workers[i].terminate()
    }
    this.workers.length = 0
    this.dna.genes.forEach(gene => {
      for (let i = 0; i < gene.pos.length; i++) {
        gene.pos[i] = gene.pos[i] + (Math.random() - 0.5) * 0.1
        gene.color[i] = Math.min(
          1,
          Math.max(0, gene.color[i] + (Math.random() - 0.5) * 0.1),
        )
      }
    })

    this.createThread()
  }

  Stop() {
    this.onFrameCompleted = []

    for (let i = 0; i < this.workers.length; i++) {
      this.workers[i].terminate()
    }

    this.workers.length = 0
  }
}
