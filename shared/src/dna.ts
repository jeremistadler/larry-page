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

export interface Triangle {
  pos: Pos
  color: TransparentColor
}

export type SolidColor = [r: number, g: number, b: number]
export type TransparentColor = [r: number, g: number, b: number, a: number]
export type PosX = number
export type PosY = number
export type Pos = [PosX, PosY, PosX, PosY, PosX, PosY]

export type ImageId = string
export type SettingsId = string

export interface Dna {
  imageId: ImageId
  settingsId: SettingsId
  generation: number
  fitness: number

  parent: {imageId: ImageId; settingsId: SettingsId; generation: number} | null

  triangles: Triangle[]
  renderSize: number

  sourceImageWidth: number
  sourceImageHeight: number

  colorSetup: ColorSetup
}

export type ColorSetup = {
  solidColors: SolidColor[]
  minOpacity: number
  maxOpacity: number
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
  oldGene: Triangle
  newGene: Triangle
  index: number
}

export interface IGeneMutator {
  name: string
  effectiveness: number
  func: (ctx: IDnaRenderContext) => IMutatorState | null
  undo: (ctx: IDnaRenderContext, state: IMutatorState) => void
}
