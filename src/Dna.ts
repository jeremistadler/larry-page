///<reference path="../references.ts" />


class Triangle {
    Pos: Vector3[];
    Color: Color;
}


// TODO
// Have a fixed list if triangles with a isDelted property,
// store the last triangle as a property for rollback
// create a new triangle and replace random when trying to evolve

class Dna {
    Triangles: Triangle[];
    Age: number;
    Fitness: number;

    constructor(public webgl: WebGLRenderingContext, triangles?: Triangle[], age?: number) {
        this.Triangles = triangles || [];
        this.Age = age || 0;
    }


    Evolve() : Dna {
        var newTriangleList = this.Triangles.slice();

        var tri = new Triangle()
        tri.Color = Color.Rgb(Math.random(), Math.random(), Math.random(), Math.random() * 0.5);
        tri.Pos = [];
        for (var i = 0; i < 3; i++)
            tri.Pos.push(new Vector3(Math.random() * 1.2 - 0.1, Math.random() * 1.2 - 0.1, 0));

        newTriangleList.push(tri);

        return new Dna(this.webgl, newTriangleList, this.Age + 1);
    }

    Draw(program: WebGLProgram, imageWidth: number, imageHeight: number) {
        if (this.Triangles.length == 0)
            return;

        var gl = this.webgl;
        gl.useProgram(program);

        var positions = [];
        var colors = [];
        for (var i = 0; i < this.Triangles.length; i++) {
            var tri = this.Triangles[i];

            positions.push(tri.Pos[0].x);
            positions.push(tri.Pos[0].y);

            positions.push(tri.Pos[1].x);
            positions.push(tri.Pos[1].y);

            positions.push(tri.Pos[2].x);
            positions.push(tri.Pos[2].y);

            colors.push(tri.Color.red);
            colors.push(tri.Color.green);
            colors.push(tri.Color.blue);
            colors.push(tri.Color.alpha);
            colors.push(tri.Color.red);
            colors.push(tri.Color.green);
            colors.push(tri.Color.blue);
            colors.push(tri.Color.alpha);
            colors.push(tri.Color.red);
            colors.push(tri.Color.green);
            colors.push(tri.Color.blue);
            colors.push(tri.Color.alpha);
        }


        var colorBuff = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuff);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        var colorLocation = gl.getAttribLocation(program, "a_color");
        gl.enableVertexAttribArray(colorLocation);
        gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);


        var posbuff = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posbuff);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        var positionLocation = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this.Triangles.length * 3);
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

}
