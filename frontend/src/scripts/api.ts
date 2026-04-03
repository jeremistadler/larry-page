import {RenderConfig} from 'shared/src/shared'
import {Dna} from 'shared/src/dna'

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
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Failed to convert image to PNG'))
            return
          }
          blob.arrayBuffer().then(resolve, reject)
        },
        'image/png',
      )
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    image.src = url
  })
}

export class DnaApi {
  static async uploadNewImage(file: File): Promise<string> {
    const pngBuffer = await convertImageToPng(file)

    const response = await fetch(RenderConfig.baseUrl + '?route=upload', {
      method: 'POST',
      body: pngBuffer,
    })
    const data = (await response.json()) as {id: string}
    return data.id
  }

  static async fetchRandomDna(): Promise<Dna> {
    const response = await fetch(RenderConfig.baseUrl + '?route=random')
    const data = await response.json()
    return data as Dna
  }

  static async fetchDnaById(id: string): Promise<Dna> {
    const response = await fetch(RenderConfig.baseUrl + '?route=dna&id=' + id)
    const data = await response.json()
    return data as Dna
  }

  static async fetchDnaToUpdate(cursor: undefined | string) {
    const response = await fetch(
      RenderConfig.baseUrl + '?route=updateFitness&cursor=' + (cursor || ''),
    )
    const data = await response.json()
    return data as {dnaList: Dna[]; keys: string[]; cursor: string}
  }

  static async fetchDnaList(): Promise<Dna[]> {
    const response = await fetch(RenderConfig.baseUrl + '?route=list')
    const data = await response.json()
    return data as Dna[]
  }

  static async saveDna(dna: Dna): Promise<any> {
    const response = await fetch(RenderConfig.baseUrl + '?route=save', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dna),
    })
    return await response.json()
  }

  static loadAndScaleImageData(
    dna: Dna,
    width: number,
    height: number,
  ): Promise<ImageData> {
    const url = RenderConfig.baseUrl + '?route=image&id=' + dna.id
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
