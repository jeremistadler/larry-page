import {RenderConfig} from './shared'
import {Dna} from './dna'

export class DnaApi {
  static async fetchRandomDna(): Promise<Dna> {
    const response = await window.fetch(
      RenderConfig.baseUrl + '/api/dna/random',
    )
    const data = await response.json()
    return <Dna>data
  }

  static async fetchDnaList(): Promise<Dna[]> {
    const response = await window.fetch(
      RenderConfig.baseUrl + '/api/organismsWithDna?limit=50',
    )
    const data = await response.json()
    return <Dna[]>data
  }

  static async saveDna(dna: Dna): Promise<any> {
    const response = await window.fetch(
      RenderConfig.baseUrl + '/api/dna/save',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dna),
      },
    )
    return await response.json()
  }

  static loadAndScaleImageData(
    url: string,
    width: number,
    height: number,
  ): Promise<ImageData> {
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
