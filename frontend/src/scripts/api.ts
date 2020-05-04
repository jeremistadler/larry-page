import {RenderConfig} from 'shared/src/shared'
import {Dna} from 'shared/src/dna'

export class DnaApi {
  static async uploadNewImage(file: File): Promise<Dna> {
    const base64 = await new Promise<string | ArrayBuffer | null>(
      (resolve, reject) => {
        const reader = new FileReader()
        reader.addEventListener(
          'load',
          () => {
            let r = reader.result

            resolve(r)
            // convert image file to base64 string
          },
          false,
        )
        reader.addEventListener('error', ev => {
          reject(reader.error)
        })

        reader.readAsArrayBuffer(file)
      },
    )

    const response = await fetch(RenderConfig.baseUrl + '?route=upload', {
      method: 'POST',
      body: base64,
    })
    const data = (await response.json()) as {dna: Dna}
    return data.dna
  }

  static async fetchRandomDna(): Promise<Dna> {
    const response = await fetch(RenderConfig.baseUrl + '?route=random')
    const data = await response.json()
    return data as Dna
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
    const url = RenderConfig.baseUrl + '?route=image&id=' + dna.Organism.Id
    return new Promise((resolve, reject) => {
      var image = new Image()
      image.crossOrigin = ''
      image.onload = () => {
        var canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        var ctx = <CanvasRenderingContext2D>(
          canvas.getContext('2d', {alpha: false})
        )
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(image, 0, 0, width, height)
        var data = ctx.getImageData(0, 0, width, height)
        resolve(data)
      }
      image.onerror = e => {
        console.error('Could not load image', e)
        reject(e)
      }
      image.src = url
    })
  }
}
