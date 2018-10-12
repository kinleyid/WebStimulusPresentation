
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
    function() { // Wait 3 seconds, then estimate frame rate
        textElement.textContent = 'Getting frame rate...';
        vss.getFrameRate(300,
            function() {
                alert('Estimated frame rate: ' + 1000/vss.msPerFrame);
                // Then run the element-changing function
                textElement.textContent = 'One';
                var i; // Create funcList based on calculated frame rate
                for (i = 1; i <= 4; i++) {
                    funcList = funcList.concat(new Array(30*i).fill(changeElement));
                    durationList = durationList.concat(new Array(30*i).fill(vss.msPerFrame * (5 - i) ));
                }
                setTimeout( // Wait one second, then change element
                    function() {
                        vss.run(funcList, durationList, 4);
                    },1*1000
                );
            }
        );
    }, 3*1000
);