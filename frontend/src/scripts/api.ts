import {RenderConfig} from 'shared/src/shared'
import {Dna, decodeDna, decodeDnaList, encodeDna} from 'shared/src/dna'

function convertImageToPng(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Failed to convert image to PNG'))
          return
        }
        blob.arrayBuffer().then(resolve, reject)
      }, 'image/png')
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    image.src = url
  })
}

async function fetchDnaBinary(url: string): Promise<Dna | null> {
  const response = await fetch(url)
  if (!response.ok) return null
  const id = response.headers.get('x-dna-id') ?? ''
  const buf = new Uint8Array(await response.arrayBuffer())
  return decodeDna(id, buf)
}

export class DnaApi {
  static async uploadNewImage(file: File): Promise<Dna> {
    const pngBuffer = await convertImageToPng(file)

    const response = await fetch(RenderConfig.baseUrl + '?route=upload', {
      method: 'POST',
      body: pngBuffer,
    })
    if (!response.ok) throw new Error('upload failed: ' + response.status)
    const id = response.headers.get('x-dna-id') ?? ''
    const buf = new Uint8Array(await response.arrayBuffer())
    return decodeDna(id, buf)
  }

  static fetchRandomDna(): Promise<Dna | null> {
    return fetchDnaBinary(RenderConfig.baseUrl + '?route=random')
  }

  static fetchDnaById(id: string): Promise<Dna | null> {
    return fetchDnaBinary(
      RenderConfig.baseUrl + '?route=dna&id=' + encodeURIComponent(id),
    )
  }

  static async fetchDnaList(): Promise<Dna[]> {
    const response = await fetch(RenderConfig.baseUrl + '?route=list')
    if (!response.ok) return []
    const buf = new Uint8Array(await response.arrayBuffer())
    if (buf.length < 4) return []
    return decodeDnaList(buf)
  }

  static async saveDna(dna: Dna): Promise<void> {
    const bytes = encodeDna(dna)
    const response = await fetch(
      RenderConfig.baseUrl + '?route=save&id=' + encodeURIComponent(dna.id),
      {
        method: 'POST',
        headers: {'Content-Type': 'application/octet-stream'},
        body: new Uint8Array(bytes),
      },
    )
    if (!response.ok) throw new Error('save failed: ' + response.status)
  }

  static loadAndScaleImageData(
    dna: Dna,
    width: number,
    height: number,
  ): Promise<ImageData> {
    const url =
      RenderConfig.baseUrl + '?route=image&id=' + encodeURIComponent(dna.id)
    return new Promise((resolve, reject) => {
      var image = new Image()
      image.crossOrigin = ''
      image.onload = () => {
        dna.sourceImageWidth = image.naturalWidth
        dna.sourceImageHeight = image.naturalHeight

        var canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        var ctx = canvas.getContext('2d', {
          alpha: false,
        }) as CanvasRenderingContext2D
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(image, 0, 0, width, height)
        var data = ctx.getImageData(0, 0, width, height)
        resolve(data)
      }
      image.onerror = (e: any) => {
        console.error('Could not load image', e)
        reject(e)
      }
      image.src = url
    })
  }
}
