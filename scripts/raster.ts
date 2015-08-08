"use strict";

class Raster {
    static _rowMin: number[] = Utils.CreateNumberArray(1024);
    static _rowMax: number[] = Utils.CreateNumberArray(1024);

    private static drawHLine(buffer: Uint8Array, width: number, height: number, x1: number, x2: number, y: number, color: number[]) {
        if (y < 0 || y > height - 1) return;
        if (x1 == x2) return;

        x1 = Math.max(x1, 0);
        x2 = Math.min(x2, width);

        var alpha = color[3];
        var inverseAlpha = 1 - alpha;

        var index = Math.floor((y * width) + x1);
        for (; x1 < x2; x1++) {
            buffer[index * 4 + 0] = alpha * color[0] + buffer[index * 4 + 0] * inverseAlpha;
            buffer[index * 4 + 1] = alpha * color[1] + buffer[index * 4 + 1] * inverseAlpha;
            buffer[index * 4 + 2] = alpha * color[2] + buffer[index * 4 + 2] * inverseAlpha;
            index++;
        };
    }

    private static scanline(x1: number, y1: number, x2: number, y2: number, startY: number, endY: number) {
        if (y1 == y2)
            return;

        if (y1 > y2) {
            var tempY = y1;
            var tempX = x1;
            y1 = y2;
            y2 = tempY;
            x1 = x2;
            x2 = tempX;
        }

        y1 = Math.floor(y1);
        y2 = Math.min(Math.floor(y2), endY);

        //if ( y2 < y1 ) { y2++ }

        var dx = (x2 - x1) / (y2 - y1); 		// change in x over change in y will give us the gradient
        var row = Math.floor(y1 - startY); 		// the offset the start writing at (into the array)

        for (; y1 <= y2; y1++) {
            if (this._rowMin[row] > x1) this._rowMin[row] = x1;
            if (this._rowMax[row] < x1) this._rowMax[row] = x1;

            x1 += dx;
            row++;
        }
    }

    private static _drawPolygon(buffer: Uint8Array, width: number, height: number, points: number[], color: number[]) {
        var minY = Math.min(points[1], points[3], points[5]);
        var maxY = Math.max(points[1], points[3], points[5]);
        var polygonHeight = Math.floor(maxY - minY);

        for (var i = 0; i < polygonHeight + 10; i++) this._rowMin[i] = 100000.0;
        for (var i = 0; i < polygonHeight + 10; i++) this._rowMax[i] = -100000.0;

        this.scanline(points[0], points[1], points[2], points[3], minY, maxY);
        this.scanline(points[4], points[5], points[0], points[1], minY, maxY);
        this.scanline(points[2], points[3], points[4], points[5], minY, maxY);

        //console.group('polygon rows: ', polygonHeight);
        //console.log('min: ', this._rowMin.slice(0, polygonHeight).map(f => f.toFixed(2)).join(', '));
        //console.log('max: ', this._rowMax.slice(0, polygonHeight).map(f => f.toFixed(2)).join(', '));
        //console.log('diff: ', this._rowMax.map((f, i) => (f - this._rowMin[i]).toFixed(2)).slice(0, polygonHeight).join(', '));
        //console.groupEnd();

        for (var i = 0; i < polygonHeight; i++) {
            this.drawHLine(buffer, width, height,
                this._rowMin[i], this._rowMax[i],
                Math.floor(i + minY), color);
        }
    }

    private static rotPoints(points, angle: number, about) {
        var x, y, i;
        var reply = [];

        angle = angle * (Math.PI / 180);

        var sin = Math.sin(angle);
        var cos = Math.cos(angle);

        for (i = 0; i < points.length; i++) {
            x = about.x + (((points[i].x - about.x) * cos) - ((points[i].y - about.y) * sin));
            y = about.y + (((points[i].x - about.x) * sin) + ((points[i].y - about.y) * cos));

            reply.push({ x: x, y: y });
        }

        return reply;
    }

    private static polyEllipse(x, y, w, h) {
        var ex, ey, i;
        var reply = [];

        for (i = 0; i < 2 * Math.PI; i += 0.01) {
            ex = x + w * Math.cos(i);
            ey = y + h * Math.sin(i);

            reply.push({ x: ex, y: ey });
        }

        return reply;
    }

    private static polyBox(x, y, w, h) {
        return [{ x: x - w / 2, y: y - h / 2 }
            , { x: x - w / 2, y: y + h / 2 }
            , { x: x + w / 2, y: y + h / 2 }
            , { x: x + w / 2, y: y - h / 2 }];
    }

    static drawPolygon(buffer: Uint8Array, width: number, height: number, points: number[], color: number[]) {
        this._drawPolygon(buffer, width, height, points, color);
    }

    static drawCircle(buffer, width, height, x, y, rad, color) {
        this._drawPolygon(buffer, width, height, this.polyEllipse(x, y, rad, rad), color);
    }

    static drawEllipse(buffer, width, height, x, y, h, w, rot: number, color) {
        this._drawPolygon(buffer, width, height, this.rotPoints(this.polyEllipse(x, y, h, w), rot, { x: x, y: y }), color);
    }

    static drawBox(buffer: Uint8Array, width: number, height: number, x, y, h, w, rot: number, color) {
        this._drawPolygon(buffer, width, height, this.rotPoints(this.polyBox(x, y, h, w), rot, { x: x, y: y }), color);
    }
}

