///<reference path="../references.ts" />
"use strict";


class JsRasterizerWorker {
    constructor(public sourceImageData: ImageData) { }
    
    go(dna: Dna, rect: IRectangle, settings: ISettings) {
        var startTime = new Date().getTime();

        var mutator = GeneMutator.GetMutator();
        var geneStates = dna.Genes.map(f => GeneHelper.CalculateState(f, rect));
        var ctx: IDnaRenderContext = {
            dna: dna,
            rect: rect,
            mutations: [],
            geneStates: geneStates,
            mutator: mutator,
            source: this.sourceImageData,
            partialFitness: FitnessCalculator.GetConstrainedFitness(dna, this.sourceImageData, rect, geneStates),
            settings: settings
        };

        var originalFullFitness = dna.Fitness;
        var originalPartialFitness = ctx.partialFitness;

        for (var i = 0; i < settings.iterations; i++)
            GeneMutator.MutateDna(ctx);

        var fitnessDiff = (originalPartialFitness - ctx.partialFitness) / settings.iterations;
        GeneMutator.UpdateEffectiveness(fitnessDiff, mutator);

        dna.Fitness = FitnessCalculator.GetFitness(dna, this.sourceImageData);

        //if (originalPartialFitness < ctx.partialFitness)
        //    debugger;

        //if (originalFullFitness < dna.Fitness)
        //    debugger;

        //var sum = GeneMutator.GeneMutators.map(f => f.effectiveness).reduce((a, b) => a + b);
        //console.log('Mutators: ', GeneMutator.GeneMutators.map(f => f.name + ': ' + Math.round(f.effectiveness / sum * 1000)).join('%, ') + '%');
        //console.log('Generation time: ', (new Date().getTime() - startTime) / iterations, 'ms', 'fittness', dna.Fitness, 'Mutations: ', dna.Mutation, 'Generations: ', dna.Generation, 'Genes: ', dna.Genes.length);

        var mut = GeneMutator.GeneMutators.map(f => {
            return { effectiveness: f.effectiveness, name: f.name }
        });
        mut.sort((a, b) => a.name.localeCompare(b.name));
        self.postMessage({ generations: settings.iterations, mutators: mut, mutations: ctx.mutations }, null);
    }
}

var childRasterizer = null;
self.onmessage = function (e) {
    if (childRasterizer == null)
        childRasterizer = new JsRasterizerWorker(e.data);
    else
        childRasterizer.go(e.data.dna, e.data.rect, e.data.settings);
}



