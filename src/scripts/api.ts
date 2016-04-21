import { RenderConfig } from './shared';
import { Dna } from './dna';

export class DnaApi {
    static fetchRandomDna(): Promise<Dna> {
        return window.fetch(RenderConfig.baseUrl + '/api/dna/random')
              .then(response => response.json())
              .then(data => (<Dna>data));
    }

    static fetchDnaList(): Promise<Dna[]> {
        return window.fetch(RenderConfig.baseUrl + '/api/organismsWithDna?limit=50')
              .then(response => response.json())
              .then(data => (<Dna[]>data));
    }

    static saveDna(dna: Dna): Promise<any> {
        return window.fetch(RenderConfig.baseUrl + '/api/dna/save',
       {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dna)
        })
      .then(response => response.json());
    }

    static loadAndScaleImageData(url: string, width: number, height: number): Promise<ImageData> {
        return new Promise((resolve, reject) =>
        {
            var image = new Image();
            image.crossOrigin = '';
            image.onload = () => {
                var canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                var ctx = <CanvasRenderingContext2D>canvas.getContext('2d', { alpha: false });
                ctx.fillStyle = 'white';
                ctx.drawImage(image, 0, 0, width, height);
                var data = ctx.getImageData(0, 0, width, height);
                resolve(data);
            };
            image.onerror = e => {
                 console.error('Could not load image', e);
                 reject(e);
             }
            image.src = url;
        });
    }
}
