///<reference path="../references.ts" />


class Vectorizer {
    SourceImgBuffer: WebGLBuffer;
    SourceImgTexBuffer: WebGLBuffer;
    sourceProgram: WebGLProgram;
    triangleProgram: WebGLProgram;
    diffProgram: WebGLProgram;
    mipMapProgram: WebGLProgram;
    Evolver: DnaEvolver;

    TempBuffer: WebGLRenderbuffer;
    TempTexture: WebGLTexture;

    DiffBuffer: WebGLRenderbuffer;
    DiffTexture: WebGLTexture;


    SourceByteArray: Int8Array;

    constructor(public webgl: WebGLRenderingContext, public sourceTex: Texture) {
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
        //this.mipMapProgram = Utils.createProgram(gl, 'mip-map');

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


        // CLEAN ME 
        this.DiffTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.DiffTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        this.DiffBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.DiffBuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.DiffTexture, 0);
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


    drawDiff(sourceImg : WebGLTexture, evolvedImg : WebGLTexture) {
        var gl = this.webgl;
        var canvas = this.webgl.canvas;
        gl.useProgram(this.diffProgram);

        // lookup the sampler locations.
        var u_image0Location = gl.getUniformLocation(this.diffProgram, "u_image0");
        var u_image1Location = gl.getUniformLocation(this.diffProgram, "u_image1");

        var positionLocation = gl.getAttribLocation(this.diffProgram, "a_position");
        var texCoordLocation = gl.getAttribLocation(this.diffProgram, "a_texCoord");

        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgTexBuffer);
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // lookup the sampler locations.
        var u_image0Location = gl.getUniformLocation(this.diffProgram, "u_image0");
        var u_image1Location = gl.getUniformLocation(this.diffProgram, "u_image1");

        // set which texture units to render with.
        gl.uniform1i(u_image0Location, 0);  // texture unit 0
        gl.uniform1i(u_image1Location, 1);  // texture unit 1

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sourceImg);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, evolvedImg);

        var resolutionLocation = gl.getUniformLocation(this.diffProgram, "u_resolution");
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    draw() {
        if (!this.Evolver) {
            if (globalDna != null)
                this.Evolver = new DnaEvolver(this.webgl, globalDna);
            else
                return;
        }
        var gl = this.webgl;
        var canvas = this.webgl.canvas;

        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        //gl.clearColor(1, 0.5, 1, 1);
        //gl.clear(gl.COLOR_BUFFER_BIT);


        for (var iterations = 0; iterations < 10; iterations++) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.TempBuffer);
            gl.bindTexture(gl.TEXTURE_2D, this.TempTexture);
            gl.clearColor(1, 1, 1, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            this.Evolver.StartEvolving();
            this.Evolver.Draw(this.triangleProgram, 512, 512);

            var triPixels = new Uint8Array(512 * 512 * 4);
            gl.readPixels(0, 0, 512, 512, gl.RGBA, gl.UNSIGNED_BYTE, triPixels);

            var fitness = this.calculateFitness(this.SourceByteArray, triPixels);
            this.Evolver.EndEvolving(fitness);

            //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            //gl.bindTexture(gl.TEXTURE_2D, this.DiffTexture);
            //gl.clearColor(1, 1, 1, 1);
            //gl.clear(gl.COLOR_BUFFER_BIT);

            //this.drawDiff(this.sourceTex.texture, this.TempTexture);
        }

        //gl.bindTexture(gl.TEXTURE_2D, null);
        //gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        //gl.clearColor(0.2, 0.2, 0.2, 1);
        //gl.clear(gl.COLOR_BUFFER_BIT);
        

        ////var srcPreviewTex = gl.createTexture();
        ////gl.bindTexture(gl.TEXTURE_2D, srcPreviewTex);
        ////gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.SourceByteArray);
        ////gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        ////gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        ////this.drawSourceImg(srcPreviewTex, 512, 0, 512, 512);
        ////this.drawSourceImg(this.TempTexture, 0, 0, 512, 512);

        ////var triPreviewTex = gl.createTexture();
        ////gl.bindTexture(gl.TEXTURE_2D, triPreviewTex);
        ////gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, triPixels);
        ////gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        ////gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        ////this.drawSourceImg(triPreviewTex, 512, 512, 512, 512);


        //gl.bindFramebuffer(gl.FRAMEBUFFER, this.TempBuffer);
        //gl.clearColor(1, 1, 1, 1);
        //gl.clear(gl.COLOR_BUFFER_BIT);
        //this.Evolver.Draw(this.triangleProgram, 512, 512);
        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        //this.drawSourceImg(this.sourceTex.texture, 0, 0, 512, 512);
        ////this.drawSourceImg(srcPreviewTex, 512, 0, 512, 512);
        //this.drawSourceImg(this.TempTexture, 0, 512, 512, 512);
        ////this.drawSourceImg(triPreviewTex, 512, 512, 512, 512);
    }

    calculateFitness(buff1: ArrayBufferView, buff2: ArrayBufferView) {
        var diff = 0.0;
        
        for (var i = 0; i < buff1.byteLength; i++){
            var q = Math.abs(buff1[i] - buff2[i]);
            diff += q * q;
        }

        return diff;
    }

}

