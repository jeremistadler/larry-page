///<reference path="references.ts" />


class Vectorizer {
    SourceImgBuffer: WebGLBuffer;
    SourceImgTexBuffer: WebGLBuffer;
    sourceProgram: WebGLProgram;
    triangleProgram: WebGLProgram;
    diffProgram: WebGLProgram;
    mipMapProgram: WebGLProgram;
    Evolver: DnaEvolver;

    Diff: FramebufferWrapper;
    Temp: FramebufferWrapper;
    Converged: FramebufferWrapper;
    srcTex: WebGLTexture;

    CurrentStartGene: number;
    SourceImgBytes: Uint8Array;

    constructor(public webgl: WebGLRenderingContext, public sourceImageData: ImageData, dna: Dna) {
        var gl = this.webgl;
        this.setState();

        gl.getExtension('OES_texture_float');

        this.sourceProgram = Utils.createProgram(gl, 'source');
        this.triangleProgram = Utils.createProgram(gl, 'triangle');
        this.diffProgram = Utils.createProgram(gl, 'diff');
        this.mipMapProgram = Utils.createProgram(gl, 'mip-map');

        this.SourceImgBytes = new Uint8Array(this.sourceImageData.data);
        this.Evolver = new DnaEvolver(this.webgl, dna, this.triangleProgram);

        if (dna.Mutation > 0)
          this.CurrentStartGene = 1000000;
        else
            this.CurrentStartGene = 0;


        this.SourceImgTexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgTexBuffer);
        Utils.setRectangleTex(gl);

