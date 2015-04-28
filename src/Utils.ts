///<reference path="../references.ts" />

class Utils {
    static StartTick(tickMethod: (dt: number) => void) {
        window.onkeydown = function () {
            tickMethod(16);
        };

        //var result = Q.defer();
        //var oldTime = 0;
        //var tickLoop = (time) => {
        //    try {
        //        var deltaTime = time - oldTime;
        //        oldTime = time;

        //        tickMethod(deltaTime / 1000);
        //        window.requestAnimationFrame(tickLoop);
        //    }
        //    catch (e) {
        //        result.reject(e);
        //    }
        //};
        tickLoop(0);
        return result.promise;
    }
}
