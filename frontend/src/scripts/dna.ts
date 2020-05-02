import {Utils} from './utils'
import {Raster} from './raster'

export interface IWorkerResult {
  generations: number
  mutations: IMutatorState[]
  mutatorName: string
  fitnessImprovement: number
}

export interface ISettings {
  minGridSize: number
  maxGridSize: number

  newMinOpacity: number
  newMaxOpacity: number

  mutatorWeights: number[]
  autoAdjustMutatorWeights: boolean
  iterations: number
}

export interface IRectangle {
  x: number
  y: number
  x2: number
  y2: number
  width: number
  height: number
}

export interface Organism {
  Id: number
  ImagePath: string
  Width: number
  Height: number
}

export interface Gene {
  Pos: number[]
  Color: number[]
}

export interface Dna {
  Genes: Gene[]
  Generation: number
  Mutation: number
  Fitness: number
  Organism: Organism
}

export interface IDnaRenderContext {
  mutator: IGeneMutator
  rect: IRectangle
  dna: Dna
  mutations: IMutatorState[]
  geneStates: IGeneRectangleState[]
  source: ImageData
  partialFitness: number
  settings: ISettings
}

export interface IGeneRectangleState {
  IsContained: boolean
  IsIntersecting: boolean
}

export interface IMutatorState {
  oldGene: Gene
  newGene: Gene
  index: number
}

export interface IGeneMutator {
  name: string
  effectiveness: number
  func: (ctx: IDnaRenderContext) => IMutatorState | null
  undo: (ctx: IDnaRenderContext, state: IMutatorState) => void
}
