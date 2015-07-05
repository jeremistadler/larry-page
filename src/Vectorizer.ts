///<reference path="../references.ts" />


class Vectorizer {
    SourceImgBuffer: WebGLBuffer;
    SourceImgTexBuffer: WebGLBuffer;
    sourceProgram: WebGLProgram;
    triangleProgram: WebGLProgram;
    diffProgram: WebGLProgram;
    Evolver: DnaEvolver;

    TempBuffer: WebGLRenderbuffer;
    TempTexture: WebGLTexture;

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
        if (!this.Evolver) {
            if (globalDna != null)
                this.Evolver = new DnaEvolver(this.webgl, globalDna);
            else
                return;
        }
        var gl = this.webgl;
        var canvas = this.webgl.canvas;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(1, 0.5, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);


        //for (var iterations = 0; iterations < 10; iterations++) {
        //    gl.bindFramebuffer(gl.FRAMEBUFFER, this.TempBuffer);
        //    gl.bindTexture(gl.TEXTURE_2D, this.TempTexture);
        //    gl.clearColor(1, 1, 1, 1);
        //    gl.clear(gl.COLOR_BUFFER_BIT);
            this.Evolver.StartEvolving();
        //    this.Evolver.Draw(this.triangleProgram, 512, 512);
        //
        //    var triPixels = new Uint8Array(512 * 512 * 4);
        //    gl.readPixels(0, 0, 512, 512, gl.RGBA, gl.UNSIGNED_BYTE, triPixels);


        var softwareRasterizer = new SoftwareRasterizer(512, 512);
        softwareRasterizer.drawGenes(this.Evolver.Dna.Genes);
        var triPixels = softwareRasterizer.ColorBuffer;

            var fitness = this.calculateFitness(this.SourceByteArray, triPixels);
            this.Evolver.EndEvolving(fitness);
        //}

        var preCanvas = <HTMLCanvasElement>document.getElementById('preview-canvas');
        var preCtx = preCanvas.getContext('2d');
        var imageData = preCtx.createImageData(512, 512);
        for (var i = 0; i < triPixels.length; i++)
            imageData.data[i] = triPixels[i];
        preCtx.putImageData(imageData, 0, 0);   


        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.clearColor(0.2, 0.2, 0.2, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);


       // var srcPreviewTex = gl.createTexture();
       // gl.bindTexture(gl.TEXTURE_2D, srcPreviewTex);
       // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.SourceByteArray);
       // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
       // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
       // //this.drawSourceImg(srcPreviewTex, 512, 0, 512, 512);
       // //this.drawSourceImg(this.TempTexture, 0, 0, 512, 512);
       // 
       // var triPreviewTex = gl.createTexture();
       // gl.bindTexture(gl.TEXTURE_2D, triPreviewTex);
       // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, triPixels);
       // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
       // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        //this.drawSourceImg(triPreviewTex, 512, 512, 512, 512);
        //
        //
        //gl.bindFramebuffer(gl.FRAMEBUFFER, this.TempBuffer);
        //gl.clearColor(1, 1, 1, 1);
        //gl.clear(gl.COLOR_BUFFER_BIT);
        //this.Evolver.Draw(this.triangleProgram, 512, 512);
        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        //
        //this.drawSourceImg(this.sourceTex.texture, 0, 0, 512, 512);
        //this.drawSourceImg(srcPreviewTex, 512, 0, 512, 512);
        //this.drawSourceImg(this.TempTexture, 0, 512, 512, 512);
        //this.drawSourceImg(triPreviewTex, 512, 512, 512, 512);
    }

    calculateFitness(buff1: ArrayBufferView, buff2: ArrayBufferView) {
        var diff = 0.0;

        for (var i = 0; i < buff1.byteLength; i++) {
            diff += Math.abs(buff1[i] - buff2[i]);
        }

        return diff;
    }

}



class SoftwareRasterizer {
    edges: Edge[] = [new Edge(), new Edge(), new Edge()];
    span = new Span();
    ColorBuffer: Int8Array;


    constructor(public width: number, public height: number) {
        this.ColorBuffer = new Int8Array(width * height * 4);
    }

    drawGenes(genes: Gene[]) {
        for (var i = 0; i < genes.length; i++) 
        {
            this.drawTriangle(1,
                genes[i].Pos[0] * this.width, genes[i].Pos[1] * this.height,
                genes[i].Pos[2] * this.width, genes[i].Pos[3] * this.height,
                genes[i].Pos[4] * this.width, genes[i].Pos[5] * this.height);
        }
    }

    drawTriangle(color, x1, y1, x2, y2, x3, y3) {
        this.edges[0].set(x1, y1, color, x2, y2, color);
        this.edges[1].set(x2, y2, color, x3, y3, color);
        this.edges[2].set(x3, y3, color, x1, y1, color);

        var maxLength = 0;
        var longEdge = 0;

        // find edge with the greatest length in the y axis
        for (var i = 0; i < 3; i++) {
            var length = (this.edges[i].y2 - this.edges[i].y1);
            if (length > maxLength) {
                maxLength = length;
                longEdge = i;
            }
        }

        var shortEdge1 = (longEdge + 1) % 3;
        var shortEdge2 = (longEdge + 2) % 3;

        this.drawSpans(this.edges[longEdge], this.edges[shortEdge1]);
        this.drawSpans(this.edges[longEdge], this.edges[shortEdge2]);
    }