        this.SourceImgBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgBuffer);
        Utils.setRectangle(gl, 0, 0, 1, 1);

        this.Diff = Utils.createFramebuffer(gl, globalWidth, globalHeight);
        this.Temp = Utils.createFramebuffer(gl, globalWidth, globalHeight);
        this.Converged = Utils.createFramebuffer(gl, 1, 1);

        this.srcTex = gl.createTexture();
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, <any>true);
        gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, globalWidth, globalHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.SourceImgBytes);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    setState(){
        var gl = this.webgl;
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.DEPTH_TEST);

        var canvas = this.webgl.canvas;
        gl.viewport(0, 0, canvas.width, canvas.height);
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

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    drawConverged(tex, x: number, y: number, width: number, height: number) {
        var gl = this.webgl;
        var canvas = this.webgl.canvas;
        gl.useProgram(this.mipMapProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.Converged.framebuffer);

        var positionLocation = gl.getAttribLocation(this.sourceProgram, "a_position");

        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgBuffer);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    drawDiff(sourceImg: WebGLTexture, evolvedImg: WebGLTexture, oldImg: WebGLTexture) {
        var gl = this.webgl;
        var canvas = this.webgl.canvas;
        gl.useProgram(this.mipMapProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.Converged.framebuffer);

        var u_image0Location = gl.getUniformLocation(this.mipMapProgram, "u_image0");
        var u_image1Location = gl.getUniformLocation(this.mipMapProgram, "u_image1");
        var u_image2Location = gl.getUniformLocation(this.mipMapProgram, "u_image2");
        var positionLocation = gl.getAttribLocation(this.mipMapProgram, "a_position");

        gl.bindBuffer(gl.ARRAY_BUFFER, this.SourceImgBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1i(u_image0Location, 0);
        gl.uniform1i(u_image1Location, 1);
        gl.uniform1i(u_image2Location, 2);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sourceImg);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, evolvedImg);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, oldImg);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    draw() {
        var gl = this.webgl;
        var canvas = this.webgl.canvas;
        this.setState();

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.Temp.framebuffer);
        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.useProgram(this.triangleProgram);
        this.setState();

        //if (this.CurrentStartGene < this.Evolver.Dna.Genes.length){
        //  this.Evolver.findBestGenePos(this.CurrentStartGene, <Int8Array><any>this.sourceImageData.data);
        //  this.CurrentStartGene++;
        //  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        //  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        //  gl.clearColor(1, 1, 1, 1);
        //  gl.clear(gl.COLOR_BUFFER_BIT);
        //  this.Evolver.Draw();
        //  return;
        //}
        
        var startTime = new Date().getTime();

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.Diff.framebuffer);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.Evolver.Draw();

        //var triPixels = new Uint8Array(globalWidth * globalHeight * 4);
        //for (var iterations = 0; iterations < 100; iterations++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.Temp.framebuffer);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.Evolver.StartEvolving();
        this.Evolver.Draw();
        //gl.readPixels(0, 0, globalWidth, globalHeight, gl.RGBA, gl.UNSIGNED_BYTE, triPixels);
        //var fitness = this.calculateFitness(this.SourceImgBytes, triPixels);
        //this.Evolver.EndEvolving(fitness);
            
        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        //gl.bindTexture(gl.TEXTURE_2D, this.DiffTexture);
        //gl.clearColor(1, 1, 1, 1);
        //gl.clear(gl.COLOR_BUFFER_BIT);

        //this.drawDiff(this.sourceTex.texture, this.TempTexture);



        gl.bindFramebuffer(gl.FRAMEBUFFER, this.Converged.framebuffer);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this.drawDiff(this.srcTex, this.Temp.tex, this.Diff.tex);
        //this.drawConverged(this.Diff.tex, 0, 0, 1, 1);

        var triPixels = new Float32Array(1 * 1 * 4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, triPixels);
        console.log(triPixels[0], triPixels[1], triPixels[2], triPixels[3]);

        var fitter = (triPixels[0] + triPixels[1] + triPixels[2]) < 0;
        this.Evolver.EndEvolving(fitter ? this.Evolver.Dna.Fitness - 1 : Infinity);
        //}


        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.drawSourceImg(this.Diff.tex, 0, 0, 0, 0);

        //gl.clearColor(1, 1, 1, 1);
        //gl.clear(gl.COLOR_BUFFER_BIT);
        //this.Evolver.Draw();

        console.log('Time per generation: ' + (new Date().getTime() - startTime) / 1);

        //gl.clearColor(1, 1, 1, 1);
        //gl.clear(gl.COLOR_BUFFER_BIT);
        //this.Evolver.Draw();

        //gl.bindTexture(gl.TEXTURE_2D, null);
        //gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        //
        //gl.clearColor(1, 1, 1, 1);
        //gl.clear(gl.COLOR_BUFFER_BIT);
        //

        ////var srcPreviewTex = gl.createTexture();
        ////gl.bindTexture(gl.TEXTURE_2D, srcPreviewTex);
        ////gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, globalWidth, globalHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.SourceByteArray);
        ////gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        ////gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        ////this.drawSourceImg(srcPreviewTex, 512, 0, globalWidth, globalHeight);
        ////this.drawSourceImg(this.TempTexture, 0, 0, globalWidth, globalHeight);

        //var triPreviewTex = gl.createTexture();
        //gl.bindTexture(gl.TEXTURE_2D, triPreviewTex);
        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, globalWidth, globalHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, triPixels);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        //this.drawSourceImg(triPreviewTex, 0, 0, globalWidth, globalHeight);


        //gl.bindFramebuffer(gl.FRAMEBUFFER, this.TempBuffer);
        //gl.clearColor(1, 1, 1, 1);
        //gl.clear(gl.COLOR_BUFFER_BIT);
        //this.Evolver.Draw();
        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        //this.drawSourceImg(this.sourceTex.texture, 0, 0, globalWidth, globalHeight);
        ////this.drawSourceImg(srcPreviewTex, 512, 0, globalWidth, globalHeight);
        //this.drawSourceImg(this.TempTexture, 0, 512, globalWidth, globalHeight);
        ////this.drawSourceImg(triPreviewTex, 512, 512, globalWidth, globalHeight);
    }

    calculateFitness(buff1: Int8Array, buff2: Int8Array) {
        var diff = 0.0;

        for (var i = 0; i < buff1.byteLength; i++){
            var q = Math.abs(buff1[i] - buff2[i]);
            diff += q * q;
        }

        return diff;
    }
}
