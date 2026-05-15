import {
  ISettings,
  IDnaRenderContext,
  IMutatorState,
  IGeneMutator,
  GENE_FLOATS,
  MAX_GENES,
  Dna,
} from './dna'
import {GetFitness} from './fitness-calculator'
import {Utils} from './utils'

const EffectivenessChangeRate = 0.03
const MinEffectiveness = 0.00001
const MaxEffectiveness = 3000

export function MutateDna(ctx: IDnaRenderContext) {
  const mutatorState = ctx.mutator.func(ctx)
  if (mutatorState === null) return

  const fitness = GetFitness(ctx.dna, ctx.source)

  if (fitness < ctx.fitness) {
    ctx.fitness = fitness
    ctx.mutations.push(mutatorState)
  } else ctx.mutator.undo(ctx, mutatorState)

  ctx.dna.testedPlacements++
}

export function getFromName(name: string) {
  for (var i = 0; i < GeneMutators.length; i++)
    if (GeneMutators[i].name === name) return GeneMutators[i]
  return null
}

function pickGeneOffset(dna: Dna): number | null {
  if (dna.geneCount === 0) return null
  return Math.floor(Math.random() * dna.geneCount) * GENE_FLOATS
}

function snapshotGene(dna: Dna, offset: number): Float32Array {
  return dna.genes.slice(offset, offset + GENE_FLOATS)
}

function restoreGene(dna: Dna, offset: number, oldData: Float32Array): void {
  dna.genes.set(oldData, offset)
}

function appendGeneAt(dna: Dna, gene: Float32Array): void {
  dna.genes.set(gene, dna.geneCount * GENE_FLOATS)
  dna.geneCount += 1
}

function undoReplace(ctx: IDnaRenderContext, state: IMutatorState) {
  if (state.kind !== 'replace') return
  restoreGene(ctx.dna, state.offset, state.oldData)
}

function undoAdd(ctx: IDnaRenderContext, state: IMutatorState) {
  if (state.kind !== 'add') return
  ctx.dna.geneCount = state.previousCount
}

function canAddGene(dna: Dna, settings: ISettings): boolean {
  const cap = Math.min(settings.maxGenes, MAX_GENES)
  if (dna.geneCount >= cap) return false
  if (dna.geneCount > dna.testedPlacements * settings.genesPerGeneration + 1)
    return false
  return true
}

