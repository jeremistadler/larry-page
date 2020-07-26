import {ImageData} from './ImageData'

export interface IWorkerResult {
  dna: Dna
  epoc: number
}

export interface ISettings {
  newMinOpacity: number
  newMaxOpacity: number

  iterations: number
  updateScreenInterval: number
  saveInterval: number

  workerThreads: number
  size: number
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
  id: string
  width: number
  height: number
  maxGenes: number
  genesPerGeneration: number
}

export interface Gene {
  pos: number[]
  color: number[]
}

export interface Dna {
  id: string
  genes: Gene[]
  generation: number
  mutation: number
  fitness: number
  sourceImageWidth: number
  sourceImageHeight: number
  maxGenes: number
  genesPerGeneration: number
  lastRenderSize: number
}

export interface DnaOld {
  genes: Gene[]
  generation: number
  mutation: number
  fitness: number
  organism: Organism
}

export interface IDnaRenderContext {
  mutator: IGeneMutator
  dna: Dna
  mutations: IMutatorState[]
  source: ImageData
  fitness: number
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
