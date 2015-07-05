///<reference path="../references.ts" />


class DnaEvolver {
    static PositionsPerGene: number = 3;

    EvolvingGene: Gene;
    EvolvingGeneIndex: number;

    ColorBuffer: WebGLBuffer;
    PosBuffer: WebGLBuffer;

    constructor(public webgl: WebGLRenderingContext, public Dna: Dna) {
        this.PosBuffer = webgl.createBuffer();
        this.ColorBuffer = webgl.createBuffer();

        var posArr = new Float32Array(this.Dna.Triangles.length * DnaEvolver.PositionsPerGene * 2);
        var colorArr = new Float32Array(this.Dna.Triangles.length * DnaEvolver.PositionsPerGene * 4);

        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.PosBuffer);
        webgl.bufferData(webgl.ARRAY_BUFFER, posArr, webgl.DYNAMIC_DRAW);

        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.ColorBuffer);
        webgl.bufferData(webgl.ARRAY_BUFFER, colorArr, webgl.DYNAMIC_DRAW);

        for (var i = 0; i < this.Dna.Triangles.length; i++)
            this.SetTriangleToBuffers(this.Dna.Triangles[i], i);
    }

    static CreateDna(numberOfGenes: number) {
        var dna = new Dna();
        dna.Fitness = 1e9;
        dna.Triangles = new Array(numberOfGenes);
        dna.Seed = Math.random();
        dna.Generations = 0;
        dna.Mutations = 0;

        for (var i = 0; i < numberOfGenes; i++) {
            dna.Triangles[i] = new Gene();
            dna.Triangles[i].Pos = Utils.CreateNumberArray(DnaEvolver.PositionsPerGene * 2);
            dna.Triangles[i].Color = Utils.CreateNumberArray(4);
        }

        return dna;
    }

    StartEvolving(): void {
        var index = Utils.randomFromTo(0, this.Dna.Triangles.length - 1);

        this.EvolvingGene = this.Dna.Triangles[index];
        this.EvolvingGeneIndex = index;

        var tri = this.Dna.Triangles[index] = new Gene();
        tri.Color = [Math.random(), Math.random(), Math.random(), Math.random() * 0.4 + 0.2];
        tri.Pos = new Array(DnaEvolver.PositionsPerGene * 2);
        for (var i = 0; i < tri.Pos.length; i++)
            tri.Pos[i] = Math.random() * 1.2 - 0.1;

        this.SetTriangleToBuffers(tri, index);

    }

    EndEvolving(fitness: number): void {
        if (fitness < this.Dna.Fitness) {
            this.Dna.Fitness = fitness;
            this.Dna.Mutations++;
            console.log('fitness', fitness, 'generation: ' + this.Dna.Generations);
        }
        else {
            this.Dna.Triangles[this.EvolvingGeneIndex] = this.EvolvingGene;
            this.SetTriangleToBuffers(this.EvolvingGene, this.EvolvingGeneIndex);
        }

        this.Dna.Generations++;
        this.EvolvingGene = null;
    }

    SetTriangleToBuffers(tri: Gene, index: number) {
        var posBuff = new Float32Array(tri.Pos);
        var colorBuff = new Float32Array(tri.Color.length * DnaEvolver.PositionsPerGene);

        for (var p = 0; p < DnaEvolver.PositionsPerGene; p++)
            for (var i = 0; i < tri.Color.length; i++)
                colorBuff[p * 4 + i] = tri.Color[i];


        this.webgl.bindBuffer(this.webgl.ARRAY_BUFFER, this.PosBuffer);
        this.webgl.bufferSubData(this.webgl.ARRAY_BUFFER, index * posBuff.length * 4, posBuff);

        this.webgl.bindBuffer(this.webgl.ARRAY_BUFFER, this.ColorBuffer);
        this.webgl.bufferSubData(this.webgl.ARRAY_BUFFER, index * colorBuff.length * 4, colorBuff);
    }

    Draw(program: WebGLProgram, imageWidth: number, imageHeight: number) {
        var gl = this.webgl;
        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.ColorBuffer);
        var colorLocation = gl.getAttribLocation(program, "a_color");
        gl.enableVertexAttribArray(colorLocation);
        gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);


        gl.bindBuffer(gl.ARRAY_BUFFER, this.PosBuffer);
        var positionLocation = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this.Dna.Triangles.length * 3);
    }
}


class Gene {
    Pos: number[];
    Color: number[];
}

class Dna {
    Triangles: Gene[];
    Generations: number;
    Mutations: number;
    Fitness: number;
    Seed: number;
}
