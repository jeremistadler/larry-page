

class JsRasterizerWorker {
    tempBuffer: Uint8Array;

    constructor(public sourceImageData: number[]) {
        this.tempBuffer = new Uint8Array(globalWidth * globalHeight * 4);
    }
    
    draw(dna: Dna) {
        var startTime = new Date().getTime();

        var iterations = 10;
        var fitness = dna.Fitness;
        var mutator = GeneMutator.GetMutator();
        for (var i = 0; i < iterations; i++) {
            this.doIteration(mutator, dna);
        }

        var fitnessDiff = (fitness - dna.Fitness) / iterations;
        GeneMutator.UpdateEffectiveness(fitnessDiff, mutator);

        console.log('Generation time: ', (new Date().getTime() - startTime) / iterations, 'ms', 'fittness', dna.Fitness, 'Mutations: ', dna.Mutation, 'Generations: ', dna.Generation, 'Genes: ', dna.Genes.length);

        var sum = GeneMutator.GeneMutators.map(f => f.effectiveness).reduce((a, b) => a + b);
        console.log('Mutators: ', GeneMutator.GeneMutators.map(f => f.name + ': ' + Math.round(f.effectiveness / sum * 1000)).join('%, ') + '%');

        var mut = GeneMutator.GeneMutators.map(f => {
            return { eff: f.effectiveness, name: f.name }
        });
        mut.sort((a, b) => a.name.localeCompare(b.name));

        self.postMessage({ dna: dna, mutations: mut }, null);

    }

    doIteration(mutator, dna: Dna) {
        var mutatorState = mutator.func(dna);

        for (var i = 0; i < this.tempBuffer.length; i++)
            this.tempBuffer[i] = 255;

        var posBuffer = new Array(6);
        var colorBuffer = new Array(6);

        for (var i = 0; i < dna.Genes.length; i++) {
            var gene = dna.Genes[i];

            for (var c = 0; c < 3; c++)
                colorBuffer[c] = Math.floor(gene.Color[c] * 255);
            colorBuffer[3] = gene.Color[3];

            for (var c = 0; c < gene.Pos.length; c++)
                posBuffer[c] = Math.floor(gene.Pos[c] * globalHeight);

            Raster.drawPolygon(this.tempBuffer, globalWidth, globalHeight, posBuffer, colorBuffer);
        }

        var fitness = this.calculateFitness(this.sourceImageData, this.tempBuffer);

        if (fitness < dna.Fitness) {
            dna.Fitness = fitness;
            dna.Mutation++;
        }
        else {
            mutator.undo(dna, mutatorState);
        }

        dna.Generation++;
    }

    calculateFitness(buff1: number[], buff2: Int8Array) {
        var diff = 0.0;
        for (var i = 0; i < buff1.length; i++) {
            var q = Math.abs(buff1[i] - buff2[i]);
            diff += q * q;
        }
        return diff;
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



