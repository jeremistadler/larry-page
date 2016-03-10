"use strict";
var Utils2 = require('./utils');
var Utils = Utils2.Utils;
var JsRasterizer = (function () {
    function JsRasterizer(source, Dna, Settings) {
        this.source = source;
        this.Dna = Dna;
        this.Settings = Settings;
        this.idleWorkers = [];
        this.activeWorkers = [];
        this.allMutations = [];
        this.startTime = 0;
        this.currentRectangles = [];
        this.onFrameCompleted = [];
        this.onFrameStarted = [];
        this.currentIteration = 0;
        this.clearNextRound = false;
        Dna.Fitness = FitnessCalculator.GetFitness(Dna, this.source);
        for (var i = 0; i < 4; i++)
            this.createThread();
        this.startLocalizedDraws();
    }
    JsRasterizer.prototype.removeWorst = function () {
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
        list.sort(function (a, b) { return a.fitness - b.fitness; });
        var indexesToRemove = [];
        for (; list.length > 2000 || (list.length > 0 && list[0].fitnessDiff <= 30);) {
            indexesToRemove.push(list[0].index);
            list.splice(0, 1);
        }
        indexesToRemove.sort(function (a, b) { return b - a; });
        for (var g = 0; g < indexesToRemove.length; g++)
            this.Dna.Genes.splice(indexesToRemove[g], 1);
        this.Dna.Fitness = FitnessCalculator.GetFitness(this.Dna, this.source);
        DebugView.SetMessage('Removed genes', new Date().getTime() - startTime, 'ms(' + indexesToRemove.length + ' items)');
    };
    JsRasterizer.prototype.drawPreview = function (ctx) {
        var _this = this;
        var width = ctx.canvas.width;
        var height = ctx.canvas.height;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        var geneStates = this.Dna.Genes.map(function (f) { return GeneHelper.CalculateState(f, _this.currentRectangles[0]); });
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
    };
    JsRasterizer.prototype.startLocalizedDraws = function () {
        var gridSize = Utils.randomInt(this.Settings.minGridSize, this.Settings.maxGridSize);
        var gridSlotWidth = this.source.width / gridSize;
        var gridSlotHeight = this.source.height / gridSize;
        var usedSlots = [];
        var gridOffsetX = (Math.random() - 0.5) * gridSlotWidth / 2;
        var gridOffsetY = (Math.random() - 0.5) * gridSlotHeight / 2;
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
    };
    JsRasterizer.prototype.onMessage = function (e) {
        var worker = e.target;
        var data = e.data;
        this.activeWorkers.splice(this.activeWorkers.indexOf(worker), 1);
        this.idleWorkers.push(worker);
        var mutations = data.mutations;
        this.Dna.Generation += data.generations;
        this.Dna.Mutation += mutations.length;
        if (this.Settings.autoAdjustMutatorWeights) {
            var mutator = GeneMutator.getFromName(data.mutatorName);
            GeneMutator.UpdateEffectiveness(data.fitnessImprovement, mutator);
        }
        DebugView.SetMessage('New Mutations', mutations.length, '');
        for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].oldGene == null)
                this.Dna.Genes.push(mutations[i].newGene);
            else
                this.Dna.Genes[mutations[i].index] = mutations[i].newGene;
        }
        if (this.idleWorkers.length == 1)
            DebugView.SetMessage('Duration - First worker', (new Date().getTime() - this.startTime), 'ms');
        if (this.activeWorkers.length == 0) {
            DebugView.SetMessage('Duration - Last worker', (new Date().getTime() - this.startTime), 'ms');
            if (this.clearNextRound) {
                this.clearNextRound = false;
                this.Dna.Genes.length = 0;
                this.Dna.Fitness = Infinity;
            }
            this.currentIteration++;
            for (var g = 0; g < this.onFrameCompleted.length; g++)
                this.onFrameCompleted[g](this.Dna);
            this.startLocalizedDraws();
            for (var g = 0; g < this.onFrameStarted.length; g++)
                this.onFrameStarted[g](this.Dna);
            DebugView.RenderToDom();
            var fitnessAfter = FitnessCalculator.GetFitness(this.Dna, this.source);
            DebugView.SetMessage('Genes', this.Dna.Genes.length, '');
            DebugView.SetMessage('Fitness improvement', this.Dna.Fitness - fitnessAfter, '');
            if (fitnessAfter > this.Dna.Fitness)
                console.warn('GLOBAL: fitness diff: ' + (this.Dna.Fitness - fitnessAfter));
            this.Dna.Fitness = fitnessAfter;
            DebugView.SetMessage('Fitness Squared', Math.round(Math.sqrt(this.Dna.Fitness) / 10), '');
            DebugView.SetMessage('Generation', this.Dna.Generation, '');
            DebugView.SetMessage('Mutations', this.Dna.Mutation, '');
        }
    };
    JsRasterizer.prototype.createThread = function () {
        var _this = this;
        var worker = new Worker('build-worker/worker.js');
        this.idleWorkers.push(worker);
        worker.onmessage = function (f) { return _this.onMessage(f); };
        worker.postMessage(this.source);
    };
    JsRasterizer.prototype.Save = function () {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', baseUrl + '/api/dna/save', true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.send(JSON.stringify(this.Dna));
    };
    JsRasterizer.prototype.Stop = function () {
        for (var i = 0; i < this.idleWorkers.length; i++) {
            this.idleWorkers[i].terminate();
        }
        for (var i = 0; i < this.activeWorkers.length; i++) {
            this.activeWorkers[i].terminate();
        }
    };
    return JsRasterizer;
}());
exports.JsRasterizer = JsRasterizer;
//# sourceMappingURL=js-rasterizer.js.map