import { Dna, ISettings, IRectangle, IWorkerResult } from './dna';
import { FitnessCalculator } from './fitness-calculator';
import { Utils } from './utils';
import { RenderConfig } from './shared';
import { GeneMutator, GeneHelper } from './gene-mutator';

export class JsRasterizer {
    idleWorkers: Worker[] = [];
    activeWorkers: Worker[] = [];
    allMutations: any[] = [];
    startTime: number = 0;
    currentRectangles: IRectangle[] = [];
    onFrameCompleted: { (dna: Dna): void; }[] = [];
    onFrameStarted: { (dna: Dna): void; }[] = [];
    currentIteration = 0;

    clearNextRound: boolean = false;

    constructor(public source: ImageData, public Dna: Dna, public Settings: ISettings) {
        Dna.Fitness = FitnessCalculator.GetFitness(Dna, this.source);

        for (var i = 0; i < 4; i++)
            this.createThread();

        this.startLocalizedDraws();
    }

    removeWorst() {
        var list = [];
        var startTime = new Date().getTime();
        var originalFitness = FitnessCalculator.GetFitness(this.Dna, this.source);

        var emptyGene = {
            Color: [0, 0, 0, 0],
            Pos: Utils.CreateNumberArray(6),
        };

        var step = Math.ceil(Math.max(this.Dna.Genes.length / 300, 1));

        for (var i = 0; i < this.Dna.Genes.length && i < 300; i += step) {
            var gene = this.Dna.Genes[i];
            this.Dna.Genes[i] = emptyGene;

            var fitness = FitnessCalculator.GetFitness(this.Dna, this.source);
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


        this.Dna.Fitness = FitnessCalculator.GetFitness(this.Dna, this.source);
        console.log('Removed ', indexesToRemove.length,  ' genes in ', new Date().getTime() - startTime, ' ms');
    }


    drawPreview(ctx: CanvasRenderingContext2D) {
        var width = ctx.canvas.width;
        var height = ctx.canvas.height;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        var geneStates = this.Dna.Genes.map(f => GeneHelper.CalculateState(f, this.currentRectangles[0]));

        for (var g = 0; g < this.Dna.Genes.length; g++) {
            var gene = this.Dna.Genes[g];
            ctx.fillStyle = 'rgba(' +
            Math.floor(gene.Color[0] * 255) + ',' +
            Math.floor(gene.Color[1] * 255) + ',' +
            Math.floor(gene.Color[2] * 255) + ',' +
            gene.Color[3] + ')';

            ctx.beginPath();
            ctx.moveTo(gene.Pos[0] * width, gene.Pos[1] * height);
            ctx.lineTo(gene.Pos[2] * width, gene.Pos[3] * height);
            ctx.lineTo(gene.Pos[4] * width, gene.Pos[5] * height);
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();

        for (var g = 0; g < this.currentRectangles.length; g++) {
            ctx.moveTo(this.currentRectangles[g].x * width, this.currentRectangles[g].y * height);
            ctx.lineTo(this.currentRectangles[g].x2 * width, this.currentRectangles[g].y * height);
            ctx.lineTo(this.currentRectangles[g].x2 * width, this.currentRectangles[g].y2 * height);
            ctx.lineTo(this.currentRectangles[g].x * width, this.currentRectangles[g].y2 * height);
            ctx.lineTo(this.currentRectangles[g].x * width, this.currentRectangles[g].y * height);
        }

        ctx.fill();
        ctx.stroke();
    }

    startLocalizedDraws() {
        //var maxGridSize = (Math.log(this.Dna.Generation + 1) / 2) + 0;
        //DebugView.SetMessage('Max grid size', maxGridSize, '(' + Math.round(maxGridSize) + ')');
        var gridSize = Utils.randomInt(this.Settings.minGridSize, this.Settings.maxGridSize);
        //gridSize = 2;
        var gridSlotWidth = this.source.width / gridSize;
        var gridSlotHeight = this.source.height / gridSize;
        var usedSlots = [];
        var gridOffsetX = (Math.random() - 0.5) * gridSlotWidth / 2;
        var gridOffsetY = (Math.random() - 0.5) * gridSlotHeight / 2;
        //gridOffsetX = 0;
        //gridOffsetY = 0;
        this.startTime = new Date().getTime();
        this.currentRectangles.length = 0;
        GeneMutator.setSettingsFromMutators(this.Settings);

        for (; this.idleWorkers.length > 0 && usedSlots.length < gridSize * gridSize;) {
            var x = 0;
            var y = 0;

            while (true) {
                x = Utils.randomInt(0, gridSize - 1);
                y = Utils.randomInt(0, gridSize - 1);
                var key = x + ':' + y;
                if (usedSlots.indexOf(key) == -1) {
                    usedSlots.push(key);
                    break;
                }
            }
            var rect = {
                x: (x * gridSlotWidth + gridOffsetX) / this.source.width,
                y: (y * gridSlotHeight + gridOffsetY) / this.source.height,
                x2: (x * gridSlotWidth + gridSlotWidth + gridOffsetX) / this.source.width,
                y2: (y * gridSlotHeight + gridSlotHeight + gridOffsetY) / this.source.height,
                width: gridSlotHeight / this.source.height,
                height: gridSlotHeight / this.source.height,
            };

            this.currentRectangles.push(rect);

            var worker = this.idleWorkers.pop();
            this.activeWorkers.push(worker);

            worker.postMessage({
                dna: this.Dna,
                rect: rect,
                settings: this.Settings
            });
        }
    }

    onMessage(e: MessageEvent) {
        var worker = <Worker>e.target;
        var data = <IWorkerResult>e.data;

        this.activeWorkers.splice(this.activeWorkers.indexOf(worker), 1);
        this.idleWorkers.push(worker);

        var mutations = data.mutations;
        this.Dna.Generation += data.generations;
        this.Dna.Mutation += mutations.length;

        if (this.Settings.autoAdjustMutatorWeights) {
            var mutator = GeneMutator.getFromName(data.mutatorName);
            GeneMutator.UpdateEffectiveness(data.fitnessImprovement, mutator);
        }

        for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].oldGene == null)
                this.Dna.Genes.push(mutations[i].newGene);
            else
                this.Dna.Genes[mutations[i].index] = mutations[i].newGene;
        }


