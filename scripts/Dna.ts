"use strict";
///<reference path="../references.ts" />

interface IRectangle {
    x: number;
    y: number;
    x2: number;
    y2: number;
    width: number;
    height: number;
}

interface Organism {
    Id: number;
    ImagePath: string;
}

interface Gene {
    Pos: number[];
    Color: number[];
}

interface Dna {
    Genes: Gene[];
    Generation: number;
    Mutation: number;
    Fitness: number;
    Organism: Organism;
}

interface IDnaRenderContext {
    mutator: IGeneMutator;
    rect: IRectangle;
    dna: Dna;
    mutations: IMutatorState[];
    geneStates: IGeneRectangleState[];
    source: ImageData;
    partialFitness: number;
}

interface IGeneRectangleState {
    IsContained: boolean;
    IsIntersecting: boolean;
}

interface IMutatorState {
    oldGene: Gene;
    newGene: Gene;
    index: number;
}

interface IGeneMutator {
    name: string;
    effectiveness: number;
    func: (ctx: IDnaRenderContext) => IMutatorState;
    undo: (ctx: IDnaRenderContext, state: IMutatorState) => void;
}

class GeneHelper {
    static CalculateState(f: Gene, rect: IRectangle): IGeneRectangleState {
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
            IsIntersecting: isContained || !(
                minX > rect.x2 ||
                maxX < rect.x ||
                minY > rect.y2 ||
                maxY < rect.y)
        }
    }
}

class FitnessCalculator{
    static Buffers: Uint8Array[] = [];

    static posBuffer: number[] = new Array(6);
    static colorBuffer: number[] = new Array(6);

    static GetBuffer(width: number, height: number) {
        var buffer = this.Buffers[width + ':' + height];
        if (buffer) return buffer;
        buffer = new Uint8ClampedArray(width * height * 4);
        this.Buffers[width + ':' + height] = buffer;
        return buffer;
    }

    static GetFitness(dna: Dna, image: ImageData) {
        var buffer = this.GetBuffer(image.width, image.height);
        for (var i = 0; i < buffer.length; i++)
            buffer[i] = 255;

        for (var i = 0; i < dna.Genes.length; i++) {
            var gene = dna.Genes[i];

            for (var c = 0; c < 3; c++)
                this.colorBuffer[c] = Math.floor(gene.Color[c] * 255);
            this.colorBuffer[3] = gene.Color[3];

            for (var c = 0; c < gene.Pos.length; c++)
                this.posBuffer[c] = gene.Pos[c] * globalHeight;

            Raster.drawPolygon(buffer, globalWidth, globalHeight, this.posBuffer, this.colorBuffer);
        }

        return this.calculateFitness(image.data, buffer);
    }

    static GetConstrainedFitness(dna: Dna, image: ImageData, rect: IRectangle, geneStates: IGeneRectangleState[]) {
        var buffer = this.GetBuffer(image.width, image.height);
        for (var i = 0; i < buffer.length; i++)
            buffer[i] = 255;

        for (var i = 0; i < dna.Genes.length; i++) {
            if (!geneStates[i].IsIntersecting)
                continue;

            var gene = dna.Genes[i];

            for (var c = 0; c < 3; c++)
                this.colorBuffer[c] = Math.floor(gene.Color[c] * 255);
            this.colorBuffer[3] = gene.Color[3];

            for (var c = 0; c < gene.Pos.length; c++)
                this.posBuffer[c] = gene.Pos[c] * globalHeight;

            Raster.drawPolygon(buffer, globalWidth, globalHeight, this.posBuffer, this.colorBuffer);
        }

        return this.calculateConstrainedFitness(image.data, buffer, rect, image.width, image.height);
    }

