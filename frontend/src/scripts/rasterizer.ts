import {Dna, ISettings, IWorkerResult} from 'shared/src/dna'
import {GetFitness} from 'shared/src/fitness-calculator'
import {DnaApi} from './api'

const SAVE_INTERVAL_MS = 10_000

export function renderDims(dna: Dna, size: number) {
  const srcW = dna.sourceImageWidth || 1
  const srcH = dna.sourceImageHeight || 1
  if (srcW >= srcH) {
    return {width: size, height: Math.max(1, Math.round((size * srcH) / srcW))}
  }
  return {width: Math.max(1, Math.round((size * srcW) / srcH)), height: size}
}

export class JsRasterizer {
  workers: Worker[] = []
  onFrameCompleted: {(dna: Dna): void}[] = []
  currentIteration = 0
  epoc = 0
  disposed: boolean = false
  source: ImageData | null = null
  lastSaveAt = 0
  lastSavedFitness = Infinity

  constructor(public dna: Dna, public settings: ISettings) {
    if (dna.testedPlacements == null) dna.testedPlacements = 0

    const dims = renderDims(dna, settings.size)
    DnaApi.loadAndScaleImageData(dna, dims.width, dims.height).then(
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
    this.dna.renderSize = this.settings.size
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

    const now = Date.now()
    if (
      now - this.lastSaveAt >= SAVE_INTERVAL_MS &&
      this.dna.fitness < this.lastSavedFitness
    ) {
      this.lastSaveAt = now
      this.lastSavedFitness = this.dna.fitness
      DnaApi.saveDna(this.dna).catch(err => console.warn('saveDna failed', err))
    }
  }

  createThread() {
    const worker = new Worker(
      new URL('./rasterizer.worker.ts', import.meta.url),
      {type: 'module'},
    )
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
    const genes = this.dna.genes
    for (let i = 0; i < genes.length; i++) {
      const v = genes[i] + (Math.random() - 0.5) * 0.1
      genes[i] = v < 0 ? 0 : v > 1 ? 1 : v
    }

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
