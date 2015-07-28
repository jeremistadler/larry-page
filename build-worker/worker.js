"use strict";
var Utils = (function () {
    function Utils() {
    }
    Utils.StartTick = function (tickMethod) {
        var oldTime = 0;
        var tickLoop = function (time) {
            var deltaTime = time - oldTime;
            oldTime = time;
            tickMethod(deltaTime / 1000);
            window.requestAnimationFrame(tickLoop);
        };
        tickLoop(0);
    };
    Utils.randomIndex = function (arr) {
        return Math.floor(Math.random() * arr.length);
    };
    Utils.randomFromTo = function (from, to) {
        return Math.floor(Math.random() * (to - from + 1) + from);
    };
    Utils.CreateNumberArray = function (length) {
        var arr = new Array(length);
        for (var i = 0; i < length; i++)
            arr[i] = 0;
        return arr;
    };
    Utils.ClampFloat = function (num) {
        return Math.min(1, Math.max(num, 0));
    };
    Utils.ClampByte = function (num) {
        return Math.min(255, Math.max(num, 0));
    };
    return Utils;
})();

"use strict";
///<reference path="../references.ts" />
var Organism = (function () {
    function Organism() {
    }
    return Organism;
})();
var Gene = (function () {
    function Gene() {
    }
    return Gene;
})();
var Dna = (function () {
    function Dna() {
    }
    return Dna;
})();
var GeneMutator = (function () {
    function GeneMutator() {
    }
    GeneMutator.MutateDna = function (mutator, dna, source, rect, mutations) {
        var mutatorState = mutator.func(dna, rect);
        if (mutatorState == null)
            return;
        for (var i = 0; i < mutatorState.newGene.Pos.length; i += 2)
            if (mutatorState.newGene.Pos[i] < rect.x || mutatorState.newGene.Pos[i] > rect.x2)
                return mutator.undo(dna, mutatorState);
        for (var i = 1; i < mutatorState.newGene.Pos.length; i += 2)
            if (mutatorState.newGene.Pos[i] < rect.y || mutatorState.newGene.Pos[i] > rect.y2)
                return mutator.undo(dna, mutatorState);
        var fitness = this.GetFitness(dna, source);
        if (fitness < dna.Fitness) {
            dna.Fitness = fitness;
            dna.Mutation++;
            mutations.push(mutatorState);
        }
        else {
            mutator.undo(dna, mutatorState);
        }
        dna.Generation++;
    };
    GeneMutator.GetFitness = function (dna, source) {
        if (!this.Buffer)
            this.Buffer = new Uint8ClampedArray(globalWidth * globalHeight * 4);
        for (var i = 0; i < this.Buffer.length; i++)
            this.Buffer[i] = 255;
        for (var i = 0; i < dna.Genes.length; i++) {
            var gene = dna.Genes[i];
            for (var c = 0; c < 3; c++)
                this.colorBuffer[c] = Math.floor(gene.Color[c] * 255);
            this.colorBuffer[3] = gene.Color[3];
            for (var c = 0; c < gene.Pos.length; c++)
                this.posBuffer[c] = Math.floor(gene.Pos[c] * globalHeight);
            Raster.drawPolygon(this.Buffer, globalWidth, globalHeight, this.posBuffer, this.colorBuffer);
        }
        return this.calculateFitness(source, this.Buffer);
    };
    GeneMutator.calculateFitness = function (buff1, buff2) {
        var diff = 0.0;
        for (var i = 0; i < buff1.length; i++) {
            var q = Math.abs(buff1[i] - buff2[i]);
            diff += q * q;
        }
        return diff;
    };
    GeneMutator.DefaultMutateGene = function (dna) {
        if (dna.Genes.length == 0)
            return null;
        var gene = new Gene();
        var index = Utils.randomIndex(dna.Genes);
        var oldGene = dna.Genes[index];
        dna.Genes[index] = gene;
        return { index: index, oldGene: oldGene, newGene: gene };
    };
    GeneMutator.GetMutator = function () {
        var totalEffectivess = 0;
        for (var i = 0; i < this.GeneMutators.length; i++)
            totalEffectivess += this.GeneMutators[i].effectiveness;
        var bias = Math.random() * totalEffectivess;
        var currentEffectiveness = 0;
        var mutator = this.GeneMutators[this.GeneMutators.length - 1];
        for (var i = 0; i < this.GeneMutators.length; i++) {
            currentEffectiveness += this.GeneMutators[i].effectiveness;
            if (currentEffectiveness > bias) {
                mutator = this.GeneMutators[i];
                break;
            }
        }
        return mutator;
    };
    GeneMutator.UpdateEffectiveness = function (fitnessDiff, mutator) {
        if (isFinite(fitnessDiff)) {
            mutator.effectiveness = mutator.effectiveness * (1 - this.EffectivenessChangeRate) + fitnessDiff * this.EffectivenessChangeRate;
            mutator.effectiveness = Math.max(mutator.effectiveness, this.MinimumEffectiveness);
        }
    };
    GeneMutator.StartingEffectiveness = 1000000;
    GeneMutator.EffectivenessChangeRate = 0.03;
    GeneMutator.MinimumEffectiveness = 0.00001;
    GeneMutator.posBuffer = new Array(6);
    GeneMutator.colorBuffer = new Array(6);
    GeneMutator.GeneMutators = [
        {
            name: 'ColorOnly',
            effectiveness: 10000000,
            func: function (dna, rect) {
                var state = GeneMutator.DefaultMutateGene(dna);
                if (state == null)
                    return null;
                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = state.oldGene.Pos.slice();
                var indexToChange = Utils.randomFromTo(0, 4);
                state.newGene.Color[indexToChange] = Utils.ClampFloat((Math.random() - 0.5) * 0.1 + state.newGene.Color[indexToChange]);
                return state;
            },
            undo: function (dna, state) { return dna.Genes[state.index] = state.oldGene; }
        },
        {
            name: 'MoveGene',
            effectiveness: 10000000,
            func: function (dna, rect) {
                var state = GeneMutator.DefaultMutateGene(dna);
                if (state == null)
                    return null;
                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = new Array(6);
                for (var i = 0; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * 1.2 * rect.width - 0.1 * rect.width;
                for (var i = 1; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * 1.2 * rect.height - 0.1 * rect.height;
                return state;
            },
            undo: function (dna, state) { return dna.Genes[state.index] = state.oldGene; }
        },
        {
            name: 'MoveGenePart',
            effectiveness: 10000000,
            func: function (dna, rect) {
                var state = GeneMutator.DefaultMutateGene(dna);
                if (state == null)
                    return null;
                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = state.oldGene.Pos.slice();
                var indexToMove = Utils.randomIndex(state.newGene.Pos);
                if (indexToMove % 2 == 0)
                    state.newGene.Pos[indexToMove] += (Math.random() - 0.5) * 0.1 * rect.width;
                else
                    state.newGene.Pos[indexToMove] += (Math.random() - 0.5) * 0.1 * rect.height;
                return state;
            },
            undo: function (dna, state) { return dna.Genes[state.index] = state.oldGene; }
        },
        {
            name: 'All Random',
            effectiveness: 10000000,
            func: function (dna, rect) {
                var state = GeneMutator.DefaultMutateGene(dna);
                if (state == null)
                    return null;
                state.newGene.Color = [Math.random(), Math.random(), Math.random(), 1 / (1 + dna.Generation * 0.0002)];
                state.newGene.Pos = new Array(6);
                for (var i = 0; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * 1.2 * rect.width + rect.x - 0.1 * rect.width;
                for (var i = 1; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * 1.2 * rect.height + rect.y - 0.1 * rect.height;
                return state;
            },
            undo: function (dna, state) { return dna.Genes[state.index] = state.oldGene; }
        },
        {
            name: 'Add Small Triangle',
            effectiveness: 2000,
            func: function (dna, rect) {
                var gene = new Gene();
                gene.Color = [Math.random(), Math.random(), Math.random(), 1 / (1 + dna.Generation * 0.0002)];
                gene.Pos = [Math.random() * rect.width + rect.x, Math.random() * rect.height + rect.y, 0, 0, 0, 0];
                gene.Pos[2] = gene.Pos[0] + Math.random() * 0.2 * rect.width - 0.1 * rect.width;
                gene.Pos[3] = gene.Pos[1] + Math.random() * 0.2 * rect.height - 0.1 * rect.height;
                gene.Pos[4] = gene.Pos[0] + Math.random() * 0.2 * rect.width - 0.1 * rect.width;
                gene.Pos[5] = gene.Pos[1] + Math.random() * 0.2 * rect.height - 0.1 * rect.height;
                dna.Genes.push(gene);
                return { index: dna.Genes.length - 1, oldGene: null, newGene: gene };
            },
            undo: function (dna, state) { return dna.Genes.splice(state.index, 1); }
        },
        {
            name: 'Add Big Triangle',
            effectiveness: 1000000,
            func: function (dna, rect) {
                var gene = new Gene();
                gene.Color = [Math.random(), Math.random(), Math.random(), 1 / (1 + dna.Generation * 0.0002)];
                gene.Pos = new Array(6);
                for (var i = 0; i < gene.Pos.length; i += 2)
                    gene.Pos[i] = Math.random() * rect.width + rect.x;
                for (var i = 1; i < gene.Pos.length; i += 2)
                    gene.Pos[i] = Math.random() * rect.height + rect.y;
                dna.Genes.push(gene);
                return { index: dna.Genes.length - 1, oldGene: null, newGene: gene };
            },
            undo: function (dna, state) { return dna.Genes.splice(state.index, 1); }
        }
    ];
    return GeneMutator;
})();

"use strict";
var Raster = (function () {
    function Raster() {
    }
    Raster.drawHLine = function (buffer, width, height, x1, x2, y, color) {
        if (y < 0 || y > height - 1)
            return;
        if (x1 == x2)
            return;
        x1 = Math.max(x1, 0);
        x2 = Math.min(x2, width);
        var alpha = color[3];
        var inverseAlpha = 1 - alpha;
        var index = Math.floor((y * width) + x1);
        for (; x1 < x2; x1++) {
            buffer[index * 4 + 0] = alpha * color[0] + buffer[index * 4 + 0] * inverseAlpha;
            buffer[index * 4 + 1] = alpha * color[1] + buffer[index * 4 + 1] * inverseAlpha;
            buffer[index * 4 + 2] = alpha * color[2] + buffer[index * 4 + 2] * inverseAlpha;
            index++;
        }
        ;
    };
    Raster.scanline = function (x1, y1, x2, y2, startY, endY) {
        if (y1 > y2) {
            var tempY = y1;
            var tempX = x1;
            y1 = y2;
            y2 = tempY;
            x1 = x2;
            x2 = tempX;
        }
        y1 = Math.floor(y1);
        y2 = Math.min(Math.floor(y2), endY);
        //if ( y2 < y1 ) { y2++ }
        var dx = (x2 - x1) / (y2 - y1); // change in x over change in y will give us the gradient
        var row = Math.round(y1 - startY); // the offset the start writing at (into the array)
        for (; y1 <= y2; y1++) {
            if (this._rowMin[row] > x1)
                this._rowMin[row] = x1;
            if (this._rowMax[row] < x1)
                this._rowMax[row] = x1;
            x1 += dx;
            row++;
        }
    };
    Raster._drawPolygon = function (buffer, width, height, points, color) {
        var minY = points[1];
        var maxY = points[1];
        for (var i = 1; i < points.length; i += 2) {
            minY = Math.min(minY, points[i]);
            maxY = Math.max(maxY, points[i]);
        }
        var polygonHeight = maxY - minY;
        for (var i = 0; i < polygonHeight + 10; i++)
            this._rowMin[i] = 100000.0;
        for (var i = 0; i < polygonHeight + 10; i++)
            this._rowMax[i] = -100000.0;
        this.scanline(points[0], points[1], points[2], points[3], minY, maxY);
        this.scanline(points[4], points[5], points[0], points[1], minY, maxY);
        this.scanline(points[2], points[3], points[4], points[5], minY, maxY);
        for (var i = 0; i < polygonHeight; i++) {
            this.drawHLine(buffer, width, height, this._rowMin[i], this._rowMax[i], Math.floor(i + minY), color);
        }
    };
    Raster.rotPoints = function (points, angle, about) {
        var x, y, i;
        var reply = [];
        angle = angle * (Math.PI / 180);
        var sin = Math.sin(angle);
        var cos = Math.cos(angle);
        for (i = 0; i < points.length; i++) {
            x = about.x + (((points[i].x - about.x) * cos) - ((points[i].y - about.y) * sin));
            y = about.y + (((points[i].x - about.x) * sin) + ((points[i].y - about.y) * cos));
            reply.push({ x: x, y: y });
        }
        return reply;
    };
    Raster.polyEllipse = function (x, y, w, h) {
        var ex, ey, i;
        var reply = [];
        for (i = 0; i < 2 * Math.PI; i += 0.01) {
            ex = x + w * Math.cos(i);
            ey = y + h * Math.sin(i);
            reply.push({ x: ex, y: ey });
        }
        return reply;
    };
    Raster.polyBox = function (x, y, w, h) {
        return [{ x: x - w / 2, y: y - h / 2 }, { x: x - w / 2, y: y + h / 2 }, { x: x + w / 2, y: y + h / 2 }, { x: x + w / 2, y: y - h / 2 }];
    };
    Raster.drawPolygon = function (buffer, width, height, points, color) {
        this._drawPolygon(buffer, width, height, points, color);
    };
    Raster.drawCircle = function (buffer, width, height, x, y, rad, color) {
        this._drawPolygon(buffer, width, height, this.polyEllipse(x, y, rad, rad), color);
    };
    Raster.drawEllipse = function (buffer, width, height, x, y, h, w, rot, color) {
        this._drawPolygon(buffer, width, height, this.rotPoints(this.polyEllipse(x, y, h, w), rot, { x: x, y: y }), color);
    };
    Raster.drawBox = function (buffer, width, height, x, y, h, w, rot, color) {
        this._drawPolygon(buffer, width, height, this.rotPoints(this.polyBox(x, y, h, w), rot, { x: x, y: y }), color);
    };
    Raster._rowMin = Utils.CreateNumberArray(1024);
    Raster._rowMax = Utils.CreateNumberArray(1024);
    return Raster;
})();

"use strict";
var globalWidth = 256;
var globalHeight = 256;
var baseUrl = '';
var debug = true;
var tempName = 'dna88';
if (debug) {
    baseUrl = 'http://larry.jeremi.se';
}

///<reference path="../references.ts" />
"use strict";
var JsRasterizer = (function () {
    function JsRasterizer(sourceImageData, Dna) {
        //this.tempBuffer = new Uint8Array(globalWidth * globalHeight * 4);
        //var canvas = document.createElement('canvas');
        //canvas.width = globalWidth;
        //canvas.height = globalHeight;
        //canvas.style.width = '200px';
        //canvas.style.height = '200px';
        //canvas.style.imageRendering = 'pixelated';
        //this.pixelCtx = canvas.getContext('2d', { alpha: false });
        //document.body.appendChild(canvas);
        this.sourceImageData = sourceImageData;
        this.Dna = Dna;
        this.workers = [];
        this.completedWorkers = 0;
        this.allMutations = [];
        var canvas = document.createElement('canvas');
        canvas.width = globalWidth;
        canvas.height = globalHeight;
        this.triangleCtx = canvas.getContext('2d', { alpha: false });
        document.body.appendChild(canvas);
        Dna.Fitness = GeneMutator.GetFitness(Dna, sourceImageData.data);
        for (var i = 0; i < 4; i++)
            this.createThread();
        this.startLocalizedDraws();
    }
    JsRasterizer.prototype.drawPreview = function () {
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
        this.triangleCtx.fillStyle = 'white';
        this.triangleCtx.fillRect(0, 0, globalWidth, globalHeight);
        for (var g = 0; g < this.Dna.Genes.length; g++) {
            var gene = this.Dna.Genes[g];
            this.triangleCtx.fillStyle = 'rgba(' + Math.floor(gene.Color[0] * 255) + ',' + Math.floor(gene.Color[1] * 255) + ',' + Math.floor(gene.Color[2] * 255) + ',' + gene.Color[3] + ')';
            this.triangleCtx.beginPath();
            this.triangleCtx.moveTo(gene.Pos[0] * globalWidth, gene.Pos[1] * globalHeight);
            this.triangleCtx.lineTo(gene.Pos[2] * globalWidth, gene.Pos[3] * globalHeight);
            this.triangleCtx.lineTo(gene.Pos[4] * globalWidth, gene.Pos[5] * globalHeight);
            this.triangleCtx.closePath();
            this.triangleCtx.fill();
        }
    };
    JsRasterizer.prototype.startLocalizedDraws = function () {
        console.log('Max grid size: ', Math.round(Math.log(this.Dna.Generation + 1) / 4) + 2);
        var gridSize = Utils.randomFromTo(1, Math.round(Math.log(this.Dna.Generation + 1) / 10) + 2);
        var gridSlotWidth = globalWidth / gridSize;
        var gridSlotHeight = globalHeight / gridSize;
        var usedSlots = [];
        var gridOffsetX = (Math.random() - 0.5) * gridSlotWidth / 4;
        var gridOffsetY = (Math.random() - 0.5) * gridSlotHeight / 4;
        for (var i = 0; i < this.workers.length; i++) {
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
                    height: gridSlotHeight / globalHeight,
                }
            });
        }
    };
    JsRasterizer.prototype.saveMutators = function (mutators) {
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
    };
    JsRasterizer.prototype.onMessage = function (e) {
        var mutations = e.data.mutations;
        this.completedWorkers++;
        this.Dna.Generation += e.data.generations;
        this.Dna.Mutation += mutations.length;
        for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].oldGene == null)
                this.Dna.Genes.push(mutations[i].newGene);
            else
                this.Dna.Genes[mutations[i].index] = mutations[i].newGene;
        }
        if (this.completedWorkers == this.workers.length) {
            this.completedWorkers = 0;
            this.startLocalizedDraws();
            this.drawPreview();
        }
    };
    JsRasterizer.prototype.createThread = function () {
        var _this = this;
        var worker = new Worker('build-worker/worker.js');
        this.workers.push(worker);
        worker.onmessage = function (f) { return _this.onMessage(f); };
        worker.postMessage(this.sourceImageData.data);
    };
    JsRasterizer.prototype.Save = function () {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', baseUrl + '/api/dna/save', true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.send(JSON.stringify(this.Dna));
    };
    return JsRasterizer;
})();

