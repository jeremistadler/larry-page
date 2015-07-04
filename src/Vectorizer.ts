///<reference path="../references.ts" />


class Vectorizer {
    SourceImgBuffer: WebGLBuffer;
    SourceImgTexBuffer: WebGLBuffer;
    sourceProgram: WebGLProgram;
    triangleProgram: WebGLProgram;
    diffProgram: WebGLProgram;
    Dna: Dna;

    TempBuffer: WebGLRenderbuffer;
    TempTexture: WebGLTexture;

    SourceByteArray: Int8Array;

    constructor(public webgl: WebGLRenderingContext, public sourceTex: Texture) {
        this.Dna = new Dna(webgl);
        this.Dna.Fitness = 1e9;
    }

    init() {
        var gl = this.webgl;
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.DEPTH_TEST);

        this.sourceProgram = Utils.createProgram(gl, 'source');
        this.triangleProgram = Utils.createProgram(gl, 'triangle');
        this.diffProgram = Utils.createProgram(gl, 'diff');

        this.SourceImgTexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgTexBuffer);
        this.setRectangleTex();

        this.SourceImgBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgBuffer);
        this.setRectangle(0, 0, 1, 1);

        var canvas = this.webgl.canvas;
        gl.viewport(0, 0, canvas.width, canvas.height);
        this.drawSourceImg(this.sourceTex.texture, 0, 0, 512, 512);

        this.SourceByteArray = new Uint8Array(512 * 512 * 4);
        gl.readPixels(0, 512, 512, 512, gl.RGBA, gl.UNSIGNED_BYTE, this.SourceByteArray);


        this.TempTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.TempTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        this.TempBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.TempBuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.TempTexture, 0);
    }

    setRectangle(x: number, y: number, width: number, height: number) {
        var x1 = x + width;
        var y1 = y + height;
        this.webgl.bufferData(
            this.webgl.ARRAY_BUFFER,
            new Float32Array([x, y1, x1, y1, x, y, x, y, x1, y1, x1, y]),
            this.webgl.STATIC_DRAW);
    }

    setRectangleTex() {
        this.webgl.bufferData(
            this.webgl.ARRAY_BUFFER,
            new Float32Array([0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0]),
            this.webgl.STATIC_DRAW);
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
        mat3.scale(mat, mat, [width, height, 0]);

        var posLoc = gl.getUniformLocation(this.sourceProgram, "u_matrix");
        gl.uniformMatrix3fv(posLoc, false, <Float32Array>mat);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    draw() {
        var gl = this.webgl;
        var canvas = this.webgl.canvas;
        var evolved = this.Dna.Evolve();

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(1, 0.5, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);


        gl.bindFramebuffer(gl.FRAMEBUFFER, this.TempBuffer);
        gl.bindTexture(gl.TEXTURE_2D, this.TempTexture);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        evolved.Draw(this.triangleProgram, 512, 512);
        
        var triPixels = new Uint8Array(512 * 512 * 4);
        gl.readPixels(0, 0, 512, 512, gl.RGBA, gl.UNSIGNED_BYTE, triPixels);
        evolved.Fitness = this.calculateFitness(this.SourceByteArray, triPixels);
        

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.clearColor(0.2, 0.2, 0.2, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        

        var srcPreviewTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, srcPreviewTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.SourceByteArray);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        this.drawSourceImg(srcPreviewTex, 512, 0, 512, 512);
        this.drawSourceImg(this.TempTexture, 0, 0, 512, 512);

        var triPreviewTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, triPreviewTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, triPixels);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        this.drawSourceImg(triPreviewTex, 512, 512, 512, 512);

        this.drawSourceImg(this.sourceTex.texture, 0, 0, 512, 512);
        this.drawSourceImg(srcPreviewTex, 512, 0, 512, 512);
        this.drawSourceImg(this.TempTexture, 0, 512, 512, 512);
        this.drawSourceImg(triPreviewTex, 512, 512, 512, 512);


        if (evolved.Fitness < this.Dna.Fitness) {
            this.Dna = evolved;
            console.log('fitness', evolved.Fitness);
        }

        if (downloadImage) {
            downloadImage = false;
            this.downloadImg(triPixels);
        }
    }

    downloadImg(buff: Uint8Array) {
        var binaryString = new Array<string>(buff.length);
        var i = buff.length;
        while (i--) {
            binaryString[i] = String.fromCharCode(buff[i]);
        }

        var data = binaryString.join('');
        var q = "data:image/png;base64," + window.btoa(data);
        window.open(q);
    }

    calculateFitness(buff1: ArrayBufferView, buff2: ArrayBufferView) {
        var diff = 0.0;
        
        for (var i = 0; i < buff1.byteLength; i++){
            diff += Math.abs(buff1[i] - buff2[i]);
        }

        return diff;
    }

}
