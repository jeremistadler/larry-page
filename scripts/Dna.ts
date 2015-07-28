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
    source: number[];
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
    func: (dna: Dna, rect: IRectangle) => IMutatorState;
    undo: (dna: Dna, state: IMutatorState) => void;
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
            IsIntersecting: isContained || (
                ((minX <= rect.x && maxX >= rect.x) || (minX <= rect.x2 && maxX >= rect.x2)) &&
                ((minY <= rect.y && maxY >= rect.y) || (minY <= rect.y2 && maxY >= rect.y2)) &&
                ((minX <= rect.x && maxX >= rect.x2) && (minY <= rect.y && maxY >= rect.y2)))
        }
    }
}

class GeneMutator {
    static StartingEffectiveness = 1000000;
    static EffectivenessChangeRate = 0.03;
    static MinimumEffectiveness = 0.00001;

    static Buffer: Uint8Array;
    static posBuffer: number[] = new Array(6);
    static colorBuffer: number[] = new Array(6);

    static MutateDna(ctx: IDnaRenderContext) {
        var mutatorState = ctx.mutator.func(ctx.dna, ctx.rect);
        if (mutatorState == null)
            return;

        for (var i = 0; i < mutatorState.newGene.Pos.length; i += 2)
            if (mutatorState.newGene.Pos[i] < ctx.rect.x || mutatorState.newGene.Pos[i] > ctx.rect.x2) {
                console.warn('Mutator ' + ctx.mutator.name + ' returned out of bounds x triangle');
                ctx.mutator.undo(ctx.dna, mutatorState); return null;
            }

        for (var i = 1; i < mutatorState.newGene.Pos.length; i += 2)
            if (mutatorState.newGene.Pos[i] < ctx.rect.y || mutatorState.newGene.Pos[i] > ctx.rect.y2) {
                console.warn('Mutator ' + ctx.mutator.name + ' returned out of bounds y triangle');
                ctx.mutator.undo(ctx.dna, mutatorState); return null;
            }

        var fitness = this.GetFitness(ctx.dna, ctx.source);

        if (fitness < ctx.dna.Fitness) {
            ctx.dna.Fitness = fitness;
            ctx.dna.Mutation++;
            ctx.mutations.push(mutatorState);
        }
        else {
            ctx.mutator.undo(ctx.dna, mutatorState);
        }

        dna.Generation++;
        return mutatorState;
    }


