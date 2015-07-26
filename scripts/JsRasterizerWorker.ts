var globalWidth = 64;
var globalHeight = 64;

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
        console.log('Mutators: ', GeneMutator.GeneMutators.map(f => f.name + ': ' + Math.round(f.effectiveness / sum * 100)).join('%, ') + '%');

        self.postMessage(dna);
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
            diff += q;
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
    static EffectivenessChangeRate = 0.2;
    static MinimumEffectiveness = 0.001;

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

    static createProgram(gl: WebGLRenderingContext, name: string): WebGLProgram {
        var p = gl.createProgram();
        gl.attachShader(p, Utils.getShader(gl, name + '-vs'));
        gl.attachShader(p, Utils.getShader(gl, name + '-fs'));
        gl.linkProgram(p);

        if (!gl.getProgramParameter(p, gl.LINK_STATUS))
            console.error("Unable to initialize the shader program.");

        return p;
    }


    static getShader(gl: WebGLRenderingContext, id: string) {
        var shaderScript = <HTMLScriptElement>document.getElementById(id);

        if (!shaderScript)
            console.error('Shader not found', id);

        var shader = null;

        if (shaderScript.type == "x-shader/x-fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            console.error('Bad shader type', id, shaderScript.type);
        }

        gl.shaderSource(shader, shaderScript.innerHTML);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            console.error("Shader compile failed", gl.getShaderInfoLog(shader));

        return shader;
    }

    static createFramebuffer(gl: WebGLRenderingContext) {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, globalWidth, globalHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        var buf = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, buf);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

        return new FramebufferWrapper(tex, buf);
    }

    static setRectangle(gl: WebGLRenderingContext, x: number, y: number, width: number, height: number) {
        var x2 = x + width;
        var y1 = y + height;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            x, y1, x2, y1, x, y, x, y, x2, y1, x2, y]), gl.STATIC_DRAW);
    }

    static setRectangleTex(gl: WebGLRenderingContext) {
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0]), gl.STATIC_DRAW);
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


class DnaEvolver {
    static PositionsPerGene: number = 3;

    EvolvingGene: Gene;
    EvolvingGeneIndex: number;

    ColorBuffer: WebGLBuffer;
    PosBuffer: WebGLBuffer;

    Risk: number;
    LastSaved: number;

