"use strict";
var Utils2 = require('./utils');
var Utils = Utils2.Utils;
var Raster = (function () {
    function Raster() {
    }
    Raster.drawHLine = function (buffer, width, height, x1, x2, y, color) {
        if (y < 0 || y > height - 1)
            return;
        if (x1 === x2)
            return;
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
        }
        ;
    };
    Raster.scanline = function (x1, y1, x2, y2, startY, endY) {
        if (y1 === y2)
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
        var dx = (x2 - x1) / (y2 - y1);
        var row = Math.floor(y1 - startY);
        for (; y1 <= y2; y1++) {
            if (this._rowMin[row] > x1)
                this._rowMin[row] = x1;
            if (this._rowMax[row] < x1)
                this._rowMax[row] = x1;
            x1 += dx;
            row++;
        }
    };
    Raster._drawPolygon = function (buffer, width, height, points, color) {
        var minY = Math.min(points[1], points[3], points[5]);
        var maxY = Math.max(points[1], points[3], points[5]);
        var polygonHeight = Math.floor(maxY - minY);
        for (var i = 0; i < polygonHeight + 10; i++)
            this._rowMin[i] = 100000.0;
        for (var i = 0; i < polygonHeight + 10; i++)
            this._rowMax[i] = -100000.0;
        this.scanline(points[0], points[1], points[2], points[3], minY, maxY);
        this.scanline(points[4], points[5], points[0], points[1], minY, maxY);
        this.scanline(points[2], points[3], points[4], points[5], minY, maxY);
        for (var i = 0; i < polygonHeight; i++) {
            this.drawHLine(buffer, width, height, this._rowMin[i], this._rowMax[i], Math.floor(i + minY), color);
        }
    };
    Raster.rotPoints = function (points, angle, about) {
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
    };
    Raster.polyEllipse = function (x, y, w, h) {
        var ex, ey, i;
        var reply = [];
        for (i = 0; i < 2 * Math.PI; i += 0.01) {
            ex = x + w * Math.cos(i);
            ey = y + h * Math.sin(i);
            reply.push({ x: ex, y: ey });
        }
        return reply;
    };
    Raster.polyBox = function (x, y, w, h) {
        return [{ x: x - w / 2, y: y - h / 2 },
            { x: x - w / 2, y: y + h / 2 },
            { x: x + w / 2, y: y + h / 2 },
            { x: x + w / 2, y: y - h / 2 }];
    };
    Raster.drawPolygon = function (buffer, width, height, points, color) {
        this._drawPolygon(buffer, width, height, points, color);
    };
    Raster.drawCircle = function (buffer, width, height, x, y, rad, color) {
        this._drawPolygon(buffer, width, height, this.polyEllipse(x, y, rad, rad), color);
    };
    Raster.drawEllipse = function (buffer, width, height, x, y, h, w, rot, color) {
        this._drawPolygon(buffer, width, height, this.rotPoints(this.polyEllipse(x, y, h, w), rot, { x: x, y: y }), color);
    };
    Raster.drawBox = function (buffer, width, height, x, y, h, w, rot, color) {
        this._drawPolygon(buffer, width, height, this.rotPoints(this.polyBox(x, y, h, w), rot, { x: x, y: y }), color);
    };
    Raster._rowMin = Utils.CreateNumberArray(1024);
    Raster._rowMax = Utils.CreateNumberArray(1024);
    return Raster;
}());
exports.Raster = Raster;
//# sourceMappingURL=raster.js.map