import { RenderConfig } from './shared';
import { Dna } from './dna';

export class Utils {
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

    static randomIndex(arr: any[]) {
        return Math.floor(Math.random() * arr.length);
    }

    /**
    * @min inclusive
    * @max exclusive
    */
    static randomFloat(min, max){
        return Math.random() * (max - min) + min;
    }

    /**
    * @min inclusive
    * @max inclusive
    */
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
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

    static Clamp(num: number, min: number, max: number) {
        return Math.min(Math.max(num, min), max);
    }

    static createDna(numberOfGenes: number, image: string, organismId: number = 0): Dna {
        var dna = {
            Fitness: Infinity,
            Genes: new Array(numberOfGenes),
            Generation: 0,
            Mutation: 0,
            Organism: {
                Id: organismId,
                ImagePath: image,
                GeneCount: numberOfGenes,
                Width: 200,
                Height: 200
            }
        };

        for (var i = 0; i < numberOfGenes; i++) {
            var gene = dna.Genes[i] = {
                Color: [Math.random(), Math.random(), Math.random(), Math.random() * 0.8 + 0.2],
                Pos: new Array(6)
            };
            for (var q = 0; q < gene.Pos.length; q++)
                gene.Pos[q] = Math.random();
        }

        return dna;
    }

    static loadDebugDna(onComplete: (dna: Dna) => void) {
        window.setTimeout(function () {
            var dna = localStorage.getItem(RenderConfig.tempName);
            if (!dna)
                onComplete(Utils.createDna(0, RenderConfig.imageBaseUrl + '/' + 'cy0miacv.hrd.jpg'));
            else
                onComplete(JSON.parse(dna));
        });
    }
}