export const GeneMutators: IGeneMutator[] = [
  {
    name: 'ColorOnly',
    effectiveness: 1000,
    func: ctx => {
      const off = pickGeneOffset(ctx.dna)
      if (off === null) return null
      const oldData = snapshotGene(ctx.dna, off)
      const channel = Utils.randomInt(0, 2)
      const idx = off + 6 + channel
      ctx.dna.genes[idx] = Utils.ClampFloat(
        ctx.dna.genes[idx] + (Math.random() - 0.5) * 0.1,
      )
      return {kind: 'replace', offset: off, oldData}
    },
    undo: undoReplace,
  },
  {
    name: 'Opacity',
    effectiveness: 1000,
    func: ctx => {
      const off = pickGeneOffset(ctx.dna)
      if (off === null) return null
      const oldData = snapshotGene(ctx.dna, off)
      const idx = off + 9
      ctx.dna.genes[idx] = Utils.ClampFloat(
        ctx.dna.genes[idx] + (Math.random() - 0.5) * 0.1,
      )
      return {kind: 'replace', offset: off, oldData}
    },
    undo: undoReplace,
  },
  {
    name: 'MoveGene',
    effectiveness: 1000,
    func: ctx => {
      const off = pickGeneOffset(ctx.dna)
      if (off === null) return null
      const oldData = snapshotGene(ctx.dna, off)
      const g = ctx.dna.genes
      g[off + 0] = Math.random()
      g[off + 1] = Math.random()
      g[off + 2] = Math.random()
      g[off + 3] = Math.random()
      g[off + 4] = Math.random()
      g[off + 5] = Math.random()
      return {kind: 'replace', offset: off, oldData}
    },
    undo: undoReplace,
  },
  {
    name: 'MoveGenePoint',
    effectiveness: 1000,
    func: ctx => {
      const off = pickGeneOffset(ctx.dna)
      if (off === null) return null
      const oldData = snapshotGene(ctx.dna, off)
      const indexToMove = Utils.randomInt(0, 5)
      ctx.dna.genes[off + indexToMove] =
        ctx.dna.genes[off + indexToMove] + (Math.random() - 0.5) * 0.1
      return {kind: 'replace', offset: off, oldData}
    },
    undo: undoReplace,
  },
  {
    name: 'All Random',
    effectiveness: 1000,
    func: ctx => {
      const off = pickGeneOffset(ctx.dna)
      if (off === null) return null
      const oldData = snapshotGene(ctx.dna, off)
      const g = ctx.dna.genes
      g[off + 0] = Math.random()
      g[off + 1] = Math.random()
      g[off + 2] = Math.random()
      g[off + 3] = Math.random()
      g[off + 4] = Math.random()
      g[off + 5] = Math.random()
      g[off + 6] = Math.random()
      g[off + 7] = Math.random()
      g[off + 8] = Math.random()
      g[off + 9] = 1 / (1 + ctx.dna.testedPlacements * 0.0002)
      return {kind: 'replace', offset: off, oldData}
    },
    undo: undoReplace,
  },
  {
    name: 'Add Small Triangle',
    effectiveness: 1000,
    func: ctx => {
      if (!canAddGene(ctx.dna, ctx.settings)) return null
      const gene = new Float32Array(GENE_FLOATS)
      gene[0] = Math.random()
      gene[1] = Math.random()
      gene[2] = gene[0] + Math.random() * 0.2 - 0.1
      gene[3] = gene[1] + Math.random() * 0.2 - 0.1
      gene[4] = gene[0] + Math.random() * 0.2 - 0.1
      gene[5] = gene[1] + Math.random() * 0.2 - 0.1
      gene[6] = Math.random()
      gene[7] = Math.random()
      gene[8] = Math.random()
      gene[9] = 1 / (1 + ctx.dna.testedPlacements * 0.0002)
      const previousCount = ctx.dna.geneCount
      appendGeneAt(ctx.dna, gene)
      return {kind: 'add', previousCount}
    },
    undo: undoAdd,
  },
  {
    name: 'Add Big Triangle',
    effectiveness: 1000,
    func: ctx => {
      if (!canAddGene(ctx.dna, ctx.settings)) return null
      const gene = new Float32Array(GENE_FLOATS)
      gene[0] = Math.random()
      gene[1] = Math.random()
      gene[2] = Math.random()
      gene[3] = Math.random()
      gene[4] = Math.random()
      gene[5] = Math.random()
      gene[6] = Math.random()
      gene[7] = Math.random()
      gene[8] = Math.random()
      gene[9] = Utils.randomFloat(
        ctx.settings.newMinOpacity,
        ctx.settings.newMaxOpacity,
      )
      const previousCount = ctx.dna.geneCount
      appendGeneAt(ctx.dna, gene)
      return {kind: 'add', previousCount}
    },
    undo: undoAdd,
  },
]

export function GetMutator(): IGeneMutator {
  var totalEffectivess = 0
  for (var i = 0; i < GeneMutators.length; i++)
    totalEffectivess += GeneMutators[i].effectiveness

  var bias = Math.random() * totalEffectivess
  var currentEffectiveness = 0
  var mutator = GeneMutators[GeneMutators.length - 1]

  for (var i = 0; i < GeneMutators.length; i++) {
    currentEffectiveness += GeneMutators[i].effectiveness

    if (currentEffectiveness > bias) {
      mutator = GeneMutators[i]
      break
    }
  }

  return mutator
}

export function UpdateEffectiveness(
  fitnessDiff: number,
  mutator: IGeneMutator,
) {
  if (isFinite(fitnessDiff)) {
    mutator.effectiveness =
      mutator.effectiveness * (1 - EffectivenessChangeRate) +
      fitnessDiff * EffectivenessChangeRate
    mutator.effectiveness = Math.max(mutator.effectiveness, MinEffectiveness)
    mutator.effectiveness = Math.min(mutator.effectiveness, MaxEffectiveness)
  }
}
