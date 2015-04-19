///<reference path="../references.ts" />

     class Color {
        hasAlphaChannel: boolean;

        constructor(public data: Float32Array, public startIndex: number = 0) {
            if (startIndex + 4 > data.length)
                throw new Error("Invalid color data");
        }

        static Rgb(red: number, green: number, blue: number, alpha?: number) {
            var hasAlpha = true;
            if (typeof alpha === "undefined") {
                hasAlpha = false;
                alpha = 1;
            }

            var color = new Color(new Float32Array([red, green, blue, alpha]));
            color.hasAlphaChannel = hasAlpha;
            return color;
        }

        static RgbByte(red: number, green: number, blue: number, alpha?: number) {
            var hasAlpha = true;
            if (typeof alpha !== "number") {
                hasAlpha = false;
                alpha = 255;
            }

            var color = new Color(new Float32Array([red / 255, green / 255, blue / 255, alpha / 255]));
            color.hasAlphaChannel = hasAlpha;
            return color;
        }

        get red() {
            return this.data[this.startIndex];
        }

        set red(value: number) {
            this.data[this.startIndex] = value;
        }

        get green() {
            return this.data[this.startIndex + 1];
        }

        set green(value: number) {
            this.data[this.startIndex + 1] = value;
        }

        get blue() {
            return this.data[this.startIndex + 2];
        }

        set blue(value: number) {
            this.data[this.startIndex + 2] = value;
        }

        get alpha() {
            if (this.hasAlphaChannel)
                return this.data[this.startIndex + 3];
        }

        set alpha(value: number) {
            var hasAlpha = true;
            if (typeof value === "undefined") {
                hasAlpha = false;
                value = 1;
            }

            this.data[this.startIndex + 3] = value;
            this.hasAlphaChannel = hasAlpha;
        }
    }