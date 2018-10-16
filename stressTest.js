
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

var wsp = new webStimulusPresentation();

setTimeout(
    function() { // Wait three seconds, then estimate frame rate
        textElement.textContent = 'Getting frame rate...';
        wsp.getFrameRate(60, 10, 3,
            function() {
                alert('Estimated frame rate: ' + 1000/wsp.msPerFrame);
                // Then run the element-changing function
                textElement.textContent = 'One';
                // Stress test; mistakes will be visible if they occur
                var nStressTestChanges = 600;
                funcList = funcList.concat(new Array(nStressTestChanges).fill(changeElement));
                durationList = durationList.concat(new Array(nStressTestChanges).fill(wsp.msPerFrame));
                funcList = funcList.concat(
                    function() {
                        interFrameIntervals = [];
                        mInterFrameIntervals = [];
                        var i;
                        for (i = 0; i < wsp.frameTimes.length - 2; i++) {
                            interFrameIntervals.push(wsp.frameTimes[i+1] - wsp.frameTimes[i])
                        }
                        interFrameIntervals.sort(function(a,b){return b-a});
                        // Look at the beginning of these arrays and see if the number of unusually large elements matches the number of "blips" you saw
                    }
                );
                setTimeout( // Wait one second, then change element
                    function() {
                        wsp.run(funcList, durationList, 10, 4);
                    },1*1000
                );
            }
        );
    }, 3*1000
);