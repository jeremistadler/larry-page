﻿"use strict";

class Organism {
    Id: number;
    ImagePath: string;
    GeneCount: number;
}

class Gene {
    Pos: number[];
    Color: number[];
}

class Dna {
    Genes: Gene[];
    Generation: number;
    Mutation: number;
    Fitness: number;
    Organism: Organism;
}


interface IGeneMutator {
    name: string;
    effectiveness: number;
    func: (dna: Dna) => any;
}

class GeneMutator {
    static StartingEffectiveness = 1000000;
    static EffectivenessChangeRate = 0.03;
    static MinimumEffectiveness = 0.00001;

    public static DefaultMutateGene(dna: Dna) {
        var gene = new Gene();
        var index = Utils.randomIndex(dna.Genes);
        var oldGene = dna.Genes[index];
        dna.Genes[index] = gene;
        return { index: index, oldGene: oldGene, newGene: gene };
    }

    public static GeneMutators: IGeneMutator[] = [
        {
            name: 'ColorOnly',
            effectiveness: 100000,
            func: function (dna: Dna) {
                var state = GeneMutator.DefaultMutateGene(dna);
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
            effectiveness: 1000000,
            func: function (dna: Dna) {
                var state = GeneMutator.DefaultMutateGene(dna);

                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = new Array(6);
                for (var i = 0; i < state.newGene.Pos.length; i++)
                    state.newGene.Pos[i] = Math.random() * 1.2 - 0.1;
                return state;
            },
            undo: (dna, state) => dna.Genes[state.index] = state.oldGene
        },
        {
            name: 'MoveGenePart',
            effectiveness: 100000,
            func: function (dna: Dna) {
                var state = GeneMutator.DefaultMutateGene(dna);
                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = state.oldGene.Pos.slice();

                var indexToMove = Utils.randomIndex(state.newGene.Pos);
                state.newGene.Pos[indexToMove] += (Math.random() - 0.5) * 0.1;
                return state;
            },
            undo: (dna, state) => dna.Genes[state.index] = state.oldGene
        },
        {
            name: 'All Random',
            effectiveness: 1000000,
            func: function (dna: Dna) {
                var state = GeneMutator.DefaultMutateGene(dna);

                state.newGene.Color = [Math.random(), Math.random(), Math.random(), 1 / (1 + dna.Generation * 0.0002)];
                state.newGene.Pos = new Array(6);
                for (var i = 0; i < state.newGene.Pos.length; i++)
                    state.newGene.Pos[i] = Math.random() * 1.2 - 0.1;
                return state;
            },
            undo: (dna, state) => dna.Genes[state.index] = state.oldGene
        },
        {
            name: 'Add Small Triangle',
            effectiveness: 2000,
            func: function (dna: Dna) {
                var gene = new Gene();
                gene.Color = [Math.random(), Math.random(), Math.random(), 1 / (1 + dna.Generation * 0.0002)];
                gene.Pos = [Math.random(), Math.random(), 0, 0, 0, 0];
                gene.Pos[2] = gene.Pos[0] + Math.random() * 0.1 - 0.05;
                gene.Pos[3] = gene.Pos[1] + Math.random() * 0.1 - 0.05;
                gene.Pos[4] = gene.Pos[0] + Math.random() * 0.1 - 0.05;
                gene.Pos[5] = gene.Pos[1] + Math.random() * 0.1 - 0.05;

                dna.Genes.push(gene);
                return { index: dna.Genes.length - 1, oldGene: null, newGene: gene };
            },
            undo: (dna, state) => dna.Genes.splice(state.index, 1)
        },
        {
            name: 'Add Triangle',
            effectiveness: 2000000,
            func: function (dna: Dna) {
                var gene = new Gene();
                gene.Color = [Math.random(), Math.random(), Math.random(), 1 / (1 + dna.Generation * 0.0002)];
                gene.Pos = new Array(6);
                for (var i = 0; i < gene.Pos.length; i++)
                    gene.Pos[i] = Math.random() * 1.2 - 0.1;

                dna.Genes.push(gene);
                return { index: dna.Genes.length - 1, oldGene: null, newGene: gene };
            },
            undo: (dna, state) => dna.Genes.splice(state.index, 1)
        },
        {
            name: 'Remove Triangle',
            effectiveness: 10000,
            func: function (dna: Dna) {
                var index = Utils.randomIndex(dna.Genes);
                var oldGene = dna.Genes[index];
                dna.Genes.splice(index, 1);
                return { index: index, oldGene: oldGene, newGene: null };
            },
            undo: (dna, state) => dna.Genes.splice(state.index, 0, state.oldGene)
        }];

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