///<reference path="../references.ts" />

     class Matrix4 {
        position: Vector3;
        modified: () => void;

        constructor(public data?: Float32Array) {
            if (typeof data === "undefined")
                this.data = new Float32Array(16);
            else if (data.length != 16)
                throw new Error("Matrix data length must be 16, not " + data.length);
            this.position = new Vector3(this.data, 12);
        }

        static Identity() {
            return new Matrix4(new Float32Array(
                [1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1]));
        }

        static Scale(value: Vector3);
        static Scale(value: number);
        static Scale(x: number, y: number, z: number);
        static Scale(arg, y?: number, z?: number) {
            var x;
            if (typeof arg === "number") {
                x = <number>arg;
                if (typeof y === "undefined")
                    y = x;
                if (typeof z === "undefined")
                    z = x;
            }
            else {
                x = (<Vector3>arg).x;
                y = (<Vector3>arg).y;
                z = (<Vector3>arg).z;
            }

            return new Matrix4(new Float32Array(
                [x, 0, 0, 0,
                    0, y, 0, 0,
                    0, 0, z, 0,
                    0, 0, 0, 1]));
        }

        static Translate(value: Vector3);
        static Translate(x: number, y: number, z: number);
        static Translate(arg, y?: number, z?: number) {
            var x;
            if (typeof arg === "number")
                x = <number>arg;
            else {
                x = (<Vector3>arg).x;
                y = (<Vector3>arg).y;
                z = (<Vector3>arg).z;
            }

            return new Matrix4(new Float32Array(
                [1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    x, y, z, 1]));
        }

        static LookAt(eye: Vector3, center: Vector3, up?: Vector3) {
            if (typeof up === "undefined")
                up = new Vector3(0, 1, 0);

            var newZ = center.sub(eye).normalize();
            var newX = newZ.cross(up).normalize();
            var newY = newX.cross(newZ).normalize();

            var b = new Matrix4();
            b.data[0] = newX.x;
            b.data[4] = newX.y;
            b.data[8] = newX.z;

            b.data[1] = newY.x;
            b.data[5] = newY.y;
            b.data[9] = newY.z;

            b.data[2] = -newZ.x;
            b.data[6] = -newZ.y;
            b.data[10] = -newZ.z;

            b.data[15] = 1;

            return b.translate(eye.scale(-1));
        }

        clone() {
            var clonedBuffer = new Float32Array(this.data.length);
            clonedBuffer.set(this.data);
            return new Matrix4(clonedBuffer);
        }

        get x() {
            return this.data[12];
        }

        get y() {
            return this.data[13];
        }

        get z() {
            return this.data[14];
        }

        set x(value: number) {
            this.data[12] = value;
            if (typeof this.modified !== "undefined")
                this.modified();
        }

        set y(value: number) {
            this.data[13] = value;
            if (typeof this.modified !== "undefined")
                this.modified();
        }

        set z(value: number) {
            this.data[14] = value;
            if (typeof this.modified !== "undefined")
                this.modified();
        }

        get scaleX() {
            return 1 / new Vector3(this.data[0], this.data[1], this.data[2]).length();
        }

        get scaleY() {
            return 1 / new Vector3(this.data[4], this.data[5], this.data[6]).length();
        }

        get scaleZ() {
            return 1 / new Vector3(this.data[8], this.data[9], this.data[10]).length();
        }

        setRotationY(value: number) {
            var c = Math.cos(value), s = Math.sin(value);
            var x = this.x, y = this.y, z = this.z;
            this.data.set([
                c, 0, s, 0,
                0, 1, 0, 0,
                -s, 0, c, 0,
                x, y, z, 1]);
            if (typeof this.modified !== "undefined")
                this.modified();
        }

        transform(vector: Vector3) {
            var x = vector.x, y = vector.y, z = vector.z;
            var m = this.data;

            return new Vector3(
                m[0] * x + m[4] * y + m[8] * z,
                m[1] * x + m[5] * y + m[9] * z,
                m[2] * x + m[6] * y + m[10] * z);
        }

        _rotateX(angle: number) {
            var m = this.data;

            var c = Math.cos(angle);
            var s = Math.sin(angle);
            var mv1 = m[1], mv5 = m[5], mv9 = m[9];
            m[1] = m[1] * c - m[2] * s;
            m[5] = m[5] * c - m[6] * s;
            m[9] = m[9] * c - m[10] * s;

            m[2] = m[2] * c + mv1 * s;
            m[6] = m[6] * c + mv5 * s;
            m[10] = m[10] * c + mv9 * s;

            if (typeof this.modified !== "undefined")
                this.modified();
        }

        _rotateY(angle: number) {
            var m = this.data;

            var c = Math.cos(angle);
            var s = Math.sin(angle);
            var mv0 = m[0], mv4 = m[4], mv8 = m[8];
            m[0] = c * m[0] + s * m[2];
            m[4] = c * m[4] + s * m[6];
            m[8] = c * m[8] + s * m[10];

            m[2] = c * m[2] - s * mv0;
            m[6] = c * m[6] - s * mv4;
            m[10] = c * m[10] - s * mv8;

            if (typeof this.modified !== "undefined")
                this.modified();
        }

        _rotateZ(angle: number) {
            var m = this.data;

            var c = Math.cos(angle);
            var s = Math.sin(angle);
            var mv0 = m[0], mv4 = m[4], mv8 = m[8];
            m[0] = c * m[0] - s * m[1];
            m[4] = c * m[4] - s * m[5];
            m[8] = c * m[8] - s * m[9];

            m[1] = c * m[1] + s * mv0;
            m[5] = c * m[5] + s * mv4;
            m[9] = c * m[9] + s * mv8;

            if (typeof this.modified !== "undefined")
                this.modified();
        }

        // Deprecated source from three.js
        // This do not work with a non-uniform scale
        _rotateByAxis(axis, angle) {
            var te = this.data;

            // optimize by checking axis
            if (axis.x === 1 && axis.y === 0 && axis.z === 0) {
                this._rotateX(angle);
                return;
            } else if (axis.x === 0 && axis.y === 1 && axis.z === 0) {
                this._rotateY(angle);
                return;
            } else if (axis.x === 0 && axis.y === 0 && axis.z === 1) {
                this._rotateZ(angle);
                return;
            }

            var x = axis.x, y = axis.y, z = axis.z;

            var n = Math.sqrt(x * x + y * y + z * z);
            x /= n;
            y /= n;
            z /= n;
            var xx = x * x, yy = y * y, zz = z * z;
            var c = Math.cos(angle);
            var s = Math.sin(angle);
            var oneMinusCosine = 1 - c;
            var xy = x * y * oneMinusCosine;
            var xz = x * z * oneMinusCosine;
            var yz = y * z * oneMinusCosine;
            var xs = x * s;
            var ys = y * s;
            var zs = z * s;
            var r11 = xx + (1 - xx) * c;
            var r21 = xy + zs;
            var r31 = xz - ys;
            var r12 = xy - zs;
            var r22 = yy + (1 - yy) * c;
            var r32 = yz + xs;
            var r13 = xz + ys;
            var r23 = yz - xs;
            var r33 = zz + (1 - zz) * c;
            var m11 = te[0], m21 = te[1], m31 = te[2], m41 = te[3];
            var m12 = te[4], m22 = te[5], m32 = te[6], m42 = te[7];
            var m13 = te[8], m23 = te[9], m33 = te[10], m43 = te[11];
            te[0] = r11 * m11 + r21 * m12 + r31 * m13;
            te[1] = r11 * m21 + r21 * m22 + r31 * m23;
            te[2] = r11 * m31 + r21 * m32 + r31 * m33;
            te[3] = r11 * m41 + r21 * m42 + r31 * m43;
            te[4] = r12 * m11 + r22 * m12 + r32 * m13;
            te[5] = r12 * m21 + r22 * m22 + r32 * m23;
            te[6] = r12 * m31 + r22 * m32 + r32 * m33;
            te[7] = r12 * m41 + r22 * m42 + r32 * m43;
            te[8] = r13 * m11 + r23 * m12 + r33 * m13;
            te[9] = r13 * m21 + r23 * m22 + r33 * m23;
            te[10] = r13 * m31 + r23 * m32 + r33 * m33;
            te[11] = r13 * m41 + r23 * m42 + r33 * m43;

            if (typeof this.modified !== "undefined")
                this.modified();
        }

        // Source from Three.js
        _extractRotation(m: Matrix4) {

            var scaleX = 1 / new Vector3(m.data[0], m.data[4], m.data[8]).length();
            var scaleY = 1 / new Vector3(m.data[1], m.data[5], m.data[9]).length();
            var scaleZ = 1 / new Vector3(m.data[2], m.data[6], m.data[10]).length();

            this.data[0] = m.data[0] * scaleX;
            this.data[4] = m.data[4] * scaleX;
            this.data[8] = m.data[8] * scaleX;

            this.data[1] = m.data[1] * scaleY;
            this.data[5] = m.data[5] * scaleY;
            this.data[9] = m.data[9] * scaleY;

            this.data[2] = m.data[2] * scaleZ;
            this.data[6] = m.data[6] * scaleZ;
            this.data[10] = m.data[10] * scaleZ;

            if (typeof this.modified !== "undefined")
                this.modified();

            return this;

        }

        translate(t: Vector3) { return this.clone()._translate(t); }

        _translate(t: Vector3) {
            var m = this.data;

            m[12] = m[0] * t.x + m[4] * t.y + m[8] * t.z + m[12];
            m[13] = m[1] * t.x + m[5] * t.y + m[9] * t.z + m[13];
            m[14] = m[2] * t.x + m[6] * t.y + m[10] * t.z + m[14];
            m[15] = m[3] * t.x + m[7] * t.y + m[11] * t.z + m[15];

            if (typeof this.modified !== "undefined")
                this.modified();

            return this;
        }

        multiply(matrixB: Matrix4) {
            var matrixC = new Matrix4();
            for (var row = 0; row < 4; row++) {
                for (var col = 0; col < 4; col++) {
                    for (var i = 0; i < 4; i++) {
                        matrixC.data[col * 4 + row] += this.data[i * 4 + row] * matrixB.data[col * 4 + i];
                    }
                }
            }
            return matrixC;
        }

        invert() {
            var inv = new Float32Array(16);
            var m = this.data;

            inv[0] = m[5] * m[10] * m[15] -
            m[5] * m[11] * m[14] -
            m[9] * m[6] * m[15] +
            m[9] * m[7] * m[14] +
            m[13] * m[6] * m[11] -
            m[13] * m[7] * m[10];

            inv[4] = -m[4] * m[10] * m[15] +
            m[4] * m[11] * m[14] +
            m[8] * m[6] * m[15] -
            m[8] * m[7] * m[14] -
            m[12] * m[6] * m[11] +
            m[12] * m[7] * m[10];

            inv[8] = m[4] * m[9] * m[15] -
            m[4] * m[11] * m[13] -
            m[8] * m[5] * m[15] +
            m[8] * m[7] * m[13] +
            m[12] * m[5] * m[11] -
            m[12] * m[7] * m[9];

            inv[12] = -m[4] * m[9] * m[14] +
            m[4] * m[10] * m[13] +
            m[8] * m[5] * m[14] -
            m[8] * m[6] * m[13] -
            m[12] * m[5] * m[10] +
            m[12] * m[6] * m[9];

            inv[1] = -m[1] * m[10] * m[15] +
            m[1] * m[11] * m[14] +
            m[9] * m[2] * m[15] -
            m[9] * m[3] * m[14] -
            m[13] * m[2] * m[11] +
            m[13] * m[3] * m[10];

            inv[5] = m[0] * m[10] * m[15] -
            m[0] * m[11] * m[14] -
            m[8] * m[2] * m[15] +
            m[8] * m[3] * m[14] +
            m[12] * m[2] * m[11] -
            m[12] * m[3] * m[10];

            inv[9] = -m[0] * m[9] * m[15] +
            m[0] * m[11] * m[13] +
            m[8] * m[1] * m[15] -
            m[8] * m[3] * m[13] -
            m[12] * m[1] * m[11] +
            m[12] * m[3] * m[9];

            inv[13] = m[0] * m[9] * m[14] -
            m[0] * m[10] * m[13] -
            m[8] * m[1] * m[14] +
            m[8] * m[2] * m[13] +
            m[12] * m[1] * m[10] -
            m[12] * m[2] * m[9];

            inv[2] = m[1] * m[6] * m[15] -
            m[1] * m[7] * m[14] -
            m[5] * m[2] * m[15] +
            m[5] * m[3] * m[14] +
            m[13] * m[2] * m[7] -
            m[13] * m[3] * m[6];

            inv[6] = -m[0] * m[6] * m[15] +
            m[0] * m[7] * m[14] +
            m[4] * m[2] * m[15] -
            m[4] * m[3] * m[14] -
            m[12] * m[2] * m[7] +
            m[12] * m[3] * m[6];

            inv[10] = m[0] * m[5] * m[15] -
            m[0] * m[7] * m[13] -
            m[4] * m[1] * m[15] +
            m[4] * m[3] * m[13] +
            m[12] * m[1] * m[7] -
            m[12] * m[3] * m[5];

            inv[14] = -m[0] * m[5] * m[14] +
            m[0] * m[6] * m[13] +
            m[4] * m[1] * m[14] -
            m[4] * m[2] * m[13] -
            m[12] * m[1] * m[6] +
            m[12] * m[2] * m[5];

            inv[3] = -m[1] * m[6] * m[11] +
            m[1] * m[7] * m[10] +
            m[5] * m[2] * m[11] -
            m[5] * m[3] * m[10] -
            m[9] * m[2] * m[7] +
            m[9] * m[3] * m[6];

            inv[7] = m[0] * m[6] * m[11] -
            m[0] * m[7] * m[10] -
            m[4] * m[2] * m[11] +
            m[4] * m[3] * m[10] +
            m[8] * m[2] * m[7] -
            m[8] * m[3] * m[6];

            inv[11] = -m[0] * m[5] * m[11] +
            m[0] * m[7] * m[9] +
            m[4] * m[1] * m[11] -
            m[4] * m[3] * m[9] -
            m[8] * m[1] * m[7] +
            m[8] * m[3] * m[5];

            inv[15] = m[0] * m[5] * m[10] -
            m[0] * m[6] * m[9] -
            m[4] * m[1] * m[10] +
            m[4] * m[2] * m[9] +
            m[8] * m[1] * m[6] -
            m[8] * m[2] * m[5];

            var det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];

            if (det == 0)
                throw new Error("Matrix.invert could not be calculated, determinant is 0");

            for (var i = 0; i < 16; i++)
                inv[i] /= det;

            return new Matrix4(inv);
        }

        transpose() {
            var m = this.data;
            return new Matrix4(new Float32Array([
                m[0], m[4], m[8], m[12],
                m[1], m[5], m[9], m[13],
                m[2], m[6], m[10], m[14],
                m[3], m[7], m[11], m[15]
            ]));
        }

        lookAt(target: Vector3, up?: Vector3) {
            if (typeof up === "undefined")
                up = new Vector3(0, 1, 0);
            return Matrix4.LookAt(this.position, target, up);
        }
    }