    static calculateConstrainedFitness(buff1: number[], buff2: Int8Array, rect: IRectangle, width: number, height: number) {
        var x1 = Math.max(Math.floor(rect.x * width), 0);
        var y1 = Math.max(Math.floor(rect.y * height), 0);
        var x2 = Math.min(Math.ceil(rect.x2 * width), width);
        var y2 = Math.min(Math.ceil(rect.y2 * height), height);

        //if (x1 === 0 && y1 === 0 && x2 === width && y2 === height)
        //    return this.calculateFitness(buff1, buff2);

        var diff = 0.0;
        var q = 0.0;
        for (var y = y1; y < y2; y++) {
            for (var x = x1; x < x2; x++) {
                q = Math.abs(buff1[(y * width + x) * 4 + 0] - buff2[(y * width + x) * 4 + 0]);
                diff += q * q;
                q = Math.abs(buff1[(y * width + x) * 4 + 1] - buff2[(y * width + x) * 4 + 1]);
                diff += q * q;
                q = Math.abs(buff1[(y * width + x) * 4 + 2] - buff2[(y * width + x) * 4 + 2]);
                diff += q * q;
                q = Math.abs(buff1[(y * width + x) * 4 + 3] - buff2[(y * width + x) * 4 + 3]);
                diff += q * q;
            }
        }

        return diff;
    }

    static calculateFitness(buff1: number[], buff2: Int8Array) {
        var diff = 0.0;
        for (var i = 0; i < buff1.length; i++) {
            var q = Math.abs(buff1[i] - buff2[i]);
            diff += q * q;
        }
        return diff;
    }
}

class GeneMutator {
    static StartingEffectiveness = 1000000;
    static EffectivenessChangeRate = 0.03;
    static MinimumEffectiveness = 0.00001;

    static MutateDna(ctx: IDnaRenderContext) {
        var mutatorState = ctx.mutator.func(ctx);
        if (mutatorState == null)
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
    }

    public static DefaultMutateGene(ctx: IDnaRenderContext): IMutatorState {
        if (ctx.dna.Genes.length == 0)
            return null;

        var oldGene: Gene = null;

        for (var i = 0; i < 100; i++) {
            var index = Utils.randomIndex(ctx.geneStates);
            if (ctx.geneStates[index].IsContained) {
                oldGene = ctx.dna.Genes[index];
                break;
            }
        }

        if (oldGene == null)
            return null;

        var gene = {
            Pos: null,
            Color: null
        };
        ctx.dna.Genes[index] = gene;
        return { index: index, oldGene: oldGene, newGene: gene };
    }

