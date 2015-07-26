"use strict";

class Raster {
    private static drawHLine(buffer: Uint8Array, width: number, x1: number, x2: number, y: number, color: number[]) {
        if (x1 < 0) x1 = 0;
        if (x2 > width) x2 = width;
        if (y < 0 || y > globalHeight - 1) return;

        var index = x1 + y * width; 			// calculate the offset into the buffer
        var x;

        for (x = x1; x < x2; x++) {
            buffer[index * 4 + 0] = Utils.ClampByte(color[3] * color[0] + buffer[index * 4 + 0] * (1 - color[3]));
            buffer[index * 4 + 1] = Utils.ClampByte(color[3] * color[1] + buffer[index * 4 + 1] * (1 - color[3]));
            buffer[index * 4 + 2] = Utils.ClampByte(color[3] * color[2] + buffer[index * 4 + 2] * (1 - color[3]));
            buffer[index * 4 + 3] = 255;
            index++;
        };
    }

    private static scanline(x1: number, y1: number, x2: number, y2: number, startY: number, edges: any[]) {
        var x, y;

        if (y1 > y2) {
            var tempY = y1;
            var tempX = x1;
            y1 = y2;
            y2 = tempY;
            x1 = x2;
            x2 = tempX;
        }

        y1 = Math.floor(y1) + 1;
        y2 = Math.floor(y2);

        //if ( y2 < y1 ) { y2++ }

        x = x1; 					// start at the start
        var dx = (x2 - x1) / (y2 - y1); 		// change in x over change in y will give us the gradient
        var index = Math.min(Math.round(y1 - startY), 0); 		// the offset the start writing at (into the array)

        for (y = y1; y <= y2; y++) { 		// cover all y co-ordinates in the line
            var xi = Math.floor(x) + 1;

            // check if we've gone over/under the max/min
            //
            if (edges[index].minx > xi) { edges[index].minx = xi; }
            if (edges[index].maxx < xi) { edges[index].maxx = xi; }

            x += dx; 					// move along the gradient
            index++; 					// move along the buffer
        }
    }

    private static _drawPolygon(buffer: Uint8Array, width: number, points: number[], color: number[]) {
        var i;
        var miny = points[1]; 			// work out the minimum and maximum y values
        var maxy = points[1];

        for (i = 1; i < points.length; i += 2) {
            if (points[i] < miny) { miny = points[i]; }
            if (points[i] > maxy) { maxy = points[i]; }
        }

        var h = maxy - miny; 				// the height is the size of our edges array
        var edges = [];

        for (i = 0; i <= h + 1; i++) { 			// build the array with unreasonable limits
            edges.push({ minx: 1000000, maxx: -1000000 });
        }

        for (i = 0; i < points.length - 3; i += 2) { 	// process each line in the polygon
            this.scanline(points[i], points[i + 1],
                          points[i + 2], points[i + 3], miny, edges);
        }

        this.scanline(points[points.length - 2] - 1, points[points.length - 1] - 1, points[0] - 1, points[1] - 1, miny, edges);

        // draw each horizontal line
        for (i = 0; i < edges.length; i++) {
            this.drawHLine(buffer, width
                , Math.floor(edges[i].minx)
                , Math.floor(edges[i].maxx)
                , Math.floor(i + miny), color);
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

    static drawPolygon(buffer: Uint8Array, width: number, points: number[], color: number[]) {
        this._drawPolygon(buffer, width, points, color);
    }

    static drawCircle(buffer, width, x, y, rad, color) {
        this._drawPolygon(buffer, width, this.polyEllipse(x, y, rad, rad), color);
    }

    static drawEllipse(buffer, width, x, y, h, w, rot: number, color) {
        this._drawPolygon(buffer, width, this.rotPoints(this.polyEllipse(x, y, h, w), rot, { x: x, y: y }), color);
    }

    static drawBox(buffer: Uint8Array, width: number, x, y, h, w, rot: number, color) {
        this._drawPolygon(buffer, width, this.rotPoints(this.polyBox(x, y, h, w), rot, { x: x, y: y }), color);
    }
}

