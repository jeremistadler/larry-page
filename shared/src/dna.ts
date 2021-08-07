import {ImageData} from './ImageData'

export interface IWorkerResult {
  dna: Dna
  epoc: number
}

export interface ISettings {
  newMinOpacity: number
  newMaxOpacity: number

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

export type Dna = {
  id: ImageId
  settingsId: SettingsId
  testedPlacements: number
  fitness: number

  parent: {imageId: ImageId; settingsId: SettingsId; generation: number} | null

  genes: Triangle[]
  renderSize: number
  colorSetup: ColorSetup

  sourceImageWidth: number
  sourceImageHeight: number
}

export type ColorSetup = {
  solidColors: SolidColor[]
  minOpacity: number
  maxOpacity: number
}

export type IDnaRenderContext = {
  mutator: IGeneMutator
  dna: Dna
  mutations: IMutatorState[]
  source: ImageData
  fitness: number
  settings: ISettings
}

export type IGeneRectangleState = {
  IsContained: boolean
  IsIntersecting: boolean
}

export type IMutatorState = {
  oldGene: Triangle
  newGene: Triangle
  index: number
}

export type IGeneMutator = {
  name: string
  effectiveness: number
  func: (ctx: IDnaRenderContext) => IMutatorState | null
  undo: (ctx: IDnaRenderContext, state: IMutatorState) => void
}
