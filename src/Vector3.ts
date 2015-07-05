///<reference path="../references.ts" />

class Vector2 {
    constructor(public x: number, public y: number) { }
}

class Vector3 {
    private data: Float32Array;
    private startIndex: number;
    modified: () => void;

    constructor();
    constructor(xyz: number);
    constructor(x: number, y: number, z: number);
    constructor(data: Float32Array, startIndex: number);

    constructor(a1?, a2?, a3?) {
        if (!(a1 instanceof Float32Array)) {
            this.data = new Float32Array(3);
            this.startIndex = 0;
            if (typeof a1 === "undefined") {
                this.data[0] = 0;
                this.data[1] = 0;
                this.data[2] = 0;
            }
            else {
                this.data[0] = a1;
                if (typeof a2 === "undefined") {
                    this.data[1] = this.data[0];
                    this.data[2] = this.data[0];
                }
                else {
                    this.data[1] = a2;

                    if (typeof a2 === "undefined")
                        throw new Error("Z coordinate not specified for Vector3");

                    this.data[2] = a3;
                }
            }
        }
        else {
            this.data = a1;
            this.startIndex = a2;

            if (this.startIndex + 3 > this.data.length)
                throw new Error("Invalid Vector3 data");
        }
    }

    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    getData(axis: number) {
        return this.data[this.startIndex + axis];
    }

    setData(axis: number, value: number) {
        this.data[this.startIndex + axis] = value;
    }

    get x() {
        return this.data[this.startIndex + 0];
    }

    get y() {
        return this.data[this.startIndex + 1];
    }

    get z() {
        return this.data[this.startIndex + 2];
    }

    set x(value: number) {
        if (value === this.x) return;
        this.data[this.startIndex + 0] = value;
        if (typeof this.modified !== "undefined")
            this.modified();
    }

    set y(value: number) {
        if (value === this.y) return;
        this.data[this.startIndex + 1] = value;
        if (typeof this.modified !== "undefined")
            this.modified();
    }

    set z(value: number) {
        if (value === this.z) return;
        this.data[this.startIndex + 2] = value;
        if (typeof this.modified !== "undefined")
            this.modified();
    }

    _add(vector: Vector3) {
        this.x += vector.x;
        this.y += vector.y;
        this.z += vector.z;
        if (typeof this.modified !== "undefined")
            this.modified();
    }

    add(vector: Vector3): Vector3 {
        return new Vector3(
            this.x + vector.x,
            this.y + vector.y,
            this.z + vector.z);
    }

    _multiply(vector: Vector3) {
        this.data[this.startIndex + 0] *= vector.x;
        this.data[this.startIndex + 1] *= vector.y;
        this.data[this.startIndex + 2] *= vector.z;
        if (typeof this.modified !== "undefined")
            this.modified();
    }

    sub(vector: Vector3): Vector3 {
        return new Vector3(
            this.x - vector.x,
            this.y - vector.y,
            this.z - vector.z);
    }

    scale(value: number): Vector3 {
        return new Vector3(
            this.x * value,
            this.y * value,
            this.z * value);
    }

    divide(value: number): Vector3 {
        return new Vector3(
            this.x / value,
            this.y / value,
            this.z / value);
    }

    length() {
            return Math.sqrt(
            this.x * this.x +
            this.y * this.y +
            this.z * this.z)
        }

    normalize(): Vector3 {
        var len = this.length();
        if (len == 0.0)
            throw new Error("A vector with no direction can't be normalized");

        return new Vector3(this.x / len, this.y / len, this.z / len);
    }

    cross(other: Vector3): Vector3 {
        var xResult = this.y * other.z - this.z * other.y;
        var yResult = this.z * other.x - this.x * other.z;
        var zResult = this.x * other.y - this.y * other.x;
        return new Vector3(xResult, yResult, zResult);
    }
}
