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

The frame rate is calculated with simple linear regression (as suggested on <a href='https://www.vsynctester.com/howtocomputevsync.html'>vsynctester.com</a>) by calling ```wsp.getFrameRate```. The arguments passed in are:
1. the number of ```requestAnimationFrame``` calls to make per attempt at estimating frame rate
2. the number of ```performance.now``` calls per ```requestAnimationFrame``` callback
3. the maximum number of milliseconds by which any calculated inter-frame interval can be off from the median without causing ```getFrameRate``` to start over
4. the maximum number of times ```getFrameRate``` can be repeatedly called without loosening up (3.)
5. the number of ms by which (3.) is incremented each time ```getFrameRate``` calls itself beyond the number of times specified by (4.)
6. a function to call after the frame rate has been calculated
```javascript
wsp.getFrameRate(60, 10, 3, 10, 1, function(){alert('Frame rate = ' + 1000/wsp.msPerFrame)});
```

### Displaying stimuli

Once the frame rate has been calculated, you can call ```wsp.run``` to display your stimuli. It takes the following arguments:
1. an array of DOM-altering functions
2. an array of the durations for which the alterations specified by (1.) should be visible
3. the number of ```performance.now``` calls per ```requestAnimationFrame``` callback (defaults to the value passed to ```wsp.getFrameRate``` or ```1```)
4. the number of milliseconds passed to ```setTimeout``` in the ```requestAnimationFrame``` callbacks (adjusted for jitter in when the callbacks actually fire)
5. the minimum number of milliseconds by which the ```requestAnimationFrame``` callback must be ahead of the next expected screen update without counting the frame as missed (it makes no sense to try to alter the DOM, say, 0.1 ms before the screen is expected to update--your alterations won't be visible)
6. the number of previous ```requestAnimationFrame``` callback times to keep track of in order to predict the next screen update time
7. the fraction of an interframe interval beyond the expected time a ```requestAnimationFrame``` callback has to fire for a missed callback to be registered
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
wsp.run(funcList, durationList, 10, 4, 6, 10, 0.8);
```
