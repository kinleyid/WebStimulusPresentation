# WebStimulusPresentation
Attempts to provide better control over when and for how long stimuli are displayed on the web.

## Introduction

There are two issues with running reaction time experiments over the web that this library tries to address:
1. You don't have access to paint times (roughly the times when the screen refreshes and stimuli become visible). <a href='https://developer.mozilla.org/en-US/docs/Web/Events/MozAfterPaint'>MozAfterPaint</a> would have been perfect for this had something like it been standardized, but that didn't happen.
2. requestAnimationFrame callbacks are supposed to fire <a href='https://medium.com/@paul_irish/requestanimationframe-scheduling-for-nerds-9c57f7438ef4'>slightly before the screen updates</a>, but in Edge and Safari they fire slightly after (see <a href='https://vimeo.com/254947206'>this talk</a> at 23:45).

There's no perfect solution to the first problem right now, but requestAnimationFrame callbacks generally fire very close to when the screen updates (<a href='https://www.vsynctester.com/howtocomputevsync.html'>according to vsycntester.com</a>). This library treats the performance.now() values (or the average of many of these, to try to cope with <a href='https://github.com/w3c/hr-time/issues/56'>reduced time precision</a>) obtained in the rAF callbacks as screen update times.

This library tries to solve the second problem by using requestAnimationFrame not to directly run the code that alters the DOM, but to estimate screen update times and schedule the code that alters the DOM.

For example, suppose a screen updates at 60 Hz. Then when a requestAnimationFrame callback fires at some time t, it will use setTimeout to schedule DOM-altering code to run some number of milliseconds d later, d < 16.67. It will also call requestAnimationFrame again to estimate when the alterations become visible. The DOM will be altered at t + d, the alterations will become visible at roughly t + 16.67, and this time will be recorded in the new requestAnimationFrame callback. This approach should also buy you more time to alter the DOM before the screen updates, assuming <a href='https://medium.com/@paul_irish/requestanimationframe-scheduling-for-nerds-9c57f7438ef4'>the diagrams here</a> are drawn to scale.

## How to use

### Initializing

See example.html and example.js.
When initializing the library, call the resulting variable ```vss``` (that's how it refers to itself).
```javascript
var msPerFrame = 1000/60;
var vss = new vSyncSystem(msPerFrame);
```

### Estimating frame rate

The frame rate can be calculated with simple linear regression (as suggested on <a href='https://www.vsynctester.com/howtocomputevsync.html'>vsynctester.com</a>) by calling ```vss.getFrameRate```. The arguments passed in are the number of ```requestAnimationFrame``` calls to make, the number of ```performance.now``` calls per ```requestAnimationFrame``` callback, the maximum number of milliseconds by which any calculated inter-frame interval can be off from the median without causing ```getFrameRate``` to start over, and a function to call after the frame rate has been calculated:
```javascript
vss.getFrameRate(60, 100, 3, function(){alert('Frame rate = ' + 1000/vss.msPerFrame)});
```

### Displaying stimuli

Once the frame rate has been calculated, you can create an array of functions that will alter the DOM and an array of corresponding durations (in milliseconds) that the alterations should be visible. You then pass these as arguments to ```vss.run``` along with the above-mentioned d parameter and the number of ```performance.now``` calls to make when the current time is estimated (defaults to the value passed to ```vss.getFrameRate``` or 1):
```javascript
function changeElement() {
    if (textElement.textContent == 'One') {
        textElement.textContent = 'Two';
    } else if (textElement.textContent == 'Two') {
        textElement.textContent = 'One';
    }
}
var funcList = new Array(100).fill(changeElement);
var durationList = new Array(100).fill(vss.msPerFrame);
funcList.push(function(){alert('All done')});
vss.run(funcList, durationList, 8);
```
