var JsRasterizerWorker = (function () {
    function JsRasterizerWorker(sourceImageData) {
        this.sourceImageData = sourceImageData;
    }
    JsRasterizerWorker.prototype.go = function (dna, rect, settings) {
        var startTime = new Date().getTime();
        GeneMutator.setFromSettings(settings);
        var mutator = GeneMutator.GetMutator();
        var geneStates = dna.Genes.map(function (f) { return GeneHelper.CalculateState(f, rect); });
        var ctx = {
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
        var workerResult = {
            generations: settings.iterations,
            mutations: ctx.mutations,
            mutatorName: mutator.name,
            fitnessImprovement: fitnessImprovement
        };
        self.postMessage(workerResult, null);
    };
    return JsRasterizerWorker;
}());
var childRasterizer = null;
self.onmessage = function (e) {
    if (childRasterizer == null)
        childRasterizer = new JsRasterizerWorker(e.data);
    else
        childRasterizer.go(e.data.dna, e.data.rect, e.data.settings);
};
//# sourceMappingURL=js-rasterizer-worker.js.map