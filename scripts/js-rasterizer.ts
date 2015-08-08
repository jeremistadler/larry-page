///<reference path="../references.ts" />
"use strict";

class JsRasterizer {
    previewCtx: CanvasRenderingContext2D;
    idleWorkers: Worker[] = [];
    activeWorkers: Worker[] = [];
    allMutations: any[] = [];
    startTime: number;
    currentRectangles: IRectangle[] = [];
    currentIteration = 0;

    previewWidth: number;
    previewHeight: number;

    constructor(public sourceImageData: ImageData, public Dna: Dna) {
        this.previewHeight = sourceImageData.width;
        this.previewWidth = sourceImageData.height;

        var canvas = document.createElement('canvas');
        canvas.width = this.previewWidth;
        canvas.height = this.previewHeight;
        //canvas.style.width = '200px';
        //canvas.style.height = '200px';
        //canvas.style.imageRendering = 'pixelated';
        this.previewCtx = <CanvasRenderingContext2D>canvas.getContext('2d', { alpha: false });
        document.body.appendChild(canvas);

        Dna.Fitness = FitnessCalculator.GetFitness(Dna, sourceImageData);

        for (var i = 0; i < 2; i++)
            this.createThread();

        this.startLocalizedDraws();
    }

    removeWorst() {
        var list = [];
        var startTime = new Date().getTime();
        var originalFitness = FitnessCalculator.GetFitness(this.Dna, this.sourceImageData);

        var emptyGene = {
            Color: [0, 0, 0, 0],
            Pos: Utils.CreateNumberArray(6),
        };

        var step = Math.ceil(Math.max(this.Dna.Genes.length / 300, 1));

        for (var i = 0; i < this.Dna.Genes.length && i < 300; i += step) {
            var gene = this.Dna.Genes[i];
            this.Dna.Genes[i] = emptyGene;

            var fitness = FitnessCalculator.GetFitness(this.Dna, this.sourceImageData);
            list.push({
                fitness: fitness,
                index: i,
                fitnessDiff: fitness - originalFitness
            });

            this.Dna.Genes[i] = gene;
        }

        list.sort((a, b) => a.fitness - b.fitness);
        var indexesToRemove = [];
        for (; list.length > 2000 || (list.length > 0 && list[0].fitnessDiff <= 30);) {
            indexesToRemove.push(list[0].index);
            list.splice(0, 1);
        }
        indexesToRemove.sort((a, b) => b - a);

        for (var g = 0; g < indexesToRemove.length; g++)
            this.Dna.Genes.splice(indexesToRemove[g], 1);


        this.Dna.Fitness = FitnessCalculator.GetFitness(this.Dna, this.sourceImageData);
        DebugView.SetMessage('Removed genes', new Date().getTime() - startTime, 'ms(' + indexesToRemove.length + ' items)');
    }


    drawPreview() {
        this.previewCtx.fillStyle = 'white';
        this.previewCtx.fillRect(0, 0, this.previewWidth, this.previewHeight);
        var geneStates = this.Dna.Genes.map(f => GeneHelper.CalculateState(f, this.currentRectangles[0]));

        for (var g = 0; g < this.Dna.Genes.length; g++) {

            var gene = this.Dna.Genes[g];
            this.previewCtx.fillStyle = 'rgba(' +
            Math.floor(gene.Color[0] * 255) + ',' +
            Math.floor(gene.Color[1] * 255) + ',' +
            Math.floor(gene.Color[2] * 255) + ',' +
            gene.Color[3] + ')';

            this.previewCtx.beginPath();
            this.previewCtx.moveTo(gene.Pos[0] * this.previewWidth, gene.Pos[1] * this.previewHeight);
            this.previewCtx.lineTo(gene.Pos[2] * this.previewWidth, gene.Pos[3] * this.previewHeight);
            this.previewCtx.lineTo(gene.Pos[4] * this.previewWidth, gene.Pos[5] * this.previewHeight);
            this.previewCtx.closePath();
            this.previewCtx.fill();
        }

        this.previewCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.previewCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        this.previewCtx.beginPath();

        for (var g = 0; g < this.currentRectangles.length; g++) {
            this.previewCtx.moveTo(this.currentRectangles[g].x * this.previewWidth, this.currentRectangles[g].y * this.previewHeight);
            this.previewCtx.lineTo(this.currentRectangles[g].x2 * this.previewWidth, this.currentRectangles[g].y * this.previewHeight);
            this.previewCtx.lineTo(this.currentRectangles[g].x2 * this.previewWidth, this.currentRectangles[g].y2 * this.previewHeight);
            this.previewCtx.lineTo(this.currentRectangles[g].x * this.previewWidth, this.currentRectangles[g].y2 * this.previewHeight);
            this.previewCtx.lineTo(this.currentRectangles[g].x * this.previewWidth, this.currentRectangles[g].y * this.previewHeight);
        }

        this.previewCtx.fill();
        this.previewCtx.stroke();
    }

