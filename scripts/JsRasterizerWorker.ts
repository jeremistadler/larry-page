var globalWidth = 256;
var globalHeight = 256;

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

            Raster.drawPolygon(this.tempBuffer, globalWidth, posBuffer, colorBuffer);
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


interface IGeneMutator {
    name: string;
    effectiveness: number;
    func: (dna: Dna) => any;
}

class GeneMutator {
    static StartingEffectiveness = 1000000;
    static EffectivenessChangeRate = 0.005;
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

                var indexToChange = Utils.randomFromTo(0, 3);
                state.newGene.Color[indexToChange] = Utils.ClampFloat((Math.random() - 0.5) * 0.1 + state.newGene.Color[indexToChange]);
                return state;
            },
            undo: (dna, state) => dna.Genes[state.index] = state.oldGene
        },
        {
            name: 'MoveGene',
            effectiveness: 100000,
            func: function (dna: Dna) {
                var state = GeneMutator.DefaultMutateGene(dna);
           
                state.newGene.Color = state.oldGene.Color.slice();
                state.newGene.Pos = new Array(DnaEvolver.PositionsPerGene * 2);
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
            effectiveness: 100000,
            func: function (dna: Dna) {
                var state = GeneMutator.DefaultMutateGene(dna);

                state.newGene.Color = [Math.random(), Math.random(), Math.random(), 0.2];
                state.newGene.Pos = new Array(DnaEvolver.PositionsPerGene * 2);
                for (var i = 0; i < state.newGene.Pos.length; i++)
                    state.newGene.Pos[i] = Math.random() * 1.2 - 0.1;
                return state;
            },
            undo: (dna, state) => dna.Genes[state.index] = state.oldGene
        },
        {
            name: 'Add Triangle',
            effectiveness: 200000,
            func: function (dna: Dna) {
                var gene = new Gene();
                gene.Color = [Math.random(), Math.random(), Math.random(), 0.2];
                gene.Pos = new Array(DnaEvolver.PositionsPerGene * 2);
                for (var i = 0; i < gene.Pos.length; i++)
                    gene.Pos[i] = Math.random() * 1.2 - 0.1;

                dna.Genes.push(gene);
                return { index: dna.Genes.length - 1, oldGene: null, newGene: gene };
            },
            undo: (dna, state) => dna.Genes.splice(state.index, 1)
        },
        {
            name: 'Remove Triangle',
            effectiveness: 100000,
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


class Utils {
    static StartTick(tickMethod: (dt: number) => void) {
        var oldTime = 0;
        var tickLoop = (time) => {
            var deltaTime = time - oldTime;
            oldTime = time;

            tickMethod(deltaTime / 1000);
            window.requestAnimationFrame(tickLoop);
        };
        tickLoop(0);
    }

    static randomIndex(arr: any[]) {
        return Math.floor(Math.random() * arr.length);
    }

    static randomFromTo(from, to) {
        return Math.floor(Math.random() * (to - from + 1) + from);
    }

    static CreateNumberArray(length: number) {
        var arr = new Array(length);
        for (var i = 0; i < length; i++)
            arr[i] = 0;
        return arr;
    }

    static ClampFloat(num: number) {
        return Math.min(1, Math.max(num, 0));
    }

    static ClampByte(num: number) {
        return Math.min(255, Math.max(num, 0));
    }
}

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


class Raster {
    private static drawHLine(buffer: Uint8Array, width: number, x1: number, x2: number, y: number, color: number[]) {
        if (x1 < 0) x1 = 0;
        if (x2 > width) x2 = width;
        if (y < 0 || y > globalHeight - 1) return;

        var index = x1 + y * width; 			// calculate the offset into the buffer
        var x;

        for (x = x1; x < x2; x++) {
            buffer[index * 4 + 0] = Utils.ClampByte(color[3] * color[0] + buffer[index * 4 + 0] * (1 - color[3]));
            buffer[index * 4 + 1] = Utils.ClampByte(color[3] * color[1] + buffer[index * 4 + 1] * (1 - color[3]));
            buffer[index * 4 + 2] = Utils.ClampByte(color[3] * color[2] + buffer[index * 4 + 2] * (1 - color[3]));
            buffer[index * 4 + 3] = 255;
            index++;
        };
    }

    private static scanline(x1: number, y1: number, x2: number, y2: number, startY: number, rows: any[]) {
        var x, y;

        if (y1 > y2) {
            var tempY = y1;
            var tempX = x1;
            y1 = y2;
            y2 = tempY;
            x1 = x2;
            x2 = tempX;
        }

        y1 = Math.floor(y1);
        y2 = Math.floor(y2);

        //if ( y2 < y1 ) { y2++ }

        x = x1; 					// start at the start
        var dx = (x2 - x1) / (y2 - y1); 		// change in x over change in y will give us the gradient
        var row = Math.round(y1 - startY); 		// the offset the start writing at (into the array)

        for (y = y1; y <= y2; y++) { 		// cover all y co-ordinates in the line
            var xi = Math.floor(x);

            if (row >= 0 && row < rows.length - 1 && rows[row].minx > xi)
                rows[row].minx = xi;

            if (row >= 0 && row < rows.length - 1 && rows[row].maxx < xi)
                rows[row].maxx = xi;

            x += dx; 					// move along the gradient
            row++; 					// move along the buffer
        }
    }

    private static _drawPolygon(buffer: Uint8Array, width: number, points: number[], color: number[]) {
        var miny = points[1]; 			// work out the minimum and maximum y values
        var maxy = points[1];

        for (var i = 1; i < points.length; i += 2) {
            if (points[i] < miny) { miny = points[i]; }
            if (points[i] > maxy) { maxy = points[i]; }
        }

        var h = maxy - miny; 				// the height is the size of our edges array
        var rows = [];

        for (var i = 0; i <= h - 1; i++) { 			// build the array with unreasonable limits
            rows.push({ minx: 1000000, maxx: -1000000 });
        }

        this.scanline(points[0], points[1], points[2], points[3], miny, rows);
        this.scanline(points[4], points[5], points[0], points[1], miny, rows);
        this.scanline(points[2], points[3], points[4], points[5], miny, rows);

        // draw each horizontal line
        for (i = 0; i < rows.length; i++) {
            this.drawHLine(buffer, width
                , Math.floor(rows[i].minx)
                , Math.floor(rows[i].maxx)
                , Math.floor(i + miny), color);
        }
    }

    private static rotPoints(points, angle: number, about) {
        var x, y, i;
        var reply = [];

        angle = angle * (Math.PI / 180);

        var sin = Math.sin(angle);
        var cos = Math.cos(angle);

        for (i = 0; i < points.length; i++) {
            x = about.x + (((points[i].x - about.x) * cos) - ((points[i].y - about.y) * sin));
            y = about.y + (((points[i].x - about.x) * sin) + ((points[i].y - about.y) * cos));

            reply.push({ x: x, y: y });
        }

        return reply;
    }

    private static polyEllipse(x, y, w, h) {
        var ex, ey, i;
        var reply = [];

        for (i = 0; i < 2 * Math.PI; i += 0.01) {
            ex = x + w * Math.cos(i);
            ey = y + h * Math.sin(i);

            reply.push({ x: ex, y: ey });
        }

        return reply;
    }

    private static polyBox(x, y, w, h) {
        return [{ x: x - w / 2, y: y - h / 2 }
            , { x: x - w / 2, y: y + h / 2 }
            , { x: x + w / 2, y: y + h / 2 }
            , { x: x + w / 2, y: y - h / 2 }];
    }

    static drawPolygon(buffer: Uint8Array, width: number, points: number[], color: number[]) {
        this._drawPolygon(buffer, width, points, color);
    }

    static drawCircle(buffer, width, x, y, rad, color) {
        this._drawPolygon(buffer, width, this.polyEllipse(x, y, rad, rad), color);
    }

    static drawEllipse(buffer, width, x, y, h, w, rot: number, color) {
        this._drawPolygon(buffer, width, this.rotPoints(this.polyEllipse(x, y, h, w), rot, { x: x, y: y }), color);
    }

    static drawBox(buffer: Uint8Array, width: number, x, y, h, w, rot: number, color) {
        this._drawPolygon(buffer, width, this.rotPoints(this.polyBox(x, y, h, w), rot, { x: x, y: y }), color);
    }
}

