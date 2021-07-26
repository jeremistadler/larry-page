import {Dna, ISettings, IWorkerResult} from 'shared/src/dna'
import {GetFitness} from 'shared/src/fitness-calculator'
import {stackBlurCanvasRGB} from 'shared/src/blur'
import {DnaApi} from './api'

export class JsRasterizer {
  workers: Worker[] = []
  allMutations: any[] = []
  onFrameCompleted: {(dna: Dna): void}[] = []
  currentIteration = 0
  epoc = 0

  constructor(
    public source: ImageData,
    public image: Dna,
    public settings: ISettings,
  ) {
    image.fitness = GetFitness(image, this.source)

    const blured = new ImageData(
      source.data.slice(),
      source.width,
      source.height,
    )

    stackBlurCanvasRGB(blured, source.width / 10)

    for (var i = 0; i < settings.workerThreads; i++) this.createThread()
  }

  onMessage(e: MessageEvent) {
    var data = e.data as IWorkerResult

    if (data.epoc !== this.epoc) return

    this.image = data.dna
    this.currentIteration++

    for (let g = 0; g < this.onFrameCompleted.length; g++)
      this.onFrameCompleted[g](this.image)

    var fitnessAfter = GetFitness(this.image, this.source)
    if (fitnessAfter > this.image.fitness)
      console.warn(
        'Fitness diff: ' + (this.image.fitness - fitnessAfter),
        ' worker calculates diff differently',
      )
    this.image.fitness = fitnessAfter

    if (this.currentIteration % this.settings.saveInterval === 0) {
      DnaApi.saveDna(this.image)
    }
  }

  createThread() {
    const worker = new Worker('rasterizer.worker.ts')
    this.workers.push(worker)
    worker.onmessage = f => this.onMessage(f)
    worker.onerror = a => console.error(a)

    worker.postMessage({
      image: this.source,
      dna: this.image,
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
    this.image.triangles.forEach(gene => {
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