    constructor(public webgl: WebGLRenderingContext, public Dna: Dna, public program: WebGLProgram) {
        this.PosBuffer = webgl.createBuffer();
        this.ColorBuffer = webgl.createBuffer();
        this.Risk = 0;


        var posArr = new Float32Array(this.Dna.Genes.length * DnaEvolver.PositionsPerGene * 2);
        var colorArr = new Float32Array(this.Dna.Genes.length * DnaEvolver.PositionsPerGene * 4);

        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.PosBuffer);
        webgl.bufferData(webgl.ARRAY_BUFFER, posArr, webgl.DYNAMIC_DRAW);

        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.ColorBuffer);
        webgl.bufferData(webgl.ARRAY_BUFFER, colorArr, webgl.DYNAMIC_DRAW);

        for (var i = 0; i < this.Dna.Genes.length; i++) {
            this.Dna.Genes[i].Color.length = 4;
            this.SetTriangleToBuffers(this.Dna.Genes[i], i);
        }

        this.LastSaved = new Date().getTime();
    }

    static CreateDna(numberOfGenes: number, image: string) {
        var dna = new Dna();
        dna.Fitness = Infinity;
        dna.Genes = new Array(numberOfGenes);
        dna.Generation = 0;
        dna.Mutation = 0;
        dna.Organism = new Organism();
        dna.Organism.ImagePath = image;
        dna.Organism.GeneCount = numberOfGenes;

        for (var i = 0; i < numberOfGenes; i++) {
            var gene = dna.Genes[i] = new Gene();
            gene.Color = [Math.random(), Math.random(), Math.random(), Math.random() * 0.8 + 0.2];
            gene.Pos = new Array(DnaEvolver.PositionsPerGene * 2);
            for (var q = 0; q < gene.Pos.length; q++)
                gene.Pos[q] = 0;
        }

        return dna;
    }

    findBestGenePos(geneIndex: number, orginalImage: Int8Array) {
        var bestMatch = null;
        var fitness = Infinity;

        var triPixels = new Uint8Array(globalWidth * globalHeight * 4);
        for (var iteration = 0; iteration < 100; iteration++) {
            var tri = new Gene();

            tri.Color = [Math.random(), Math.random(), Math.random(), Math.random() * 0.4 + 0.2];
            tri.Pos = new Array(DnaEvolver.PositionsPerGene * 2);
            for (var i = 0; i < tri.Pos.length; i++)
                tri.Pos[i] = Math.random() * 1.2 - 0.1;

            this.SetTriangleToBuffers(tri, geneIndex);

            this.Draw();

            this.webgl.readPixels(0, 0, globalWidth, globalHeight, this.webgl.RGBA, this.webgl.UNSIGNED_BYTE, triPixels);
            var newFitness = this.calculateFitness(orginalImage, triPixels);

            if (newFitness < fitness) {
                bestMatch = tri;
                fitness = newFitness;
            }
        }

        this.Dna.Fitness = fitness;
        this.Dna.Mutation++;
        this.Dna.Generation++;
        this.Dna.Genes[geneIndex] = bestMatch;
        this.SetTriangleToBuffers(bestMatch, geneIndex);
    }

    calculateFitness(buff1: Int8Array, buff2: Int8Array) {
        var diff = 0.0;

        for (var i = 0; i < buff1.byteLength; i++) {
            var q = Math.abs(buff1[i] - buff2[i]);
            diff += q * q;
        }

        return diff;
    }

    StartEvolving(): void {
        var index = Utils.randomIndex(this.Dna.Genes);

        this.EvolvingGene = this.Dna.Genes[index];
        this.EvolvingGeneIndex = index;

        var gene = new Gene();
        this.Dna.Genes[index] = gene;

        if (Math.random() > 0.5) {
            gene.Color = [Math.random(), Math.random(), Math.random(), 0.2];
            gene.Pos = new Array(DnaEvolver.PositionsPerGene * 2);
            for (var i = 0; i < gene.Pos.length; i++)
                gene.Pos[i] = Math.random() * 1.2 - 0.1;
        }
        else if (Math.random() > 0.3) {
            var oldGene = this.EvolvingGene;
            gene.Color = oldGene.Color.slice();
            gene.Pos = oldGene.Pos.slice();

            var indexToMove = Utils.randomIndex(gene.Pos);
            gene.Pos[indexToMove] += (Math.random() - 0.5) * 0.1;
        }
        else {
            var oldGene = this.EvolvingGene;
            gene.Color = oldGene.Color.slice();
            gene.Pos = oldGene.Pos.slice();

            var indexToChange = Utils.randomFromTo(0, 3);
            gene.Color[indexToChange] = Utils.ClampFloat((Math.random() - 0.5) * 0.1 + gene.Color[indexToChange]);
        }

        this.SetTriangleToBuffers(gene, index);
    }

    EndEvolving(fitness: number): void {
        if (fitness < this.Dna.Fitness + this.Risk * 100) {
            this.Dna.Fitness = fitness;
            this.Dna.Mutation++;
            //console.log('fitness', fitness, 'generation: ' + this.Dna.Generation, 'Risk', this.Risk, 'index', this.EvolvingGeneIndex);

            this.Risk = 0;

            var dateNow = new Date().getTime();
            var saveTime = this.Dna.Mutation > 1000 ? 5 : 20
            if (dateNow > this.LastSaved + 1000 * saveTime) {
                this.Save();
                this.LastSaved = dateNow;
            }
        }
        else {
            this.Dna.Genes[this.EvolvingGeneIndex] = this.EvolvingGene;
            this.SetTriangleToBuffers(this.EvolvingGene, this.EvolvingGeneIndex);
            this.Risk++;
        }

        this.Dna.Generation++;
    }

    Save() {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', baseUrl + '/api/dna/save', true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.send(JSON.stringify(this.Dna));
    }

    SetTriangleToBuffers(tri: Gene, index: number) {
        var posBuff = new Float32Array(tri.Pos);
        var colorBuff = new Float32Array(4 * DnaEvolver.PositionsPerGene);

        for (var p = 0; p < DnaEvolver.PositionsPerGene; p++)
            for (var i = 0; i < 4; i++)
                colorBuff[p * 4 + i] = tri.Color[i];

        this.webgl.bindBuffer(this.webgl.ARRAY_BUFFER, this.PosBuffer);
        this.webgl.bufferSubData(this.webgl.ARRAY_BUFFER, index * posBuff.byteLength, posBuff);

        this.webgl.bindBuffer(this.webgl.ARRAY_BUFFER, this.ColorBuffer);
        this.webgl.bufferSubData(this.webgl.ARRAY_BUFFER, index * colorBuff.byteLength, colorBuff);
    }

    Draw() {
        var gl = this.webgl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.ColorBuffer);
        var colorLocation = gl.getAttribLocation(this.program, "a_color");
        gl.enableVertexAttribArray(colorLocation);
        gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);


        gl.bindBuffer(gl.ARRAY_BUFFER, this.PosBuffer);
        var positionLocation = gl.getAttribLocation(this.program, "a_position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this.Dna.Genes.length * 3);
    }
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

    private static scanline(x1: number, y1: number, x2: number, y2: number, startY: number, edges: any[]) {
        var x, y;

        if (y1 > y2) {
            var tempY = y1;
            var tempX = x1;
            y1 = y2;
            y2 = tempY;
            x1 = x2;
            x2 = tempX;
        }

        y1 = Math.floor(y1) + 1;
        y2 = Math.floor(y2);

        //if ( y2 < y1 ) { y2++ }

        x = x1; 					// start at the start
        var dx = (x2 - x1) / (y2 - y1); 		// change in x over change in y will give us the gradient
        var index = Math.min(Math.round(y1 - startY), 0); 		// the offset the start writing at (into the array)

        for (y = y1; y <= y2; y++) { 		// cover all y co-ordinates in the line
            var xi = Math.floor(x) + 1;

            // check if we've gone over/under the max/min
            //
            if (edges[index].minx > xi) { edges[index].minx = xi; }
            if (edges[index].maxx < xi) { edges[index].maxx = xi; }

            x += dx; 					// move along the gradient
            index++; 					// move along the buffer
        }
    }

    private static _drawPolygon(buffer: Uint8Array, width: number, points: number[], color: number[]) {
        var i;
        var miny = points[1]; 			// work out the minimum and maximum y values
        var maxy = points[1];

        for (i = 1; i < points.length; i += 2) {
            if (points[i] < miny) { miny = points[i]; }
            if (points[i] > maxy) { maxy = points[i]; }
        }

        var h = maxy - miny; 				// the height is the size of our edges array
        var edges = [];

        for (i = 0; i <= h + 1; i++) { 			// build the array with unreasonable limits
            edges.push({ minx: 1000000, maxx: -1000000 });
        }

        for (i = 0; i < points.length - 3; i += 2) { 	// process each line in the polygon
            this.scanline(points[i], points[i + 1],
                points[i + 2], points[i + 3], miny, edges);
        }

        this.scanline(points[points.length - 2] - 1, points[points.length - 1] - 1, points[0] - 1, points[1] - 1, miny, edges);

        // draw each horizontal line
        for (i = 0; i < edges.length; i++) {
            this.drawHLine(buffer, width
                , Math.floor(edges[i].minx)
                , Math.floor(edges[i].maxx)
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
