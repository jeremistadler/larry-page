///<reference path="references.ts" />


class JsRasterizer {
    Canvas: CanvasRenderingContext2D;
    tempBuffer: Uint8Array;
    workers: Worker[] = [];
    completedWorkers: number = 0;

    constructor(public sourceImageData: ImageData, public Dna: Dna) {
        this.tempBuffer = new Uint8Array(globalWidth * globalHeight * 4);
        var canvas = document.createElement('canvas');
        canvas.width = globalWidth;
        canvas.height = globalHeight;
        canvas.style.width = '200px';
        canvas.style.height = '200px';
        canvas.style.imageRendering = 'pixelated';
        this.Canvas= canvas.getContext('2d');
        document.body.appendChild(canvas);

        var workers = [];

        for (var i = 0; i < 4; i++)
            this.createThread();
    }

    drawPreview() {
        for (var i = 0; i < this.tempBuffer.length; i++) {
            this.tempBuffer[i] = 255;
        }

        var posBuffer = new Array(6);
        var colorBuffer = new Array(6);

        for (var i = 0; i < this.Dna.Genes.length; i++) {
            var gene = this.Dna.Genes[i];

            for (var c = 0; c < 3; c++)
                colorBuffer[c] = Math.floor(gene.Color[c] * 255);
            colorBuffer[3] = gene.Color[3];

            for (var c = 0; c < gene.Pos.length; c++)
                posBuffer[c] = Math.floor(gene.Pos[c] * globalHeight);

            Raster.drawPolygon(this.tempBuffer, globalWidth, posBuffer, colorBuffer);
        }

        var data = this.Canvas.createImageData(globalWidth, globalHeight);
        for (var i = 0; i < data.data.length; i++)
            data.data[i] = this.tempBuffer[i];
        this.Canvas.putImageData(data, 0, 0);
    }

    onMessage(e: MessageEvent) {
        var dna = <Dna>e.data;
        this.completedWorkers++;

        if (dna.Fitness < this.Dna.Fitness) {
            this.Dna = dna;
        }

        if (this.completedWorkers == this.workers.length) {
            for (var q = 0; q < this.workers.length; q++)
                this.workers[q].postMessage(this.Dna);

            this.completedWorkers = 0;
            this.drawPreview();
        }
    }

    createThread() {
        var worker = new Worker('build/JsRasterizerWorker.js');
        this.workers.push(worker);
        worker.onmessage = f => this.onMessage(f);

        worker.postMessage(this.sourceImageData.data);
        worker.postMessage(this.Dna);
    }

    draw() {

    }
}