        if (this.activeWorkers.length == 0) {
            if (this.clearNextRound) {
                this.clearNextRound = false;
                this.Dna.Genes.length = 0;
                this.Dna.Fitness = Infinity;
            }

            this.currentIteration++;
            //if (this.currentIteration % 50 == 0)
            //    this.removeWorst();

            for (var g = 0; g < this.onFrameCompleted.length; g++)
                this.onFrameCompleted[g](this.Dna);

            this.startLocalizedDraws();

            for (var g = 0; g < this.onFrameStarted.length; g++)
                this.onFrameStarted[g](this.Dna);


            var fitnessAfter = FitnessCalculator.GetFitness(this.Dna, this.source);
            if (fitnessAfter > this.Dna.Fitness)
                console.warn('Fitness diff: ' + (this.Dna.Fitness - fitnessAfter), ' startLocalizedDraws is mutating the image');
            this.Dna.Fitness = fitnessAfter;

            if (this.currentIteration % 50 == 0)
                this.Save();

            //localStorage.setItem(tempName, JSON.stringify(this.Dna));
        }
    }

    createThread() {
        var worker = new Worker('worker.bundle.js');
        this.idleWorkers.push(worker);
        worker.onmessage = f => this.onMessage(f);
        worker.postMessage(this.source);
        worker.onerror = (a) => console.error(a);
    }

    Save() {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', RenderConfig.baseUrl + '/api/dna/save', true);
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
