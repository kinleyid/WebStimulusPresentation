
var textElement = document.getElementById('textElement');

function changeElement() {
    if (textElement.textContent == 'One') {
        textElement.textContent = 'Two';
    } else if (textElement.textContent == 'Two') {
        textElement.textContent = 'One';
    }
}

funcList = new Array();
durationList = new Array();

var vss = new vSyncSystem;

setTimeout(
    function() { // Wait three seconds, then estimate frame rate
        textElement.textContent = 'Getting frame rate...';
        vss.getFrameRate(60, 10, 3,
            function() {
                alert('Estimated frame rate: ' + 1000/vss.msPerFrame);
                // Then run the element-changing function
                textElement.textContent = 'One';
                // Stress test; mistakes will be visible if they occur
                var nStressTestChanges = 600;
                funcList = funcList.concat(new Array(nStressTestChanges).fill(changeElement));
                durationList = durationList.concat(new Array(nStressTestChanges).fill(vss.msPerFrame));
                funcList = funcList.concat(
                    function() {
                        interFrameIntervals = [];
                        mInterFrameIntervals = [];
                        var i;
                        for (i = 0; i < vss.frameTimes.length - 2; i++) {
                            interFrameIntervals.push(vss.frameTimes[i+1] - vss.frameTimes[i])
                        }
                        for (i = 0; i < vss.measuredTimes.length - 2; i++) {
                            mInterFrameIntervals.push(vss.measuredTimes[i+1] - vss.measuredTimes[i])
                        }
                        interFrameIntervals.sort(function(a,b){return b-a});
                        mInterFrameIntervals.sort(function(a,b){return b-a});
                        // Look at the beginning of these arrays and see if the number of unusually large elements matches the number of "blips" you saw
                    }
                );
                setTimeout( // Wait one second, then change element
                    function() {
                        vss.run(funcList, durationList, 4, 10);
                    },1*1000
                );
            }
        );
    }, 3*1000
);