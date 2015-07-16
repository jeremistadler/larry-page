///<reference path="references.ts" />

class DnaEvolver {
    static PositionsPerGene: number = 3;

    EvolvingGene: Gene;
    EvolvingGeneIndex: number;

    ColorBuffer: WebGLBuffer;
    PosBuffer: WebGLBuffer;

    LastSaved: number;

    constructor(public webgl: WebGLRenderingContext, public Dna: Dna, public program: WebGLProgram) {
        this.PosBuffer = webgl.createBuffer();
        this.ColorBuffer = webgl.createBuffer();

        var posArr = new Float32Array(this.Dna.Genes.length * DnaEvolver.PositionsPerGene * 2);
        var colorArr = new Float32Array(this.Dna.Genes.length * DnaEvolver.PositionsPerGene * 4);

        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.PosBuffer);
        webgl.bufferData(webgl.ARRAY_BUFFER, posArr, webgl.DYNAMIC_DRAW);

        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.ColorBuffer);
        webgl.bufferData(webgl.ARRAY_BUFFER, colorArr, webgl.DYNAMIC_DRAW);

        for (var i = 0; i < this.Dna.Genes.length; i++)
            this.SetTriangleToBuffers(this.Dna.Genes[i], i);

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
            dna.Genes[i] = new Gene();
            dna.Genes[i].Pos = Utils.CreateNumberArray(DnaEvolver.PositionsPerGene * 2);
            dna.Genes[i].Color = Utils.CreateNumberArray(4);
        }

        return dna;
    }

    findBestGenePos(geneIndex: number, orginalImage: Int8Array){
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

          if (newFitness < fitness){
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

        for (var i = 0; i < buff1.byteLength; i++){
            var q = Math.abs(buff1[i] - buff2[i]);
            diff += q * q;
        }

        return diff;
    }

    StartEvolving(): void {
        var index = Utils.randomIndex(this.Dna.Genes);

        this.EvolvingGene = this.Dna.Genes[index];
        this.EvolvingGeneIndex = index;

        var tri = this.Dna.Genes[index] = new Gene();

        if (Math.random() > 0.9) {
            tri.Color = [Math.random(), Math.random(), Math.random(), Math.random() * 0.4 + 0.2];
            tri.Pos = new Array(DnaEvolver.PositionsPerGene * 2);
            for (var i = 0; i < tri.Pos.length; i++)
                tri.Pos[i] = Math.random() * 1.2 - 0.1;
        }
        else if (Math.random() > 0.3) {
            var oldTri = this.EvolvingGene;
            tri.Color = oldTri.Color.slice();
            tri.Pos = oldTri.Pos.slice();

            var indexToMove = Utils.randomIndex(tri.Pos);
            tri.Pos[indexToMove] += (Math.random() - 0.5) * 0.1;
        }
        else {
            var oldTri = this.EvolvingGene;
            tri.Color = oldTri.Color.slice();
            tri.Pos = oldTri.Pos.slice();

            var indexToChange = Utils.randomFromTo(0, 2);
            tri.Color[indexToChange] = Utils.ClampFloat((Math.random() - 0.5) * 0.1 + tri.Color[indexToChange]);
        }

        this.SetTriangleToBuffers(tri, index);
    }

    EndEvolving(fitness: number): void {
        if (fitness < this.Dna.Fitness) {
            this.Dna.Fitness = fitness;
            this.Dna.Mutation++;
            console.log('fitness', fitness, 'generation: ' + this.Dna.Generation);

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
        }

        this.Dna.Generation++;
        this.EvolvingGene = null;
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
            for (var i = 0; i < tri.Color.length; i++)
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
