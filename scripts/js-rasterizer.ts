///<reference path="../references.ts" />
"use strict";

class JsRasterizer {
    pixelCtx: CanvasRenderingContext2D;
    previewCtx: CanvasRenderingContext2D;
    workers: Worker[] = [];
    completedWorkers: number = 0;
    allMutations: any[] = [];
    startTime: number;

    constructor(public sourceImageData: ImageData, public Dna: Dna) {
        var canvas = document.createElement('canvas');
        canvas.width = globalWidth;
        canvas.height = globalHeight;
        canvas.style.width = '200px';
        canvas.style.height = '200px';
        canvas.style.imageRendering = 'pixelated';
        this.previewCtx = <CanvasRenderingContext2D>canvas.getContext('2d', { alpha: false });
        document.body.appendChild(canvas);

        Dna.Fitness = FitnessCalculator.GetFitness(Dna, sourceImageData);

        for (var i = 0; i < 1; i++)
            this.createThread();

        this.startLocalizedDraws();
    }

    removeWorst() {
        var list = [];
        var startTime = new Date().getTime();
        var originalFitness = FitnessCalculator.GetFitness(this.Dna, this.sourceImageData);

        for (var i = 0; i < this.Dna.Genes.length; i++) {
            var gene = this.Dna.Genes[i];
            this.Dna.Genes[i] = {
                Color: [0, 0, 0, 0],
                Pos: Utils.CreateNumberArray(6),
            };

            var fitness = FitnessCalculator.GetFitness(this.Dna, this.sourceImageData);
            list.push({
                fitness: fitness,
                index: i,
                fitnessDiff: fitness - originalFitness
            });

            this.Dna.Genes[i] = gene;
        }

        list.sort((a, b) => a.fitness - b.fitness);
        var removed = 0;
        for (var i = 0; i < list.length; i++) {
            if (list[i].fitnessDiff <= 30) {
                removed++;
                this.Dna.Genes.splice(list[i].index, 1);
            }
        }

        this.Dna.Fitness = FitnessCalculator.GetFitness(this.Dna, this.sourceImageData);
        DebugView.SetMessage('Removed genes', new Date().getTime() - startTime, 'ms(' + removed + ' items)');
    }


    drawPreview() {
        //for (var i = 0; i < this.tempBuffer.length; i++) {
        //    this.tempBuffer[i] = 255;
        //}

        //var posBuffer = new Array(6);
        //var colorBuffer = new Array(6);

        //for (var i = 0; i < this.Dna.Genes.length; i++) {
        //    var gene = this.Dna.Genes[i];

        //    for (var c = 0; c < 3; c++)
        //        colorBuffer[c] = Math.floor(gene.Color[c] * 255);
        //    colorBuffer[3] = gene.Color[3];

        //    for (var c = 0; c < gene.Pos.length; c++)
        //        posBuffer[c] = Math.floor(gene.Pos[c] * globalHeight);

        //    Raster.drawPolygon(this.tempBuffer, globalWidth, posBuffer, colorBuffer);
        //}

        //var data = this.pixelCtx.createImageData(globalWidth, globalHeight);
        //for (var i = 0; i < data.data.length; i++)
        //    data.data[i] = this.tempBuffer[i];
        //this.pixelCtx.putImageData(data, 0, 0);


        //var div = document.createElement('div');
        //div.style.width = '1px';
        //div.style.height = (this.Dna.Fitness / 10000) + 'px';
        //div.style.display = 'inline-block';
        //div.style.backgroundColor = 'cornflowerblue';
        //document.body.appendChild(div);
        
        this.previewCtx.fillStyle = 'white';
        this.previewCtx.fillRect(0, 0, globalWidth, globalHeight);

        for (var g = 0; g < this.Dna.Genes.length; g++) {
            var gene = this.Dna.Genes[g];
            this.previewCtx.fillStyle = 'rgba(' +
            Math.floor(gene.Color[0] * 255) + ',' +
            Math.floor(gene.Color[1] * 255) + ',' +
            Math.floor(gene.Color[2] * 255) + ',' +
            gene.Color[3] + ')';

            this.previewCtx.beginPath();
            this.previewCtx.moveTo(gene.Pos[0] * globalWidth, gene.Pos[1] * globalHeight);
            this.previewCtx.lineTo(gene.Pos[2] * globalWidth, gene.Pos[3] * globalHeight);
            this.previewCtx.lineTo(gene.Pos[4] * globalWidth, gene.Pos[5] * globalHeight);
            this.previewCtx.closePath();
            this.previewCtx.fill();
        }
    }

