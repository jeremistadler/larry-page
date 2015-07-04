///<reference path="../references.ts" />


class Vectorizer {
    clearColor: Color;
    SourceImgBuffer: WebGLBuffer;
    SourceImgTexBuffer: WebGLBuffer;
    sourceProgram: WebGLProgram;
    triangleProgram: WebGLProgram;
    diffProgram: WebGLProgram;
    Dna: Dna;

    constructor(public webgl: WebGLRenderingContext, public sourceTex: Texture) {
        this.clearColor = Color.RgbByte(100, 149, 237, 255);
        this.clearColor = Color.RgbByte(30, 30, 30, 255);
        this.Dna = new Dna(webgl);

        var tri = new Triangle();
        tri.Color = Color.Rgb(1, 0.2, 0.2, 0.5);
        tri.Pos = [];
        tri.Pos.push(new Vector3(0, 0, 0));
        tri.Pos.push(new Vector3(0.1, 0, 0));
        tri.Pos.push(new Vector3(0, 0.1, 0));
        this.Dna.Triangles.push(tri)

        tri = new Triangle();
        tri.Color = Color.Rgb(0.2, 0.2, 1, 0.5);
        tri.Pos = [];
        tri.Pos.push(new Vector3(1, 1, 0));
        tri.Pos.push(new Vector3(0.6, 1, 0));
        tri.Pos.push(new Vector3(1, 0.6, 0));

        this.Dna.Triangles.push(tri)
    }

    createProgram(name: string): WebGLProgram {
        var gl = this.webgl;
        var p = gl.createProgram();
        gl.attachShader(p, this.getShader(name + '-vs'));
        gl.attachShader(p, this.getShader(name + '-fs'));
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS))
            console.error("Unable to initialize the shader program.");

        return p;
    }

    init() {
        var gl = this.webgl;
        gl.clearColor(50, 100, 0, 100);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.sourceProgram = this.createProgram('source');
        this.triangleProgram = this.createProgram('triangle');
        this.diffProgram = this.createProgram('diff');

        this.SourceImgTexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgTexBuffer);
        this.setRectangleTex();

        this.SourceImgBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgBuffer);
        this.setRectangle(0, 0, 100, 100);
    }

    setRectangle(x: number, y: number, width: number, height: number) {
        var x2 = x + width;
        var y1 = y + height;
        this.webgl.bufferData(this.webgl.ARRAY_BUFFER, new Float32Array([
            x, y1, x2, y1, x, y, x, y, x2, y1, x2, y]), this.webgl.STATIC_DRAW);
    }

    setRectangleTex() {
        this.webgl.bufferData(this.webgl.ARRAY_BUFFER, new Float32Array([
            0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), this.webgl.STATIC_DRAW);
    }

    drawSourceImg(tex, x: number, y: number, width: number, height: number) {
        var gl = this.webgl;
        var canvas = this.webgl.canvas;
        gl.useProgram(this.sourceProgram);

        var positionLocation = gl.getAttribLocation(this.sourceProgram, "a_position");
        var texCoordLocation = gl.getAttribLocation(this.sourceProgram, "a_texCoord");

        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgTexBuffer);
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);


        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgBuffer);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        var resolutionLocation = gl.getUniformLocation(this.sourceProgram, "u_resolution");
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);


        var mat = mat3.create();
        mat3.translate(mat, mat, [x, y, 0]);

        var posLoc = gl.getUniformLocation(this.sourceProgram, "u_matrix");

        gl.uniformMatrix3fv(posLoc, false, [
            1.1, 0, 0,
            0, 1.5, 0,
            0, 0, 1
        ]);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    draw() {
        var gl = this.webgl;
        var canvas = this.webgl.canvas;

        var evolved = this.Dna.Evolve().Evolve().Evolve().Evolve().Evolve();

        gl.clearColor(this.clearColor.red, this.clearColor.green, this.clearColor.blue, this.clearColor.alpha);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.drawSourceImg(this.sourceTex.texture, 0, 0, 200, 300);

        //var rttTexture = gl.createTexture();
        //gl.bindTexture(gl.TEXTURE_2D, rttTexture);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        //var fbo = gl.createFramebuffer();
        //gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rttTexture, 0);

        //gl.clearColor(0, 1, 0, 1); // green;
        //gl.clear(gl.COLOR_BUFFER_BIT);

        //evolved.Draw(this.triangleProgram, 512, 512);

        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        //this.drawSourceImg(rttTexture, 1, 0, 200, 300);




        //gl.bindTexture(gl.TEXTURE_2D, null);
        //gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);


        //// if more fit
        //this.Dna = evolved;
    }

    getShader(id: string) {
        var gl = this.webgl;
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
}
