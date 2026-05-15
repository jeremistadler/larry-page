import {ImageData} from './ImageData'

export const GENE_FLOATS = 10
export const GENE_BYTES = GENE_FLOATS * 4
export const DNA_HEADER_BYTES = 24

export type Dna = {
  id: string
  fitness: number
  testedPlacements: number
  sourceImageWidth: number
  sourceImageHeight: number
  genes: Float32Array
}

export function geneCount(dna: Dna): number {
  return dna.genes.length / GENE_FLOATS
}

export function encodeDna(dna: Dna): Uint8Array {
  const count = geneCount(dna)
  const out = new Uint8Array(DNA_HEADER_BYTES + count * GENE_BYTES)
  const view = new DataView(out.buffer)
  view.setFloat64(0, dna.fitness, true)
  view.setUint32(8, dna.testedPlacements, true)
  view.setUint32(12, dna.sourceImageWidth, true)
  view.setUint32(16, dna.sourceImageHeight, true)
  view.setUint32(20, count, true)
  out.set(
    new Uint8Array(dna.genes.buffer, dna.genes.byteOffset, count * GENE_BYTES),
    DNA_HEADER_BYTES,
  )
  return out
}

export function decodeDna(id: string, bytes: Uint8Array): Dna {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const fitness = view.getFloat64(0, true)
  const testedPlacements = view.getUint32(8, true)
  const sourceImageWidth = view.getUint32(12, true)
  const sourceImageHeight = view.getUint32(16, true)
  const count = view.getUint32(20, true)
  const genes = new Float32Array(count * GENE_FLOATS)
  new Uint8Array(genes.buffer).set(
    bytes.subarray(DNA_HEADER_BYTES, DNA_HEADER_BYTES + count * GENE_BYTES),
  )
  return {
    id,
    fitness,
    testedPlacements,
    sourceImageWidth,
    sourceImageHeight,
    genes,
  }
}

export function encodeDnaList(items: Dna[]): Uint8Array {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  let totalSize = 4
  parts.push(new Uint8Array(4))
  new DataView(parts[0].buffer).setUint32(0, items.length, true)

  for (const dna of items) {
    const idBytes = encoder.encode(dna.id)
    const dnaBytes = encodeDna(dna)
    const header = new Uint8Array(8)
    const hView = new DataView(header.buffer)
    hView.setUint32(0, idBytes.length, true)
    hView.setUint32(4, dnaBytes.length, true)
    parts.push(header, idBytes, dnaBytes)
    totalSize += header.length + idBytes.length + dnaBytes.length
  }

  const out = new Uint8Array(totalSize)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

export function decodeDnaList(bytes: Uint8Array): Dna[] {
  const decoder = new TextDecoder()
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const count = view.getUint32(0, true)
  let off = 4
  const result: Dna[] = []
  for (let i = 0; i < count; i++) {
    const idLen = view.getUint32(off, true)
    off += 4
    const dnaLen = view.getUint32(off, true)
    off += 4
    const id = decoder.decode(bytes.subarray(off, off + idLen))
    off += idLen
    const dna = decodeDna(id, bytes.subarray(off, off + dnaLen))
    off += dnaLen
    result.push(dna)
  }
  return result
}

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

  maxGenes: number
  genesPerGeneration: number
}

export type IDnaRenderContext = {
  mutator: IGeneMutator
  dna: Dna
  mutations: IMutatorState[]
  source: ImageData
  fitness: number
  settings: ISettings
}

export type IMutatorState =
  | {kind: 'replace'; offset: number; oldData: Float32Array}
  | {kind: 'add'; oldGenes: Float32Array}

export type IGeneMutator = {
  name: string
  effectiveness: number
  func: (ctx: IDnaRenderContext) => IMutatorState | null
  undo: (ctx: IDnaRenderContext, state: IMutatorState) => void
}
