///<reference path="references.ts" />

class FramebufferWrapper {
    constructor(public tex: WebGLTexture, public framebuffer: WebGLFramebuffer) { }
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

    static randomFromTo(from, to){
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
