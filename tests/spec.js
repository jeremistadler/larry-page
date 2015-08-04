///<reference path="../references.ts" />
///<reference path="jasmine.d.ts" />
describe("Raster", function () {
    it("should be able to raster a triangle", function () {
        var buffer = new Uint8ClampedArray(100 * 100 * 4);
        for (var i = 3; i < buffer.length; i += 4)
            buffer[i] = 255;
        Raster.drawPolygon(buffer, 100, 100, [0, 0, 40, 0, 40, 100], [255, 100, 10, 1]);
        expect(buffer[0]).toBe(255);
        expect(buffer[1]).toBe(100);
        expect(buffer[2]).toBe(10);
        expect(buffer[3]).toBe(255);
    });
    it("should be able to alpha blend", function () {
        var buffer = new Uint8ClampedArray(100 * 100 * 4);
        for (var i = 3; i < buffer.length; i += 4)
            buffer[i] = 255;
        Raster.drawPolygon(buffer, 100, 100, [0, 0, 40, 0, 40, 100], [255, 100, 10, 0.5]);
        expect(buffer[0]).toBe(128);
        expect(buffer[1]).toBe(50);
        expect(buffer[2]).toBe(5);
        expect(buffer[3]).toBe(255);
    });
});
describe("Fitness calculator", function () {
    it("should calculate the same fitness combined", function () {
        var cleanBuffer = new Uint8ClampedArray(100 * 100 * 4);
        var buffer = new Uint8ClampedArray(100 * 100 * 4);
        for (var i = 3; i < buffer.length; i += 4)
            buffer[i] = 255;
        for (var i = 3; i < cleanBuffer.length; i += 4)
            cleanBuffer[i] = 255;
        Raster.drawPolygon(buffer, 100, 100, [0, 0, 40, 0, 40, 100], [255, 100, 10, 1]);
        //Raster.drawPolygon(buffer, 100, 100, [0, 0, 40, 0, 0, 100], [255, 100, 10, 1]);
        var totalFitness = FitnessCalculator.calculateFitness(cleanBuffer, buffer);
        var fitnessP0 = FitnessCalculator.calculateConstrainedFitness(cleanBuffer, buffer, { height: 1, width: 1, x: 0.0, y: 0, x2: 1, y2: 1 }, 100, 100);
        var fitnessP1 = FitnessCalculator.calculateConstrainedFitness(cleanBuffer, buffer, { height: 1, width: 0.5, x: 0.0, y: 0, x2: 0.5, y2: 1 }, 100, 100);
        var fitnessP2 = FitnessCalculator.calculateConstrainedFitness(cleanBuffer, buffer, { height: 1, width: 0.5, x: 0.5, y: 0, x2: 1, y2: 1 }, 100, 100);
        var fitnessP01 = FitnessCalculator.calculateConstrainedFitness(cleanBuffer, buffer, { height: 1, width: 0.1, x: 0.0, y: 0, x2: 0.1, y2: 1 }, 100, 100);
        expect(fitnessP0).toBe(totalFitness);
        expect(fitnessP1 + fitnessP2).toBe(totalFitness);
        expect(fitnessP01).not.toBe(totalFitness);
        expect(fitnessP01).not.toBe(0);
    });
});
describe("Gene Helper", function () {
    it("should be able to calculate intersecting genes", function () {
        var gene = {
            Pos: [-1, 0, 1, 0, 0, 1],
            Color: []
        };
        var rect = {
            x: 0,
            y: 0,
            x2: 1,
            y2: 1
        };
        var state = GeneHelper.CalculateState(gene, rect);
        expect(state.IsIntersecting).toBe(true);
        expect(state.IsContained).toBe(false);
    });
    it("should be able to calculate intersecting genes, case 2", function () {
        var gene = {
            Pos: [0, 0, 0, 1, 100, 0],
            Color: []
        };
        var rect = {
            x: 0,
            y: 0,
            x2: 1,
            y2: 1
        };
        var state = GeneHelper.CalculateState(gene, rect);
        expect(state.IsIntersecting).toBe(true);
        expect(state.IsContained).toBe(false);
    });
    //TODO, find a case where it does not work
    it("should be able to calculate intersecting genes, case 2", function () {
        var gene = {
            Pos: [0, 0, 0, 1, 100, 0],
            Color: []
        };
        var rect = {
            x: 0,
            y: 0,
            x2: 1,
            y2: 1
        };
        var state = GeneHelper.CalculateState(gene, rect);
        expect(state.IsIntersecting).toBe(true);
        expect(state.IsContained).toBe(false);
    });
    it("should be able to calculate covering genes as intersecting", function () {
        var gene = {
            Pos: [0, 0, 100, 0, 0, 100],
            Color: []
        };
        var rect = {
            x: 0.1,
            y: 0.1,
            x2: 1,
            y2: 1
        };
        var state = GeneHelper.CalculateState(gene, rect);
        expect(state.IsIntersecting).toBe(true);
        expect(state.IsContained).toBe(false);
    });
    it("should be able to calculate contained genes as intersecting genes", function () {
        var gene = {
            Pos: [0.5, 0.5, 0.6, 0.5, 0.5, 0.6],
            Color: []
        };
        var rect = {
            x: 0,
            y: 0,
            x2: 1,
            y2: 1
        };
        var state = GeneHelper.CalculateState(gene, rect);
        expect(state.IsIntersecting).toBe(true);
        expect(state.IsContained).toBe(true);
    });
});