    startLocalizedDraws() {
        var maxGridSize = (Math.log(this.Dna.Generation + 1) / 2) + 2;
        DebugView.SetMessage('Max grid size', maxGridSize, '(' + Math.round(maxGridSize) + ')');
        var gridSize = Utils.randomFromTo(1, Math.round(maxGridSize));
        var gridSlotWidth = globalWidth / gridSize;
        var gridSlotHeight = globalHeight / gridSize;
        var usedSlots = [];
        var gridOffsetX = (Math.random() - 0.5) * gridSlotWidth / 2;
        var gridOffsetY = (Math.random() - 0.5) * gridSlotHeight / 2;
        this.startTime = new Date().getTime();

        for (var i = 0; i < this.workers.length; i++)
        {
            if (usedSlots.length == this.workers.length)
                return;

            var x = 0;
            var y = 0;

            while (true) {
                x = Utils.randomFromTo(0, gridSize);
                y = Utils.randomFromTo(0, gridSize);
                var key = x + ':' + y;
                if (usedSlots.indexOf(key) == -1)
                    break;
            }

            this.workers[i].postMessage({
                dna: this.Dna,
                rect: {
                    x: (x * gridSlotWidth + gridOffsetX) / globalWidth,
                    y: (y * gridSlotHeight + gridOffsetY) / globalHeight,
                    x2: (x * gridSlotWidth + gridSlotWidth + gridOffsetX) / globalWidth,
                    y2: (y * gridSlotHeight + gridSlotHeight + gridOffsetY) / globalHeight,
                    width: gridSlotHeight / globalHeight,
                    height: gridSlotHeight/ globalHeight,
                }
            });
        }
    }

    saveMutators(mutators) {
        //this.allMutations.push(e.data.mutators);
        //if (this.allMutations.length % 500 == 0 && this.allMutations.length > 0) {
        //    var csv = '';

        //    for (var g = 0; g < this.allMutations[0].length; g++) {
        //        csv += this.allMutations[0][g].name;
        //        if (g != this.allMutations[0].length - 1)
        //            csv += ',';
        //    }

        //    csv += '\r\n';

        //    for (var g = 0; g < this.allMutations.length; g++) {
        //        var sum = this.allMutations[g].map(f => f.eff).reduce((a, b) => a + b);

        //        for (var j = 0; j < this.allMutations[g].length; j++) {
        //            csv += (this.allMutations[g][j].eff / sum);
        //            if (j != this.allMutations[g].length - 1)
        //                csv += ',';
        //        }
        //        csv += '\r\n';
        //    }

        //    csv = "data:text/csv," + encodeURIComponent(csv);
        //    window.open(csv, 'Mutations num ' + this.Dna.Generation + '.csv');
        //}

    }

    onMessage(e: MessageEvent) {
        this.completedWorkers++;
        var mutations = <IMutatorState[]>e.data.mutations;
        this.Dna.Generation += e.data.generations;
        this.Dna.Mutation += mutations.length;

        DebugView.SetMessage('Mutations', mutations.length, '');
        for (var i = 0; i < e.data.mutators.length; i++)
            DebugView.SetMessage('Mutator: ' + e.data.mutators[i].name, e.data.mutators[i].effectiveness, '');

        for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].oldGene == null)
                this.Dna.Genes.push(mutations[i].newGene);
            else
                this.Dna.Genes[mutations[i].index] = mutations[i].newGene;
        }

        if (this.completedWorkers == 1)
            DebugView.SetMessage('Duration - First worker', (new Date().getTime() - this.startTime), 'ms');
        
        if (this.completedWorkers == this.workers.length) {
            this.completedWorkers = 0;

            DebugView.SetMessage('Duration - Last worker', (new Date().getTime() - this.startTime), 'ms');

            //if (Math.random() > 0.99)
            //    this.removeWorst();

            this.startLocalizedDraws();
            this.drawPreview();

            var fitnessAfter = FitnessCalculator.GetFitness(this.Dna, this.sourceImageData);
            DebugView.SetMessage('Genes', this.Dna.Genes.length, '');
            DebugView.SetMessage('Fitness improvement', this.Dna.Fitness - fitnessAfter, '');
            if (fitnessAfter > this.Dna.Fitness)
                console.warn('GLOBAL: fitness diff: ' + (this.Dna.Fitness - fitnessAfter));
            this.Dna.Fitness = fitnessAfter;
            DebugView.SetMessage('Fitness Squared', Math.round(Math.sqrt(this.Dna.Fitness) / 10), '');
            DebugView.SetMessage('Generation', this.Dna.Mutation, '');
            DebugView.SetMessage('Mutations', this.Dna.Generation, '');
            
            //localStorage.setItem(tempName, JSON.stringify(this.Dna));
        }
    }

    createThread() {
        var worker = new Worker('build-worker/worker.js');
        this.workers.push(worker);
        worker.onmessage = f => this.onMessage(f);
        worker.postMessage(this.sourceImageData);
    }

    Save() {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', baseUrl + '/api/dna/save', true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.send(JSON.stringify(this.Dna));
    }
}
