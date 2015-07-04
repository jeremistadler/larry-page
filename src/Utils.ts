///<reference path="../references.ts" />

class Utils {
    static StartTick(tickMethod: (dt: number) => void) {
        var result = Q.defer();
        var oldTime = 0;
        var tickLoop = (time) => {
            try {
                var deltaTime = time - oldTime;
                oldTime = time;

                tickMethod(deltaTime / 1000);
                window.requestAnimationFrame(tickLoop);
            }
            catch (e) {
                result.reject(e);
            }
        };
        tickLoop(0);
        return result.promise;
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
}
