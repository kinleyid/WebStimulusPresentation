function vSyncSystem() {
    vss = this;
    vss.run = function(funcList, durationList, nTimeQueriesPerFrame, missedFrameTolerance) {
        vss.funcList = funcList;
        vss.durationList = durationList;
        if (nTimeQueriesPerFrame == undefined) {
            if (vss.nTimeQueriesPerFrame == undefined) {
                vss.nTimeQueriesPerFrame = 1;
            }
        } else {
            vss.nTimeQueriesPerFrame = nTimeQueriesPerFrame;
        }
        if (missedFrameTolerance == undefined) {
            vss.missedFrameTolerance = 4;
        } else {
            vss.missedFrameTolerance = missedFrameTolerance;
        }
        vss.funcIdx = 0;
        vss.frameTimes = new Array();
        vss.nextChangeTime = vss.getCurrentTime(vss.nTimeQueriesPerFrame); // forces immediate update
        setTimeout(vss.frameLoop, 0);
    }
    vss.frameLoop = function() {
        var currTime = vss.getCurrentTime(vss.nTimeQueriesPerFrame);
        var nextFrameTime = vss.t0 + Math.ceil((currTime  - vss.t0)/vss.msPerFrame)*vss.msPerFrame;
        if (Math.abs(nextFrameTime - vss.nextChangeTime) < Math.abs(nextFrameTime + vss.msPerFrame - vss.nextChangeTime)
                && nextFrameTime - currTime > vss.missedFrameTolerance){
            vss.funcList[vss.funcIdx]();
            vss.frameTimes.push(nextFrameTime);
            if (vss.funcIdx == vss.funcList.length - 1) {
                return;
            }
            vss.nextChangeTime = nextFrameTime + vss.durationList[vss.funcIdx++];
        }
        setTimeout(vss.frameLoop, 0);
    }
    vss.getFrameRate = function(nFramesToRecord, nTimeQueriesPerFrame, interFrameTolerance, postFrameRateCalcCallback) {
        vss.nFramesToRecord = nFramesToRecord;
        vss.nTimeQueriesPerFrame = nTimeQueriesPerFrame;
        vss.interFrameTolerance = interFrameTolerance;
        vss.postFrameRateCalcCallback = postFrameRateCalcCallback;
        vss.frameTimesForRegression = [];
        window.requestAnimationFrame(
            function() { // doubling up like this is safer--else the first inter-frame interval is often unusually small
                window.requestAnimationFrame(vss.recordFrame);
            }
        );
    }
    vss.recordFrame = function() {
        vss.frameTimesForRegression.push(vss.getCurrentTime(vss.nTimeQueriesPerFrame));
        if (vss.frameTimesForRegression.length == vss.nFramesToRecord) {
            vss.computeMsPerFrame();
        } else {
            window.requestAnimationFrame(vss.recordFrame);
        }
    }
    vss.computeMsPerFrame = function() {
        // Make sure the inter-frame intervals are consistent
        var i, n = vss.frameTimesForRegression.length, IFIs = new Array();
        for (i = 0; i < n - 1; i++) {
            IFIs.push(vss.frameTimesForRegression[i+1] - vss.frameTimesForRegression[i]);
        }
        var IFImedian = IFIs.sort(function(a, b){return a - b})[Math.ceil((n - 1)/2)];
        // If any inter-frame interval differs from the median by more than vss.interFrameTolerance, start over
        if (IFImedian - IFIs[0] > vss.interFrameTolerance || IFIs[n - 2] - IFImedian > vss.interFrameTolerance) {
            vss.getFrameRate(vss.nFramesToRecord, vss.nTimeQueriesPerFrame, vss.interFrameTolerance, vss.postFrameRateCalcCallback);
        } else { // Simple linear regression
            var y = vss.frameTimesForRegression;
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
            vss.msPerFrame = (n*Sxy - Sx*Sy)/(n*Sxx - Sx**2);
            vss.t0 = Sy/n - vss.msPerFrame*Sx/n;
            vss.postFrameRateCalcCallback();
        }
    }
    vss.getCurrentTime = function(nQueries) {
        var timeEstimate = 0, i; // Take average of multiple time points
        for (i = 0; i < nQueries; i++) {
            timeEstimate += performance.now();
        }
        return timeEstimate/nQueries;
    }
}