    public static GeneMutators: IGeneMutator[] = [
        {
            name: 'ColorOnly',
            effectiveness: 1000,
            func: function (ctx: IDnaRenderContext): IMutatorState {
                var state = GeneMutator.DefaultMutateGene(ctx);
                if (state == null) return null;

                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = state.oldGene.Pos.slice();

                var indexToChange = Utils.randomFromTo(0, 4);
                state.newGene.Color[indexToChange] = Utils.ClampFloat((Math.random() - 0.5) * 0.1 + state.newGene.Color[indexToChange]);
                return state;
            },
            undo: (ctx, state) => ctx.dna.Genes[state.index] = state.oldGene
        },
        {
            name: 'Opacity',
            effectiveness: 1000,
            func: function (ctx: IDnaRenderContext): IMutatorState {
                var state = GeneMutator.DefaultMutateGene(ctx);
                if (state == null) return null;

                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = state.oldGene.Pos.slice();

                state.newGene.Color[3] = Utils.ClampFloat((Math.random() - 0.5) * 0.1 + state.newGene.Color[3]);
                return state;
            },
            undo: (ctx, state) => ctx.dna.Genes[state.index] = state.oldGene
        },
        {
            name: 'MoveGene',
            effectiveness: 1000,
            func: function (ctx: IDnaRenderContext): IMutatorState {
                var state = GeneMutator.DefaultMutateGene(ctx);
                if (state == null) return null;

                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = new Array(6);
                for (var i = 0; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * ctx.rect.width + ctx.rect.x;
                for (var i = 1; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * ctx.rect.height + ctx.rect.y;
                return state;
            },
            undo: (ctx, state) => ctx.dna.Genes[state.index] = state.oldGene
        },
        {
            name: 'MoveGenePoint',
            effectiveness: 1000,
            func: function (ctx: IDnaRenderContext): IMutatorState {
                var state = GeneMutator.DefaultMutateGene(ctx);
                if (state == null) return null;

                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = state.oldGene.Pos.slice();

                var indexToMove = Utils.randomIndex(state.newGene.Pos);
                if (indexToMove % 2 == 0)
                    state.newGene.Pos[indexToMove] = Utils.Clamp(state.newGene.Pos[indexToMove] + (Math.random() - 0.5) * 0.1 * ctx.rect.width, ctx.rect.x, ctx.rect.x2);
                else
                    state.newGene.Pos[indexToMove] = Utils.Clamp(state.newGene.Pos[indexToMove] + (Math.random() - 0.5) * 0.1 * ctx.rect.height, ctx.rect.y, ctx.rect.y2);
                return state;
            },
            undo: (ctx, state) => ctx.dna.Genes[state.index] = state.oldGene
        },
        {
            name: 'All Random',
            effectiveness: 1000,
            func: function (ctx: IDnaRenderContext): IMutatorState {
                var state = GeneMutator.DefaultMutateGene(ctx);
                if (state == null) return null;

                state.newGene.Color = [Math.random(), Math.random(), Math.random(), 1 / (1 + ctx.dna.Generation * 0.0002)];
                state.newGene.Pos = new Array(6);

                for (var i = 0; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * ctx.rect.width + ctx.rect.x;

                for (var i = 1; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * ctx.rect.height + ctx.rect.y;

                return state;
            },
            undo: (ctx, state) => ctx.dna.Genes[state.index] = state.oldGene
        },
        //{
        //    name: 'Add Small Triangle',
        //    effectiveness: 1000,
        //    func: function (ctx: IDnaRenderContext): IMutatorState {
        //        var gene = {
        //            Color: [Math.random(), Math.random(), Math.random(), 1 / (1 + ctx.dna.Generation * 0.0002)],
        //            Pos: [Math.random() * ctx.rect.width + ctx.rect.x, Math.random() * ctx.rect.height + ctx.rect.y, 0, 0, 0, 0]
        //        };
        //        gene.Pos[2] = Utils.Clamp(gene.Pos[0] + Math.random() * 0.2 * ctx.rect.width - 0.1 * ctx.rect.width, ctx.rect.x, ctx.rect.x2);
        //        gene.Pos[3] = Utils.Clamp(gene.Pos[1] + Math.random() * 0.2 * ctx.rect.height - 0.1 * ctx.rect.height, ctx.rect.y, ctx.rect.y2);
        //        gene.Pos[4] = Utils.Clamp(gene.Pos[0] + Math.random() * 0.2 * ctx.rect.width - 0.1 * ctx.rect.width, ctx.rect.x, ctx.rect.x2);
        //        gene.Pos[5] = Utils.Clamp(gene.Pos[1] + Math.random() * 0.2 * ctx.rect.height - 0.1 * ctx.rect.height, ctx.rect.y, ctx.rect.y2);
        //
        //        ctx.dna.Genes.push(gene);
        //        return { index: ctx.dna.Genes.length - 1, oldGene: <Gene>null, newGene: gene };
        //    },
        //    undo: (ctx, state) => ctx.dna.Genes.splice(state.index, 1)
        //},
        {
            name: 'Add Big Triangle',
            effectiveness: 1000,
            func: function (ctx: IDnaRenderContext): IMutatorState {
                if (ctx.geneStates.length > ctx.dna.Generation / 5000 + 20)
                    return null;

                var gene = {
                    Color: [Math.random(), Math.random(), Math.random(), 1 / (1 + ctx.dna.Generation * 0.0002)],
                    Pos: new Array(6)
                }

                for (var i = 0; i < gene.Pos.length; i += 2)
                    gene.Pos[i] = Math.random() * ctx.rect.width + ctx.rect.x;

                for (var i = 1; i < gene.Pos.length; i += 2)
                    gene.Pos[i] = Math.random() * ctx.rect.height + ctx.rect.y;


                ctx.dna.Genes.push(gene);
                return { index: ctx.dna.Genes.length - 1, oldGene: null, newGene: gene };
            },
            undo: (ctx, state) => ctx.dna.Genes.splice(state.index, 1)
        }
    ];

    public static GetMutator(): IGeneMutator {
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
    }

    public static UpdateEffectiveness(fitnessDiff: number, mutator: IGeneMutator) {
        if (isFinite(fitnessDiff)) {
            mutator.effectiveness = mutator.effectiveness * (1 - this.EffectivenessChangeRate) +
            fitnessDiff * this.EffectivenessChangeRate;
            mutator.effectiveness = Math.max(mutator.effectiveness, this.MinimumEffectiveness);
        }
    }
}