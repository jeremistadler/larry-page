"use strict";

class Utils {
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

    static randomFromTo(from, to){
        return Math.floor(Math.random() * (to - from + 1) + from);
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
}