    startLocalizedDraws() {
        var maxGridSize = (Math.log(this.Dna.Generation + 1) / 2) + 0;
        DebugView.SetMessage('Max grid size', maxGridSize, '(' + Math.round(maxGridSize) + ')');
        var gridSize = Utils.randomFromTo(1, Math.round(maxGridSize));
        //gridSize = 2;
        var gridSlotWidth = globalWidth / gridSize;
        var gridSlotHeight = globalHeight / gridSize;
        var usedSlots = [];
        var gridOffsetX = (Math.random() - 0.5) * gridSlotWidth / 2;
        var gridOffsetY = (Math.random() - 0.5) * gridSlotHeight / 2;
        //gridOffsetX = 0;
        //gridOffsetY = 0;
        this.startTime = new Date().getTime();
        this.currentRectangles.length = 0;

        for (; this.idleWorkers.length > 0 && usedSlots.length < gridSize * gridSize;)
        {
            var x = 0;
            var y = 0;

            while (true) {
                x = Utils.randomFromTo(0, gridSize - 1);
                y = Utils.randomFromTo(0, gridSize - 1);
                var key = x + ':' + y;
                if (usedSlots.indexOf(key) == -1) {
                    usedSlots.push(key);
                    break;
                }
            }
            var rect = {
                x: (x * gridSlotWidth + gridOffsetX) / globalWidth,
                y: (y * gridSlotHeight + gridOffsetY) / globalHeight,
                x2: (x * gridSlotWidth + gridSlotWidth + gridOffsetX) / globalWidth,
                y2: (y * gridSlotHeight + gridSlotHeight + gridOffsetY) / globalHeight,
                width: gridSlotHeight / globalHeight,
                height: gridSlotHeight / globalHeight,
            };

            this.currentRectangles.push(rect);

            var worker = this.idleWorkers.pop();
            this.activeWorkers.push(worker);

            worker.postMessage({
                dna: this.Dna,
                rect: rect
            });
        }
    }

    onMessage(e: MessageEvent) {
        var worker = <Worker>e.target;
        this.activeWorkers.splice(this.activeWorkers.indexOf(worker), 1);
        this.idleWorkers.push(worker);

        var mutations = <IMutatorState[]>e.data.mutations;
        this.Dna.Generation += e.data.generations;
        this.Dna.Mutation += mutations.length;

        DebugView.SetMessage('New Mutations', mutations.length, '');
        for (var i = 0; i < e.data.mutators.length; i++)
            DebugView.SetMessage('Mutator: ' + e.data.mutators[i].name, e.data.mutators[i].effectiveness, '');

        for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].oldGene == null)
                this.Dna.Genes.push(mutations[i].newGene);
            else
                this.Dna.Genes[mutations[i].index] = mutations[i].newGene;
        }

        if (this.idleWorkers.length == 1)
            DebugView.SetMessage('Duration - First worker', (new Date().getTime() - this.startTime), 'ms');
        
        if (this.activeWorkers.length == 0)
        {
            DebugView.SetMessage('Duration - Last worker', (new Date().getTime() - this.startTime), 'ms');

            this.currentIteration++;
            if (this.currentIteration % 50 == 0)
                this.removeWorst();

            this.startLocalizedDraws();
            this.drawPreview();
            DebugView.RenderToDom()


            var fitnessAfter = FitnessCalculator.GetFitness(this.Dna, this.sourceImageData);
            DebugView.SetMessage('Genes', this.Dna.Genes.length, '');
            DebugView.SetMessage('Fitness improvement', this.Dna.Fitness - fitnessAfter, '');
            if (fitnessAfter > this.Dna.Fitness)
                console.warn('GLOBAL: fitness diff: ' + (this.Dna.Fitness - fitnessAfter));
            this.Dna.Fitness = fitnessAfter;
            DebugView.SetMessage('Fitness Squared', Math.round(Math.sqrt(this.Dna.Fitness) / 10), '');
            DebugView.SetMessage('Generation', this.Dna.Generation, '');
            DebugView.SetMessage('Mutations', this.Dna.Mutation, '');

            if (this.currentIteration % 50 == 0)
                this.Save();

            //localStorage.setItem(tempName, JSON.stringify(this.Dna));
        }
    }

    createThread() {
        var worker = new Worker('build-worker/worker.js');
        this.idleWorkers.push(worker);
        worker.onmessage = f => this.onMessage(f);
        worker.postMessage(this.sourceImageData);
    }

    Save() {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', baseUrl + '/api/dna/save', true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.send(JSON.stringify(this.Dna));
    }

    Stop() {
        for (var i = 0; i < this.idleWorkers.length; i++) {
            this.idleWorkers[i].terminate();
        }

        for (var i = 0; i < this.activeWorkers.length; i++) {
            this.activeWorkers[i].terminate();
        }
    }
}
