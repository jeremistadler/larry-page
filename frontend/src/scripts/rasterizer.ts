import {Dna, ISettings, IWorkerResult, Gene} from 'shared/src/dna'
import {FitnessCalculator} from 'shared/src/fitness-calculator'
import {Utils} from 'shared/src/utils'
import {RenderConfig} from 'shared/src/shared'
import {GeneMutator, GeneHelper} from 'shared/src/gene-mutator'
import {DnaApi} from './api'

export class JsRasterizer {
  idleWorkers: Worker[] = []
  activeWorkers: Worker[] = []
  allMutations: any[] = []
  startTime: number = 0
  onFrameCompleted: {(dna: Dna): void}[] = []
  onFrameStarted: {(dna: Dna): void}[] = []
  currentIteration = 0

  constructor(
    public source: ImageData,
    public dna: Dna,
    public settings: ISettings,
  ) {
    dna.fitness = FitnessCalculator.GetFitness(dna, this.source)

    for (var i = 0; i < settings.workerThreads; i++) this.createThread()

    this.startLocalizedDraws()
  }

  private removeWorst() {
    const startTime = Date.now()
    const originalFitness = FitnessCalculator.GetFitness(this.dna, this.source)
    const emptyGene: Gene = {
      color: [0, 0, 0, 0],
      pos: Utils.CreateNumberArray(6),
    }

    const targetGeneCount = this.dna.generation / 8000 + 10
    let removedCount = 0

    while (this.dna.genes.length - removedCount > targetGeneCount) {
      const list: {fitness: number; index: number; fitnessDiff: number}[] = []

      for (var i = 0; i < this.dna.genes.length; i++) {
        var gene = this.dna.genes[i]
        this.dna.genes[i] = emptyGene

        var fitness = FitnessCalculator.GetFitness(this.dna, this.source)
        list.push({
          fitness: fitness,
          index: i,
          fitnessDiff: fitness - originalFitness,
        })

        this.dna.genes[i] = gene
      }

      list.sort((a, b) => a.fitness - b.fitness)

      const removedGenes: Gene[] = []

      // Remove all genes that are not intersecting
      for (
        let i = 0;
        i < list.length && this.dna.genes.length > targetGeneCount;
        i++
      ) {
        const oldGene = this.dna.genes[list[i].index]
        this.dna.genes[list[i].index] = emptyGene
        removedCount++

        if (
          removedGenes.some(gene =>
            GeneHelper.trianglesIntersect(oldGene, gene),
          )
        ) {
          break
        }

        removedGenes.push(oldGene)
      }
    }

    this.dna.fitness = FitnessCalculator.GetFitness(this.dna, this.source)

    console.log(
      'Removed ',
      removedCount,
      ' genes in ',
      Date.now() - startTime,
      ' ms',
    )
  }

  drawCurrentWorkersOnCanvas(ctx: CanvasRenderingContext2D) {
    var width = ctx.canvas.width
    var height = ctx.canvas.height

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)

    // ctx.putImageData(this.source, 0, 0)
    // return

    for (var g = 0; g < this.dna.genes.length; g++) {
      var gene = this.dna.genes[g]
      ctx.fillStyle =
        'rgba(' +
        Math.floor(gene.color[0] * 255) +
        ',' +
        Math.floor(gene.color[1] * 255) +
        ',' +
        Math.floor(gene.color[2] * 255) +
        ',' +
        gene.color[3] +
        ')'

      ctx.beginPath()
      ctx.moveTo(gene.pos[0] * width, gene.pos[1] * height)
      ctx.lineTo(gene.pos[2] * width, gene.pos[3] * height)
      ctx.lineTo(gene.pos[4] * width, gene.pos[5] * height)
      ctx.closePath()
      ctx.fill()
    }
  }

  startLocalizedDraws() {
    this.startTime = Date.now()
    GeneMutator.setSettingsFromMutators(this.settings)

    for (; this.idleWorkers.length > 0; ) {
      var worker = this.idleWorkers.pop()
      this.activeWorkers.push(worker as any)

      if (worker)
        worker.postMessage({
          dna: this.dna,
          settings: this.settings,
        })
    }
  }

  onMessage(e: MessageEvent) {
    var worker = e.target as Worker
    var data = e.data as IWorkerResult

    this.activeWorkers.splice(this.activeWorkers.indexOf(worker), 1)
    this.idleWorkers.push(worker)

    var mutations = data.mutations
    this.dna.generation += data.generations
    this.dna.mutation += mutations.length

    if (this.settings.autoAdjustMutatorWeights) {
      var mutator = GeneMutator.getFromName(data.mutatorName)
      GeneMutator.UpdateEffectiveness(data.fitnessImprovement, mutator as any)
    }

    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].oldGene == null)
        this.dna.genes.push(mutations[i].newGene)
      else this.dna.genes[mutations[i].index] = mutations[i].newGene
    }

    if (this.activeWorkers.length === 0) {
      this.currentIteration++

      for (let g = 0; g < this.onFrameCompleted.length; g++)
        this.onFrameCompleted[g](this.dna)

      this.startLocalizedDraws()

      for (let g = 0; g < this.onFrameStarted.length; g++)
        this.onFrameStarted[g](this.dna)

      var fitnessAfter = FitnessCalculator.GetFitness(this.dna, this.source)
      if (fitnessAfter > this.dna.fitness)
        console.warn(
          'Fitness diff: ' + (this.dna.fitness - fitnessAfter),
          ' startLocalizedDraws is mutating the image',
        )
      this.dna.fitness = fitnessAfter

      if (this.currentIteration % 100 === 0) {
        this.removeWorst()
        this.Save()
      }

      //localStorage.setItem(tempName, JSON.stringify(this.Dna));
    }
  }

  createThread() {
    const worker = new Worker(RenderConfig.baseAssets + '/rasterizer.worker.js')
    this.idleWorkers.push(worker)
    worker.onmessage = f => this.onMessage(f)
    worker.postMessage(this.source)
    worker.onerror = a => console.error(a)
  }

  Save() {
    DnaApi.saveDna(this.dna)
  }

  Stop() {
    this.onFrameCompleted = []

    for (let i = 0; i < this.idleWorkers.length; i++) {
      this.idleWorkers[i].terminate()
    }

    for (let i = 0; i < this.activeWorkers.length; i++) {
      this.activeWorkers[i].terminate()
    }
  }
}
