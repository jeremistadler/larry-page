///<reference path="references.ts" />


class JsRasterizer {
    pixelCtx: CanvasRenderingContext2D;
    triangleCtx: CanvasRenderingContext2D;
    tempBuffer: Uint8Array;
    workers: Worker[] = [];
    completedWorkers: number = 0;
    allMutations: any[] = [];

    constructor(public sourceImageData: ImageData, public Dna: Dna) {
        this.tempBuffer = new Uint8Array(globalWidth * globalHeight * 4);
        var canvas = document.createElement('canvas');
        canvas.width = globalWidth;
        canvas.height = globalHeight;
        canvas.style.width = '200px';
        canvas.style.height = '200px';
        canvas.style.imageRendering = 'pixelated';
        this.pixelCtx = canvas.getContext('2d', { alpha: false });
        document.body.appendChild(canvas);

        var canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        this.triangleCtx = canvas.getContext('2d', { alpha: false });
        document.body.appendChild(canvas);

        var workers = [];

        for (var i = 0; i < 1; i++)
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

        var data = this.pixelCtx.createImageData(globalWidth, globalHeight);
        for (var i = 0; i < data.data.length; i++)
            data.data[i] = this.tempBuffer[i];
        this.pixelCtx.putImageData(data, 0, 0);


        //var div = document.createElement('div');
        //div.style.width = '1px';
        //div.style.height = (this.Dna.Fitness / 10000) + 'px';
        //div.style.display = 'inline-block';
        //div.style.backgroundColor = 'cornflowerblue';
        //document.body.appendChild(div);
        
        this.triangleCtx.fillStyle = 'white';
        this.triangleCtx.fillRect(0, 0, 200, 200);

        for (var g = 0; g < this.Dna.Genes.length; g++) {
            var gene = this.Dna.Genes[g];
            this.triangleCtx.fillStyle = 'rgba(' +
            Math.floor(gene.Color[0] * 255) + ',' +
            Math.floor(gene.Color[1] * 255) + ',' +
            Math.floor(gene.Color[2] * 255) + ',' +
            gene.Color[3] + ')';

            this.triangleCtx.beginPath();
            this.triangleCtx.moveTo(gene.Pos[0] * 200, gene.Pos[1] * 200);
            this.triangleCtx.lineTo(gene.Pos[2] * 200, gene.Pos[3] * 200);
            this.triangleCtx.lineTo(gene.Pos[4] * 200, gene.Pos[5] * 200);
            this.triangleCtx.closePath();
            this.triangleCtx.fill();
        }
    }

    onMessage(e: MessageEvent) {
        var dna = <Dna>e.data.dna;
        var mutations = e.data.mutations;
        this.allMutations.push(mutations);


        this.completedWorkers++;

        if (this.allMutations.length % 3000 == 0 && this.allMutations.length > 0) {
            var csv = '';

            for (var g = 0; g < this.allMutations.length; g++) {
                csv += this.allMutations[g].name;
                if (g != this.allMutations.length - 1)
                    csv += ',';
            }

            for (var g = 0; g < this.allMutations.length; g++) {
                csv += this.allMutations[g].eff;
                if (g != this.allMutations.length - 1)
                    csv += ',';
            }

            csv = "data:application/octet-stream," + encodeURIComponent(csv);
            window.open(csv, 'Mutations num ' + this.Dna.Generation + '.csv');
        }

        if (dna.Fitness < this.Dna.Fitness) {
            this.Dna = dna;
        }

        if (this.completedWorkers == this.workers.length) {
            for (var q = 0; q < this.workers.length; q++)
                this.workers[q].postMessage(this.Dna);

            this.completedWorkers = 0;
            this.drawPreview();

            localStorage.setItem('dna5', JSON.stringify(this.Dna));
        }
    }

    createThread() {
        var worker = new Worker('build/JsRasterizerWorker.js');
        this.workers.push(worker);
        worker.onmessage = f => this.onMessage(f);

        worker.postMessage(this.sourceImageData.data);
        worker.postMessage(this.Dna);
    }

    Save() {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', baseUrl + '/api/dna/save', true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.send(JSON.stringify(this.Dna));
    }
}
