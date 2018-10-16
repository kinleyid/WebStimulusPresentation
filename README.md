# WebStimulusPresentation

## Introduction

There are two issues with running reaction time experiments over the web that this library tries to address:
1. You don't have access to paint times (roughly the times when the screen refreshes and stimuli become visible). <a href='https://developer.mozilla.org/en-US/docs/Web/Events/MozAfterPaint'>MozAfterPaint</a> would have been perfect for this had something like it been standardized, but that didn't happen.
2. requestAnimationFrame callbacks are supposed to fire <a href='https://medium.com/@paul_irish/requestanimationframe-scheduling-for-nerds-9c57f7438ef4'>slightly before the screen updates</a>, but in Edge and Safari they fire slightly after (see <a href='https://vimeo.com/254947206'>this talk</a> at 23:45). Therefore if you use rAF callbacks to alter the DOM and estimate when the alterations become visible, there will systematic differences between users of these browsers and everyone else.

There's no perfect solution to the first problem right now, but requestAnimationFrame callbacks generally fire very close to when the screen updates (<a href='https://www.vsynctester.com/howtocomputevsync.html'>according to vsycntester.com</a>). This library treats the performance.now() values (or the average of many of these, to try to cope with <a href='https://github.com/w3c/hr-time/issues/56'>reduced time precision</a>) obtained in rAF callbacks as screen update times and uses simple linear regression (as suggested on <a href='https://www.vsynctester.com/howtocomputevsync.html'>vsynctester.com</a> to estimate frame rate and try to predict when the screen will update next.

This library tries to solve the second problem by using ```requestAnimationFrame``` only to estimate screen update times and schedule DOM alterations using ```setTimeout```.

## How to use

### Initializing

See example.html and example.js.
When initializing the library, call the resulting variable ```wsp``` (that's how it refers to itself).
```javascript
var wsp = new webStimulusPresentation();
```

### Estimating frame rate

The frame rate is calculated with simple linear regression (as suggested on <a href='https://www.vsynctester.com/howtocomputevsync.html'>vsynctester.com</a>) by calling ```wsp.getFrameRate```. The arguments passed in are the number of ```requestAnimationFrame``` calls to make, the number of ```performance.now``` calls per ```requestAnimationFrame``` callback, the maximum number of milliseconds by which any calculated inter-frame interval can be off from the median without causing ```getFrameRate``` to start over, and a function to call after the frame rate has been calculated:
```javascript
wsp.getFrameRate(60, 10, 3, function(){alert('Frame rate = ' + 1000/wsp.msPerFrame)});
```

### Displaying stimuli

Once the frame rate has been calculated, you can create an array of functions that will alter the DOM and an array of corresponding durations (in milliseconds) for which the alterations should be visible. You then pass these as arguments to ```wsp.run``` along with the number of ```performance.now``` calls to make whenever the current time is estimated (defaults to the value passed to ```wsp.getFrameRate``` or 1) and the minimum number of milliseconds before the next screen update a DOM alteration will be performed (if the screen is going to update in t + 0.1 ms, changes made at t ms won't be visible so you might as well record a missed frame and wait til the next one. If this value is set to 0, frames will be missed without being recorded as such. It defaults to 4):
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
wsp.run(funcList, durationList, 10, 4);
```
