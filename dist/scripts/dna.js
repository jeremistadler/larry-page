"use strict";
var Utils2 = require('./utils');
var Utils = Utils2.Utils;
var Raster2 = require('./raster');
var Raster = Raster2.Raster;
var GeneHelper = (function () {
    function GeneHelper() {
    }
    GeneHelper.CalculateState = function (f, rect) {
        var minX = f.Pos[0];
        var maxX = f.Pos[0];
        var minY = f.Pos[1];
        var maxY = f.Pos[1];
        for (var i = 2; i < f.Pos.length; i += 2) {
            minX = Math.min(minX, f.Pos[i]);
            maxX = Math.max(maxX, f.Pos[i]);
        }
        for (var i = 3; i < f.Pos.length; i += 2) {
            minY = Math.min(minY, f.Pos[i]);
            maxY = Math.max(maxY, f.Pos[i]);
        }
        var isContained = minX >= rect.x && maxX <= rect.x2 && minY >= rect.y && maxY <= rect.y2;
        return {
            IsContained: isContained,
            IsIntersecting: isContained || !(minX > rect.x2 ||
                maxX < rect.x ||
                minY > rect.y2 ||
                maxY < rect.y)
        };
    };
    return GeneHelper;
}());
var FitnessCalculator = (function () {
    function FitnessCalculator() {
    }
    FitnessCalculator.GetBuffer = function (width, height) {
        var buffer = this.Buffers[width + ':' + height];
        if (buffer)
            return buffer;
        buffer = new Uint8ClampedArray(width * height * 4);
        this.Buffers[width + ':' + height] = buffer;
        return buffer;
    };
    FitnessCalculator.GetFitness = function (dna, image) {
        var buffer = this.GetBuffer(image.width, image.height);
        for (var i = 0; i < buffer.length; i++)
            buffer[i] = 255;
        for (var i = 0; i < dna.Genes.length; i++) {
            var gene = dna.Genes[i];
            this.colorBuffer[0] = Math.floor(gene.Color[0] * 255);
            this.colorBuffer[1] = Math.floor(gene.Color[1] * 255);
            this.colorBuffer[2] = Math.floor(gene.Color[2] * 255);
            this.colorBuffer[3] = gene.Color[3];
            this.posBuffer[0] = gene.Pos[0] * image.width;
            this.posBuffer[1] = gene.Pos[1] * image.height;
            this.posBuffer[2] = gene.Pos[2] * image.width;
            this.posBuffer[3] = gene.Pos[3] * image.height;
            this.posBuffer[4] = gene.Pos[4] * image.width;
            this.posBuffer[5] = gene.Pos[5] * image.height;
            Raster.drawPolygon(buffer, image.width, image.height, this.posBuffer, this.colorBuffer);
        }
        return this.calculateFitness(image, buffer);
    };
    FitnessCalculator.GetConstrainedFitness = function (dna, image, rect, geneStates) {
        var buffer = this.GetBuffer(image.width, image.height);
        for (var i = 0; i < buffer.length; i++)
            buffer[i] = 255;
        for (var i = 0; i < dna.Genes.length; i++) {
            if (!geneStates[i].IsIntersecting)
                continue;
            var gene = dna.Genes[i];
            this.colorBuffer[0] = Math.floor(gene.Color[0] * 255);
            this.colorBuffer[1] = Math.floor(gene.Color[1] * 255);
            this.colorBuffer[2] = Math.floor(gene.Color[2] * 255);
            this.colorBuffer[3] = gene.Color[3];
            this.posBuffer[0] = gene.Pos[0] * image.width;
            this.posBuffer[1] = gene.Pos[1] * image.height;
            this.posBuffer[2] = gene.Pos[2] * image.width;
            this.posBuffer[3] = gene.Pos[3] * image.height;
            this.posBuffer[4] = gene.Pos[4] * image.width;
            this.posBuffer[5] = gene.Pos[5] * image.height;
            Raster.drawPolygon(buffer, image.width, image.height, this.posBuffer, this.colorBuffer);
        }
        return this.calculateConstrainedFitness(image, buffer, rect);
    };
    FitnessCalculator.calculateConstrainedFitness = function (img, buff2, rect) {
        var x1 = Math.max(Math.floor(rect.x * img.width), 0);
        var y1 = Math.max(Math.floor(rect.y * img.height), 0);
        var x2 = Math.min(Math.ceil(rect.x2 * img.width), img.width);
        var y2 = Math.min(Math.ceil(rect.y2 * img.height), img.height);
        var diff = 0;
        var q = 0;
        for (var y = y1; y < y2; y++) {
            for (var x = x1; x < x2; x++) {
                q = Math.abs(img.data[(y * img.width + x) * 4 + 0] - buff2[(y * img.width + x) * 4 + 0]);
                diff += q * q;
                q = Math.abs(img.data[(y * img.width + x) * 4 + 1] - buff2[(y * img.width + x) * 4 + 1]);
                diff += q * q;
                q = Math.abs(img.data[(y * img.width + x) * 4 + 2] - buff2[(y * img.width + x) * 4 + 2]);
                diff += q * q;
                q = Math.abs(img.data[(y * img.width + x) * 4 + 3] - buff2[(y * img.width + x) * 4 + 3]);
                diff += q * q;
            }
        }
        return diff;
    };
    FitnessCalculator.calculateFitness = function (img, buff2) {
        var diff = 0;
        for (var i = 0; i < img.data.length; i++) {
            var q = Math.abs(img.data[i] - buff2[i]);
            diff += q * q;
        }
        return diff;
    };
    FitnessCalculator.Buffers = [];
    FitnessCalculator.posBuffer = new Array(6);
    FitnessCalculator.colorBuffer = new Array(6);
    return FitnessCalculator;
}());
var GeneMutator = (function () {
    function GeneMutator() {
    }
    GeneMutator.MutateDna = function (ctx) {
        var mutatorState = ctx.mutator.func(ctx);
        if (mutatorState === null)
            return;
        var geneState = GeneHelper.CalculateState(mutatorState.newGene, ctx.rect);
        ctx.geneStates[mutatorState.index] = geneState;
        var partialFitness = FitnessCalculator.GetConstrainedFitness(ctx.dna, ctx.source, ctx.rect, ctx.geneStates);
        if (partialFitness < ctx.partialFitness) {
            ctx.partialFitness = partialFitness;
            ctx.mutations.push(mutatorState);
            ctx.dna.Mutation++;
        }
        else
            ctx.mutator.undo(ctx, mutatorState);
        ctx.dna.Generation++;
    };
    GeneMutator.setFromSettings = function (settings) {
        for (var i = 0; i < settings.mutatorWeights.length; i++)
            GeneMutator.GeneMutators[i].effectiveness = settings.mutatorWeights[i];
    };
    GeneMutator.setSettingsFromMutators = function (settings) {
        for (var i = 0; i < settings.mutatorWeights.length; i++)
            settings.mutatorWeights[i] = GeneMutator.GeneMutators[i].effectiveness;
    };
    GeneMutator.getFromName = function (name) {
        for (var i = 0; i < GeneMutator.GeneMutators.length; i++)
            if (GeneMutator.GeneMutators[i].name === name)
                return GeneMutator.GeneMutators[i];
        return null;
    };
    GeneMutator.DefaultMutateGene = function (ctx) {
        if (ctx.dna.Genes.length === 0)
            return null;
        var oldGene = null;
        for (var i = 0; i < 100; i++) {
            var index = Utils.randomIndex(ctx.geneStates);
            if (ctx.geneStates[index].IsContained) {
                oldGene = ctx.dna.Genes[index];
                break;
            }
        }
        if (oldGene === null)
            return null;
        var gene = {
            Pos: null,
            Color: null
        };
        ctx.dna.Genes[index] = gene;
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
            mutator.effectiveness = mutator.effectiveness * (1 - this.EffectivenessChangeRate) +
                fitnessDiff * this.EffectivenessChangeRate;
            mutator.effectiveness = Math.max(mutator.effectiveness, this.MinEffectiveness);
            mutator.effectiveness = Math.min(mutator.effectiveness, this.MaxEffectiveness);
        }
    };
    GeneMutator.EffectivenessChangeRate = 0.03;
    GeneMutator.MinEffectiveness = 0.00001;
    GeneMutator.MaxEffectiveness = 3000;
    GeneMutator.GeneMutators = [
        {
            name: 'ColorOnly',
            effectiveness: 1000,
            func: function (ctx) {
                var state = GeneMutator.DefaultMutateGene(ctx);
                if (state === null)
                    return null;
                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = state.oldGene.Pos.slice();
                var indexToChange = Utils.randomInt(0, 2);
                state.newGene.Color[indexToChange] = Utils.ClampFloat((Math.random() - 0.5) * 0.1 + state.newGene.Color[indexToChange]);
                return state;
            },
            undo: function (ctx, state) { return ctx.dna.Genes[state.index] = state.oldGene; }
        },
        {
            name: 'Opacity',
            effectiveness: 1000,
            func: function (ctx) {
                var state = GeneMutator.DefaultMutateGene(ctx);
                if (state === null)
                    return null;
                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = state.oldGene.Pos.slice();
                state.newGene.Color[3] = Utils.ClampFloat((Math.random() - 0.5) * 0.1 + state.newGene.Color[3]);
                return state;
            },
            undo: function (ctx, state) { return ctx.dna.Genes[state.index] = state.oldGene; }
        },
        {
            name: 'MoveGene',
            effectiveness: 1000,
            func: function (ctx) {
                var state = GeneMutator.DefaultMutateGene(ctx);
                if (state === null)
                    return null;
                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = new Array(6);
                for (var i = 0; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * ctx.rect.width + ctx.rect.x;
                for (var i = 1; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * ctx.rect.height + ctx.rect.y;
                return state;
            },
            undo: function (ctx, state) { return ctx.dna.Genes[state.index] = state.oldGene; }
        },
        {
            name: 'MoveGenePoint',
            effectiveness: 1000,
            func: function (ctx) {
                var state = GeneMutator.DefaultMutateGene(ctx);
                if (state === null)
                    return null;
                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = state.oldGene.Pos.slice();
                var indexToMove = Utils.randomIndex(state.newGene.Pos);
                if (indexToMove % 2 === 0)
                    state.newGene.Pos[indexToMove] = Utils.Clamp(state.newGene.Pos[indexToMove] + (Math.random() - 0.5) * 0.1 * ctx.rect.width, ctx.rect.x, ctx.rect.x2);
                else
                    state.newGene.Pos[indexToMove] = Utils.Clamp(state.newGene.Pos[indexToMove] + (Math.random() - 0.5) * 0.1 * ctx.rect.height, ctx.rect.y, ctx.rect.y2);
                return state;
            },
            undo: function (ctx, state) { return ctx.dna.Genes[state.index] = state.oldGene; }
        },
        {
            name: 'All Random',
            effectiveness: 1000,
            func: function (ctx) {
                var state = GeneMutator.DefaultMutateGene(ctx);
                if (state === null)
                    return null;
                state.newGene.Color = [Math.random(), Math.random(), Math.random(), 1 / (1 + ctx.dna.Generation * 0.0002)];
                state.newGene.Pos = new Array(6);
                for (var i = 0; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * ctx.rect.width + ctx.rect.x;
                for (var i = 1; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * ctx.rect.height + ctx.rect.y;
                return state;
            },
            undo: function (ctx, state) { return ctx.dna.Genes[state.index] = state.oldGene; }
        },
        {
            name: 'Add Big Triangle',
            effectiveness: 1000,
            func: function (ctx) {
                if (ctx.geneStates.length > ctx.dna.Generation / 5000 + 20)
                    return null;
                var gene = {
                    Color: [Math.random(), Math.random(), Math.random(), Utils.randomFloat(ctx.settings.newMinOpacity, ctx.settings.newMaxOpacity)],
                    Pos: new Array(6)
                };
                for (var i = 0; i < gene.Pos.length; i += 2)
                    gene.Pos[i] = Math.random() * ctx.rect.width + ctx.rect.x;
                for (var i = 1; i < gene.Pos.length; i += 2)
                    gene.Pos[i] = Math.random() * ctx.rect.height + ctx.rect.y;
                ctx.dna.Genes.push(gene);
                return { index: ctx.dna.Genes.length - 1, oldGene: null, newGene: gene };
            },
            undo: function (ctx, state) { return ctx.dna.Genes.splice(state.index, 1); }
        }
    ];
    return GeneMutator;
}());
//# sourceMappingURL=dna.js.map