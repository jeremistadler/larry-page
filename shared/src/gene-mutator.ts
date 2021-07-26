import {
  ISettings,
  Triangle,
  IRectangle,
  IGeneRectangleState,
  IDnaRenderContext,
  IMutatorState,
  IGeneMutator,
} from './dna'
import {GetFitness} from './fitness-calculator'
import {Utils} from './utils'

export function RectFromGene(f: Triangle): IRectangle {
  var minX = f.pos[0]
  var maxX = f.pos[0]
  var minY = f.pos[1]
  var maxY = f.pos[1]

  for (var i = 2; i < f.pos.length; i += 2) {
    minX = Math.min(minX, f.pos[i])
    maxX = Math.max(maxX, f.pos[i])
  }

  for (var i = 3; i < f.pos.length; i += 2) {
    minY = Math.min(minY, f.pos[i])
    maxY = Math.max(maxY, f.pos[i])
  }

  return {
    x: minX,
    x2: maxX,
    y: minY,
    y2: maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function trianglesIntersect(gene1: Triangle, gene2: Triangle) {
  gene1.pos
  return (
    linesIntersect(
      gene1.pos[0], // a
      gene1.pos[1], // a
      gene1.pos[2], // b
      gene1.pos[3], // b
      gene2.pos[0], // other.a
      gene1.pos[1], // other.a
      gene2.pos[2], // other.b
      gene2.pos[3], // other.b
    ) ||
    linesIntersect(
      gene1.pos[0],
      gene1.pos[1],
      gene1.pos[2],
      gene1.pos[3],
      gene2.pos[0],
      gene1.pos[1],
      gene2.pos[4],
      gene2.pos[5],
    ) ||
    linesIntersect(
      gene1.pos[0],
      gene1.pos[1],
      gene1.pos[2],
      gene1.pos[3],
      gene2.pos[2],
      gene1.pos[3],
      gene2.pos[4],
      gene2.pos[5],
    ) ||
    linesIntersect(
      gene1.pos[0],
      gene1.pos[1],
      gene1.pos[4],
      gene1.pos[5],
      gene2.pos[0],
      gene1.pos[1],
      gene2.pos[2],
      gene2.pos[3],
    ) ||
    linesIntersect(
      gene1.pos[0],
      gene1.pos[1],
      gene1.pos[4],
      gene1.pos[5],
      gene2.pos[0],
      gene1.pos[1],
      gene2.pos[4],
      gene2.pos[5],
    ) ||
    linesIntersect(
      gene1.pos[0],
      gene1.pos[1],
      gene1.pos[4],
      gene1.pos[5],
      gene2.pos[2],
      gene1.pos[3],
      gene2.pos[4],
      gene2.pos[5],
    ) ||
    linesIntersect(
      gene1.pos[2],
      gene1.pos[3],
      gene1.pos[4],
      gene1.pos[5],
      gene2.pos[0],
      gene1.pos[1],
      gene2.pos[2],
      gene2.pos[3],
    ) ||
    linesIntersect(
      gene1.pos[2],
      gene1.pos[3],
      gene1.pos[4],
      gene1.pos[5],
      gene2.pos[0],
      gene1.pos[1],
      gene2.pos[4],
      gene2.pos[5],
    ) ||
    linesIntersect(
      gene1.pos[2],
      gene1.pos[3],
      gene1.pos[4],
      gene1.pos[5],
      gene2.pos[2],
      gene1.pos[3],
      gene2.pos[4],
      gene2.pos[5],
    )
  )
}

function linesIntersect(
  a: number,
  b: number,
  c: number,
  d: number,
  p: number,
  q: number,
  r: number,
  s: number,
): boolean {
  var det, gamma, lambda
  det = (c - a) * (s - q) - (r - p) * (d - b)
  if (det === 0) {
    return false
  } else {
    lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det
    gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det
    return 0 < lambda && lambda < 1 && 0 < gamma && gamma < 1
  }
}

export function CalculateState(
  f: Triangle,
  rect: IRectangle,
): IGeneRectangleState {
  var minX = f.pos[0]
  var maxX = f.pos[0]
  var minY = f.pos[1]
  var maxY = f.pos[1]

  for (var i = 2; i < f.pos.length; i += 2) {
    minX = Math.min(minX, f.pos[i])
    maxX = Math.max(maxX, f.pos[i])
  }

  for (var i = 3; i < f.pos.length; i += 2) {
    minY = Math.min(minY, f.pos[i])
    maxY = Math.max(maxY, f.pos[i])
  }

  var isContained =
    minX >= rect.x && maxX <= rect.x2 && minY >= rect.y && maxY <= rect.y2

  return {
    IsContained: isContained,
    IsIntersecting:
      isContained ||
      !(minX > rect.x2 || maxX < rect.x || minY > rect.y2 || maxY < rect.y),
  }
}

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
    ctx.dna.changedTriangles++
  } else ctx.mutator.undo(ctx, mutatorState)

  ctx.dna.triedChanges++
}

export function getFromName(name: string) {
  for (var i = 0; i < GeneMutators.length; i++)
    if (GeneMutators[i].name === name) return GeneMutators[i]

  return null
}

export function DefaultMutateGene(
  ctx: IDnaRenderContext,
): IMutatorState | null {
  if (ctx.dna.triangles.length === 0) return null

  const index = Utils.randomIndex(ctx.dna.triangles)
  const oldGene = ctx.dna.triangles[index]

  const newGene = ({
    pos: null,
    color: null,
  } as any) as Triangle
  ctx.dna.triangles[index] = newGene

  return {index, oldGene, newGene}
}