///<reference path="scripts/utils.ts" />
///<reference path="scripts/dna.ts" />
///<reference path="scripts/raster.ts" />
///<reference path="scripts/shared.ts" />
///<reference path="scripts/js-rasterizer.ts" />

var JsRasterizerWorker = (function () {
    function JsRasterizerWorker(sourceImageData) {
        this.sourceImageData = sourceImageData;
        this.tempBuffer = new Uint8Array(globalWidth * globalHeight * 4);
    }
    JsRasterizerWorker.prototype.go = function (dna, rect) {
        var startTime = new Date().getTime();
        var iterations = 100;
        var mutator = GeneMutator.GetMutator();
        var mutations = [];
        var orginalGenes = dna.Genes;
        var allowedGenes = orginalGenes.filter(function (f, index) {
            for (var i = 0; i < f.Pos.length; i += 2)
                if (f.Pos[i] < rect.x || f.Pos[i] > rect.x2)
                    return false;
            for (var i = 1; i < f.Pos.length; i += 2)
                if (f.Pos[i] < rect.y || f.Pos[i] > rect.y2)
                    return false;
            f.i = index;
            return true;
        });
        dna.Genes = allowedGenes;
        dna.Fitness = GeneMutator.GetFitness(dna, this.sourceImageData);
        var fitness = dna.Fitness;
        for (var i = 0; i < iterations && fitness == dna.Fitness; i++)
            GeneMutator.MutateDna(mutator, dna, this.sourceImageData, rect, mutations);
        var fitnessDiff = (fitness - dna.Fitness) / iterations;
        //GeneMutator.UpdateEffectiveness(Math.sign(fitnessDiff), mutator);
        if (dna.Genes.length > 0)
            GeneMutator.UpdateEffectiveness(fitnessDiff, mutator);
        var sum = GeneMutator.GeneMutators.map(function (f) { return f.effectiveness; }).reduce(function (a, b) { return a + b; });
        console.log('Mutators: ', GeneMutator.GeneMutators.map(function (f) { return f.name + ': ' + Math.round(f.effectiveness / sum * 1000); }).join('%, ') + '%');
        console.log('Generation time: ', (new Date().getTime() - startTime) / iterations, 'ms', 'fittness', dna.Fitness, 'Mutations: ', dna.Mutation, 'Generations: ', dna.Generation, 'Genes: ', dna.Genes.length);
        var mut = GeneMutator.GeneMutators.map(function (f) {
            return { effectiveness: f.effectiveness, name: f.name };
        });
        mut.sort(function (a, b) { return a.name.localeCompare(b.name); });
        for (var i = 0; i < mutations.length; i++)
            if (mutations[i].oldGene != null)
                mutations[i].index = mutations[i].oldGene.i;
        self.postMessage({ generations: 1, mutators: mut, mutations: mutations }, null);
    };
    return JsRasterizerWorker;
})();
var childRasterizer = null;
self.onmessage = function (e) {
    if (childRasterizer == null)
        childRasterizer = new JsRasterizerWorker(e.data);
    else
        childRasterizer.go(e.data.dna, e.data.rect);
};
