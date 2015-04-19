///<reference path="../references.ts" />


class Vectorizer {
    clearColor: Color;
    SourceImgBuffer: WebGLBuffer;
    SourceImgTexBuffer: WebGLBuffer;
    sourceProgram: WebGLProgram;
    triangleProgram: WebGLProgram;
    Dna: Dna;

    constructor(public webgl: WebGLRenderingContext, public sourceTex: Texture) {
        this.clearColor = Color.RgbByte(100, 149, 237, 255);
        this.clearColor = Color.RgbByte(30, 30, 30, 255);
        this.Dna = new Dna(webgl);
    }


    init() {
        var gl = this.webgl;
        gl.clearColor(50, 100, 0, 100);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.sourceProgram = gl.createProgram();
        gl.attachShader(this.sourceProgram, this.getShader('source-vs'));
        gl.attachShader(this.sourceProgram, this.getShader('source-fs'));
        gl.linkProgram(this.sourceProgram);
        if (!gl.getProgramParameter(this.sourceProgram, gl.LINK_STATUS))
            console.error("Unable to initialize the shader program.");

        this.triangleProgram = gl.createProgram();
        gl.attachShader(this.triangleProgram, this.getShader('triangle-vs'));
        gl.attachShader(this.triangleProgram, this.getShader('triangle-fs'));
        gl.linkProgram(this.triangleProgram);
        if (!gl.getProgramParameter(this.triangleProgram, gl.LINK_STATUS))
            console.error("Unable to initialize the shader program.");


        this.SourceImgTexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgTexBuffer);
        this.setRectangleTex();

        this.SourceImgBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgBuffer);
        this.setRectangle(10, 10, 300, 200);
    }

    setRectangle(x: number, y: number, width: number, height: number) {
        var gl = this.webgl;
        var x2 = x + width;
        var y1 = y + height;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            x, y1, x2, y1, x, y, x, y, x2, y1, x2, y]), gl.STATIC_DRAW);
    }

    setRectangleTex() {
        var gl = this.webgl;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
    }

    draw() {
        var gl = this.webgl;
        var canvas = this.webgl.canvas;

        gl.clearColor(this.clearColor.red, this.clearColor.green, this.clearColor.blue, this.clearColor.alpha);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.useProgram(this.sourceProgram);

        var positionLocation = gl.getAttribLocation(this.sourceProgram, "a_position");
        var texCoordLocation = gl.getAttribLocation(this.sourceProgram, "a_texCoord");

        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgTexBuffer);
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);


        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgBuffer);
        gl.bindTexture(gl.TEXTURE_2D, this.sourceTex.texture);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        var resolutionLocation = gl.getUniformLocation(this.sourceProgram, "u_resolution");
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

        gl.drawArrays(gl.TRIANGLES, 0, 6);


        gl.useProgram(this.triangleProgram);

        var envolved = this.Dna.Envolve();
        this.Dna.Draw(this.triangleProgram);
        this.Dna = envolved;
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
