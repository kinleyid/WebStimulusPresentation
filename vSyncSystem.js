function vSyncSystem(msPerFrame) {
    vss = this;
    vss.msPerFrame = msPerFrame;
    vss.measuredTimes = new Array();
    vss.frameTimes = new Array();
    vss.run = function(funcList, durationList, delayMs, nTimeQueriesPerFrame, missedFrameTolerance) {
        vss.funcList = funcList;
        vss.durationList = durationList;
        if (delayMs == undefined) {
            vss.delayMs = 8;
        } else {
            vss.delayMs = delayMs;
        }
        if (nTimeQueriesPerFrame == undefined) {
            if (vss.nTimeQueriesPerFrame == undefined) {
                vss.nTimeQueriesPerFrame = 1;
            }
        } else {
            vss.nTimeQueriesPerFrame = nTimeQueriesPerFrame;
        }
        if (missedFrameTolerance == undefined) {
            vss.missedFrameTolerance = vss.msPerFrame/2;
        } else {
            vss.missedFrameTolerance = missedFrameTolerance;
        }
        vss.funcIdx = 0;
        vss.nextChangeTime = vss.getCurrentTime(vss.nTimeQueriesPerFrame); // forces immediate update
        /*
        window.requestAnimationFrame(
            function() {
                window.requestAnimationFrame(
                    function() {
                        vss.frameLoop(false);
                    }
                );
            }
        );
        */
        setTimeout(vss.frameLoopNew, 0);
    }
    vss.frameLoop = function(shouldRecordTime) {
        var measuredTime = vss.getCurrentTime(vss.nTimeQueriesPerFrame);
        var frameIdx = Math.round((measuredTime  - vss.t0)/vss.msPerFrame);
        var frameTime = vss.t0 + frameIdx*vss.msPerFrame; // Regression-based estimate of the time at which changes become visible
        if (measuredTime - frameTime <= vss.missedFrameTolerance  && vss.lastFrameIdx) {
            frameIdx = vss.lastFrameIdx + 1;
            frameTime = vss.t0 + frameIdx*vss.msPerFrame;
        }
        vss.lastFrameIdx = frameIdx;
        if (shouldRecordTime) {
            vss.measuredTimes.push(measuredTime);
            vss.frameTimes.push(frameTime);
            if (vss.funcIdx == vss.funcList.length - 1) {
                return;
            } else {
                vss.nextChangeTime = frameTime + vss.durationList[vss.funcIdx++];
            }
        }
        var shouldRecordNextTime = false;
        if (Math.abs(frameTime + vss.msPerFrame - vss.nextChangeTime) < Math.abs(frameTime + 2*vss.msPerFrame - vss.nextChangeTime)){
            setTimeout(
                function() {
                    vss.funcList[vss.funcIdx]();
                },
                vss.delayMs + frameTime - measuredTime // Accounts for discrepancy between frameTime and measuredTime
            );
            shouldRecordNextTime = true;
        }
        window.requestAnimationFrame(
            function() {
                vss.frameLoop(shouldRecordNextTime);
            }
        );
    }
    vss.frameLoopNew = function() {
        var currTime = vss.getCurrentTime(vss.nTimeQueriesPerFrame);
        var nextFrameTime = vss.t0 + Math.round((currTime  - vss.t0)/vss.msPerFrame)*vss.msPerFrame;
        if (
            Math.abs(nextFrameTime - vss.nextChangeTime) < Math.abs(nextFrameTime + vss.msPerFrame - vss.nextChangeTime)
            &&
            nextFrameTime - currTime > vss.missedFrameTolerance
        )
        {
            vss.funcList[vss.funcIdx]();
            vss.frameTimes.push(nextFrameTime);
            if (vss.funcIdx == vss.funcList.length - 1) {
                return;
            }
            vss.nextChangeTime = nextFrameTime + vss.durationList[vss.funcIdx++];
        }
        setTimeout(vss.frameLoopNew, 0);
    }
    vss.getFrameRate = function(nFramesToRecord, nTimeQueriesPerFrame, interFrameTolerance, postFrameRateCalcCallback) {
        vss.nFramesToRecord = nFramesToRecord;
        vss.nTimeQueriesPerFrame = nTimeQueriesPerFrame;
        vss.interFrameTolerance = interFrameTolerance;
        vss.postFrameRateCalcCallback = postFrameRateCalcCallback;
        vss.frameTimesForRegression = [];
        window.requestAnimationFrame(
            function() {
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