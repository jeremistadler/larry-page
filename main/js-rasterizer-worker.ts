

class JsRasterizerWorker {
    tempBuffer: Uint8Array;

    constructor(public sourceImageData: number[]) {
        this.tempBuffer = new Uint8Array(globalWidth * globalHeight * 4);
    }
    
    go(dna: Dna, rect: Rectangle) {
        var startTime = new Date().getTime();

        var iterations = 100;
        var mutator = GeneMutator.GetMutator();
        var mutations: IMutatorState[] = [];

        var orginalGenes = dna.Genes;
        var allowedGenes = orginalGenes.filter((f, index) => {
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

        var sum = GeneMutator.GeneMutators.map(f => f.effectiveness).reduce((a, b) => a + b);
        console.log('Mutators: ', GeneMutator.GeneMutators.map(f => f.name + ': ' + Math.round(f.effectiveness / sum * 1000)).join('%, ') + '%');
        console.log('Generation time: ', (new Date().getTime() - startTime) / iterations, 'ms', 'fittness', dna.Fitness, 'Mutations: ', dna.Mutation, 'Generations: ', dna.Generation, 'Genes: ', dna.Genes.length);

        var mut = GeneMutator.GeneMutators.map(f => {
            return { effectiveness: f.effectiveness, name: f.name }
        });
        mut.sort((a, b) => a.name.localeCompare(b.name));

        for (var i = 0; i < mutations.length; i++)
            if (mutations[i].oldGene != null)
                mutations[i].index = mutations[i].oldGene.i;

        self.postMessage({ generations: 1, mutators: mut, mutations: mutations }, null);
    }
}

var childRasterizer = null;
self.onmessage = function (e) {
    if (childRasterizer == null)
        childRasterizer = new JsRasterizerWorker(e.data);
    else
        childRasterizer.go(e.data.dna, e.data.rect);
}



