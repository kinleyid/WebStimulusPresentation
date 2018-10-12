function vSyncSystem(msPerFrame) {
    vss = this;
    vss.msPerFrame = msPerFrame;
    vss.displayTimes = [];
    vss.run = function(funcList, durationList, delayMs) {
        vss.funcList = funcList;
        vss.durationList = durationList;
        vss.delayMs = delayMs;
        vss.idx = 0;
        vss.nextChangeTime = performance.now(); // forces immediate update
        window.requestAnimationFrame(
            function() {
                vss.frameLoop(false);
            }
        );
    }
    vss.frameLoop = function(shouldRecordTime) {
        var ct = performance.now();
        if (shouldRecordTime) {
            vss.displayTimes.push(ct);
            if (vss.idx == vss.funcList.length - 1) {
                return;
            } else {
                vss.nextChangeTime = ct + vss.durationList[vss.idx++];
            }
        }
        var shouldRecordNextTime = false;
        if (Math.abs(ct + vss.msPerFrame - vss.nextChangeTime) < Math.abs(ct + 2*vss.msPerFrame - vss.nextChangeTime)){
            setTimeout(vss.funcList[vss.idx], vss.delayMs);
            shouldRecordNextTime = true;
        }
        window.requestAnimationFrame(
            function() {
                vss.frameLoop(shouldRecordNextTime);
            }
        );
    }
    vss.getFrameRate = function(nFramesToRecord, postFrameRateCalcCallback) {
        // Assumes window.requestAnimationFrame uses system vsync signal--I don't think this is true of old browsers
        vss.nFramesToRecord = nFramesToRecord;
        vss.postFrameRateCalcCallback = postFrameRateCalcCallback;
        vss.frameTimesForRegression = [];
        window.requestAnimationFrame(vss.recordFrame);
    }
    vss.recordFrame = function() {
        vss.frameTimesForRegression.push(performance.now());
        if (vss.frameTimesForRegression.length == vss.nFramesToRecord) {
            vss.computeMsPerFrame();
        } else {
            window.requestAnimationFrame(vss.recordFrame);
        }
    }
    vss.computeMsPerFrame = function() { // Simple regression
        var y = vss.frameTimesForRegression;
        var yMean = y.reduce(function(acc, curr){return acc + curr}, 0) / y.length;
        y = y.map(function(element){return element - yMean}); // Subtract mean for numerical stability
        var n = y.length;
        var x = new Array(n);
        var i;
        for (i = 0; i < n; i++) {
            x[i] = i+1;
        }
        var Sy = 0, Sxy = 0;
        for (i = 0; i < n; i++) {
            Sy += y[i];
            Sxy += x[i]*y[i];
        }
        var Sx = n*(n + 1) / 2;
        var Sxx = n*(n + 1)*(2*n + 1) / 6;
        vss.msPerFrame = (n*Sxy - Sx*Sy) / (n*Sxx - Sx**2);
        vss.postFrameRateCalcCallback();
    }
}