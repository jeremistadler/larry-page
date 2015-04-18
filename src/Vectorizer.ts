///<reference path="../references.ts" />


class Vectorizer {
    clearColor: Color;

    constructor(public webgl: WebGLRenderingContext) {
        this.clearColor = Color.Rgb(10, 40, 100);
    }

    init() {
        var gl = this.webgl;
        gl.clearColor(this.clearColor.red, this.clearColor.green, this.clearColor.blue, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clearDepth(1.0);
    }

    draw() {
        var gl = this.webgl;
        var canvas = this.webgl.canvas;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    }
}
