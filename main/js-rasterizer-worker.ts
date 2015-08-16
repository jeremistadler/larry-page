///<reference path="../references.ts" />
"use strict";


class JsRasterizerWorker {
    constructor(public sourceImageData: ImageData) { }
    
    go(dna: Dna, rect: IRectangle, settings: ISettings) {
        var startTime = new Date().getTime();
        GeneMutator.setFromSettings(settings);

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

        var fitnessImprovement = (originalPartialFitness - ctx.partialFitness) / settings.iterations;

        if (originalPartialFitness < ctx.partialFitness)
            debugger;

        var newFitness = FitnessCalculator.GetFitness(dna, this.sourceImageData);
        if (originalFullFitness < newFitness)
            debugger;
        
        var workerResult: IWorkerResult = {
            generations: settings.iterations,
            mutations: ctx.mutations,
            mutatorName: mutator.name,
            fitnessImprovement: fitnessImprovement
        };

        self.postMessage(workerResult, null)
    }
}

var childRasterizer = null;
self.onmessage = function (e) {
    if (childRasterizer == null)
        childRasterizer = new JsRasterizerWorker(e.data);
    else
        childRasterizer.go(e.data.dna, e.data.rect, e.data.settings);
}



