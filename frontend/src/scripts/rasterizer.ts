import {Dna, ISettings, IRectangle, IWorkerResult, Gene} from 'shared/src/dna'
import {FitnessCalculator} from 'shared/src/fitness-calculator'
import {Utils} from 'shared/src/utils'
import {RenderConfig} from 'shared/src/shared'
import {GeneMutator} from 'shared/src/gene-mutator'
import {DnaApi} from './api'

export class JsRasterizer {
  idleWorkers: Worker[] = []
  activeWorkers: Worker[] = []
  allMutations: any[] = []
  startTime: number = 0
  currentRectangles: IRectangle[] = []
  onFrameCompleted: {(dna: Dna): void}[] = []
  onFrameStarted: {(dna: Dna): void}[] = []
  currentIteration = 0

  clearNextRound: boolean = false

  constructor(
    public source: ImageData,
    public dna: Dna,
    public settings: ISettings,
  ) {
    dna.fitness = FitnessCalculator.GetFitness(dna, this.source)

    for (var i = 0; i < 1; i++) this.createThread()

    this.startLocalizedDraws()
  }

  private removeWorst() {
    const startTime = Date.now()
    const originalFitness = FitnessCalculator.GetFitness(this.dna, this.source)
    const emptyGene: Gene = {
      color: [0, 0, 0, 0],
      pos: Utils.CreateNumberArray(6),
    }

    const targetGeneCount = this.dna.generation / 8000 + 20
    let removedCount = 0

    while (this.dna.genes.length > targetGeneCount) {
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
      this.dna.genes[list[0].index] = emptyGene
      removedCount++
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
    // var geneStates = this.dna.genes.map(f =>
    //   GeneHelper.CalculateState(f, this.currentRectangles[0]),
    // )

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

    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.beginPath()

    for (var g = 0; g < this.currentRectangles.length; g++) {
      ctx.moveTo(
        this.currentRectangles[g].x * width,
        this.currentRectangles[g].y * height,
      )
      ctx.lineTo(
        this.currentRectangles[g].x2 * width,
        this.currentRectangles[g].y * height,
      )
      ctx.lineTo(
        this.currentRectangles[g].x2 * width,
        this.currentRectangles[g].y2 * height,
      )
      ctx.lineTo(
        this.currentRectangles[g].x * width,
        this.currentRectangles[g].y2 * height,
      )
      ctx.lineTo(
        this.currentRectangles[g].x * width,
        this.currentRectangles[g].y * height,
      )
    }

    ctx.fill()
    ctx.stroke()
  }

  startLocalizedDraws() {
    //var maxGridSize = (Math.log(this.Dna.Generation + 1) / 2) + 0;
    //DebugView.SetMessage('Max grid size', maxGridSize, '(' + Math.round(maxGridSize) + ')');
    var gridSize = Utils.randomInt(
      this.settings.minGridSize,
      this.settings.maxGridSize,
    )
    //gridSize = 2;
    var gridSlotWidth = this.source.width / gridSize
    var gridSlotHeight = this.source.height / gridSize
    var usedSlots = []
    var gridOffsetX = ((Math.random() - 0.5) * gridSlotWidth) / 2
    var gridOffsetY = ((Math.random() - 0.5) * gridSlotHeight) / 2
    //gridOffsetX = 0;
    //gridOffsetY = 0;
    this.startTime = Date.now()
    this.currentRectangles.length = 0
    GeneMutator.setSettingsFromMutators(this.settings)

    for (
      ;
      this.idleWorkers.length > 0 && usedSlots.length < gridSize * gridSize;

    ) {
      var x = 0
      var y = 0

      while (true) {
        x = Utils.randomInt(0, gridSize - 1)
        y = Utils.randomInt(0, gridSize - 1)
        var key = x + ':' + y
        if (usedSlots.indexOf(key) === -1) {
          usedSlots.push(key)
          break
        }
      }
      var rect = {
        x: (x * gridSlotWidth + gridOffsetX) / this.source.width,
        y: (y * gridSlotHeight + gridOffsetY) / this.source.height,
        x2:
          (x * gridSlotWidth + gridSlotWidth + gridOffsetX) / this.source.width,
        y2:
          (y * gridSlotHeight + gridSlotHeight + gridOffsetY) /
          this.source.height,
        width: gridSlotHeight / this.source.height,
        height: gridSlotHeight / this.source.height,
      }

      this.currentRectangles.push(rect)

      var worker = this.idleWorkers.pop()
      this.activeWorkers.push(worker as any)

      if (worker)
        worker.postMessage({
          dna: this.dna,
          rect: rect,
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
      if (this.clearNextRound) {
        this.clearNextRound = false
        this.dna.genes.length = 0
        this.dna.fitness = Infinity
      }

      this.currentIteration++

      for (var g = 0; g < this.onFrameCompleted.length; g++)
        this.onFrameCompleted[g](this.dna)

      this.startLocalizedDraws()

      for (var g = 0; g < this.onFrameStarted.length; g++)
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