export const GeneMutators: IGeneMutator[] = [
  {
    name: 'ColorOnly',
    effectiveness: 1000,
    func: function (ctx: IDnaRenderContext): IMutatorState | null {
      const state = DefaultMutateGene(ctx)
      if (state === null) return null

      state.newGene.color = state.oldGene.color.slice()
      state.newGene.pos = state.oldGene.pos.slice()

      const indexToChange = Utils.randomInt(0, 2)
      state.newGene.color[indexToChange] = Utils.ClampFloat(
        (Math.random() - 0.5) * 0.1 + state.newGene.color[indexToChange],
      )
      return state
    },
    undo: (ctx, state) => (ctx.dna.triangles[state.index] = state.oldGene),
  },
  {
    name: 'Opacity',
    effectiveness: 1000,
    func: function (ctx: IDnaRenderContext): IMutatorState | null {
      var state = DefaultMutateGene(ctx)
      if (state === null) return null

      state.newGene.color = state.oldGene.color.slice()
      state.newGene.pos = state.oldGene.pos.slice()

      state.newGene.color[3] = Utils.ClampFloat(
        (Math.random() - 0.5) * 0.1 + state.newGene.color[3],
      )
      return state
    },
    undo: (ctx, state) => (ctx.dna.triangles[state.index] = state.oldGene),
  },
  {
    name: 'MoveGene',
    effectiveness: 1000,
    func: function (ctx: IDnaRenderContext): IMutatorState | null {
      var state = DefaultMutateGene(ctx)
      if (state === null) return null

      state.newGene.color = state.oldGene.color.slice()
      state.newGene.pos = new Array(6)
      for (var i = 0; i < state.newGene.pos.length; i += 2)
        state.newGene.pos[i] = Math.random()
      for (var i = 1; i < state.newGene.pos.length; i += 2)
        state.newGene.pos[i] = Math.random()
      return state
    },
    undo: (ctx, state) => (ctx.dna.triangles[state.index] = state.oldGene),
  },
  {
    name: 'MoveGenePoint',
    effectiveness: 1000,
    func: function (ctx: IDnaRenderContext): IMutatorState | null {
      var state = DefaultMutateGene(ctx)
      if (state === null) return null

      state.newGene.color = state.oldGene.color.slice()
      state.newGene.pos = state.oldGene.pos.slice()

      var indexToMove = Utils.randomIndex(state.newGene.pos)
      if (indexToMove % 2 === 0)
        state.newGene.pos[indexToMove] =
          state.newGene.pos[indexToMove] + (Math.random() - 0.5) * 0.1
      else
        state.newGene.pos[indexToMove] =
          state.newGene.pos[indexToMove] + (Math.random() - 0.5) * 0.1
      return state
    },
    undo: (ctx, state) => (ctx.dna.triangles[state.index] = state.oldGene),
  },
  {
    name: 'All Random',
    effectiveness: 1000,
    func: function (ctx: IDnaRenderContext): IMutatorState | null {
      var state = DefaultMutateGene(ctx)
      if (state === null) return null

      state.newGene.color = [
        Math.random(),
        Math.random(),
        Math.random(),
        1 / (1 + ctx.dna.triedChanges * 0.0002),
      ]
      state.newGene.pos = new Array(6)

      for (var i = 0; i < state.newGene.pos.length; i += 2)
        state.newGene.pos[i] = Math.random()

      for (var i = 1; i < state.newGene.pos.length; i += 2)
        state.newGene.pos[i] = Math.random()

      return state
    },
    undo: (ctx, state) => (ctx.dna.triangles[state.index] = state.oldGene),
  },
  {
    name: 'Add Small Triangle',
    effectiveness: 1000,
    func: function (ctx: IDnaRenderContext): IMutatorState | null {
      if (ctx.dna.triangles.length >= ctx.dna.maxTriangles) return null
      if (
        ctx.dna.triangles.length >
        ctx.dna.triedChanges * ctx.dna.genesPerGeneration + 1
      )
        return null

      var gene: Triangle = {
        color: [
          Math.random(),
          Math.random(),
          Math.random(),
          1 / (1 + ctx.dna.triedChanges * 0.0002),
        ],
        pos: [Math.random(), Math.random(), 0, 0, 0, 0],
      }
      gene.pos[2] = gene.pos[0] + Math.random() * 0.2 - 0.1
      gene.pos[3] = gene.pos[1] + Math.random() * 0.2 - 0.1
      gene.pos[4] = gene.pos[0] + Math.random() * 0.2 - 0.1
      gene.pos[5] = gene.pos[1] + Math.random() * 0.2 - 0.1

      ctx.dna.triangles.push(gene)
      return {
        index: ctx.dna.triangles.length - 1,
        oldGene: null as any,
        newGene: gene,
      }
    },
    undo: (ctx, state) => ctx.dna.triangles.splice(state.index, 1),
  },
  {
    name: 'Add Big Triangle',
    effectiveness: 1000,
    func: function (ctx: IDnaRenderContext): IMutatorState | null {
      if (ctx.dna.triangles.length >= ctx.dna.maxTriangles) return null
      if (
        ctx.dna.triangles.length >
        ctx.dna.triedChanges * ctx.dna.genesPerGeneration + 1
      )
        return null

      var gene: Triangle = {
        color: [
          Math.random(),
          Math.random(),
          Math.random(),
          Utils.randomFloat(
            ctx.settings.newMinOpacity,
            ctx.settings.newMaxOpacity,
          ),
        ],
        pos: new Array(6),
      }

      for (var i = 0; i < gene.pos.length; i++) gene.pos[i] = Math.random()

      ctx.dna.triangles.push(gene)
      return {
        index: ctx.dna.triangles.length - 1,
        oldGene: null as any,
        newGene: gene,
      }
    },
    undo: (ctx, state) => ctx.dna.triangles.splice(state.index, 1),
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
