

class JsRasterizerWorker {
    tempBuffer: Uint8Array;

    constructor(public sourceImageData: number[]) {
        this.tempBuffer = new Uint8Array(globalWidth * globalHeight * 4);
    }
    
    draw(dna: Dna) {
        var startTime = new Date().getTime();

        var iterations = 40;
        var fitness = dna.Fitness;
        var mutator = GeneMutator.GetMutator();

        for (var i = 0; i < iterations; i++)
            GeneMutator.MutateDna(mutator, dna, this.sourceImageData);

        var fitnessDiff = (fitness - dna.Fitness) / iterations;
        GeneMutator.UpdateEffectiveness(fitnessDiff, mutator);

        var sum = GeneMutator.GeneMutators.map(f => f.effectiveness).reduce((a, b) => a + b);
        console.log('Mutators: ', GeneMutator.GeneMutators.map(f => f.name + ': ' + Math.round(f.effectiveness / sum * 1000)).join('%, ') + '%');
        console.log('Generation time: ', (new Date().getTime() - startTime) / iterations, 'ms', 'fittness', dna.Fitness, 'Mutations: ', dna.Mutation, 'Generations: ', dna.Generation, 'Genes: ', dna.Genes.length);

        var mut = GeneMutator.GeneMutators.map(f => {
            return { eff: f.effectiveness, name: f.name }
        });
        mut.sort((a, b) => a.name.localeCompare(b.name));

        self.postMessage({ dna: dna, mutations: mut }, null);
    }
}

var childRasterizer = null;
self.onmessage = function (e) {
    var d = e.data;

    if (childRasterizer == null)
        childRasterizer = new JsRasterizerWorker(d);
    else
        childRasterizer.draw(d);
}