    drawSpans(e1, e2) {
        var e1ydiff = e1.y2 - e1.y1;
        if (e1ydiff === 0) return;

        var e2ydiff = e2.y2 - e2.y1;
        if (e2ydiff === 0) return;

        var e1xdiff = e1.x2 - e1.x1;
        var e2xdiff = e2.x2 - e2.x1;

        var e1colordiffr = e1.r2 - e1.r1;
        var e1colordiffg = e1.g2 - e1.g1;
        var e1colordiffb = e1.b2 - e1.b1;

        var e2colordiffr = e2.r2 - e2.r1;
        var e2colordiffg = e2.g2 - e2.g1;
        var e2colordiffb = e2.b2 - e2.b1;

        var factor1 = (e2.y1 - e1.y1) / e1ydiff;
        var factorStep1 = 1 / e1ydiff;
        var factor2 = 0;
        var factorStep2 = 1 / e2ydiff;

        for (var y = e2.y1; y < e2.y2; y++) {

            this.span.set(
                e1.x1 + (e1xdiff * factor1),
                e1.r1 + e1colordiffr * factor1,
                e1.g1 + e1colordiffg * factor1,
                e1.b1 + e1colordiffb * factor1,

                e2.x1 + (e2xdiff * factor2),
                e2.r1 + e2colordiffr * factor2,
                e2.g1 + e2colordiffg * factor2,
                e2.b1 + e2colordiffb * factor2
                );

            var xdiff = this.span.x2 - this.span.x1;
            if (xdiff > 0) {

                var colordiffr = this.span.r2 - this.span.r1;
                var colordiffg = this.span.g2 - this.span.g1;
                var colordiffb = this.span.b2 - this.span.b1;

                var factor = 0;
                var factorStep = 1 / xdiff;

                for (var x = this.span.x1; x < this.span.x2; x++) {
                    var r = this.span.r1 + colordiffr * factor;
                    var g = this.span.g1 + colordiffg * factor;
                    var b = this.span.b1 + colordiffb * factor;

                    this.drawPixel(x, y, r, g, b, 255);
                    factor += factorStep;
                }
            }

            factor1 += factorStep1;
            factor2 += factorStep2;
        }
    }

    drawPixel(x, y, r, g, b, a) {
        var offset = (y * this.width + x) * 4;
        this.ColorBuffer[offset + 0] = 1;
        this.ColorBuffer[offset + 1] = 255;
        this.ColorBuffer[offset + 2] = 1;
        this.ColorBuffer[offset + 3] = 255;
    }
}

class Span {
    x1 = 0;
    x2 = 0;

    r1 = 0;
    g1 = 0;
    b1 = 0;

    r2 = 0;
    g2 = 0;
    b2 = 0;

    set(x1, r1, g1, b1, x2, r2, g2, b2) {
        if (x1 < x2) {
            this.x1 = x1 >> 0;
            this.x2 = x2 >> 0;

            this.r1 = r1;
            this.g1 = g1;
            this.b1 = b1;

            this.r2 = r2;
            this.g2 = g2;
            this.b2 = b2;
        } else {

            this.x1 = x2 >> 0;
            this.x2 = x1 >> 0;

            this.r1 = r2;
            this.g1 = g2;
            this.b1 = b2;

            this.r2 = r1;
            this.g2 = g1;
            this.b2 = b1;
        }
    }
}

class Edge {
    x1 = 0;
    y1 = 0;

    x2 = 0;
    y2 = 0;

    r1 = 0;
    g1 = 0;
    b1 = 0;

    r2 = 0;
    g2 = 0;
    b2 = 0;

    set(x1, y1, color1, x2, y2, color2) {

        if (y1 < y2) {

            this.x1 = x1 >> 0;
            this.y1 = y1 >> 0;

            this.x2 = x2 >> 0;
            this.y2 = y2 >> 0;

            this.r1 = color1 >> 16 & 255;
            this.g1 = color1 >> 8 & 255;
            this.b1 = color1 & 255;

            this.r2 = color2 >> 16 & 255;
            this.g2 = color2 >> 8 & 255;
            this.b2 = color2 & 255;

        } else {

            this.x1 = x2 >> 0;
            this.y1 = y2 >> 0;

            this.x2 = x1 >> 0;
            this.y2 = y1 >> 0;

            this.r1 = color2 >> 16 & 255;
            this.g1 = color2 >> 8 & 255;
            this.b1 = color2 & 255;

            this.r2 = color1 >> 16 & 255;
            this.g2 = color1 >> 8 & 255;
            this.b2 = color1 & 255;

        }

    }
}