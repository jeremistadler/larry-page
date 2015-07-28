

class JsRasterizerWorker {
    tempBuffer: Uint8Array;

    constructor(public sourceImageData: number[]) {
        this.tempBuffer = new Uint8Array(globalWidth * globalHeight * 4);
    }
    
    go(dna: Dna, rect: IRectangle) {
        var startTime = new Date().getTime();

        var iterations = 100;
        var mutator = GeneMutator.GetMutator();
        var mutations: IMutatorState[] = [];

        // TODO Create FitnessCalculator with rectangle and only draw intersecting triangles,
        // Test triangle instersection and refactor so the genes gets clean of rectange state

        dna.Genes.forEach(f => GeneHelper.CalculateIntersections(f, rect));

        dna.Fitness = GeneMutator.GetFitness(dna, this.sourceImageData);
        var fitness = dna.Fitness;

        for (var i = 0; i < iterations; i++)
            GeneMutator.MutateDna(mutator, dna, this.sourceImageData, rect, mutations);

        var fitnessDiff = (fitness - dna.Fitness) / iterations;
        if (dna.Genes.length > 0)
            GeneMutator.UpdateEffectiveness(fitnessDiff, mutator);

        //var sum = GeneMutator.GeneMutators.map(f => f.effectiveness).reduce((a, b) => a + b);
        //console.log('Mutators: ', GeneMutator.GeneMutators.map(f => f.name + ': ' + Math.round(f.effectiveness / sum * 1000)).join('%, ') + '%');
        //console.log('Generation time: ', (new Date().getTime() - startTime) / iterations, 'ms', 'fittness', dna.Fitness, 'Mutations: ', dna.Mutation, 'Generations: ', dna.Generation, 'Genes: ', dna.Genes.length);

        var mut = GeneMutator.GeneMutators.map(f => {
            return { effectiveness: f.effectiveness, name: f.name }
        });
        mut.sort((a, b) => a.name.localeCompare(b.name));
        self.postMessage({ generations: iterations, mutators: mut, mutations: mutations }, null);
    }
}

var childRasterizer = null;
self.onmessage = function (e) {
    if (childRasterizer == null)
        childRasterizer = new JsRasterizerWorker(e.data);
    else
        childRasterizer.go(e.data.dna, e.data.rect);
}



