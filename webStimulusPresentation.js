function webStimulusPresentation() {
    wsp = this;
    wsp.run = function(funcList, durationList, nTimeQueriesPerFrame, delayMs, missedFrameTolerance) {
        wsp.funcList = funcList;
        wsp.durationList = durationList;
        if (nTimeQueriesPerFrame == undefined) {
            if (wsp.nTimeQueriesPerFrame == undefined) {
                wsp.nTimeQueriesPerFrame = 1;
            }
        } else {
            wsp.nTimeQueriesPerFrame = nTimeQueriesPerFrame;
        }
        if (delayMs == undefined) {
            wsp.delayMs = 8;
        } else {
            wsp.delayMs = delayMs;
        }
        if (missedFrameTolerance == undefined) {
            wsp.missedFrameTolerance = 4;
        } else {
            wsp.missedFrameTolerance = missedFrameTolerance;
        }
        wsp.funcIdx = 0;
        wsp.frameTimes = new Array();
        wsp.lastTimes = new Array();
        wsp.nextChangeTime = wsp.getCurrentTime(wsp.nTimeQueriesPerFrame); // forces immediate update
        wsp.doubleRAF(wsp.frameLoop);
    }
    wsp.frameLoop = function() {
        var currTime = wsp.getCurrentTime(wsp.nTimeQueriesPerFrame);
        var nLastTimesToKeep = 10;
        if (wsp.lastTimes.length == nLastTimesToKeep) {
            var nextFrameTime = wsp.lastTimes.reduce(function(acc, curr){return acc + curr}, 0)/nLastTimesToKeep
                                + (nLastTimesToKeep/2 + 1.5)*wsp.msPerFrame;
            wsp.lastTimes.shift();
        } else {
            var nextFrameTime = currTime + wsp.msPerFrame;
        }
        wsp.lastTimes.push(currTime);
        if (Math.abs(nextFrameTime - wsp.nextChangeTime) < Math.abs(nextFrameTime + wsp.msPerFrame - wsp.nextChangeTime)) {
            if (nextFrameTime - currTime > wsp.missedFrameTolerance) {
                setTimeout(wsp.funcList[wsp.funcIdx], wsp.delayMs - currTime - (nextFrameTime - wsp.msPerFrame)); // Adjust for late rAF callback fires
                wsp.frameTimes.push(nextFrameTime);
                if (wsp.funcIdx == wsp.funcList.length - 1) {
                    return;
                }
                wsp.nextChangeTime = nextFrameTime + wsp.durationList[wsp.funcIdx++];
            } // Else missed frame or just unusually late call?
        }
        window.requestAnimationFrame(wsp.frameLoop);
    }
    wsp.getFrameRate = function(nFramesToRecord, nTimeQueriesPerFrame, interFrameTolerance, postFrameRateCalcCallback) {
        wsp.nFramesToRecord = nFramesToRecord;
        wsp.nTimeQueriesPerFrame = nTimeQueriesPerFrame;
        wsp.interFrameTolerance = interFrameTolerance;
        wsp.postFrameRateCalcCallback = postFrameRateCalcCallback;
        wsp.frameTimesForRegression = [];
        wsp.doubleRAF(wsp.recordFrame);
    }
    wsp.recordFrame = function() {
        wsp.frameTimesForRegression.push(wsp.getCurrentTime(wsp.nTimeQueriesPerFrame));
        if (wsp.frameTimesForRegression.length == wsp.nFramesToRecord) {
            wsp.computeMsPerFrame();
        } else {
            window.requestAnimationFrame(wsp.recordFrame);
        }
    }
    wsp.computeMsPerFrame = function() {
        // Make sure the inter-frame intervals are consistent
        var i, n = wsp.frameTimesForRegression.length, IFIs = new Array();
        for (i = 0; i < n - 1; i++) {
            IFIs.push(wsp.frameTimesForRegression[i+1] - wsp.frameTimesForRegression[i]);
        }
        var IFImedian = IFIs.sort(function(a, b){return a - b})[Math.ceil((n - 1)/2)];
        // If any inter-frame interval differs from the median by more than wsp.interFrameTolerance, start over
        if (IFImedian - IFIs[0] > wsp.interFrameTolerance || IFIs[n - 2] - IFImedian > wsp.interFrameTolerance) {
            wsp.getFrameRate(wsp.nFramesToRecord, wsp.nTimeQueriesPerFrame, wsp.interFrameTolerance, wsp.postFrameRateCalcCallback);
        } else { // Simple linear regression
            var y = wsp.frameTimesForRegression;
            var ymean = y.reduce(function(acc, curr){return acc + curr}, 0)/y.length;
            y = y.map(function(element){return element - ymean}); // Subtract mean for numerical stability
            var x = new Array(n);
            for (i = 0; i < n; i++) { // Frame index variable
                x[i] = i;
            }
            var Sy = 0, Sxy = 0;
            for (i = 0; i < n; i++) {
                Sy += y[i];
                Sxy += x[i]*y[i];
            }
            var Sx = n*(n + 1)/2;
            var Sxx = n*(n + 1)*(2*n + 1)/6;
            wsp.msPerFrame = (n*Sxy - Sx*Sy)/(n*Sxx - Sx**2);
            wsp.postFrameRateCalcCallback();
        }
    }
    wsp.getCurrentTime = function(nQueries) {
        var timeEstimate = 0, i; // Take average of multiple time points
        for (i = 0; i < nQueries; i++) {
            timeEstimate += performance.now();
        }
        return timeEstimate/nQueries;
    }
    wsp.doubleRAF = function(callback) {
        window.requestAnimationFrame(
            function() {
                window.requestAnimationFrame(callback);
            }
        );
    }
}