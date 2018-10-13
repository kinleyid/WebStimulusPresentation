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
    vss.getFrameRate = function(nFramesToRecord, nTimeQueriesPerFrame, interFrameTolerance, postFrameRateCalcCallback) {
        vss.nFramesToRecord = nFramesToRecord;
        vss.nTimeQueriesPerFrame = nTimeQueriesPerFrame;
        vss.interFrameTolerance = interFrameTolerance;
        vss.postFrameRateCalcCallback = postFrameRateCalcCallback;
        vss.frameTimesForRegression = [];
        window.requestAnimationFrame(
            function() { // Doubling up like this is more robust
                window.requestAnimationFrame(vss.recordFrame);
            }
        );
    }
    vss.recordFrame = function() {
        var currTime = 0, i; // Take average of multiple time points
        for (i = 0; i < vss.nTimeQueriesPerFrame; i++) {
            currTime += performance.now(); // is there a faster way to do this?
        }
        currTime = currTime / vss.nTimeQueriesPerFrame;
        vss.frameTimesForRegression.push(currTime);
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
            var ymean = y.reduce(function(acc, curr){return acc + curr}, 0) / y.length;
            y = y.map(function(element){return element - ymean}); // Subtract mean for numerical stability
            var x = new Array(n);
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
            vss.t0 = Sy/n - vss.msPerFrame*Sx/n;
            vss.postFrameRateCalcCallback();
        }
    }
}