    static GetFitness(dna: Dna, source: number[]) {
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

    public static DefaultMutateGene(dna: Dna) {
        if (dna.Genes.length == 0)
            return null;

        var oldGene: Gene = null;

        for (var i = 0; i < 100; i++) {
            var index = Utils.randomIndex(dna.Genes);
            oldGene = dna.Genes[index];
            if (oldGene.Contained)
                break;
            else
                oldGene = null;
        }

        if (oldGene == null)
            return null;

        var gene = {
            Pos: null,
            Color: null
        };
        dna.Genes[index] = gene;
        return { index: index, oldGene: oldGene, newGene: gene };
    }

    public static GeneMutators: IGeneMutator[] = [
        {
            name: 'ColorOnly',
            effectiveness: 10000000,
            func: function (dna: Dna, rect: IRectangle) {
                var state = GeneMutator.DefaultMutateGene(dna);
                if (state == null) return null;

                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = state.oldGene.Pos.slice();

                var indexToChange = Utils.randomFromTo(0, 4);
                state.newGene.Color[indexToChange] = Utils.ClampFloat((Math.random() - 0.5) * 0.1 + state.newGene.Color[indexToChange]);
                return state;
            },
            undo: (dna, state) => dna.Genes[state.index] = state.oldGene
        },
        {
            name: 'MoveGene',
            effectiveness: 10000000,
            func: function (dna: Dna, rect: IRectangle) {
                var state = GeneMutator.DefaultMutateGene(dna);
                if (state == null) return null;

                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = new Array(6);
                for (var i = 0; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * rect.width + rect.x;
                for (var i = 1; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * rect.height + rect.y;
                return state;
            },
            undo: (dna, state) => dna.Genes[state.index] = state.oldGene
        },
        {
            name: 'MoveGenePoint',
            effectiveness: 10000000,
            func: function (dna: Dna, rect: IRectangle) {
                var state = GeneMutator.DefaultMutateGene(dna);
                if (state == null) return null;

                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = state.oldGene.Pos.slice();

                var indexToMove = Utils.randomIndex(state.newGene.Pos);
                if (indexToMove % 2 == 0)
                    state.newGene.Pos[indexToMove] = Utils.Clamp(state.newGene.Pos[indexToMove] + (Math.random() - 0.5) * 0.1 * rect.width, rect.x, rect.x2);
                else
                    state.newGene.Pos[indexToMove] = Utils.Clamp(state.newGene.Pos[indexToMove] + (Math.random() - 0.5) * 0.1 * rect.height, rect.y, rect.y2);
                return state;
            },
            undo: (dna, state) => dna.Genes[state.index] = state.oldGene
        },
        {
            name: 'All Random',
            effectiveness: 10000000,
            func: function (dna: Dna, rect: IRectangle) {
                var state = GeneMutator.DefaultMutateGene(dna);
                if (state == null) return null;

                state.newGene.Color = [Math.random(), Math.random(), Math.random(), 1 / (1 + dna.Generation * 0.0002)];
                state.newGene.Pos = new Array(6);

                for (var i = 0; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * rect.width + rect.x;

                for (var i = 1; i < state.newGene.Pos.length; i += 2)
                    state.newGene.Pos[i] = Math.random() * rect.height + rect.y;

                return state;
            },
            undo: (dna, state) => dna.Genes[state.index] = state.oldGene
        },
        {
            name: 'Add Small Triangle',
            effectiveness: 2000,
            func: function (dna: Dna, rect: IRectangle) {
                var gene = {
                    Color: [Math.random(), Math.random(), Math.random(), 1 / (1 + dna.Generation * 0.0002)],
                    Pos: [Math.random() * rect.width + rect.x, Math.random() * rect.height + rect.y, 0, 0, 0, 0]
                };
                gene.Pos[2] = Utils.Clamp(gene.Pos[0] + Math.random() * 0.2 * rect.width - 0.1 * rect.width, rect.x, rect.x2);
                gene.Pos[3] = Utils.Clamp(gene.Pos[1] + Math.random() * 0.2 * rect.height - 0.1 * rect.height, rect.y, rect.y2);
                gene.Pos[4] = Utils.Clamp(gene.Pos[0] + Math.random() * 0.2 * rect.width - 0.1 * rect.width, rect.x, rect.x2);
                gene.Pos[5] = Utils.Clamp(gene.Pos[1] + Math.random() * 0.2 * rect.height - 0.1 * rect.height, rect.y, rect.y2);

                dna.Genes.push(gene);
                return { index: dna.Genes.length - 1, oldGene: null, newGene: gene };
            },
            undo: (dna, state) => dna.Genes.splice(state.index, 1)
        },
        {
            name: 'Add Big Triangle',
            effectiveness: 1000000,
            func: function (dna: Dna, rect: IRectangle) {
                var gene = {
                    Color: [Math.random(), Math.random(), Math.random(), 1 / (1 + dna.Generation * 0.0002)],
                    Pos: new Array(6)
                }

                for (var i = 0; i < gene.Pos.length; i += 2)
                    gene.Pos[i] = Math.random() * rect.width + rect.x;

                for (var i = 1; i < gene.Pos.length; i += 2)
                    gene.Pos[i] = Math.random() * rect.height + rect.y;


                dna.Genes.push(gene);
                return { index: dna.Genes.length - 1, oldGene: null, newGene: gene };
            },
            undo: (dna, state) => dna.Genes.splice(state.index, 1)
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